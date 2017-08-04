const fs = require("fs");
const path = require("path");
const jimp = require("jimp");
const moment = require("moment");
const TextRecognizer = require("./text-recognizer");
const imageUtils = require("./image-utils");
const outputDirectory = path.join(__dirname, "..", "scraped-images");
const dataDirectory = path.join(__dirname, "..", "data");
const parseFilename = require("./utils").parseFilename;

clean()
    .then(() => console.log("Done!"))
    .catch(console.log);

async function clean() {
    console.log("Removing empty (white) images!");
    await removeEmptyImages();
    console.log("Removing duplicates!");
    await removeDuplicatesViaTimestamp();
}

/**
 * Removes duplicate images, as determined by UTC timestamp parsed from the image. This turns out
 * to be more accurate than comparing images via pixels. 
 */
async function removeDuplicatesViaTimestamp() {
    const allImages = {};
    const filenames = fs.readdirSync(outputDirectory);

    // Parse all the filenames
    for (const filename of filenames) {
        const {utcFromBuoy, utcSaved, stationId} = parseFilename(filename);
        if (allImages[stationId] === undefined) allImages[stationId] = [];
        allImages[stationId].push({utcFromBuoy, utcSaved, stationId, filename});
    }

    // Loop over each stations data and remove dups
    for (const [stationId, images] of Object.entries(allImages)) {
        // Sort by timestamp
        images.sort((a, b) => a.utcFromBuoy - b.utcFromBuoy);
        // Progressively remove duplicates
        let a = 0;
        let lastImage = await jimp.read(path.join(outputDirectory, images[a].filename));
        for (let b = 1; b < images.length; b++) {
            let image = await jimp.read(path.join(outputDirectory, images[b].filename));
            const areSameUtc = images[a].utcFromBuoy === images[b].utcFromBuoy;
            if (areSameUtc) {
                console.log(`${images[b].filename}: Duplicate detected. Deleting...`);
                fs.unlink(path.join(outputDirectory, images[b].filename), err => console.log);
            } else {
                a = b;
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



// --- Unused or one-off code ---
// Saved for easy access in case it is needed again

/**
 * Take old file format msTimestamp-stationId.jpg and update it to the new format
 *  {msTimestamp, parsed from OCR of image}-{msTimestamp of GET request}-{stationId}.jpg 
 */
async function renameFiles() {
    const textRecognizer = new TextRecognizer();
    const filenames = fs.readdirSync(outputDirectory);
    for (const filename of filenames) {
        const filenameResult = /(\d+)-(\d+).(\w+)/.exec(filename);
        const timestamp = parseInt(filenameResult[1], 10);
        const stationId = parseInt(filenameResult[2], 10);

        const img = await jimp.read(path.join(outputDirectory, filename));

        // Read the bottom bar of text from the image
        const bar = img.clone().crop(0, img.bitmap.height - 30, img.bitmap.width, 30);
        const textData = await textRecognizer.recognizeText(bar.bitmap);
        const text = textData.text.trim();

        const result = /(\d+)\/(\d+)\/(\d+)\s*(\d+)\s*UTC/.exec(text) // 07/30/2017 1610 UTC
        if (result && result.length >= 5) {
            const matches = result.slice(1);
            const [month, day, year] = matches.map((s) => parseInt(s, 10));
            const time = matches[3];
            const hours = parseInt(time.slice(0, 2)); // First 2 digits
            const minutes = parseInt(time.slice(-2), 10); // Last 2 digits
            // Convert to date object, which requires 4 digit year & a month starting at 0
            const utcDate = moment.utc([year, month - 1, day, hours, minutes]);
            const utcMs = utcDate.valueOf();
            const newFilename = `${utcMs}-${timestamp}-${stationId}.jpg`;
            const oldPath = path.resolve(__dirname, outputDirectory, filename);
            const newPath = path.resolve(__dirname, outputDirectory, newFilename);
            fs.renameSync(oldPath, newPath);
            console.log(`${oldPath} -> ${newPath}`);
        }
    }
    textRecognizer.terminate();
}

async function removeDuplicatesByPixels() {
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

async function analyze() {
    const textRecognizer = new TextRecognizer();
    const filenames = fs.readdirSync(outputDirectory);
    let data = {};

    let i = 0;
    for (const filename of filenames) {
        const buoyData = {};

        const {utcFromBuoy, utcSaved, stationId} = parseFilename(filename);
        buoyData.utcOfImage = utcFromBuoy;
        buoyData.utcOfSave = utcSaved;
        buoyData.dateOfImage = moment.utc(utcFromBuoy).toString();
        buoyData.dateOfSave = moment.utc(utcSaved).toString();
        buoyData.minuteDateDiff = moment.utc(utcSaved).diff(moment.utc(utcFromBuoy), "minutes");
        buoyData.filename = filename;

        const img = await jimp.read(path.join(outputDirectory, filename));

        // Read the bottom bar of text from the image
        const bar = img.clone().crop(0, img.bitmap.height - 30, img.bitmap.width, 30);
        const textData = await textRecognizer.recognizeText(bar.bitmap);
        const text = textData.text.trim();
        buoyData.text = text;

        if (!data[stationId]) data[stationId] = [];
        data[stationId].push(buoyData);

        i++;
        if (i % 25 === 0) console.log(`Progress: ${(i / filenames.length).toFixed(3)}%`);
    }
    
    fs.writeFileSync(path.join(dataDirectory, "scraped-data.json"), JSON.stringify(data, null, 2));
    textRecognizer.terminate();
}
