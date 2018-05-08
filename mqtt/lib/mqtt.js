const EventEmitter = require("events").EventEmitter;
const util = require("util");
const MQTTChannel = require("./channel");
const debug = require("debug")("mail-sync:mqtt:mqtt");

function mqtt({ id, client }) {
  EventEmitter.call(this);
  this.id = id;
  this.client = client;
  this.channels = {};

  this.client.on("message", (topic, message) => {
    var unserialized = this.unserialize(message);
    debug(
      "Received message",
      topic,
      "len: " + message.length,
      this.stringifyDebugMessage(unserialized)
    );
    this.emit(topic, unserialized);
  });

  this.client.on("connect", message => this.emit("connect", message));
}
util.inherits(mqtt, EventEmitter);

/**
 * Create a channel
 * @param {string} id Channel id
 */
mqtt.prototype.channel = function(id) {
  const channel = this.channels[id] || new MQTTChannel({ client: this, id });
  this.channels[id] = channel;
  return channel;
};

/**
 * Serialize Object to JSON String Buffer
 * @param {Object} message
 */
mqtt.prototype.serialize = function(message) {
  try {
    return Buffer.from(JSON.stringify(message));
  } catch (e) {
    console.error("Failed to serialize message", message);
    return null;
  }
};

/**
 * Unserialize JSON String Buffer to JSON Object
 * @param {Buffer} message
 */
mqtt.prototype.unserialize = function(message) {
  const jsonStr = message.toString();
  if (!jsonStr) {
    return jsonStr; // empty message
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    debug("Failed to unserialize message", message, jsonStr);
    return null;
  }
};

mqtt.prototype.subscribe = function(topic, fn) {
  debug("Subscribing to topic", topic);
  this.client.subscribe(topic);
  if (fn) {
    this.on(topic, message => {
      debug("Receive subscribed message", topic);
      fn(message);
    });
  }
};

mqtt.prototype.publish = function(topic, message) {
  const serialized = this.serialize(message);
  debug("pulish message", topic, this.stringifyDebugMessage(message));
  this.client.publish(topic, serialized);
};

mqtt.prototype.stringifyDebugMessage = function(message = "", length = 100) {
  let str;
  try {
    str = JSON.stringify(message);
  } catch (e) {
    str = "";
  }
  return typeof str === 'string' ? str.substr(0, length) + (str.length > length ? "..." : "") : str;
};

module.exports = mqtt;
