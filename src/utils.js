exports.parseFilename = function parseFilename(filename) {
    const result = /(\d+)-(\d+).(\w+)/.exec(filename);
    const timestamp = parseInt(result[1], 10);
    const stationId = parseInt(result[2], 10);
    const extension = result[3];
    return {timestamp, stationId, extension};
}