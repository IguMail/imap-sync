const crypto = require("crypto");

function sha1(str) {
  return crypto
    .createHash("sha1")
    .update(str)
    .digest("hex");
}

function createToken() {
  return sha1(Math.ceil(Math.random() * Math.pow(10, 20)).toString(16));
}

function generateMailHash(mail) {
  const hash = sha1(JSON.stringify({
    messageId: mail.messageId,
    deliveredTo: mail.deliveredTo,
    subject: mail.subject,
    receivedDate: mail.receivedDate
  }));
  return hash;
}

module.exports = {
  sha1,
  createToken,
  generateMailHash
}