/**
 * Storage interface
 */
function Storage(adapter) {
  this.adapter = adapter
}

Storage.prototype.Model = function(name) {
  return this.adapter.Model(name)
}

Storage.prototype.Collection = function(name) {
  return this.adapter.Collection(name)
}

Storage.prototype.connect = function(config, callback) {
  return this.adapter.connect(config, callback)
}

Storage.prototype.close = function(callback) {
  return this.adapter.close(callback)
}

module.exports = Storage