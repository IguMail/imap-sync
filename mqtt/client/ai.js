const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const crypto = require("crypto");
const hat = require("hat");
const debug = require("debug")("mail-sync:ai");

var accessToken = 'fe94fa975050d326aba8c85ffb193319b92bb253' // mocked

var MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
var client = mqtt.connect(MQTT_HOST);
var userId = 'ai'
var channelId = hat(256)
var transport = new mqttTransport({
  id: channelId,
  client
});

var mailState = "";
var connected = false;

transport.on("connect", () => {
  // wait for server
  setTimeout(() => {
    transport.publish("channel", {
      channelId,
      userId
    });
    var channel = transport.channel(channelId);
    startAuth(channel);
  }, 2000);
});

function startAuth(channel) {
  debug("Start auth", channel.id);
  channel.subscribe("auth", ({ authToken }) => {
    secureChannel(authToken, onSecureChannel);
  });
}

function secureChannel(authToken, cb) {
  debug("Create secure channel from authToken", authToken);

  const sha1 = crypto
    .createHash("sha1")
    .update(accessToken + authToken)
    .digest("hex");

  const channel = transport.channel(sha1);
  cb(channel);
}

function onSecureChannel(channel) {
  debug("On secure channel");
  channel.publish("sync");
  channel.subscribe("imap/mail", ({ mail, headers, attributes }) => {
    debug("mail", mail, headers, attributes);
  });
  channel.subscribe("mail/saved", (entry) => {
    debug("saved", entry);
  });
}
