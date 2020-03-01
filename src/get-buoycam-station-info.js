const fs = require("fs");
const path = require("path");
const axios = require("axios");
const isThere = require("is-there");
const { buoycamInfoEndpoint } = require("./endpoints");

const infoPath = path.resolve(__dirname, "../data/buoycam-info.json");
let hasValidData = false;
let stations = [];
let stationInfoMap = {};

// If the last result has been cached, load that station info up.
if (isThere(infoPath)) {
  hasValidData = true;
  const string = fs.readFileSync(infoPath);
  stationInfoMap = JSON.parse(string);
  stations = Object.keys(stationInfoMap);
}

async function getStationInfo(shouldHitEndpoint = true) {
  if (shouldHitEndpoint || !hasValidData) refreshData();
  return stationInfoMap;
}

async function getStationIds(shouldHitEndpoint = true) {
  if (shouldHitEndpoint || !hasValidData) refreshData();
  return stations;
}

async function refreshData() {
  try {
    console.log("Refreshing station info from NBDC API.");

    const response = await axios.get(buoycamInfoEndpoint);
    const { data, status } = response;

    if (status !== 200) {
      throw new Error("Could not get buoycam data from endpoint.");
    }

    // Create a fresh map from station ID to info about the station and an array of IDs.
    stationInfoMap = {};
    data.forEach(({ id, ...info }) => {
      stationInfoMap[id] = info;
    });
    ids = Object.keys(stationInfoMap);
    hasValidData = true;

    // Cache the result for future reference if the API goes down.
    fs.writeFileSync(infoPath, JSON.stringify(stationInfoMap, null, 2));
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  getStationInfo,
  getStationIds,
  refreshData
};
