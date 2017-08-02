const request = require("request");
const fs = require("fs");
const schedule = require("node-schedule");

const endpoint = "http://www.ndbc.noaa.gov/buoycam.php?station=";
const stations = require("../data/buoycam-id-list");

function scrapStations() {
    const time = Date.now();
    for (const station of stations) {
        request
            .get(`${endpoint}${station}`)
            .on("error", (err) => console.log(err))
            .pipe(fs.createWriteStream(`../scraped-images/${time}-${station}.jpg`));
    }
}

fs.mkdirSync("../scraped-images");
const job = schedule.scheduleJob("18 * * * *", scrapStations);
