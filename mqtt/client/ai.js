const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const crypto = require("crypto");
const hat = require("hat");
const config = require('../config')
const debug = require("debug")("mail-sync:ai");

// fe94fa975050d326aba8c85ffb193319b92bb253
const accessToken = config.ai.accessToken 
const mqttOptions = {
  username: 'ai',
  password: accessToken
}

const MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
const client = mqtt.connect(MQTT_HOST, mqttOptions);
const userId = 'ai'
const transport = new mqttTransport({
  client
});

transport.on("connect", () => {
  // wait for server
  setTimeout(() => {
    subscribe(transport)
  }, 500);
});

function subscribe(channel) {
  channel.subscribe("mail/saved", (entry) => {
    debug("mail", entry);
  });
  channel.subscribe("mail/deleted", (entry) => {
    debug("deleted", entry);
  })
  channel.subscribe("mail/action", (entry) => {
    debug("action", entry);
  })
}