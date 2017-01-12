var storage = require('../../lib/rethinkdb/rethinkDbStorage')

process.env.DEBUG = 'test:*'
var debug = require('debug')('test:rethinkDbModel')

var config = {
  host: 'localhost',
  port: 28015,
  db: 'test'
}

var Storage = new storage()
var Model

Storage.connect(config, function(err) {
	if (err) throw err
  debug('Connected %o', config)

  Model = Storage.Model('users')

  // clean test table
  Storage.db.tableDrop('users').run(Storage.conn).then(function() {
    // create and insert dummy data
    createUser(function() {
      insertUser(function() {
        // do test
        testFilter()
      })
    })
  })
  
})

function createUser(callback) {
  debug('Creating users')

  Model.create(function(err, result) {
    if (err) throw err
    debug('result %o', result)
    callback(result)
  })
}

function insertUser(callback) {
  debug('Inserting user')
  Model.set({
    name: 'Gabe',
    age: 'irrelevant-now'
  }).insert(function(err, result) {
  	if (err) throw err
  	debug('insert:result %o', result)
    callback(result)
  })
}

function testFilter() {
  debug('testFilter')
  Model.filter({ name: 'Gabe' }).load(function(err, model) {
    if (err) throw err
    debug('Model:result %o', model);
    Storage.close()
  })
}
