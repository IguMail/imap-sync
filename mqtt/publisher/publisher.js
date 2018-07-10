/**
 * Mail Sync Publisher
 */
const debug = require("debug")("mail-sync:mqtt:pub");
const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const MailEventEmitter = require('events').EventEmitter;
const store = require('../../store/store');
const MailSync = require("../../sync");
const imapConfig = require("../../config/imap");
const config = require('../config')
const { generateMailHash, getDeliveredTo } = require('../lib/utils')
const striptags = require('striptags')
const api = require('../../store/adapters/api')

const MQTT_HOST = process.env.MQTT_HOST || config.mqtt.url
const uid = require('hat')(64)
const mailboxRecursionDepth = 2

const mailEmitter = new MailEventEmitter();

// MQTT Client 
let client, transport
const mailSyncs = new Map()

global.mailSyncs = mailSyncs // debugging

connect()

function connect() {
  debug("Connecting to host", MQTT_HOST);
  const mqttOptions = {
    clientId: 'publisher-' + uid,
    username: 'publisher',
    password: config.publisher.accessToken
  }
  client = mqtt.connect(MQTT_HOST, mqttOptions);
  transport = new mqttTransport({ id: "server", client });
  transport.on("connect", () => onConnected(transport))
}

function onConnected(transport) {
  debug("Server connected, subscribing...")
  transport.subscribe("client/+/imap/sync", ({username, password}) => {
    const accountId = username
    const xOAuth2Token = password
    debug('Sync requested by ', accountId, xOAuth2Token)
    findAccounts(accountId)
      .then(accounts => {
        accounts.forEach(account => {
          const channelId = 'client/' + account.account
          debug('creating channel', channelId)
          const channel = transport.channel(channelId)
          syncMailAccount(channel, account)
        })
      })
      .catch(err => debug('Failed to find accounts', err))
  })
}

function findAccounts(accountId) {
  debug('Finding mail accounts', accountId)
  return store.findAll('account', {
    account: accountId
  })
}

function syncMailAccount(channel, user) {
  channel.publish("imap", {
    state: "connecting"
  });

  // create a mail sync
  if (!mailSyncs.has(user)) {
    debug('Creating a new mail sync for user', user)
    mailSyncs.set(user, createMailSync(user, channel, 'INBOX', mailboxRecursionDepth))
  // start existing if stopped
  } else {
    debug('Existing mail sync for user', user)
    const sync = mailSyncs.get(user)
    if (sync.imap.state === 'disconnected') {
      debug('MailSync disconnected, connect')
      sync.start()
    } else {
      debug('MailSync already connected')
      sync.fetchNewMail()
    }
  }
  
}

function syncBoxes(user, boxes, path, cb, recursionDepth = 0) {
  const currBoxName = Object.keys(boxes).shift()
  debug('syncBoxes', { user, currBoxName, boxes, path })
  if (!path)
    path = '';
  for (let key in boxes) {
    const box = boxes[key]
    const boxPath = path + key
    if (box.children && recursionDepth)
      syncBoxes(user, box.children, boxPath + box.delimiter, recursionDepth--)
    else {
      debug('boxName: ' + key);
      if (key === currBoxName) continue
      cb && cb(boxPath)
    }
  }
}

