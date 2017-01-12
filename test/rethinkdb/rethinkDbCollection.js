var storage = require('../../lib/rethinkdb/rethinkDbStorage')

var config = {
  host: 'localhost',
  port: 28015,
  db: 'test'
}

var Storage = new storage()
var Collection

Storage.connect(config, function(err) {
	if (err) throw err
  console.log('Connected', arguments)

  Collection = Storage.Collection('users')

  Collection.filter({ name: 'Gabe' }).run(function(err, result) {
    if (err) {
      createUser(function() {
        insertUser(testFilter)
      })
    } else {
      result.toArray(function(err, models) {
        console.log('Users', models)
        if (!models.length) {
          insertUser(testFilter)
        } else {
          testFilter()
        }
      })
    }
  })
})

function createUser(callback) {
  console.log('Creating users')

  Collection.create(function(err, result) {
    if (err) throw err
    console.log('result', result)
    callback(result)
  })
}

function insertUser(callback) {
  Collection.insert({
    name: 'Gabe',
    age: 'irrelevant-now'
  }).run(function(err, result) {
  	if (err) throw err
  	console.log('result', result)
    callback(result)
  })
}

function testFilter() {
  console.log('testFilter')
  Collection.filter({ name: 'Gabe' }).run(function(err, result) {

    result.toArray(function(err, result) {
      if (err) throw err;
      console.log('toArray:result', result);
      Storage.close()
    })
  })
}
