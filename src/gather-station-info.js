const rp = require("request-promise");
const cheerio = require("cheerio");
const changeCase = require("change-case");
const fs = require("fs");
const base64 = require("node-base64-image");
const jimp = require("jimp");
const { URL } = require("url");
const { promisify } = require("util");
const encode = promisify(base64.encode);
const path = require("path");

const stationIds = require("../data/buoycam-id-list");

async function getStationData() {
  const allStationData = {};

  for (const stationId of stationIds) {
    const endpoint = `http://www.ndbc.noaa.gov/station_page.php?station=${stationId}`;

    // Await cheerio-parsed HTML
    const $ = await rp({
      uri: endpoint,
      transform: body => cheerio.load(body)
    });

    // Start building the data
    const stationData = {
      stationInfoUrl: endpoint,
      buoyCamUrl: `http://www.ndbc.noaa.gov/buoycam.php?station=${stationId}`
    };

    // Parse the header to get a name and description. Check for these possibilities:
    //  Station 41009 (LLNR 840) - CANAVERAL 20 NM East of Cape Canaveral, FL
    //  Station 46050 (LLNR 641) - STONEWALL BANK - 20NM West of Newport, OR
    //  Station 41013 (LLNR 815)  - Frying Pan Shoals, NC
    const header = $("#contentarea > h1").text();
    const trimmedParts = header.split("-").map(s => s.trim());
    const partsMatch = /Station\s*.*\s+-\s*([A-Z ]+)\s+-?\s*(.+)/.exec(header);
    if (trimmedParts.length >= 3) {
      // "Proper" dash separator
      stationData.stationName = changeCase.titleCase(trimmedParts[1]);
      stationData.locationDescription = trimmedParts[2];
    } else if (partsMatch && partsMatch.length >= 3) {
      // Missing a dash, but it has the UPPERCASE name format
      stationData.stationName = changeCase.titleCase(partsMatch[1]).trim();
      stationData.locationDescription = partsMatch[2].trim();
    } else if (trimmedParts.length >= 2 && trimmedParts[1].includes(",")) {
      // Missing the UPPERCASE name section, but has a comma. This means there is likely an
      // address without a shorthand name, so just chop the location description to create a
      // name.
      stationData.stationName = changeCase.titleCase(trimmedParts[1].split(",")[0]).trim();
      stationData.locationDescription = trimmedParts[1].trim();
    }

    // Parse the meta info to extract the lat and long coordinates
    const info = $("#stn_metadata > p:first-child").text();
    const ddMatch = /([0-9.]+) N ([0-9.]+)/g.exec(info);
    const dmsMatch = /(\d+)°(\d+)'(\d+)" N (\d+)°(\d+)'(\d+)" W/.exec(info);
    const latLong = {};
    if (ddMatch && ddMatch.length >= 2) {
      latLong.dd = { north: ddMatch[1], west: ddMatch[2] };
    }
    if (dmsMatch && dmsMatch.length >= 7) {
      const [, nDeg, nMin, nSec, wDeg, wMin, wSec] = dmsMatch;
      latLong.dms = {
        north: { degrees: nDeg, minutes: nMin, seconds: nSec },
        west: { degrees: wDeg, minutes: wMin, seconds: wSec }
      };
    }
    stationData.latLong = latLong;

    // Get a picture of the buoy as a base 64 encoded string
    const imgSrc = $("#stn_img_map > a > img").attr("src");
    const resolvedUrl = new URL(imgSrc, endpoint); // img src is relative to the current page
    const base64Img = await encode(resolvedUrl.href, { string: true, local: false });
    stationData.base64Image = base64Img;

    // Store the complete station data
    allStationData[stationId] = stationData;
  }
  return allStationData;
}

const outPath = path.resolve(__dirname, "../data/buoycam-info.json");

getStationData()
  .then(data => JSON.stringify(data, null, 2))
  .then(jsonString => fs.writeFileSync(outPath, jsonString))
  .catch(err => console.log(err));
