exports.getPercentWhite = function getPercentWhite(img, threshold = 255) {
    const bmp = img.bitmap;
    let whiteCount = 0;
    for (let i = 0; i < bmp.data.length; i += 4) {
        const r = bmp.data[i];
        const g = bmp.data[i + 1];
        const b = bmp.data[i + 2];
        if (r >= threshold && b >= threshold && g >= threshold) whiteCount++;
    }
    return whiteCount / (bmp.width * bmp.height);
};

exports.areExactlyEqual = function areExactlyEqual(img1, img2) {
    const bmp1 = img1.bitmap;
    const bmp2 = img2.bitmap;
    if (bmp1.width !== bmp2.width || bmp1.height !== bmp2.height) return false;
    for (let i = 0; i < bmp1.data.length; i++) {
        if (bmp1.data[i] !== bmp2.data[i]) return false;
    }
    return true;
}

/**
 * The caption in the buoy images is reliably placed in the (almost) center at the bottom of the
 * buoy images. 
 */
exports.getBuoyCaptionImage = function getBuoyCaptionImage(image) {
    const cx = image.bitmap.width / 2;
    const w = 700;
    const h = 30;
    const croppedImage = image.clone().crop(cx - (w / 2), image.bitmap.height - h, w, h);
    return croppedImage;
}