const driver = require('./config/driver');
const init = require('./init');
const getDecodeData = require('./utils/decodeData');
const { logging } = require('selenium-webdriver');
const checkValues = require('./utils/checkValues');
const checkPass = require('./utils/checkPass');
const getHistory = require('./utils/getHistory');
const buyOrSell = require('./utils/buyOrSell');
const changeBet = require('./utils/changeBet');

let actions = [];
const timesActions = {};
let history = [];
const profits = [];
const dateTime = {};
let puncts = null;
let initSum = null;
let curSum = null;
let koef = null;
let asset = null;
let period = null;
let lastOpenTime = null;
let isPassLastAction = false;
let isRepeat = false;

(async function v3() {
    console.log('1')
  try {
    console.log('2')
    const data = await init();
    initSum = data.initSum;
    curSum = data.initSum;
    koef = data.koef;
    period = data.period;
    puncts = data.puncts;
  } catch (e) {
    console.log(e);
    throw new Error('Проблема в init.js');
  }
  console.log('3')
  while (true) {
    const data = await driver.manage().logs().get(logging.Type.PERFORMANCE);

    for (let i = 0; i < data.length; i++) {
      const decodeData = getDecodeData(data[i].message);

      if (!decodeData) continue;

      if ('openTimestamp' in decodeData) {
        console.log('открылась ставка', decodeData);
        const { openTimestamp, closeTimestamp, openPrice, command } =
          decodeData;

        const dataAction = {
          openTime: openTimestamp,
          closeTime: closeTimestamp,
          openPrice,
          command,
          isActive: true,
        };

        actions.push(dataAction);
      } else if ('deals' in decodeData) {
        console.log('закрылась ставка', decodeData);
        const { profit, openTimestamp } = decodeData.deals[0];
        const dataProfit = { profit, openTime: openTimestamp };
        const lastAction = actions.at(-1);

        if (lastAction && lastAction.openTime === openTimestamp) {
          lastAction.isActive = false;
        }

        if (!lastAction) {
          isPassLastAction = true;
        }

        profits.push(dataProfit);
      } else if (decodeData.asset && decodeData.period === period) {
        asset = decodeData.asset;
        const oldHistory = getHistory(decodeData.history, period);
        dateTime[asset] = { ...oldHistory };
        console.log('история', dateTime[asset]);
        actions = [];
        history = [];
      } else if (
        Array.isArray(decodeData) &&
        decodeData[0] &&
        decodeData[0].length === 3 &&
        decodeData[0][0] === asset
      ) {
        history.push(decodeData[0]);
        const [, dataCurTime, dataCurPrice] = decodeData[0];
        const curTime = Math.trunc(dataCurTime);
        const lastOpenCandleTime = curTime - period;
        const lastAction = actions.at(-1);
        const checkResultBeforeSecond = lastAction?.closeTime - 1 === curTime;

        if (isPassLastAction) {
          const lastActionOpenTime = lastAction?.openTime;
          const lastProfit = profits.at(-1);
          if (lastActionOpenTime === lastProfit?.openTime || actions.length === 0) {
            if (lastProfit.profit < 0) {
              curSum *= koef;
            } else if (lastProfit.profit > 0 && curSum !== initSum) {
              curSum = initSum;
            }
            await changeBet(driver, curSum);
            isPassLastAction = false;
            isRepeat = true;
          }
        }
        if (curTime % period === 0) {
          if (curTime in dateTime[asset]) {
            continue;
          } else {
            dateTime[asset][curTime] = { open: dataCurPrice };
            if (lastOpenCandleTime in dateTime[asset]) {
              dateTime[asset][lastOpenCandleTime].close = history.at(-2)[2];
              history = [];
            }
            lastOpenTime = curTime;
            console.log('dateTime', dateTime[asset]);
          }

          if (isPassLastAction) continue;

          if (actions.length === 0 || isRepeat) {
            if (lastAction?.isActive) continue;
            const curAction = checkValues(dateTime[asset], curTime, period);
            console.log('action', curAction);
            if (curAction) {
              await buyOrSell(driver, curAction);
              isRepeat = false;
            }
            continue;
          } else if ((lastAction?.closeTime - 1) % period === 0) {
            isPassLastAction = true;
            continue;
          }
        } else if (checkResultBeforeSecond) {
          const lastTime = lastAction.closeTime - 1;
          if (lastTime in timesActions) {
            continue;
          } else {
            timesActions[lastTime] = true;
          }
          const openPrice = lastAction.openPrice;
          const command = lastAction.command;

          const isPass = checkPass(openPrice, dataCurPrice, puncts);

          if (isPass) {
            console.log('pass');
            isPassLastAction = true;
            continue;
          }

          const isLoose =
            (openPrice > dataCurPrice && command === 0) ||
            (openPrice < dataCurPrice && command === 1);

          if (isLoose) {
            curSum *= koef;
          } else if (curSum !== initSum) {
            curSum = initSum;
          }
          console.log('новая ставка', curSum);
          await changeBet(driver, curSum);
          const curOpenPrice = dateTime[asset][lastOpenTime].open;
          const curAction = checkValues(dateTime[asset], lastOpenTime, period);

          await driver.sleep(1000);

          if (curOpenPrice > dataCurPrice && curAction === 'sell') {
            console.log('sell');
            await buyOrSell(driver, curAction);
          } else if (curOpenPrice < dataCurPrice && curAction === 'buy') {
            console.log('buy');
            await buyOrSell(driver, curAction);
          } else {
            console.log('repeat');
            isRepeat = true;
            continue;
          }
          lastAction.isActive = false;
        }
      }
    }
  }
})();
