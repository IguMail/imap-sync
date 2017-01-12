/**
 * Model Interface Implementation for rethinkDb
 */
var Model = function(conn, db, name) {
	this.conn = conn
	this.name = name
	this.db = db
	this.table = this.db.table(name)
}

Model.prototype.filter = function(filter) {
	this.table.filter(this._parseFilter(filter))
}

Model.prototype.run = function(callback) {
	var self = this
	this.table.run(this.conn, function(err, result) {
		if(err) throw err;
		callback.call(self, result)
	})
}

Model.prototype._parseFilter = function(filter) {
	var rethinkFilter
	if (typeof filter == 'Array') {

	} else {
		Object.keys(filter).map(function(key) {
			var _filter = rethinkdb.row(key).eq(value)
			if (rethinkFilter) {
				rethinkFilter.and(_filter)
			} else {
				rethinkFilter = _filter
			}
		})
	}
	return rethinkFilter
}