# Buoy Cam Scraper

A scraper to pull images from NBDC's network of buoys that have cam feeds ([link](http://www.ndbc.noaa.gov/buoycams.shtml)), lonely sensors that constantly monitor our seas, air and atmosphere. The cameras are updated on an hourly basis, so the script is set to scrape the feeds every hour from the time it starts running.

![](images/41424-optimize.gif)
![](images/51001-optimize.gif)

## Installation

Make sure you have [node](https://nodejs.org/en/) installed. Download the files, open a terminal in the buoy-cam-scraper folder and run:

```
npm install
```

## Usage

Open up a terminal in buoy-cam-scraper/ and run:

```
npm run start
```

This will start reading and capturing new images from the buoy cameras and saving them to `scraped-images/`. The script will re-scrape every 30 minutes. Each file is named in the following format:

```
scraped-images/[buoy ID]/[UTC ms when photo was taken by buoy]-[UTC ms when photo was downloaded]-[buoy ID].jpg
```

The UTC time when the photo was taken by the buoy is parsed via OCR using tesseract.js. Images that have no data (i.e. all white images) and images that have already been downloaded will be skipped.

## Performance

The code is written to be run on a Raspberry Pi. On a Raspberry Pi 3, it takes about ~2 minutes to scrape images from all the buoy cams. The bulk of the time is spent on OCR.

## Info

See the info about the NBDC web APIs [here](https://www.ndbc.noaa.gov/docs/ndbc_web_data_guide.pdf).

## Data

The data folder contains some scraped meta information in buoycam-info.json - meta information about the buoy cams including: name, GPS location, image width, image height.