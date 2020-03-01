const CronJob = require("cron").CronJob;
const scrapeCams = require("./scrape-cams");

// Schedule every 30 minutes. The syntax is in the form:
//  Seconds, Minutes, Hours, Day of Month, Months, Day of Week
const job = new CronJob("0 */30 * * * *", scrapeCams);
job.start();
scrapeCams();
