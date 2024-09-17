const driver = require('./config/driver');
const init = require('./init');
const getDecodeData = require('./utils/decodeData');
const { By, Key, logging, Actions } = require('selenium-webdriver');
const checkValues = require('./utils/checkValues');
const checkPass = require('./utils/checkPass');

// node src/test.js

let actions = [];
const profits = [];
let history = [];
let valuteHistory = [];
const dateTime = {};
let lastTimeOpen = null;
let lastCloseTime = null;
let asset = null;
let startSum = null;
let minPrice = null;
let koef = null;
let period = null;
let isRepeat = false;
let isLittle = false;
let valueTimeBtn = null;

async function example() {
  try {
    const data = await init();
    koef = data.koef;
    startSum = data.start;
    minPrice = data.start;
    period = data.period;
    valueTimeBtn = data.valueTime;
  } catch (e) {
    console.log(e);
    throw new Error('Проблема в init.js');
  }

  while (true) {
    const data = await driver.manage().logs().get(logging.Type.PERFORMANCE);

    for (let i = 0; i < data.length; i++) {
      const decodeData = getDecodeData(data[i].message);

      if (!decodeData) continue;

      // console.log(decodeData);

      if ('openTimestamp' in decodeData) {
        console.log(decodeData)
        const { openTimestamp, closeTimestamp, openPrice, command } =
          decodeData;
        actions.push({
          openTime: openTimestamp,
          closeTime: closeTimestamp,
          openPrice,
          command,
          isActive: true,
        });
        isRepeat = false;
      } else if ('deals' in decodeData) {
        profits.push({
          profit: decodeData.deals[0].profit,
          openTime: decodeData.deals[0].openTimestamp,
        });
        isRepeat = true
      }

      if (decodeData.asset && decodeData.period === period) {
        asset = decodeData.asset;
        const oldHistory = decodeData.history;
        const curTime = parseInt(`${Math.floor(oldHistory.at(-1)[0] / 10)}0`);
        console.log(oldHistory)

        let newTime = curTime;

        while (newTime % period !== 0) {
          newTime -= 10;
        }
        console.log('new', newTime);

        const openCurIndex = oldHistory.findLastIndex(
          ([time]) => Math.trunc(time) === newTime
        );
        const openLastIndex = oldHistory.findLastIndex(
          ([time]) => Math.trunc(time) === newTime - period
        );
        const openLastLastIndex = oldHistory.findLastIndex(
          ([time]) => Math.trunc(time) === newTime - period * 2
        );

        const openCur = oldHistory[openCurIndex - 1][1];
        const closeLast = oldHistory[openCurIndex - 2][1];
        const openLast = oldHistory[openLastIndex - 1][1];
        const closeLastLast = oldHistory[openLastIndex - 2][1];
        const openLastLast = oldHistory[openLastLastIndex - 1][1];

        if (!(asset in dateTime)) {
          dateTime[asset] = {};
        }
        dateTime[asset][newTime] = { open: openCur };

        dateTime[asset][newTime - period] = {
          open: openLast,
          close: closeLast,
        };

        dateTime[asset][newTime - period * 2] = {
          open: openLastLast,
          close: closeLastLast,
        };

        // console.log(dateTime);

        actions = [];
        history = [];
      }

      if (
        Array.isArray(decodeData) &&
        decodeData[0] &&
        decodeData[0].length === 3 &&
        decodeData[0][0] === asset
      ) {
        const [, curTime, curPrice] = decodeData[0];
        const time = Math.trunc(curTime);
        const lastTime = time - period;
        const lastAction = actions.at(-1);

        if (lastAction) {
          const { closeTime } = lastAction;
          lastCloseTime = closeTime - 1;
          const lastProfit = profits.at(-1);
          if (
            isLittle &&
            lastProfit &&
            lastAction.openTime === lastProfit.openTime
          ) {
            console.log('проверяю завершение ставки');
            console.log(lastProfit);
            if (lastProfit.profit > 0) {
              console.log('win');
              startSum = minPrice;
              await driver
                .findElement(
                  By.xpath(`//div[contains(@class, 'value__val')]/input`)
                )
                .sendKeys(Key.chord(Key.CONTROL, 'a'), `${startSum}`);
            } else if (lastProfit.profit < 0) {
              console.log('loose');
              const newPrice = startSum * koef;
              startSum = newPrice;
              await driver
                .findElement(
                  By.xpath(`//div[contains(@class, 'value__val')]/input`)
                )
                .sendKeys(Key.chord(Key.CONTROL, 'a'), `${startSum}`);
            }
            lastAction.isActive = false;
            isLittle = false;
            isRepeat = true;
            console.log(lastAction)
          }
        }

        if (time in dateTime[asset]) continue;

        if (time % period === 0) {
          console.log('=== 1min')
          dateTime[asset][time] = { open: curPrice };

          if (lastTime in dateTime[asset]) {
            lastTimeOpen = lastTime + period;
            dateTime[asset][lastTime].close = history.at(-1)[0][2];
            const { open, close } = dateTime[asset][lastTime];

            const act = checkValues(dateTime[asset], time, period);
            console.log('act', act, actions.length, isRepeat);
            if (actions.length === 0 || isRepeat) {
              console.log('1 ставка');
              if (open > close && act === 'put') {
                await driver
                  .findElement(By.css('body'))
                  .sendKeys(Key.chord(Key.SHIFT, 's'));
              } else if (open < close && act === 'call') {
                await driver
                  .findElement(By.css('body'))
                  .sendKeys(Key.chord(Key.SHIFT, 'w'));
              }
            }
            history = [];
          }
        } else if (time === lastCloseTime && actions.at(-1)?.isActive) {
          console.log('before 1 sec')
          const action = actions.at(-1);
          const openPrice = action.openPrice;
          const command = action.command;

          console.log(openPrice, curPrice);
          const isPass = checkPass(openPrice, curPrice);
          if (isPass) {
            console.log('pass');
            isLittle = true;
            continue;
          }

          console.log('check win or loose')
          if (
            (openPrice > curPrice && command === 0) ||
            (openPrice < curPrice && command === 1)
          ) {
            const newPrice = startSum * koef;
            startSum = newPrice;
            await driver
              .findElement(
                By.xpath(`//div[contains(@class, 'value__val')]/input`)
              )
              .sendKeys(Key.chord(Key.CONTROL, 'a'), `${startSum}`);

            action.isActive = false;
          } else if (openPrice !== curPrice) {
            startSum = minPrice;
            await driver
              .findElement(
                By.xpath(`//div[contains(@class, 'value__val')]/input`)
              )
              .sendKeys(Key.chord(Key.CONTROL, 'a'), `${startSum}`);

            action.isActive = false;
          } else {
            isRepeat = true;
            action.isActive = false;
            continue;
          }

          const open = dateTime[asset][lastTimeOpen]?.open;

          if (!open) continue;

          console.log({ lastTimeOpen: open, curPrice });

          const act = checkValues(dateTime[asset], lastTimeOpen, period);

          await driver.sleep(1000);

          if (open > curPrice && act === 'put') {
            await driver
              .findElement(By.css('body'))
              .sendKeys(Key.chord(Key.SHIFT, 's'));
          } else if (open < curPrice && act === 'call') {
            await driver
              .findElement(By.css('body'))
              .sendKeys(Key.chord(Key.SHIFT, 'w'));
          } else {
            isRepeat = true;
          }
        }
        history.push(decodeData);
      }
    }
  }
}

example();

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
