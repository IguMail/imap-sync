const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const crypto = require("crypto");
const hat = require("hat");
const debug = require("debug")("mail-sync:ai");

var accessToken = 'fe94fa975050d326aba8c85ffb193319b92bb253' // mocked
var mqttOptions = {
  username: 'ai',
  password: accessToken
}

var MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
var client = mqtt.connect(MQTT_HOST, mqttOptions);
var userId = 'ai'
var channelId = 'ai'
var transport = new mqttTransport({
  id: channelId,
  client
});

var mailState = "";
var connected = false;

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