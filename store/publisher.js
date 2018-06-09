const debug = require("debug")("mail-sync:server:mqtt:pub");
const mqtt = require("mqtt");
const mqttTransport = require("../mqtt/lib/mqtt");
const MailEventEmitter = require('events').EventEmitter;
const config = require('../mqtt/config')

const uid = require('hat')(128)

let client, transport

function createClient(url) {
  debug("Connecting to mqtt url", url);
  const mqttOptions = {
    clientId: 'publisher-' + uid,
    username: 'publisher',
    password: config.publisher.accessToken
  }
  return mqtt.connect(url, mqttOptions)
}

function connect(url) {
  if (!client) {
    client = createClient(url)
    transport = new mqttTransport({ id: "store", client })
    return new Promise(
      resolve => transport.on("connect", () => resolve(transport))
    )
  }
  return Promise.resolve(transport)
}

module.exports = {
  client,
  transport,
  connect
}