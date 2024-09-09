const driver = require('./config/driver');
const { By, Key } = require('selenium-webdriver');

// node src/test.js

const start = 10; // минимальная ставка
const finish = 1; // максимальная ставка
const koef = 2; // коэффициент умножения
const time = 60; // время сделки
const period = 60; // время свечи
const company = 'Криптовалюты'; // название раздела один в один как написано на сайте
const valute = 'Bitcoin OTC'; // название пары на торги один в один как написано на сайте

let resultStart = start;

const times = {
  5: 'S5',
  15: 'S15',
  30: 'S30',
  60: 'M1',
  180: 'M3',
  300: 'M5',
};

async function init() {
  let btnSkip;

  try {
    await driver.get('https://po-vol7.com/ru/cabinet/try-demo');
    const btn = await driver.findElement(By.className('btn-skip'));
    btnSkip = btn;
  } catch {
    const btn = await driver.findElement(By.className('js-exit'));
    btnSkip = btn;
  }

  await btnSkip.click();

  const currentValute = await driver.findElement(
    By.className('current-symbol')
  );

  await currentValute.click();

  const curCompany = await driver.findElement(
    By.xpath(
      `//span[contains(@class, 'assets-block__nav-item-label') and contains(text(), '${company}')]`
    )
  );

  await curCompany.click();

  const curPair = await driver.findElement(
    By.xpath(
      `//span[contains(@class, 'js-tour-asset-label alist__label') and contains(text(), '${valute}')]`
    )
  );

  await curPair.click();

  await driver.executeScript(
    'document.querySelector(".drop-down-modal-wrap").style.display = "none"; document.elementFromPoint(100, 100).click()'
  );

  const types = await driver.findElement(
    By.className('tooltip2 items__link items__link--chart-type')
  );

  await types.click();

  const type = await driver.findElement(
    By.xpath(`//span[contains(text(), 'Свечи')]`)
  );

  await type.click();

  const interval = await driver.findElement(
    By.xpath(
      `//ul[contains(@class, 'list-links')]/li/a/span[contains(text(), '${times[period]}')]`
    )
  );

  await interval.click();

  await driver.executeScript(
    'document.querySelector(".drop-down-modal-wrap").style.display = "none"; document.elementFromPoint(100, 100).click()'
  );

  const valueTime = await driver.findElement(By.className('value__val'));

  await valueTime.click();

  const findTime = await driver.findElement(
    By.xpath(`//div[contains(text(), '${times[time]}')]`)
  );

  await findTime.click();

  await driver
    .findElement(By.xpath(`//div[contains(@class, 'value__val')]/input`))
    .sendKeys(Key.chord(Key.CONTROL, 'a'), `${start}`);

  const curStart = await driver
    .findElement(By.xpath(`//div[contains(@class, 'value__val')]/input`))
    .getAttribute('value');

  if (curStart !== `$${resultStart}`) {
    throw new Error('Ставка забаговалась');
  }

  const hotKeys = await driver.findElement(
    By.className('hotkeys-icon tooltip2')
  );

  await hotKeys.click();

  const activeHotKeys = await driver.findElement(
    By.xpath('//a[contains(text(), "Включить горячие клавиши")]')
  );

  await activeHotKeys.click();

  //   const call = await driver.findElement(By.className('btn btn-call'));

  //   await call.click();

  return {start, koef};
}

module.exports = init;
