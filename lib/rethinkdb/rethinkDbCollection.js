var r = require('rethinkdb')

/**
 * Collection Interface Implementation for rethinkDb
 */
var Collection = function(Storage, name) {
	this.conn = Storage.conn
	this.name = name
	this.db = Storage.db
	this.table = this.db.table(name)
}

Collection.prototype.create = function(callback) {
	var self = this
	this.db.tableCreate(this.name).run(this.conn, function(err, result) {
		callback && callback.call(self, err, result)
	})
	return this
}

Collection.prototype.filter = function(filter) {
	var result = this.table.filter(this._parseFilter(filter))
	return this
}

Collection.prototype.run = function(callback) {
	var self = this
	this.table.run(this.conn, function(err, result) {
		callback && callback.call(self, err, result)
	})
	return this
}

Collection.prototype.insert = function(model, callback) {
	var self = this
	console.log('model', model)
	this.table.insert(model).run(this.conn, function(err, result) {
		callback && callback.call(self, err, result)
	})
	return this
}

Collection.prototype.update = function(model, callback) {
	var self = this
	this.table.update(model).run(this.conn, function(err, result) {
		callback && callback.call(self, err, result)
	})
	return this
}

/**
 * use the filter directly for now
 */
Collection.prototype._parseFilter = function(filter) {
	return filter
}

module.exports = Collection
