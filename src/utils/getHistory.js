const getHistory = (history, period) => {
  const result = {};

  let i = history.length - 1;

  const openCandles = [];
  const closeCandles = [];

  while (openCandles.length < 4 && i >= 0) {
    const [time] = history[i];
    const truncTime = Math.trunc(time);
    if (truncTime % period === 0) {
      const [, openPrice] =
        Math.trunc(history[i - 1][0]) === Math.trunc(history[i][0])
          ? history[i - 1]
          : history[i];
      const [closeLast, closePrice] = history[i - 2];
      openCandles.push([truncTime, openPrice]);
      closeCandles.push([closeLast, closePrice]);
      i--;
    }
    i--;
  }

  const [lastTime, lastPrice] = openCandles[0];

  result[lastTime] = { open: lastPrice };

  for (let i = 1; i < openCandles.length; i++) {
    const [openTime, openPrice] = openCandles[i];
    const [, closePrice] = closeCandles[i - 1];
    result[openTime] = { open: openPrice, close: closePrice };
  }

  return result;
};


module.exports = getHistory