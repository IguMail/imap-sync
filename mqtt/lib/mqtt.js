const EventEmitter = require("events").EventEmitter;
const util = require("util");
const debug = require("debug")("mail-sync:mqtt:mqtt");

function mqtt({ id, client }) {
  EventEmitter.call(this);
  this.id = id;
  this.client = client;

  this.client.on("message", (topic, message) => {
    var unserialized = this.unserialize(message);
    debug("Received message", topic, unserialized);
    this.emit(topic, unserialized);
  });

  this.client.on("connect", message => this.emit("connect", message));
}
util.inherits(mqtt, EventEmitter);

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
      debug("Receive subscribed message", topic, message);
      fn(message);
    });
  }
};

mqtt.prototype.publish = function(topic, message) {
  const serialized = this.serialize(message);
  debug("pulish message", topic, serialized);
  this.client.publish(topic, serialized);
};

module.exports = mqtt;
