const { By, Key } = require('selenium-webdriver');

async function changeBet(driver, amount) {
  await driver
    .findElement(By.xpath(`//div[contains(@class, 'value__val')]/input`))
    .sendKeys(Key.chord(Key.CONTROL, 'a'), `${amount}`);
}

module.exports = changeBet;
