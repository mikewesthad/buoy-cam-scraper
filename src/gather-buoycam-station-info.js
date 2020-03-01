const rp = require("request-promise");
const fs = require("fs");
const path = require("path");

const outAllInfoPath = path.resolve(__dirname, "../data/buoycam-info.json");
const outIDPath = path.resolve(__dirname, "../data/buoycam-ids.json");

async function main() {
  try {
    const result = await rp("http://www.ndbc.noaa.gov/buoycams.php");
    const json = JSON.parse(result);

    // Dump the whole station listing, in case it's useful.
    fs.writeFileSync(outAllInfoPath, JSON.stringify(json, null, 2));

    // Filter out just the IDs.
    const ids = json.map(stationInfo => parseInt(stationInfo.id, 10));
    fs.writeFileSync(outIDPath, JSON.stringify(ids, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
