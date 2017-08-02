const request = require("request");
const fs = require("fs");
const schedule = require("node-schedule");
const isThere = require("is-there");

const endpoint = "http://www.ndbc.noaa.gov/buoycam.php?station=";
const stations = require("../data/buoycam-id-list");

function scrapeStations() {
    const time = Date.now();
    for (const station of stations) {
        request
            .get(`${endpoint}${station}`)
            .on("error", (err) => console.log(err))
            .pipe(fs.createWriteStream(`../scraped-images/${time}-${station}.jpg`));
    }
}

// First run
if (!isThere("../scraped-images")) fs.mkdirSync("../scraped-images");
scrapeStations();

// Schedule to run every hour
const currentMinutes = new Date().getMinutes();
const job = schedule.scheduleJob(`${currentMinutes} * * * *`, scrapeStations);
