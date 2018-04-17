const EventEmitter = require("events").EventEmitter;
const util = require("util");
const debug = require("debug")("mail-sync:mqtt:channel");

/**
 *
 * @param {string} id Channel ID
 * @param {mqtt} client MQTT Client ./mqtt.js
 */
function MQTTChannel({ id, client }) {
  EventEmitter.call(this);
  this.id = id;
  this.client = client;
  this.client.on("connect", message => this.emit("connect", message));
}
util.inherits(MQTTChannel, EventEmitter);

MQTTChannel.prototype.subscribe = function(topic, fn) {
  const channelTopic = this.id + "/" + topic;
  debug("subscribe", channelTopic);
  return this.client.subscribe(channelTopic, fn);
};

MQTTChannel.prototype.publish = function(topic, message) {
  const channelTopic = this.id + "/" + topic;
  debug("publish", channelTopic, "len: " + (message && message.length));
  this.client.publish(channelTopic, message);
};

module.exports = MQTTChannel;
