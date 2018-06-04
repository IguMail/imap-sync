const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const crypto = require("crypto");
const hat = require("hat");
const store = require('../../store/store');
const debug = require("debug")("mail-sync:client");

var MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
var userId = process.env.USERID || '107051418222637953650'; // mocked from db
var channelId = 'client/' + userId

start()

function start() {
  getUserById(userId).then(user => {
    if (!user) throw new Error('User not found')
    connect(user)
  })
  .catch(error => debug('Error getUserById', error))
}

function getUserById(userId) {
  return store.find('user', userId)
}

function connect(user) {

  var mqttOptions = {
    clientId: user.id,
    username: user.id,
    password: user.user.xOAuth2Token
  }

  debug('Connecting to ', MQTT_HOST, 'as', user.id)
  var client = mqtt.connect(MQTT_HOST, mqttOptions);
  var transport = new mqttTransport({
    id: 'channelId',
    client
  });

  transport.on("connect", () => onConnected(transport));
}

function onConnected(transport) {
  debug('Connected to server')
  var channel = transport.channel(channelId);
  subscribe(channel)
}

function subscribe(channel) {
  debug("On secure channel");
  channel.subscribe("imap", () => {
    debug("connected to mail sync broker");
  });
  channel.subscribe("imap/connected", message => {
    debug("connected to mailbox", message);
  });
  channel.subscribe("imap/mail", ({ mail, headers, attributes }) => {
    //debug("mail", mail, headers, attributes);
  });
  channel.subscribe("imap/attachment", ({ mail, attachment }) => {
    //debug("attachment", mail, attachment);
  });
  channel.subscribe("imap/uids", message => {
    debug("received %s uids", message.length);
  });
  channel.subscribe("imap/error", error => {
    debug("Error occurred", error);
    if (error.textCode === "AUTHENTICATIONFAILED") {
      debug("Re-Authentication required");
    }
  });

  setTimeout(
    () => channel.publish("imap/sync", { userId }),
    500)
}
