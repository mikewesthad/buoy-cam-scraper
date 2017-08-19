const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const isThere = require("is-there");
const jimp = require("jimp");
const {parseFilename, parseBuoyDate} = require("./utilities/utils");
const {getPercentWhite, getBuoyCaptionImage} = require("./utilities/image-utils");
const stations = require("../data/buoycam-id-list");
const TextRecognizer = require("./ocr/text-recognizer");
const moment = require("moment");

const endpoint = "http://www.ndbc.noaa.gov/buoycam.php";
const outputDirectory = path.join(__dirname, "..", "scraped-images");
const textRecognizer = new TextRecognizer();

// Create folder for output, if none exists
if (!isThere(outputDirectory)) fs.mkdirSync(outputDirectory);

// Loop over the files, finding the most recent timestamp for each station
const lastTimestamps = {};
const filenames = fs.readdirSync(outputDirectory);
for (const filename of filenames) {
    const {utcFromBuoy, utcSaved, stationId} = parseFilename(filename);
    if (lastTimestamps[stationId] === undefined || (utcFromBuoy > lastTimestamps[stationId])) {
        lastTimestamps[stationId] = utcFromBuoy;
    }
}

// First run
scrapeStations().catch(console.error);

// Schedule to run every hour
const currentMinutes = new Date().getMinutes();
const job = schedule.scheduleJob(`${currentMinutes} * * * *`, scrapeStations);

async function scrapeStations() {
    const startTime = Date.now();
    console.log(`Scraping at ${moment().toString()}`);

    // Attempt to optimize for raspberry pi's limited resources... run this loop in sequence
    for (const stationId of stations) {
        try {
            const utcSaved = Date.now();
            const image = await jimp.read(`${endpoint}?station=${stationId}`);
    
            // Check if the image is a white screen - indicates no recent buoy data. If so,
            // skip it.
            const whitePercent = getPercentWhite(image);
            if (whitePercent > 0.95) {
                console.log(`\t${stationId}: No buoy data. Skipping...`);
                continue;
            }
    
            // Check caption against last caption - this is more reliable than image diff check!
            const captionImage = getBuoyCaptionImage(image);
            const caption = await textRecognizer.recognizeText(captionImage.bitmap);
            const utcFromBuoy = parseBuoyDate(caption.text.trim());
            if (lastTimestamps[stationId] && lastTimestamps[stationId] === utcFromBuoy) {
                console.log(`\t${stationId}: Caption matches last caption. Skipping...`);
                continue;
            }
            
            // All checks passed, save that image
            console.log(`\t${stationId}: New image. Saving...`);
            const imagePath = path.join(outputDirectory, `${utcFromBuoy}-${utcSaved}-${stationId}.jpg`);
            image
                .quality(75) // Match quality to what is returned from the server
                .write(imagePath);
            lastTimestamps[stationId] = utcFromBuoy;
        } catch (err) {
            console.error(err);
        }
    }

    console.log(`Scraping completed in: ${(Date.now() - startTime) / 1000 / 60} min.\n\n`);
}