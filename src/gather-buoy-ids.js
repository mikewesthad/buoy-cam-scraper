const rp = require("request-promise");
const fs = require("fs");
const path = require("path");

const outPath = path.resolve(__dirname, "../data/buoycam-id-list.json");

rp("http://www.ndbc.noaa.gov/buoycams.php")
  .then(result => JSON.parse(result))
  .then(json => json.map(data => parseInt(data.id, 10)))
  .then(data => JSON.stringify(data, null, 2))
  .then(jsonString => fs.writeFileSync(outPath, jsonString))
  .catch(err => console.log(err));
