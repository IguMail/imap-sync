var storage = require('../../lib/rethinkdb/rethinkDbStorage')

var config = { 
host: 'localhost',
  port: 28015,
  db: 'test'
}

var Storage = new storage()

Storage.connect(config, function() {
	console.log('Connected', arguments)

	var Model = Storage.Model('auth')
	console.log('Model', Model)

	var Collection = Storage.Collection('auth')
	console.log('Collection', Collection)

})


