var config = require('../config')
var debug = require('debug')('mail-sync:broker:auth')

// provides authentication for mosca
var Authenticator = {}

// initial connection user/pass auth
Authenticator.authenticate = function(client, username, password = '', callback) {
  debug('authenticate', client.id, username, password.toString())
  var authenticated = false
  if (username === 'ai') {
    // ai needs accessToken
    authenticated = config.ai.accessToken === password.toString()
  } else if (username === 'publisher') {
    // publishers need accessToken
    authenticated = config.publisher.accessToken === password.toString()
  } else {
    // clients/subscribers need OAuthToken
    authenticated = true // TODO: Implement
  }
  // save username so we can use it later
  if (authenticated) {
    client.username = username
  }
  callback(null, authenticated);
}

// acl for publishing
Authenticator.authorizePublish = function(client, topic, payload, callback) {
  debug('authorizePublish', client.id, topic, true)
  authorized = false
  // publishers can publish to any topic
  if (client.username === 'publisher') {
    authorized = true
  }
  // clients/subscribers can only publish to their username namespaced topic
  if (client.username === 'publisher') {
    if (topic.indexOf('client/' + client.username) === 0) authorized = true
  }
  callback(null, true);
}

// acl for subscribe
Authenticator.authorizeSubscribe = function(client, topic, callback) {
  var authorized = false
  // ai and publisher can subscribe to any topic
  if (client.username === 'ai' || client.username === 'publisher') {
    authorized = true
  // clients can only subscribe to their username namespaced topic
  } else {
    if (topic.indexOf('client/' + client.username) === 0) authorized = true
  }
  debug('authorizeSubscribe', client.id, topic, authorized)
  callback(null, authorized);
}

module.exports = Authenticator