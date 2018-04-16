const mqtt = require("mqtt");

const MQTT_HOST = process.env.MQTT_HOST || "mqtt://broker.hivemq.com";
const MQTT_PORT = process.env.MQTT_PORT || 1883;

const io = require("socket.io");

module.exports = function createServer(host = MQTT_HOST, port = MQTT_PORT) {
  const client = new mqtt.MQTTClient(host, port, "pusher");

  io.sockets.on("connection", socket => {
    socket.on("subscribe", data => {
      console.log(`Subscribing to ${data.topic}`);
      socket.join(data.topic);
      client.subscribe(data.topic);
    });
  });

  client.addListener("mqttData", (topic, payload) => {
    console.log("Received mqttData", topic, payload);
    io.sockets.in(topic).emit("mqtt", {
      topic: String(topic),
      payload: String(payload)
    });
  });

  return io;
};
