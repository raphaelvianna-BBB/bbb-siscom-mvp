const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Configures the cache location for Puppeteer Chromium downloads
    // to be within the project folder, so Render doesn't wipe it
    // when moving from build step to runtime!
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
