var mosca = require('mosca')
var debug = require('debug')('mail-sync:broker')
var config = require('../config')
var authenticator = require('./authenticator')

var PORT = process.env.PORT || 1883

var mongo = {
  //using ascoltatore
  type: 'mongo',		
  url: 'mongodb://localhost:27017/mqtt',
  pubsubCollection: 'ascoltatori',
  mongo: {}
}

var moquitto = {
  type: 'mqtt',
  json: false,
  mqtt: require('mqtt'),
  host: '127.0.0.1',
  port: 1883
}

var persistence = {
  factory: mosca.persistence.Mongo,
  url: 'mongodb://localhost:27017/mqtt'
}

var moscaSettings = {
  port: PORT,
  backend: {}, // mqtt
  persistence: {} // persistence
}

var server = new mosca.Server(moscaSettings)

Object.assign(server, authenticator)

server.on('ready', function() {
  debug('Mosca server is up and running on port ', PORT)
})

server.on('clientConnected', function(client) {
	debug('client connected', client.id)
})

server.on('published', function(packet, client) {
  debug('Published', packet.payload.toString().substr(0, 100))
})

debug('Starting mosca...')