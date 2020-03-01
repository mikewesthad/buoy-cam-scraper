const fs = require("fs");
const path = require("path");
const isThere = require("is-there");
const jimp = require("jimp");
const moment = require("moment");
const { parseFilename, parseBuoyDate } = require("./utilities/utils");
const { getPercentWhite, getBuoyCaptionImage } = require("./utilities/image-utils");
const TextRecognizer = require("./ocr/text-recognizer");
const { buoycamEndpoint } = require("./endpoints");
const { getStationIds } = require("./get-buoycam-station-info");

const outputDirectory = path.join(__dirname, "..", "scraped-images");
const textRecognizer = new TextRecognizer();

// Create folder for output, if none exists.
if (!isThere(outputDirectory)) fs.mkdirSync(outputDirectory);

// Loop over the files, finding the most recent timestamp for each station.
const lastTimestamps = {};
const filenames = fs.readdirSync(outputDirectory);
filenames.forEach(filename => {
  const stationId = parseInt(filename);
  const images = fs.readdirSync(path.join(outputDirectory, filename));
  images.forEach(imageName => {
    const { utcFromBuoy } = parseFilename(imageName);
    if (lastTimestamps[stationId] === undefined || utcFromBuoy > lastTimestamps[stationId]) {
      lastTimestamps[stationId] = utcFromBuoy;
    }
  });
});

async function scrapeCams() {
  const startTime = Date.now();
  console.log(`Scraping at ${moment().toString()}`);

  const ids = await getStationIds();

  // Attempt to optimize for raspberry pi's limited resources... run this loop in sequence.
  for (const stationId of ids) {
    try {
      const utcSaved = Date.now();
      const image = await jimp.read(`${buoycamEndpoint}?station=${stationId}`);

      // Check if the image is a white screen - indicates no recent buoy data. If so, skip it.
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

      // All checks passed, save that image.
      console.log(`\t${stationId}: New image. Saving...`);
      const imagePath = path.join(
        outputDirectory,
        stationId,
        `${utcFromBuoy}-${utcSaved}-${stationId}.jpg`
      );
      image
        .quality(75) // Match quality to what is returned from the server.
        .write(imagePath);
      lastTimestamps[stationId] = utcFromBuoy;
    } catch (err) {
      console.error(err);
    }
  }

  console.log(`Scraping completed in: ${(Date.now() - startTime) / 1000 / 60} min.\n\n`);
}

module.exports = scrapeCams;
