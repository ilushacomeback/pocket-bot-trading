const driver = require('./config/driver');
const init = require('./init');
const getDecodeData = require('./utils/decodeData');
const { By, Key, logging } = require('selenium-webdriver');

// node src/test.js

const actions = [];
const profits = [];
let history = [];
const dateTime = {};
let lastTimeBuy = null;
let asset = null;
let startSum = null;
let minPrice = null;
let koef = null;
let period = null

async function example() {
  try {
    const data = await init();
    koef = data.koef;
    startSum = data.start;
    minPrice = data.start;
    period = data.period
  } catch (e) {
    console.log(e);
    throw new Error('Проблема в init.js');
  }

  while (true) {
    const data = await driver.manage().logs().get(logging.Type.PERFORMANCE);

    for (let i = 0; i < data.length; i++) {
      const decodeData = getDecodeData(data[i].message);

      if (!decodeData) continue;

      if ('openTimestamp' in decodeData) {
        const { openTimestamp, closeTimestamp } = decodeData;
        actions.push({
          open: openTimestamp,
          close: closeTimestamp,
          isActive: true,
        });
      } else if ('deals' in decodeData) {
        profits.push(decodeData.profit);
      }

      if (decodeData.asset && decodeData.period === period) {
        asset = decodeData.asset;
      }

      if (Array.isArray(decodeData) && decodeData[0][0] === asset) {
        const [, curTime, curPrice] = decodeData[0];
        const time = Math.trunc(curTime);
        const lastTime = time - period;

        if (time in dateTime) continue;

        if (time % period === 0) {
          dateTime[time] = { open: curPrice };

          if (lastTime in dateTime) {
            lastTimeBuy = lastTime;
            dateTime[lastTime].close = history.at(-1)[0][2];
            const { open, close } = dateTime[lastTime];

            if (actions.length === 0) {
              if (open > close) {
                await driver
                  .findElement(By.css('body'))
                  .sendKeys(Key.chord(Key.SHIFT, 's'));
              } else {
                await driver
                  .findElement(By.css('body'))
                  .sendKeys(Key.chord(Key.SHIFT, 'w'));
              }
            }
            history = [];
          }
        } else {
          history.push(decodeData);
          const lastAction = actions.at(-1);

          if (lastAction && lastAction.close < time && lastAction.isActive) {
            lastAction.isActive = false;

            const { open, close } = dateTime[lastTimeBuy];
            const lastProfit = profits.at(-1)
            if (lastProfit < 0) {
              const newPrice = startSum * koef;
              startSum = newPrice;
              await driver
                .findElement(
                  By.xpath(`//div[contains(@class, 'value__val')]/input`)
                )
                .sendKeys(Key.chord(Key.CONTROL, 'a'), `${newPrice}`);
            } else if (lastProfit > 0 && profits.at(-2) < 0) {
              startSum = minPrice;
              await driver
                .findElement(
                  By.xpath(`//div[contains(@class, 'value__val')]/input`)
                )
                .sendKeys(Key.chord(Key.CONTROL, 'a'), `${startSum}`);
            }

            if (open > close) {
              await driver
                .findElement(By.css('body'))
                .sendKeys(Key.chord(Key.SHIFT, 's'));
            } else if (open < close) {
              await driver
                .findElement(By.css('body'))
                .sendKeys(Key.chord(Key.SHIFT, 'w'));
            }
          }
        }
      }
    }
  }
}

example();

function checkValues() {}

// респонс открытия сделки

// {
//   id: 'FlpUcfbmSAuFpk3TASEyTfwDki8jzdYL',
//   openTime: '2024-09-09 17:08:01',
//   closeTime: '2024-09-09 17:09:01',
//   openTimestamp: 1725901681,
//   closeTimestamp: 1725901741,
//   isDemo: 1,
//   amount: 10,
//   profit: 9.2,
//   percentProfit: 92,
//   percentLoss: 100,
//   openPrice: 56382.65,
//   copyTicket: '',
//   closePrice: 0,
//   command: 0, // 0 = вверх, 1 = вниз
//   asset: 'BTCUSD_otc',
//   nickname: 'DEMO',
//   avatarUser: '',
//   percentProfitable: 100,
//   requestId: 1725901701,
//   openMs: 204,
//   optionType: 100,
//   currency: 'USD'
// }

// респонс закрытия сделки

// {
//   profit: 9.2,
//   deals: [
//     {
//       id: 'Z7izOOvN5Hcaw2Lpa2O87XzhjDnLeVDT',
//       openTime: '2024-09-09 17:12:01',
//       closeTime: '2024-09-09 17:13:01',
//       openTimestamp: 1725901921,
//       closeTimestamp: 1725901981,
//       amount: 10,
//       profit: 9.2,
//       percentProfit: 92,
//       percentLoss: 100,
//       openPrice: 56382.666,
//       closePrice: 56382.693,
//       command: 0,
//       asset: 'BTCUSD_otc',
//       isDemo: 1,
//       copyTicket: '',
//       avatarUser: '',
//       nickname: 'DEMO',
//       percentProfitable: 100,
//       closeMs: 177,
//       optionType: 100,
//       openMs: 79,
//       currency: 'USD'
//     }
//   ]
// }
