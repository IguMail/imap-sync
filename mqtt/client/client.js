const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const crypto = require("crypto");
const debug = require("debug")("mail-sync:client");

var MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
var client = mqtt.connect(MQTT_HOST);
var transport = new mqttTransport({
  id: "gabe@fijiwebdesign.com",
  client
});

var mailState = "";
var connected = false;
var xOAuth2 = require("../../session").xOAuth2; // mocked

transport.on("connect", () => {
  // wait for server
  setTimeout(() => {
    transport.publish("channel", {
      id: transport.id
    });
    var channel = transport.channel(transport.id);
    startAuth(channel);
  }, 2000);
});

function startAuth(channel) {
  debug("Start auth", channel.id);
  channel.subscribe("auth", ({ authToken }) => {
    secureChannel(authToken);
  });
}

function secureChannel(authToken) {
  debug("Create secure channel from authToken", authToken);

  const sha1 = crypto
    .createHash("sha1")
    .update(xOAuth2 + authToken)
    .digest("hex");

  const channel = transport.channel(sha1);
  onSecureChannel(channel);
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
