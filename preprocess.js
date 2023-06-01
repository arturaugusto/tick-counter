// OTSU

var RED_INTENCITY_COEF = 0.2126;
var GREEN_INTENCITY_COEF = 0.7152;
var BLUE_INTENCITY_COEF = 0.0722;

function toGrayscale(imageData) {
    var data = imageData.data;
    
    for(var i = 0; i < data.length; i += 4) {
        var brightness = RED_INTENCITY_COEF * data[i] + GREEN_INTENCITY_COEF * data[i + 1] + BLUE_INTENCITY_COEF * data[i + 2];
        // red
        data[i] = brightness;
        // green
        data[i + 1] = brightness;
        // blue
        data[i + 2] = brightness;
    }
    
    // overwrite original image
    return imageData
};

function hist(imageData) {
    var data = imageData.data;
    var brightness;
    var brightness256Val;
    var histArray = Array.apply(null, new Array(256)).map(Number.prototype.valueOf,0);
    
    for (var i = 0; i < data.length; i += 4) {
        brightness = RED_INTENCITY_COEF * data[i] + GREEN_INTENCITY_COEF * data[i + 1] + BLUE_INTENCITY_COEF * data[i + 2];
        brightness256Val = Math.floor(brightness);
        histArray[brightness256Val] += 1;
    }
    
    return histArray;
};

function otsu(histogram, total) {
    var sum = 0;
    for (var i = 1; i < 256; ++i)
        sum += i * histogram[i];
    var sumB = 0;
    var wB = 0;
    var wF = 0;
    var mB;
    var mF;
    var max = 0.0;
    var between = 0.0;
    var threshold1 = 0.0;
    var threshold2 = 0.0;
    for (var i = 0; i < 256; ++i) {
        wB += histogram[i];
        if (wB == 0)
            continue;
        wF = total - wB;
        if (wF == 0)
            break;
        sumB += i * histogram[i];
        mB = sumB / wB;
        mF = (sum - sumB) / wF;
        between = wB * wF * Math.pow(mB - mF, 2);
        if ( between >= max ) {
            threshold1 = i;
            if ( between > max ) {
                threshold2 = i;
            }
            max = between;            
        }
    }
    return ( threshold1 + threshold2 ) / 2.0;
};

function applyGammaCorrection(imageData, gamma) {
  const gammaTable = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    gammaTable[i] = Math.pow(i / 255, gamma) * 255;
  }

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gammaTable[data[i]];
    data[i+1] = gammaTable[data[i+1]];
    data[i+2] = gammaTable[data[i+2]];
  }

  return imageData;
}

function binarize(threshold, imageData) {
    var data = imageData.data;
    var val;
    
    for(var i = 0; i < data.length; i += 4) {
        var brightness = RED_INTENCITY_COEF * data[i] + GREEN_INTENCITY_COEF * data[i + 1] + BLUE_INTENCITY_COEF * data[i + 2];
        
        // if (document.getElementById('invert').checked) {
        //   val = ((brightness > threshold) ? 0 : 255);
        // } else {
        //   val = ((brightness > threshold) ? 255 : 0);
        // }
        val = ((brightness > threshold) ? 0 : 255);

        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
    }
    
    // overwrite original image
    return imageData
}

