const checkPass = (openPrice, curPrice, puncts) => {
  const strOpenPrice = openPrice.toString();
  const strCurPrice = curPrice.toString();
  const longerNum =
    strOpenPrice.length > strCurPrice.length ? strOpenPrice : strCurPrice;
  const fixed = parseInt(longerNum.split('.')[1].length);
  const diff =
    openPrice - Math.trunc(openPrice) - (curPrice - Math.trunc(curPrice));
  const str = diff.toFixed(fixed).toString();
  const index = str.split('').findIndex((el) => el !== '0' && el !== '.' && el !== '-');
  const fixedDiff = str.slice(index)
  console.log('diff', fixedDiff);
  if (fixedDiff < puncts && fixedDiff > -puncts) {
    return true;
  }

  return false;
};

module.exports = checkPass;
