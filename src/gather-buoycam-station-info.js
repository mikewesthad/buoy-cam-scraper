const fs = require("fs");
const path = require("path");
const axios = require("axios");

const outAllInfoPath = path.resolve(__dirname, "../data/buoycam-info.json");
const outIDPath = path.resolve(__dirname, "../data/buoycam-ids.json");

async function main() {
  try {
    const response = await axios.get("http://www.ndbc.noaa.gov/buoycams.php");
    const { data, status } = response;

    if (status !== 200) {
      throw new Error("Could not get buoycam data from endpoint.");
    }

    // Dump the whole station listing, in case it's useful.
    const stationInfoMap = {};
    data.forEach(({ id, ...info }) => {
      stationInfoMap[id] = info;
    });
    fs.writeFileSync(outAllInfoPath, JSON.stringify(stationInfoMap, null, 2));

    // Filter out just the IDs.
    const ids = data.map(stationInfo => parseInt(stationInfo.id, 10));
    fs.writeFileSync(outIDPath, JSON.stringify(ids, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
