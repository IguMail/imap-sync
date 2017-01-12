
const MSG_NOT_LOADED = 'Please call set() or load() before updating or inserting the model'

/**
 * Model Interface Implementation for rethinkDb
 */
var Model = function(Storage, name) {
	this.model = null
	this.collection = Storage.Collection(name)
}

Model.prototype.create = function(callback) {
	var self = this
	this.collection.create(callback)
	return this
}

Model.prototype.filter = function(filter) {
	this.collection.filter(filter).table.limit(1)
	return this
}

Model.prototype.run = function(callback) {
	this.collection.run(callback)
	return this
}

Model.prototype.load = function(callback) {
	var self = this
	this.run(function(err, result) {
		if (err) throw err
		result.toArray(function(err, arr) {
			self.set(arr.pop())
			callback.call(self, err, self.model)
		})
	})
	return this
}

Model.prototype.set = function(model) {
	this.model = model
	return this
}

// todo
Model.prototype.insert = function(callback) {
	if (!this.model) {
		throw new Error(MSG_NOT_LOADED)
	}
	this.collection.insert(this.model, callback)
	return this
}

// todo
Model.prototype.update = function(callback) {
	if (!this.model) {
		throw new Error(MSG_NOT_LOADED)
	}
	this.collection.update(this.model, callback)
	return this
}

module.exports = Model
