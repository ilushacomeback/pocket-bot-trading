const Chrome = require('selenium-webdriver/chrome');
const options = new Chrome.Options();
const { Builder, Browser, } = require('selenium-webdriver');

const args = [
  '--ignore-ssl-errors',
  '--ignore-certificate-errors',
  '--ignore-certificate-errors-spki-list',
];

options.setChromeBinaryPath('/tmp').addArguments(args);

const driver = new Builder()
  .forBrowser(Browser.CHROME)
  .setChromeOptions(options)
  .setCapability('goog:loggingPrefs', {'performance': 'ALL'})
  .build();

module.exports = driver;
