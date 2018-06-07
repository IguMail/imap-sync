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
    receivedDate: mail.receivedDate,
    from: mail.from,
    text: mail.text,
    html: mail.html,
    headers: mail.headers
  }));
  return hash;
}

function getDeliveredTo(user, mail) {
  let deliveredTo
  if (mail.headers['delivered-to']) {
    deliveredTo = Array.isArray(mail.headers['delivered-to']) 
      ? mail.headers['delivered-to']
      : [mail.headers['delivered-to']]
  } else {
    deliveredTo = [user.user.email]
  }
  return deliveredTo
}

module.exports = {
  sha1,
  createToken,
  generateMailHash,
  getDeliveredTo
}