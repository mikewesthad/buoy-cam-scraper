/**
 * Old script - committing so it can be reused in the future if needed.
 */

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const isThere = require("is-there");
const { promisify } = require("util");
const writeFile = promisify(fs.writeFile);
const { parseFilename } = require("./utilities/utils");
const moment = require("moment");

const imageDirectory = "../scraped-images";
const gifDirectory = "../gifs";
const startDate = moment.utc("2017-09-20");
const endDate = moment.utc();
const outputPrefix = `${startDate.format("MMDD")}-${endDate.format("MMDD")}`;

if (!isThere(gifDirectory)) fs.mkdirSync(gifDirectory);

const allImagesInfo = {};
// Read all the filenames
const imageFilenames = fs.readdirSync(imageDirectory);
for (const filename of imageFilenames) {
  const { utcFromBuoy, utcSaved, stationId } = parseFilename(filename);
  if (allImagesInfo[stationId] === undefined) allImagesInfo[stationId] = [];
  allImagesInfo[stationId].push({ utcFromBuoy, utcSaved, stationId, filename });
}
// Sort in ascending order of timestamp
for (const [stationId, stationImages] of Object.entries(allImagesInfo)) {
  allImagesInfo[stationId] = stationImages
    .filter(elem => moment.utc(elem.utcFromBuoy).isBetween(startDate, endDate))
    .sort((a, b) => a.utcFromBuoy - b.utcFromBuoy);
}

const selectedStations = [42059, 42058, 42057, 42065, 41047, 41046, 41043, 41044];
for (const [stationId, stationImages] of Object.entries(allImagesInfo)) {
  // if (!selectedStations.includes(parseInt(stationId))) continue;
  const outPath = path.join(gifDirectory, `${outputPrefix}-${stationId}`);
  gifFromStations(stationId, stationImages.length, 50, outPath);
}

// Delay is N/100 seconds
function gifFromStations(stationId, count = 20, delay = 20, outPath = "out") {
  const stationImages = allImagesInfo[stationId];
  const selected = stationImages.slice(0, count);
  if (selected.length === 0)
    return console.log(`${stationId} - no images found within date range.`);
  const stations = selected.map(info => path.join(imageDirectory, info.filename)).join("\n");
  const command = `magick -delay ${delay} -loop 0 @${outPath}.txt ${outPath}.gif`;
  writeFile(`${outPath}.txt`, stations)
    .then(() => executeCommand(command))
    .then(stdout => {
      if (stdout) console.log(stdout);
      fs.unlink(`${outPath}.txt`, () => console.log(`GIF saved: ${outPath}.gif`));

      const command = `ffmpeg -i ${outPath}.gif -c:v libx264 -preset veryslow -crf 20 -r 30 ${outPath}.mp4`;
      return executeCommand(command);
    })
    .then(() => {
      console.log(`MP4 saved: ${outPath}.mp4`);
    })
    .catch(console.error);
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else if (stderr) reject(stderr);
      else resolve(stdout);
    });
  });
}
