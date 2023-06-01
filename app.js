const video = document.getElementById('video');
const button = document.getElementById('button');
const select = document.getElementById('select');

const videoCanvas = document.getElementById('videoCanvas');
const videoCanvasCtx = videoCanvas.getContext("2d", { willReadFrequently: true });

const roiCanvas = document.getElementById('roiCanvas');
const roiCanvasCtx = roiCanvas.getContext("2d", { willReadFrequently: true });


let roiCanvasArr = ['1'].map(i => {
  const roiXCanvas = document.getElementById('roi'+i+'Canvas');
  const roiXCanvasCtx = roiXCanvas.getContext("2d", { willReadFrequently: true });

  const maskXCanvas = document.getElementById('mask'+i+'Canvas');
  const maskXCanvasCtx = maskXCanvas.getContext("2d");

  return {
    roiCanvas: roiXCanvas,
    roiCanvasCtx: roiXCanvasCtx,
    maskCanvas: maskXCanvas,
    maskCanvasCtx: maskXCanvasCtx
  }
})



let currentStream;



function stopMediaTracks(stream) {
  stream.getTracks().forEach(track => {
    track.stop();
  });
};

let confTemplate = {
  region: null,
  padTop: 0,
  format: '-',
  gap: 20,
  tickWidth: 10,
  tickHeight: 13,
  skew: 0,
  vskew: 0,
  detectThresh: 0.05,
  vTarget: 'd',
  hTarget: 'w',
  gamma: 2.2,
  invert: false,
}

let state = {
  roiConfSel: null,
  confs: [
    Object.assign({}, confTemplate),
    // Object.assign({}, confTemplate)
  ]
}



let urlState = window.location.href.split('#/')[1]
if (urlState) {
  state = JSON.parse(decodeURI(urlState))
}

state.confs[0].region ||= [10, 10, roiCanvas.width/2-10, 100]
// state.confs[1].region ||= [roiCanvas.width/2+10, 10, roiCanvas.width/2-20, 100]


