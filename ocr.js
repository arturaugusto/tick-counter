

const ocr = (maskCanvas, maskCanvasCtx, roiCanvas, roiCanvasCtx, conf) => {
  let t1 = new Date();
  
  let maskImg = maskCanvasCtx.createImageData(maskCanvas.width, maskCanvas.height)
  let maskImgData = maskImg.data;

  let roiCanvasImg = roiCanvasCtx.getImageData(0, 0, roiCanvas.width, roiCanvas.height)
  let roiCanvasImgData = roiCanvasImg.data;

  let digitsCount = conf.format.split('').filter(x => x !== '.').length
  let digitWidth = (maskCanvas.width-Math.abs(conf.padLeft))/digitsCount - conf.gap + conf.gap/digitsCount


  if (conf.padLeft < 0) {
    conf.padLeft = 0
  }

  let digitHeigth = roiCanvas.height

  conf.tickWidth = digitWidth/20
  conf.tickHeight = digitHeigth/7

  conf.tickWidth = Math.max(conf.tickWidth, 2)

  const drawPixel = (x, y, color) => {
    let roundedX = Math.round(x);
    let roundedY = Math.round(y);

    let index = 4 * (maskCanvas.width * roundedY + roundedX);

    maskImgData[index + 0] = color.r;
    maskImgData[index + 1] = color.g;
    maskImgData[index + 2] = color.b;
    maskImgData[index + 3] = color.a;
  }

  const getPixel = (x, y) => {
    let roundedX = Math.round(x);
    let roundedY = Math.round(y);
    let index = 4 * (roiCanvas.width * roundedY + roundedX);
    return Boolean(roiCanvasImgData[index + 0])
  }

  const drawSeg = (x, y, width, height) => {
    
    let segBuff = []
    let segIsOn = false
    let color = null

    // loop all pixels two times, 
    // first to get segment state
    // second to draw detected region
    for (let ocasion = 0; ocasion < 2; ocasion++) {
      for (let j = y; j < y+height-1; j++) {
        for (let i = x; i < x+width-1; i++) {
          let jSkew = j - i*Math.sin(-conf.vskew/180*Math.PI)
          let iSkew = i - j*Math.sin(-conf.skew/180*Math.PI)
          if (ocasion === 1) {
            drawPixel(iSkew, jSkew, color)
          } else {
            segBuff.push(getPixel(iSkew, jSkew))
          }
        }
      }

      // return early on second loop, when
      // segment is detected
      if (ocasion === 1) return segIsOn ? 1 : 0
      
      // detect segment
      let segBuffOnCount = 0
      for (let i = segBuff.length - 1; i >= 0; i--) {
        if (segBuff[i]) segBuffOnCount++
      }
      segIsOn = (segBuffOnCount/segBuff.length) < (1-conf.detectThresh)
      
      if (segIsOn) {
        color = {r: 0, g: 255, b: 0, a: 90}
      } else {
        color = {r: 250, g: 0, b: 0, a: 90}
      }
    }
    return 0
  }

  swapBuffer = () => {
    maskCanvasCtx.putImageData(maskImg, 0, 0)
  }

  let output = conf.format.split('').reduce((a, digitTemplate) => {

    const verticalX = conf.padLeft + digitWidth/2 - conf.tickWidth/2 + digitWidth * a.i + conf.gap * a.i
    const verticalXPrev = conf.padLeft + digitWidth/2 - conf.tickWidth/2 + digitWidth * (a.i-1) + conf.gap * (a.i-1)
    
    const horizontalLeftX = conf.padLeft + digitWidth * a.i + conf.gap * a.i
    const horizontalLeftY = conf.padTop + digitHeigth/3 - conf.tickWidth/2
    
    const bottomY = conf.padTop + (digitHeigth - digitHeigth/3) - conf.tickWidth/2
    const horizontalRightX = conf.padLeft + digitWidth - conf.tickHeight + digitWidth * a.i + conf.gap * a.i

    const drawTopSegment = () => {
      return drawSeg(
        verticalX,
        conf.padTop,
        conf.tickWidth,
        conf.tickHeight,
      )
    }

    const drawCenterSegment = () => {
      return drawSeg(
        verticalX,
        conf.padTop + digitHeigth/2 - conf.tickHeight/2,
        conf.tickWidth,
        conf.tickHeight,
      )
    }

    const drawHorizontalCenterSegment = () => {
      return drawSeg(
        0,
        maskCanvas.height/3,
        maskCanvas.width+1,
        maskCanvas.height/3
      )
    }

    const drawBottomSegment = () => {
      return drawSeg(
        verticalX,
        conf.padTop + digitHeigth - conf.tickHeight,
        conf.tickWidth,
        conf.tickHeight,
      )
    }

    const drawLeftTopSegment = () => {
      return drawSeg(
        horizontalLeftX,
        horizontalLeftY,
        conf.tickHeight,
        conf.tickWidth,
      )
    }
    
    const drawLeftBottomSegment = () => {
      return drawSeg(
        horizontalLeftX,
        bottomY,
        conf.tickHeight,
        conf.tickWidth,
      )
    }

    const drawRightTopSegment = () => {
      return drawSeg(
        horizontalRightX,
        horizontalLeftY,
        conf.tickHeight,
        conf.tickWidth,
      )
    }

    const drawRightBottomSegment = () => {
      return drawSeg(
        horizontalRightX,
        bottomY,
        conf.tickHeight,
        conf.tickWidth,
      )
    }

    const drawDot = () => {
      let heigthFactor = 1
      return drawSeg(
        (verticalX+verticalXPrev)/2,
        conf.padTop + digitHeigth - conf.tickHeight/heigthFactor,
        conf.tickWidth,
        conf.tickHeight/heigthFactor,
      )
    }

    const digitsTemplateMap = Object({
      '8': () => {
        let res = [
          drawTopSegment(),
          drawLeftTopSegment(),
          drawRightTopSegment(),
          drawCenterSegment(),
          drawLeftBottomSegment(),
          drawRightBottomSegment(),
          drawBottomSegment()
        ];
        a.i = a.i+1
        
        if            (!res[0] && 
              !res[1] &&           !res[2] && 
                        res[3] && 
              !res[4] &&           !res[5] && 
                        !res[6]) return '-'

        if            (res[0] && 
              res[1] &&           res[2] && 
                        !res[3] && 
              res[4] &&           res[5] && 
                        res[6]) return '0'
        
        if            (!res[0] && 
              !res[1] &&           res[2] && 
                        !res[3] && 
              !res[4] &&           res[5] && 
                        !res[6]) return '1'

        if            (res[0] && 
              !res[1] &&           res[2] && 
                        res[3] && 
              res[4] &&           !res[5] && 
                        res[6]) return '2'

        if            (res[0] && 
              !res[1] &&           res[2] && 
                        res[3] && 
              !res[4] &&           res[5] && 
                        res[6]) return '3'

        if            (!res[0] && 
              res[1] &&           res[2] && 
                        res[3] && 
              !res[4] &&           res[5] && 
                        !res[6]) return '4'

        if            (res[0] && 
              res[1] &&           !res[2] && 
                        res[3] && 
              !res[4] &&           res[5] && 
                        res[6]) return '5'

        if            (res[0] && 
              res[1] &&           !res[2] && 
                        res[3] && 
              res[4] &&           res[5] && 
                        res[6]) return '6'

        if            (!res[0] && 
              res[1] &&           !res[2] && 
                        res[3] && 
              res[4] &&           res[5] && 
                        res[6]) return '6'
        
        if            (res[0] && 
              res[1] &&           res[2] && 
                        !res[3] && 
              !res[4] &&           res[5] && 
                        !res[6]) return '7'
        
        if            (res[0] && 
              !res[1] &&           res[2] && 
                        !res[3] && 
              !res[4] &&           res[5] && 
                        !res[6]) return '7'

        if            (res[0] && 
              res[1] &&           res[2] && 
                        res[3] && 
              res[4] &&           res[5] && 
                        res[6]) return '8'

        if            (res[0] && 
              res[1] &&           res[2] && 
                        res[3] && 
              !res[4] &&           res[5] && 
                        res[6]) return '9'

        if            (res[0] && 
              res[1] &&           res[2] && 
                        res[3] && 
              !res[4] &&           res[5] && 
                        !res[6]) return '9'
        
        if            (!res[0] && 
              !res[1] &&           !res[2] && 
                        !res[3] && 
              !res[4] &&           !res[5] && 
                        !res[6]) return ''

        if            (!res[0] && 
          res[1] &&           !res[2] && 
                    !res[3] && 
          res[4] &&           !res[5] && 
                    res[6]) return 'L'
                                    
                        
        return '?'
      },
      '.': () => {
        let res = drawDot()
        return res ? '.' : ''
      },
      '-': () => {
        let res = drawHorizontalCenterSegment()
        return res ? '-' : ' '
      }
    })
    
    a.res += digitsTemplateMap[digitTemplate]()

    return a
  }, {i: 0, res: ''} )
  
  // document.getElementById('output').innerText = output.res
  // console.log(output.res)

  // readBuf.shift()
  // readBuf.push(output.res)

  // let readBufSet = new Set(readBuf)

  // if (readBufSet.size === 1 && output.res.length) {
  //   let text = output.res + '\t\t'+new Date().toISOString().split('.')[0].replace('T',' ')+'\n'

  //   if (document.getElementById('startLog').checked) {
  //     let logOutputEl = document.getElementById('logOutput')
  //     logOutputEl.value += text
  //     logOutputEl.scrollTop = logOutputEl.scrollHeight;
  //   }    
  // }
  

  swapBuffer();

  let t2 = new Date();
  let dt = t2 - t1;

  // console.log('elapsed time = ' + dt + ' ms');
  return output.res

}
