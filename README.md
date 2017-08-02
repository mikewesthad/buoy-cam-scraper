# Buoy Cam Scraper

A scraper to pull images from NBDC's network of buoys that have cam feeds ([link](http://www.ndbc.noaa.gov/buoycams.shtml)), lonely sensors that constantly monitor our seas, air and atmosphere. The cameras are updated on an hourly basis, so the script is set to scrape the feeds every hour from the time it starts running.

![](images/41424-optimize.gif)
![](images/51001-optimize.gif)

Usage:

```
$ npm install
$ npm run scrape-cams
```

The data folder contains some scraped meta information:

- buoycam-id-list.json - a list of buoy IDs that have cameras, hand collected on 8/1/17
- buoycam-info.json - meta information about the buoy cams including: name, lat-long location and a base 64 image of the buoy. Scraped on 8/1/17 using `npm run gather-station-info`.

Notes:

- Push version that uses Tesseract to parse the text out of the buoy cam images
- Update the algo to scrape every 30 minutes and only save if the image is unique (because nyquist sampling)