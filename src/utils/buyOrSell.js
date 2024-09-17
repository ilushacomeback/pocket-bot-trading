const { By, Key } = require('selenium-webdriver');

async function buyOrSell(driver, action) {
  if (action === 'buy') {
    await driver
      .findElement(By.css('body'))
      .sendKeys(Key.chord(Key.SHIFT, 'w'));
  } else if (action === 'sell') {
    await driver
      .findElement(By.css('body'))
      .sendKeys(Key.chord(Key.SHIFT, 's'));
  } else {
    throw new Error('некорректное действие');
  }
}

module.exports = buyOrSell;
