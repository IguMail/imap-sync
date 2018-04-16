/**
 * Mail Server
 */
const debug = require("debug")("mail-sync:mqtt:server");
const mqtt = require("mqtt");
const MQTTChannel = require("../lib/channel");
const mqttClientLib = require("../lib/mqtt");

const MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const client = mqtt.connect(MQTT_HOST);
var mqttClient = new mqttClientLib({ id: "server", client });

debug("Connecting to host", MQTT_HOST);

// MQTT Client Channels
let channels = {};

mqttClient.on("connect", () => {
  debug("Server connected, subscribing...");
  mqttClient.subscribe("auth", message => {
    onAuth(message);
  });
});

function onAuth({ id, xOAuth2 }) {
  debug("Client auth", { id, xOAuth2 });
  const channel = new MQTTChannel({
    client: mqttClient,
    id: id
  });
  channel.xOAuth2 = xOAuth2;
  channel.publish("connection", true);
  channels[id] = channel;

  createMailSync(xOAuth2, channel);
}

/**
 * Want to notify client that mail is disconnected before shutting down
 */
function handleAppExit(options, err) {
  if (err) {
    console.error("App exited due to error", err);
  }
  if (options.cleanup) {
    client.publish("mail/connected", "false");
  }
  if (options.exit) {
    process.exit();
  }
}

var MailSync = require("../../index");
var imapConfig = require("../../config/imap");

function createMailSync(xoauth2, pubsub) {
  debug("Authenticating: ", xoauth2);
  var mailSync = new MailSync({
    ...imapConfig,
    xoauth2
  });

  mailSync.start(); // start listening

  mailSync.on("connected", function() {
    debug("imapConnected");
    pubsub.publish("imap/connected");
  });

  mailSync.on("mailbox", function(mailbox) {
    debug("mailbox open: ", mailbox);
    pubsub.publish("imap/mailbox", mailbox);
  });

  mailSync.on("disconnected", function() {
    debug("imapDisconnected, restart");
    mailSync.start();
  });

  mailSync.on("error", function(err) {
    debug("Error", err);
    pubsub.publish("imap/error", err);
  });

  mailSync.on("uids", function(uids) {
    debug("uids", uids);
    pubsub.publish("imap/uids", uids);
  });

  mailSync.on("mail", function(mail, seqno, attributes) {
    // do something with mail object including attachments
    debug("mail", attributes.uid, seqno, mail.subject, mail.date);
    /*
    pubsub.publish("imap/mail", {
      mail,
      seqno,
      attributes
    });
    */
  });

  mailSync.on("attachment", function(attachment) {
    debug("attachment", attachment.path);
    //pubsub.publish("imap/attachment", attachment);
  });

  return mailSync;
}

module.exports = client;

/**
 * Handle the different ways an application can shutdown
 */
process.on(
  "exit",
  handleAppExit.bind(null, {
    cleanup: true
  })
);
process.on(
  "SIGINT",
  handleAppExit.bind(null, {
    exit: true
  })
);
process.on(
  "uncaughtException",
  handleAppExit.bind(null, {
    exit: true
  })
);
