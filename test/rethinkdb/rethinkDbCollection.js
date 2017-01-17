var storage = require('../../lib/rethinkdb/rethinkDbStorage')
var promise = require('bluebird')
var debug = require('debug')('test:rethinkDb:Collection')

var config = {
  host: 'localhost',
  port: 28015,
  db: 'test'
}

var Storage = new storage()

Storage.connect(config, function(err) {
	if (err) throw err
  debug('Connected')

  var Users = Storage.Collection('users')
  Users.remove(function(err, result) {
    err && debug('Error removing users:', err)
    createUser(function() {
      insertUser().then(function() {
        testFilter().then(testPromise)
      })
    })
  })
})

function createUser(callback) {
  debug('Creating users')

  var Users = Storage.Collection('users')
  return Users.create(function(err, result) {
    if (err) throw err
    debug('createUser:result', result)
    callback(result)
  })
}

function insertUser(callback) {
  debug('Inserting Users')
  var Users = Storage.Collection('users')
  var promises = []
  for(var i = 0; i < 5; i++) {
    promises.push(
      Users.insert({
        name: 'Gabe',
        date: new Date(),
        age: 'unknown'
      }))
  }

  return promise.all(promises).then(function(result) {
      debug('Users inserted', result)
      callback && callback(result)
    }).catch(function(err) {
      throw err
    })
}

function testFilter() {
  debug('testFilter')
  var Users = Storage.Collection('users')
  return Users.filter({ name: 'Gabe' })
    .limit(3)
    .run(function(err, result) {

      result.toArray(function(err, result) {
        if (err) throw err;
        debug('testFilter:toArray:result', result)
      })
    })
}

function testPromise() {
  debug('testPromise')
  var Collection = Storage.Collection('users')
  return Collection.filter({name: 'Gabe'})
    .limit(3)
    .then(function(result) {
      return result.toArray(function(err, result) {
        debug('testPromise:toArray:result', result)
      })
    })
    .catch(function(result) {
      debug('testPromise:catch', result)
    })
    .finally(function() {
      debug('testPromise:finally')
      Storage.close()
    })
}
