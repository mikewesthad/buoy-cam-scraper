const Tesseract = require("Tesseract.js");

module.exports = class EnglishTesseract {
    constructor() {
        // Language needs to be in the same directory as the script for some reason
        this.tesseract = Tesseract.create({langPath: "./eng.traineddata"});
    }
    recognizeText(imageLike) {
        return new Promise((resolve, reject) => {
            this.tesseract
                .recognize(imageLike)
                .then(data => resolve(data))
                .catch(err => reject(err));
        });
    }
    /**
     * You must explicitly terminate the recognizer when you are done with it.
     */
    terminate() {
        this.tesseract.terminate();
    }
}