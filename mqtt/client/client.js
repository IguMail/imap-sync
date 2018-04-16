const mqtt = require("mqtt");
const MQTTChannel = require("../lib/channel");
const mqttClientLib = require("../lib/mqtt");
const PromiseEmitter = require("../../lib/PromiseEmitter");
const debug = require("debug")("mail-sync:client");

var MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
var client = mqtt.connect(MQTT_HOST);
var promised = new PromiseEmitter(client);
var mqttClient = new mqttClientLib({ id: "foo", client });

var mailState = "";
var connected = false;
var xOAuth2 = require("../../session").xOAuth2; // mocked
var channel = new MQTTChannel({
  client: mqttClient,
  id: "foo"
});

mqttClient.on("connect", () => {
  setTimeout(() => {
    mqttClient.publish("auth", {
      id: "foo",
      xOAuth2
    });
    channel.subscribe("connection", () => {
      debug("connected to mail broker");
    });
    channel.subscribe("imap/connected", message => {
      debug("connected to mailbox", message);
    });
    channel.subscribe("imap/mail", message => {
      debug("mail", message);
    });
    channel.subscribe("imap/uids", message => {
      debug("uids", message);
    });
  }, 1000);
});
