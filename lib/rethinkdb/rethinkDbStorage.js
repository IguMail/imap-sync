var rethinkdb = require('rethinkdb')
var model = require('./rethinkDbModel')
var collection = require('./rethinkDbCollection')

const MSG_NOT_CONNECTED = 'Not Connected to the rethinkdb database'

var default_config = { 
    host: 'localhost', 
    port: 28015
  }

/**
 * Storage interface implementation for RethinkDb
 */
function Storage(config) {
  this.config = config || default_config
}

Storage.prototype.Model = function(name) {
  if (!this.conn) throw new Error(MSG_NOT_CONNECTED)
  return new model(this, name)
}

Storage.prototype.Collection = function(name) {
  if (!this.conn) throw new Error(MSG_NOT_CONNECTED)
  return new collection(this, name)
}

Storage.prototype.connect = function(config, callback) {
  rethinkdb.connect(config, (err, conn) => {
    this.conn = conn
    this.db = rethinkdb.db(config.db)
    callback.call(this, err, conn)
  })
  return this
}

Storage.prototype.close = function(callback) {
  this.conn.close(callback)
  return this
}

module.exports = Storage