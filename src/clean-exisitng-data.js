const fs = require("fs");
const path = require("path");
const jimp = require("jimp");
const TextRecognizer = require("./text-recognizer");
const imageUtils = require("./image-utils");
const outputDirectory = path.join(__dirname, "..", "scraped-images");
const dataDirectory = path.join(__dirname, "..", "data");
const parseFilename = require("./utils").parseFilename;

async function removeDuplicates() {
    const allImages = {};
    const filenames = fs.readdirSync(outputDirectory);

    // Parse all the filenames
    for (const filename of filenames) {
        const {timestamp, stationId} = parseFilename(filename);
        if (allImages[stationId] === undefined) allImages[stationId] = [];
        allImages[stationId].push({timestamp, stationId, filename});
    }

    // Loop over each stations data and remove dups
    for (const [stationId, images] of Object.entries(allImages)) {
        // Sort by timestamp
        images.sort((a, b) => a.timestamp - b.timestamp);
        // Progressively remove duplicates
        let lastImage = await jimp.read(path.join(outputDirectory, images[0].filename));
        for (let i = 1; i < images.length; i++) {
            let image = await jimp.read(path.join(outputDirectory, images[i].filename));
            const areSame = imageUtils.areExactlyEqual(lastImage, image);
            if (areSame) {
                console.log(`${images[i].filename}: Duplicate detected. Deleting...`);
                fs.unlink(path.join(outputDirectory, images[i].filename), err => console.log);
            } else {
                lastImage = image;
            }
        }
    }
}

async function removeEmptyImages() {
    const filenames = fs.readdirSync(outputDirectory);
    let data = [];
    for (const filename of filenames) {
        const img = await jimp.read(path.join(outputDirectory, filename));
        // Check if the image is a white screen - indicates no recent buoy data. If so, delete.
        const whitePercent = imageUtils.getPercentWhite(img);
        if (whitePercent > 0.95) {
            console.log(`${filename}: No buoy data. Deleting...`);
            fs.unlink(path.join(outputDirectory, filename), err => console.log);
        } 
    }
}

async function regenerateData() {
    const textRecognizer = new TextRecognizer();
    const filenames = fs.readdirSync(outputDirectory);
    let data = [];

    for (const filename of filenames) {
        const img = await jimp.read(path.join(outputDirectory, filename));

        // Read the bottom bar of text from the image
        const bar = img.clone().crop(0, img.bitmap.height - 30, img.bitmap.width, 30);
        const textData = await textRecognizer.recognizeText(bar.bitmap);
        const text = textData.text.trim();

        const {timestamp, stationId} = parseFilename(filename);
        data.push({filename, text, timestamp, stationId});
    }

    fs.writeFileSync(path.join(dataDirectory, "scraped-data.json"), JSON.stringify(data, null, 2));
    textRecognizer.terminate();
}

removeDuplicates()
    .then(() => console.log("Duplicates removed!"))
    .catch(console.error);

removeEmptyImages()
    .then(() => console.log("Empty (white) images removed!"))
    .catch(console.error);

regenerateData()
    .then(() => console.log("Data regenerated!"))
    .catch(console.error);
