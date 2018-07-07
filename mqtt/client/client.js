const mqtt = require("mqtt");
const mqttTransport = require("../lib/mqtt");
const api = require('../../store/adapters/api')
const config = require('../config')

const debug = require("debug")("mail-sync:client");

const isDev = process.env.NODE_ENV === 'development'

const MQTT_HOST = process.env.MQTT_HOST || config.mqtt.url;
const userId = process.env.USERID;
const accountId = process.env.ACCOUNTID || (isDev && 'gabe@fijiwebdesign.com');

if (!userId && !accountId) {
  throw new Error('Please supply a USERID or ACCOUNTID')
}

start()

function start() {
  const getUser = userId 
    ? api.getUserById(userId) 
    : api.getUserByAccountId(accountId)
  getUser.then(user => {
    if (!user) throw new Error('User not found')
    connect(user)
  })
  .catch(error => debug('Error getUserById', error))
}

function connect(user) {

  const mqttOptions = {
    clientId: user.id,
    username: user.id,
    password: user.user.xOAuth2Token
  }

  debug('Connecting to ', MQTT_HOST, 'as', user.id)
  const client = mqtt.connect(MQTT_HOST, mqttOptions);
  const transport = new mqttTransport({
    id: 'channelId',
    client
  });

  transport.once("connect", () => createChannel(transport, user));
}

function createChannel(transport, user) {
  debug('Subscribing to server')
  const channelId = 'client/' + user.account
  const channel = transport.channel(channelId);
  subscribe(channel, user)
}

function subscribe(channel, user) {
  debug("On secure channel");
  channel.subscribe("imap/connected", () => {
    debug("connected to mail sync broker");
  });
  channel.subscribe("imap/mailbox", message => {
    debug("connected to mailbox", message);
  });
  channel.subscribe("imap/mail", ({ mail }) => {
    debug("mail", mail.subject);
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
  channel.subscribe("mail/action", entry => {
    debug('mail action', entry)
  });
  channel.subscribe("mail/saved", entry => {
    debug('mail saved', entry.id, entry.subject)
  });

  setTimeout(
    () => channel.publish("imap/sync", { username: user.account }),
    2000)
}
