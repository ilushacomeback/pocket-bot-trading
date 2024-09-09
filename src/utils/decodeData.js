function getDecodeData(data) {
  const message = JSON.parse(data).message;

  const response = message?.params?.response;
  if (response?.opcode === 2) {
    const decode = Buffer.from(response.payloadData, 'base64').toString(
      'utf-8'
    );
    const decodeData = JSON.parse(decode);
    return decodeData
  }
}

module.exports = getDecodeData
