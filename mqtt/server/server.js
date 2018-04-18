/**
 * Mail Server
 */
const debug = require("debug")("mail-sync:mqtt:server");
const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const crypto = require("crypto");

const MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const client = mqtt.connect(MQTT_HOST);
var transport = new mqttTransport({ id: "server", client });
var xOAuth2 = require("../../session").xOAuth2; // mocked

debug("Connecting to host", MQTT_HOST);

// MQTT Client Channels
let channels = {};

transport.on("connect", () => {
  debug("Server connected, subscribing...");
  transport.subscribe("channel", message => {
    const channel = transport.channel(message.id);
    startAuth(channel);
  });
});

function startAuth(channel) {
  debug("Start auth", channel.id);
  const authToken = createToken();
  channel.publish("auth", {
    channel: "sha1(XOAUTH+authToken)",
    authToken
  });
  secureChannel(authToken);
}

function secureChannel(authToken) {
  debug("Create secure channel from authToken", authToken);

  const sha1Token = sha1(xOAuth2 + authToken);

  const channel = transport.channel(sha1Token);
  channels[sha1Token] = channel;
  channel.subscribe("sync", () => syncMail(channel));
}

function syncMail(channel) {
  channel.publish("connection", {
    state: "established"
  });
  createMailSync(xOAuth2, channel);
}

function sha1(str) {
  return crypto
    .createHash("sha1")
    .update(str)
    .digest("hex");
}

function createToken() {
  return sha1(Math.ceil(Math.random() * Math.pow(10, 20)).toString(16));
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

var MailSync = require("../../sync");
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
    debug("received %s uids", uids.length);
    pubsub.publish("imap/uids", uids);
  });

  mailSync.on("mail", function(mail, seqno, attributes) {
    // do something with mail object including attachments
    debug("mail", attributes.uid, seqno, mail.subject, mail.date);
    pubsub.publish("imap/mail", {
      mail,
      seqno,
      attributes
    });
  });

  mailSync.on("attachment", function(attachment) {
    debug("attachment", attachment.path);
    pubsub.publish("imap/attachment", attachment);
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
