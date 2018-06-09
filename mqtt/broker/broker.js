var mqtt = require('mqtt')
var mosca = require('mosca')
var debug = require('debug')('mail-sync:broker')
var config = require('../config')
var authenticator = require('./authenticator')
var url = require('url')

var mqttUrl = url.parse(config.mqtt.url)
var HOST = process.env.HOST || mqttUrl.hostname
var PORT = parseInt(process.env.PORT || mqttUrl.port || 1883, 10)

var backend = {
  mqtt: {
    type: 'mqtt',
    json: false,
    mqtt,
    host: HOST,
    port: PORT
  },
  mongo: {
    //using ascoltatore
    type: 'mongo',		
    url: 'mongodb://localhost:27017/mqtt',
    pubsubCollection: 'ascoltatori',
    mongo: {}
  }
}

var persistence = {
  mongo: {
    factory: mosca.persistence.Mongo,
    url: 'mongodb://localhost:27017/mqtt'
  },
  memory: {
    factory: mosca.persistence.Memory
  }
}

var moscaSettings = {
  port: PORT,
  persistence: persistence.memory
}

var server = new mosca.Server(moscaSettings)

Object.assign(server, authenticator)

server.on('ready', function() {
  debug('Mosca server is up and running on port mqtt://%s:%s', HOST, PORT)
})

server.on('clientConnected', function(client) {
	debug('client connected', client.id)
})

server.on('published', function(packet, client) {
  debug('Published', packet.topic, packet.payload.toString().substr(0, 100))
})

debug('Starting mosca...')