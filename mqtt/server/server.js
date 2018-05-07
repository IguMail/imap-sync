/**
 * Mail Sync Server
 */
const debug = require("debug")("mail-sync:mqtt:server");
const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const crypto = require("crypto");
const MailEventEmitter = require('events').EventEmitter;
const store = require('../../store/store');
var MailSync = require("../../sync");
var imapConfig = require("../../config/imap");

const MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const client = mqtt.connect(MQTT_HOST);
var transport = new mqttTransport({ id: "server", client });
var mailEmitter = new MailEventEmitter();

var accessToken = 'fe94fa975050d326aba8c85ffb193319b92bb253' // mocked

debug("Connecting to host", MQTT_HOST);

// MQTT Client Channels
let channels = {};

transport.on("connect", () => {
  debug("Server connected, subscribing...");
  transport.subscribe("channel", ({userId, channelId}) => {
    const channel = transport.channel(channelId);
    channel.userId = userId
    startAuth(channel);
  });
});

function startAuth(channel) {
  const { userId, channelId } = channel
  debug("Start auth", channelId);
  const authToken = createToken();
  channel.publish("auth", {
    channel: "sha1(XOAUTH+authToken)",
    channelId,
    userId,
    authToken
  });
  secureChannel(channel, authToken);
}

function secureChannel(insecureChannel, authToken) {
  const { userId, channelId } = insecureChannel
  debug("Create secure channel from authToken", authToken);

  // TODO: get this from DB based on id
  if (userId === 'ai') {
    // generate secure channel ID
    const sha1ChannelId = sha1(accessToken + authToken);
    // secure channel
    const channel = transport.channel(sha1ChannelId);
    // AI can subscribe to all mail updates
    channel.subscribe("sync", () => {
      mailEmitter.on('imap/mail', ({ mail, seqno, attributes }) => {
        channel.publish('imap/mail', { mail, seqno, attributes })
      })
      mailEmitter.on('mail/saved', (entry) => {
        channel.publish('mail/saved', entry)
      })
    });
    return
  }

  if (!userId) {
    return debug('User Id undefined', userId)
  }

  store.find('user', userId)
    .then(user => {
      const xOAuth2 = user.xOAuth2Token
      const sha1ChannelId = sha1(xOAuth2 + authToken);

      const channel = transport.channel(sha1ChannelId);
      debug("Secure channel from authToken, xOAuth2, channelId", 
        authToken, xOAuth2, sha1ChannelId);

      // users can only subscribe to their account updates
      channels[sha1ChannelId] = channel;
      channel.subscribe("sync", () => {
        channel.sync = syncMail(channel, xOAuth2)
      });
    })
    .catch(err => debug('Failed to find user', err))
}

function syncMail(channel, xOAuth2) {
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

function createMailSync(xoauth2, pubsub) {
  debug("Authenticating: ", xoauth2);
  var mailSync = new MailSync({
    ...imapConfig,
    mailParserOptions: {
      streamAttachments: false // TODO: stream attachments
    },
    attachments: false, // never save attachments to file
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
    mailEmitter.emit("imap/mail", {
      mail,
      seqno,
      attributes
    });
  });

  mailSync.on("attachment", function({ mail, attachment }) {
    debug("attachment", mail, attachment);
    var { messageId, subject, inReplyTo, from, to } = mail;
    pubsub.publish("imap/attachment", { mail: {
      messageId, subject, inReplyTo, from, to
    }, attachment });
  });

  return mailSync;
}

// TODO: remove For debugging
if (process.env.CLEAN_STORE === 'true') {
  store.destroyAll("message");
  store.destroyAll("attachment");
}

/**
 * All Mail events
 */
mailEmitter.on('imap/mail', ({ mail, seqno, attributes }) => {
  const {
    messageId,
    receivedDate,
    subject
  } = mail;
  const deliveredTo = Array.isArray(mail.headers['delivered-to']) 
    ? mail.headers['delivered-to']
    : [mail.headers['delivered-to']]
  const hash = generateMailHash(mail);

  const storeMessage = (mail, attachments) => {
    // use saved attachment entries without content
    mail.attachments = attachments.map(attachment => {
      delete(attachment.attachment.content)
      return {
        ...attachment.attachment,
        id: attachment.id,
        hash: attachment.hash
      }
    })
    return store.create('message', { 
      messageId,
      deliveredTo: deliveredTo,
      account: deliveredTo[0], // TODO: fix get from OAuth or user/pass
      receivedDate,
      subject,
      mail,
      hash,
      attributes 
    })
  }

  const storeAttachment = attachment => {
    return store.create('attachment', { 
      messageId,
      account: deliveredTo[0],
      hash,
      attributes,
      attachment
    })
  }

  const storeAttachments = (attachments = []) =>
    attachments.map(attachment => 
      storeAttachment(attachment).then(entry => {
        mailEmitter.emit('attachment/saved', entry);
        return entry
      })
    )

  Promise.all(storeAttachments(mail.attachments))
    .then((attachments) => storeMessage(mail, attachments))
    .then((entry) => mailEmitter.emit('mail/saved', entry))
    .catch(err => debug('Failed to save message', err))
})

function generateMailHash(mail) {
  const hash = sha1(JSON.stringify({
    messageId: mail.messageId,
    deliveredTo: mail.deliveredTo,
    subject: mail.subject,
    receivedDate: mail.receivedDate
  }));
  return hash;
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
require('../../lib/processOnExit')(handleAppExit)
