var r = require('rethinkdb')
var debug = require('debug')('rethinkdb:collection')

/**
 * Collection Interface Implementation for rethinkDb
 */
var Collection = function(Storage, name) {
	this.conn = Storage.conn
	this.name = name
	this.db = Storage.db
	this.table = this.db.table(name)
	this.query = this.table
	this.promise = null
}

Collection.prototype.create = function(callback) {
	var self = this
	this.promise = this.db.tableCreate(this.name).run(this.conn, function(err, result) {
		callback && callback.call(self, err, result)
	})
	return this
}

Collection.prototype.remove = function(callback) {
	var self = this
	
	this.promise = this.db.tableDrop(this.name)
		.run(this.conn, callback)
	return this
}

Collection.prototype.filter = function(filter) {
	this.query = this.query.filter(this._parseFilter(filter))
	return this
}

Collection.prototype.find = function(filter) {
	return this.filter(filter)
}

Collection.prototype.limit = function(limit) {
	this.query = this.query.limit(limit)
	return this
}

Collection.prototype.run = function(callback) {
	var self = this
	debug('run:query', this.query, this.table)
	this.promise = this.query.run(this.conn, function(err, result) {
			callback && callback.call(self, err, result)
		})
	return this
}

// this needs to return a proper Promise
Collection.prototype.then = function(callback) {
	var self = this
	if (!this.promise) {
		this.run()
	}
	this.promise.then(function() {
		callback && callback.apply(self, arguments)
	})
	return this
}

// this needs to return a proper Promise
Collection.prototype.catch = function(callback) {
	var self = this
	if (!this.promise) {
		this.run()
	}
	this.promise.catch(function() {
		callback && callback.apply(self, arguments)
	})
	return this
}

/**
 * this needs to return a proper Promise
 * we can't implement this in sync.
 * sync chaining of then().finally() will execute finally() first
 * We also need to return promises. 
 * So we can resolve those before resolving the next in the chain
 */
Collection.prototype.finally = function(callback) {
	var self = this
	if (!this.promise) {
		this.run()
	}
	this.promise.finally(function() {
		callback && callback.apply(self, arguments)
	})
	return this
}

Collection.prototype.insert = function(model, callback) {
	var self = this
	debug('model', model)
	this.promise = this.table.insert(model).run(this.conn, function(err, result) {
		callback && callback.call(self, err, result)
	})
	return this
}

Collection.prototype.update = function(model, callback) {
	var self = this
	this.promise = this.table.update(model).run(this.conn, function(err, result) {
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
