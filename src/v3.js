const driver = require('./config/driver');
const init = require('./init');
const getDecodeData = require('./utils/decodeData');
const { logging, until, By } = require('selenium-webdriver');
const checkValues = require('./utils/checkValues');
const checkPass = require('./utils/checkPass');
const getHistory = require('./utils/getHistory');
const buyOrSell = require('./utils/buyOrSell');
const changeBet = require('./utils/changeBet');

let actions = [];
const timesActions = {};
let history = [];
let looseStrick = 0;
const state = { pause: false, time: null, version: 'v1' };
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
let switchVersionCount = null;
let pauseTime = null;
let isNotRepeatLoose = true;

function buildButton() {
  const ul = document.querySelector('.bottom');
  const btn = document.createElement('button');
  btn.textContent = 'Стартуем бота';
  btn.style.color = 'black';
  btn.addEventListener('click', () => {
    btn.textContent = 'Стартанул';
    btn.classList.add('pocket-trading-bot');
    btn.disabled = true;
  });
  ul.prepend(btn);
}

(async function v3() {
  try {
    const data = await init();
    initSum = data.initSum;
    curSum = data.initSum;
    koef = data.koef;
    period = data.period;
    puncts = data.puncts;
    switchVersionCount = data.switchVersionCount;
    pauseTime = data.pauseTime;
    console.log('find exit');
    await driver.wait(
      until.elementLocated(By.xpath(`//span[contains(text(), 'Выход')]`)),
      Infinity
    );
    await driver.sleep(1000 * 30);
    await driver.executeScript(buildButton);
    console.log('wait');
    await driver.wait(
      until.elementLocated(By.className('pocket-trading-bot')),
      Infinity
    );
    console.log('start bot');
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
        console.log('открылась ставка', decodeData);
        console.log('version', state.version);
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

        if (profit <= 0 && isNotRepeatLoose) {
          looseStrick++;
          console.log('close profit', looseStrick);
        } else if (profit > 0) {
          looseStrick = 0;
          if (state.version === 'v2') {
            state.version = 'v1'
          }
        }

        if (looseStrick === switchVersionCount) {
          if (state.version === 'v1') {
            state.version = 'v2';
          } else if (state.version === 'v2') {
            state.pause = true;
            state.time = openTimestamp + pauseTime * 60;
          }
          looseStrick = 0;
        }

        const dataProfit = { profit, openTime: openTimestamp };
        const lastAction = actions.at(-1);

        if (lastAction && lastAction.openTime === openTimestamp) {
          lastAction.isActive = false;
        }

        if (!lastAction) {
          isPassLastAction = true;
        }

        isNotRepeatLoose = true;
        profits.push(dataProfit);
      } else if (
        decodeData.asset &&
        decodeData.period === period &&
        decodeData.history
      ) {
        asset = decodeData.asset;
        const oldHistory = getHistory(decodeData.history, period);
        dateTime[asset] = { ...oldHistory };
        console.log('история', dateTime);
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
        const timeNow = Math.trunc(new Date().getTime() / 1000);

        const curTime = Math.trunc(dataCurTime);
        const isActualTime =
          timeNow + 7205 > curTime && timeNow + 7195 < curTime;
        const lastOpenCandleTime = curTime - period;
        const lastAction = actions.at(-1);
        const checkResultBeforeSecond = lastAction?.closeTime - 1 === curTime;

        if (isPassLastAction) {
          const lastActionOpenTime = lastAction?.openTime;
          const lastProfit = profits.at(-1);
          if (
            lastActionOpenTime === lastProfit?.openTime ||
            actions.length === 0
          ) {
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
          }

          if (state.pause) {
            if (curTime >= state.time) {
              state.pause = false;
              state.time = null;
              state.version = 'v1';
            } else {
              console.log('pause');
              continue;
            }
          }

          if (isPassLastAction) continue;

          if ((actions.length === 0 || isRepeat) && isActualTime) {
            // console.log(curTime, timeNow)
            if (lastAction?.isActive) continue;
            let curAction = null;

            if (state.version === 'v1') {
              curAction = checkValues(dateTime[asset], curTime, period);
            } else if (state.version === 'v2') {
              const { open, close } = dateTime[asset][lastOpenCandleTime];
              if (open > close) {
                curAction = 'sell';
              } else if (open < close) {
                curAction = 'buy';
              }
            }
            console.log('action', curAction);
            if (curAction && !state.pause) {
              await buyOrSell(driver, curAction);
              isRepeat = false;
            }
            continue;
          } else if (checkResultBeforeSecond) {
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
            looseStrick++;
            isNotRepeatLoose = false;
            console.log('osLoose', looseStrick);
            if (looseStrick === switchVersionCount) {
              console.log('update loose');
              looseStrick = 0;
              if (state.version === 'v1') {
                state.version = 'v2';
              } else if (state.version === 'v2') {
                state.pause = true;
                state.time = curTime + pauseTime * 60;
                await changeBet(driver, curSum);
                isRepeat = true;
                continue;
              }
            }
          } else if (curSum !== initSum) {
            curSum = initSum;
            looseStrick = 0
            if (state.version === 'v2') {
              state.version = 'v1'
            }
          }
          console.log('новая ставка', curSum);
          await changeBet(driver, curSum);
          const curOpenPrice = dateTime[asset][lastOpenTime].open;
          let curAction = null;

          if (state.version === 'v1') {
            curAction = checkValues(dateTime[asset], lastOpenTime, period);
          } else if (state.version === 'v2') {
            if (curOpenPrice > dataCurPrice) {
              curAction = 'sell';
            } else if (curOpenPrice < dataCurPrice) {
              curAction = 'buy';
            }
          }

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
            // continue;
          }
          lastAction.isActive = false;
        }
      }
    }
  }
})();
