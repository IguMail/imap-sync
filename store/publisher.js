const debug = require("debug")("mail-sync:server:mqtt:pub");
const mqtt = require("mqtt");
const mqttTransport = require("../mqtt/lib/mqtt");
const MailEventEmitter = require('events').EventEmitter;
const config = require('../mqtt/config')

const MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const uid = require('hat')(128)

let client, transport

function createClient() {
  debug("Connecting to host", MQTT_HOST);
  const mqttOptions = {
    clientId: 'publisher-' + uid,
    username: 'publisher',
    password: config.publisher.accessToken
  }
  return mqtt.connect(MQTT_HOST, mqttOptions)
}

function connect() {
  if (!client) {
    client = createClient()
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