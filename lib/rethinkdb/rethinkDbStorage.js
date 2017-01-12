var rethinkdb = require('rethinkdb')
var model = require('./rethinkDbModel')

function Storage(config) {
  this.config = Object.assign({ 
    host: 'localhost', 
    port: 28015
  }, config || {})
}

Storage.prototype.Model = function(name) {
  return model(this,conn, this.db, name)
}

Storage.prototype.Collection = function(name) {
  return collection(this,conn, this.db, name)
}

Storage.prototype.connect = function(config, callback) {
  rethinkdb.connect(dbConfig, (err, conn) => {
    this.conn = conn
    this.db = rethinkdb.db(dbConfig.db)
    callback.call(this, err)
  })
}