video.addEventListener("play", () => {
  videoCanvas.width = video.videoWidth;
  videoCanvas.height = video.videoHeight;

  roiCanvas.width = video.videoWidth;
  roiCanvas.height = video.videoHeight;


  state.roiConfSel = state.confs[0]

  let buffer = null

  const draw = () => {    
    roiCanvasCtx.clearRect(0, 0, roiCanvas.width, roiCanvas.height)
    
    
    state.confs.forEach((conf, i) => {
      
      if (i === 0) {
        roiCanvasCtx.fillStyle = "rgba(255, 0, 0, 0.3)";
      } else {
        roiCanvasCtx.fillStyle = "rgba(0, 0, 255, 0.3)";
      }

      // let bounding
      // if (i === 0) {
      //   bounding = roiCanvas.getBoundingClientRect()
      // } else {
      //   bounding = roiCanvasArr[i-1].roiCanvas.getBoundingClientRect()
      // }
      // let wrapperEl = roiCanvasArr[i].roiCanvas.parentElement
      // wrapperEl.style["top"] = `${bounding.top + bounding.height}px`;


      // Crop desired region from first canvas
      var imageData1 = videoCanvasCtx.getImageData(...conf.region);

      conf.digitHeigth = imageData1.height
      
      // fix padding when skew

      conf.padLeft = Math.abs(imageData1.height*Math.sin(-conf.skew/180*Math.PI))
      // conf.padTop = (imageData1.width/2*Math.sin(-conf.vskew/180*Math.PI))
      let digitsCount = conf.format.split('').filter(x => x !== '.').length
      
      if (conf.skew > 0) {
        conf.padLeft = -conf.padLeft
      }

      conf.tickWidth = conf.digitHeigth / 20
      conf.tickHeight = conf.digitHeigth / 10

      roiCanvasCtx.fillRect(...conf.region);
      videoCanvasCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);


      roiCanvasArr[i].roiCanvasCtx.putImageData(imageData1, 0, 0);

      
      roiCanvasArr[i].roiCanvas.width = imageData1.width;
      roiCanvasArr[i].roiCanvas.height = imageData1.height;

      
      applyGammaCorrection(imageData1, conf.gamma)

      let uint8array = Uint8Array.from(imageData1.data)

      const sess = new gm.Session();
      
      const t = new gm.Tensor('uint8', [roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width, 4], uint8array);
      
      let pipeline = t

      // operations always return a valid input for another operation.
      // if you are a functional programmer, you could easily compose these.
      pipeline = gm.grayscale(pipeline);
      pipeline = gm.gaussianBlur(pipeline, 3, 3);
      // pipeline = gm.adaptiveThreshold(pipeline);
      pipeline = gm.sobelOperator(pipeline);
      pipeline = gm.cannyEdges(pipeline, 0.25, 0.85);
      pipeline = gm.dilate(pipeline, [3, 3]);
      pipeline = gm.erode(pipeline, [3, 3]);


      // allocate output tensor
      const output = gm.tensorFrom(pipeline);

      sess.init(pipeline);

      // run your operation
      sess.runOp(pipeline, 0, output);
      const canvasProcessed = gm.canvasCreate(roiCanvasArr[i].roiCanvas.height, roiCanvasArr[i].roiCanvas.width);

      gm.canvasFromTensor(canvasProcessed, output)


      let imageData2 = gm.toImageData(output, true)
      // let imageData2 = canvasProcessed.imageData
      

      // Draw modified image data to second canvas
      let histogram = hist(imageData2);
      let threshold = otsu(histogram, imageData2.width*imageData2.height);
      

      binarize(threshold, imageData2, conf.invert);

      roiCanvasArr[i].roiCanvasCtx.putImageData(imageData2, 0, 0);

      roiCanvasArr[i].maskCanvas.width = imageData2.width;
      roiCanvasArr[i].maskCanvas.height = imageData2.height;


      let res = ocr(roiCanvasArr[i].maskCanvas, roiCanvasArr[i].maskCanvasCtx, roiCanvasArr[i].roiCanvas, roiCanvasArr[i].roiCanvasCtx, conf);


      // let resFloat = parseFloat(res)

      // if (!isNaN(resFloat)) {
      //   chart._data[i+1].push(resFloat)
      // } else {
      //   chart._data[i+1].push(undefined)
      // }

      let chartValArr = chart._data[i+1]
      if (buffer && res !== buffer && res === '-') {
        chart._data[0].push(Date.now()/1000)

        if (!chartValArr.length) {
          chartValArr.push(1)
        } else {
          chartValArr.push(chartValArr[chartValArr.length-1]+1)
        }
      }

      buffer = res

      let counter = chartValArr[chartValArr.length-1]

      if (counter !== undefined) {
        roiCanvasCtx.fillStyle = "black";
        roiCanvasCtx.font = "22px Arial";
        roiCanvasCtx.fillText(counter, conf.region[0]-30, conf.region[1]+conf.region[3]);
      }
      sess.destroy()

      if (state.showpp) {
        roiCanvasCtx.drawImage(roiCanvasArr[i].roiCanvas, conf.region[0], conf.region[1], conf.region[2], conf.region[3])
      }
      roiCanvasCtx.drawImage(roiCanvasArr[i].maskCanvas, conf.region[0], conf.region[1], conf.region[2], conf.region[3])

    })


    // console.log(chart._data)
    chart.setData(chart._data)

    window.setTimeout(() => {
      requestAnimationFrame(draw);
    }, 10)
  };

  if (btoa(window.location.origin) === 'aHR0cHM6Ly9hcnR1cmF1Z3VzdG8uZ2l0aHViLmlv' || btoa(window.location.origin) === 'aHR0cDovLzEyNy4wLjAuMTo4MDAw') {
    requestAnimationFrame(draw);  
  }

});

function gotDevices(mediaDevices) {
  select.innerHTML = '';
  select.appendChild(document.createElement('option'));
  let count = 1;
  mediaDevices.forEach(mediaDevice => {
    if (mediaDevice.kind === 'videoinput') {
      const option = document.createElement('option');
      option.value = mediaDevice.deviceId;
      const label = mediaDevice.label || `Camera ${count++}`;
      const textNode = document.createTextNode(label);
      option.appendChild(textNode);
      select.appendChild(option);
    }
  });

}

button.addEventListener('click', event => {
  if (typeof currentStream !== 'undefined') {
    stopMediaTracks(currentStream);
  }
  const videoConstraints = {};
  if (select.value === '') {
    videoConstraints.facingMode = 'environment';
  } else {
    videoConstraints.deviceId = { exact: select.value };
  }
  const constraints = {
    video: videoConstraints,
    audio: false
  };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => {
      currentStream = stream;
      video.srcObject = stream;
      return navigator.mediaDevices.enumerateDevices();
    })
    .then(gotDevices)
    .catch(error => {
      console.error(error);
    });
});


navigator.mediaDevices.enumerateDevices().then(gotDevices);
