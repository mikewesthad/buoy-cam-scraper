const Tesseract = require("Tesseract.js");
const fs = require("fs");

const path = "./scrapped/1501433319399-41010.jpg";
const img = fs.readFileSync(path);

Tesseract
    .create({langPath: "./eng.traineddata"})
    .recognize(img)
    .then(data => {
        console.log('then\n', data.text)
    })
    .catch(err => {
      console.log('catch\n', err);
    })
    .finally(e => {
      console.log('finally\n');
      process.exit();
    });