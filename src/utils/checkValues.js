const checkValues = (dateTime, time, period) => {
    const { open, close } = dateTime[time - period]
    const { open: openLast, close: closeLast } = dateTime[time - (period *2)]
    if (open > close && openLast > closeLast) {
        return 'sell'
    } else if (open < close && openLast < closeLast) {
        return 'buy'
    }
}

module.exports = checkValues