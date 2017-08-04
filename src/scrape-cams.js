const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const isThere = require("is-there");
const jimp = require("jimp");
const parseFilename = require("./utils").parseFilename;
const imageUtils = require("./image-utils");
const stations = require("../data/buoycam-id-list");
const TextRecognizer = require("./text-recognizer");

const endpoint = "http://www.ndbc.noaa.gov/buoycam.php";
const outputDirectory = path.join(__dirname, "..", "scraped-images");
let lastImages = {};
const textRecognizer = new TextRecognizer();

// Create folder for output, if none exists
if (!isThere(outputDirectory)) fs.mkdirSync(outputDirectory);

// Init
getLatestImages()
    .then((latestImages) => {
        lastImages = latestImages;

        // First run
        scrapeStations();

        // Schedule to run every hour
        const currentMinutes = new Date().getMinutes();
        const job = schedule.scheduleJob(`${currentMinutes} * * * *`, scrapeStations);
    })
    .catch(console.log);

async function parseCaption(image) {
    // Read the bottom bar of text from the image
    const bar = image.clone().crop(0, image.bitmap.height - 30, image.bitmap.width, 30);
    const textData = await textRecognizer.recognizeText(bar.bitmap);
    return textData.text.trim();
}

async function getLatestImages() {
    const latestImages = {};
    const filenames = fs.readdirSync(outputDirectory);
    // Loop over the files, finding the most recent timestamp for each station
    for (const filename of filenames) {
        const {timestamp, stationId} = parseFilename(filename);
        if (!latestImages.stationId || (timestamp > latestImages[stationId].timestamp)) {
            latestImages[stationId] = {
                imagePath: path.join(outputDirectory, filename),
                timestamp
            };
        }
    }
    // Load the last image for each station into memory
    for (const [stationId, lastImage] of Object.entries(latestImages)) {
        const image = await jimp.read(lastImage.imagePath);
        lastImage.caption = await parseCaption(image);
    }
    return latestImages;
}

async function scrapeStations() {
    const timestamp = Date.now();
    console.log(`Scraping at ${timestamp}`);

    // Attempt to optimize for raspberry pi's limited resources... run this loop in sequence
    for (const stationId of stations) {
        const image = await jimp.read(`${endpoint}?station=${stationId}`);

        // Check if the image is a white screen - indicates no recent buoy data. If so,
        // skip it.
        const whitePercent = imageUtils.getPercentWhite(image);
        if (whitePercent > 0.95) {
            console.log(`\t${stationId}: No buoy data. Skipping...`);
            return;
        }

        // Check caption against last caption - this is more reliable than image diff check!
        const caption = await parseCaption(image);
        if (lastImages[stationId] && lastImages[stationId].caption === caption) {
            console.log(`\t${stationId}: Caption matches last caption. Skipping...`);
            return;
        }

        // // Check image against last image saved - this may end up being useless
        // if (lastImages[stationId]) {
        //     const lastImage = lastImages[stationId].image;
        //     const diff = jimp.diff(lastImage, image, 0);
        //     if (diff.percent === 0) {
        //         console.log(`\t${stationId}: Image matches last scraped. Skipping...`);
        //         return;
        //     } 
        // }
        
        // All checks passed, save that image
        console.log(`\t${stationId}: New image. Saving...`);
        const imagePath = path.join(outputDirectory, `${timestamp}-${stationId}.jpg`);
        image
            .quality(75) // Match quality to what is returned from the server
            .write(imagePath);
        lastImages[stationId] = {imagePath, timestamp, caption};
    }
}