function createMailSync(user, pubsub, mailbox, recursionDepth = 0) {
  const opts = {
    ...imapConfig,
    mailParserOptions: {
      streamAttachments: false // TODO: stream attachments
    },
    attachments: false, // never save attachments to file
    xoauth2: user.user.xOAuth2Token,
    mailbox
  }
  const mailSync = new MailSync(opts);

  debug("MailSync Authenticating: ", opts);

  mailSync.start(); // start listening
  mailSync.children = new Map() // child mailbox connections

  mailSync.on("connected", function() {
    debug("imapConnected");
    pubsub.publish("imap/connected");

    const imap = mailSync.imap

    return // TODO: maybe recurse
    if (recursionDepth) {
      imap.getSubscribedBoxes((err, boxes, path) => {
        syncBoxes(user, boxes, path, boxPath => {
          mailSync.children.set(boxPath, createMailSync(user, pubsub, boxPath, 0))
        }, recursionDepth--)
      })
    }

  });

  mailSync.on("mailbox", function(mailbox) {
    debug("mailbox open: ", mailbox);
    pubsub.publish("imap/mailbox", mailbox);
  });

  mailSync.on("disconnected", function() {
    debug("imapDisconnected, restart");
    setTimeout(() => {
      mailSync.start()
    }, 1000)
  });

  mailSync.on("error", function(error) {
    debug("Error", error);
    pubsub.publish("imap/error", { error });
    // todo: backoff timer
    if (error && error.source === 'timeout') {
      setTimeout(() => {
        mailSync.restart()
      }, 5000)
    }
    if (error && error.source === 'authentication') {
      const { refreshToken, email } = user.user
      debug('Refreshing token for user', user)
      api.refreshToken('google', refreshToken, function(err, accessToken, refreshToken) {
        if (err) {
          debug('Failed to refresh token', err, accessToken, refreshToken)
          return err
        }
        debug('Refreshed token', accessToken, refreshToken)
        user.user.accessToken = accessToken
        user.user.xOAuth2Token = api.buildXOAuth2Token(email, accessToken)
        mailSync.imap._config.xoauth2 = user.user.xOAuth2Token // TODO: create new imap instance
        user.user.updatedAt = new Date()
        user.save()
          .then(user => {
            debug('Saved user with new token', user)
            mailSync.restart()
          })
      })
    }
  });

  mailSync.on("uids", function(uids) {
    debug("received %s uids", uids.length);
    pubsub.publish("imap/uids", uids);
  });

  mailSync.on("mail", function(mail, seqno, attributes) {
    // do something with mail object including attachments
    debug("mail", attributes, seqno, mail.subject, mail.date);
    pubsub.publish("imap/mail", {
      mail,
      seqno,
      attributes
    });
    mailEmitter.emit("imap/mail", {
      pubsub,
      user,
      mail,
      seqno,
      attributes
    });
  });

  mailSync.on("attachment", function({ mail, attachment }) {
    debug("attachment", mail.subject, attachment);
    const { messageId, subject, inReplyTo, from, to } = mail;
    pubsub.publish("imap/attachment", 
    { 
      mail: {
        messageId, subject, inReplyTo, from, to
      }, 
      attachment 
    });
  });

  return mailSync;
}

/**
 * All Mail events
 */
mailEmitter.on('imap/mail', ({ pubsub, user, mail, seqno, attributes }) => {
  const {
    messageId,
    receivedDate,
    subject,
    text,
    html
  } = mail;
  const deliveredTo = getDeliveredTo(user, mail)
  const hash = generateMailHash(mail)

  const snippet = (text || (html && striptags(html)) || '').substr(0, 200)

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
      account: user.account, // TODO: fix get from OAuth or user/pass
      receivedDate,
      subject,
      mail,
      hash,
      seqno,
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
  
  // check mail exists before store
  store.findAll('message', {
    messageId,
    hash
  }).then(messages => {
    if (messages && messages.length > 0) {
      return debug('Message exists in storage', messageId, hash, subject, snippet.substr(0, 200))
    }
    Promise.all(storeAttachments(mail.attachments))
    .then((attachments) => storeMessage(mail, attachments))
    .then((entry) => mailEmitter.emit('mail/saved', { pubsub, user, entry } ))
    .catch(err => debug('Failed to save message', err))
  })
  
})

/**
 * Publish mail save
 */
mailEmitter.on('mail/saved', ({ pubsub, entry }) => {
  transport.publish('mail/saved', entry) // ai
  pubsub.publish("mail/saved", entry) // user channel
})

/**
 * Want to notify client that mail is disconnected before shutting down
 */
function handleAppExit(options, err) {
  try {
    if (err) {
      console.error("App exited due to error", err)
      transport.publish("app/error", err)
    }
    if (options.cleanup) {
      transport.publish("mail/connected", false)
    }
    if (options.exit) {
      process.exit();
    }
  } catch(e) { /* ignore fails */ }
}
require('../../lib/processOnExit')(handleAppExit)
