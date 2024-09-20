const Chrome = require('selenium-webdriver/chrome');
const options = new Chrome.Options();
const { Builder, Browser } = require('selenium-webdriver');

const args = [
  '--ignore-ssl-errors',
  '--ignore-certificate-errors',
  '--ignore-certificate-errors-spki-list',
  '--disable-blink-features=AutomationControlled',
  'user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
];

options
  .setChromeBinaryPath(
    '/home/rudenkoilya/.cache/typescript/5.5/node_modules/@types/selenium-webdriver/chrome'
  )
  .addArguments(args);

const driver = new Builder()
  .forBrowser(Browser.CHROME)
  .setChromeOptions(options)
  .setCapability('goog:loggingPrefs', { performance: 'ALL' })
  .build();

module.exports = driver;
