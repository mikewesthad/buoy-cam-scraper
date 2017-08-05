const moment = require("moment");

exports.parseFilename = function parseFilename(filename) {
    const result = /(\d+)-(\d+)-(\d+).(\w+)/.exec(filename);
    const utcFromBuoy = parseInt(result[1], 10);
    const utcSaved = parseInt(result[2], 10);
    const stationId = parseInt(result[3], 10);
    const extension = result[4];
    return {utcFromBuoy, utcSaved, stationId, extension};
}

/**
 * Parses text in the form "07/30/2017 0110 UTC" into UTC milliseconds
 */
exports.parseBuoyDate = function parseBuoyDate(text) {
    const result = /(\d+)\/(\d+)\/(\d+)\s*(\d+)\s*UTC/.exec(text) 
    if (result && result.length >= 5) {
        const matches = result.slice(1);
        const [month, day, year] = matches.map((s) => parseInt(s, 10));
        const time = matches[3];
        const hours = parseInt(time.slice(0, 2)); // First 2 digits
        const minutes = parseInt(time.slice(-2), 10); // Last 2 digits
        // Convert to date object, which requires 4 digit year & a month starting at 0
        const utcDate = moment.utc([year, month - 1, day, hours, minutes]);
        const utcMs = utcDate.valueOf();
        return utcMs;
    }
    return null;
}