const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const crypto = require("crypto");
const hat = require("hat");
const store = require('../../store/store');
const debug = require("debug")("mail-sync:client");

var MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
var client = mqtt.connect(MQTT_HOST);
var channelId = hat(256)
var transport = new mqttTransport({
  id: channelId,
  client
});

var mailState = "";
var connected = false;
var userId = process.env.USERID || '107051418222637953650'; // mocked from db

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
  
  store.find('user', userId)
    .then(user => {
      const xOAuth2 = user.xOAuth2Token
      const sha1ChannelId = crypto
        .createHash("sha1")
        .update(xOAuth2 + authToken)
        .digest("hex");

      const channel = transport.channel(sha1ChannelId);
      debug("Joining secure channel from authToken %s xOAuth2 %s channelId %s", 
        authToken, xOAuth2, sha1ChannelId);
      cb(channel);
    })
    .catch(err => debug('Failed to find user', err))
}

function onSecureChannel(channel) {
  debug("On secure channel");
  channel.publish("sync");
  channel.subscribe("connection", () => {
    debug("connected to mail broker");
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
}
