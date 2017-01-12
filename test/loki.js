var loki = require('lokijs')
var db = new loki('./loki.db', {autoload: true})
var authCollection = db.addCollection('auth')

var peerId = 'test'
var data = { peerId: peerId, getXauth: 'yeah'}

//authCollection.insert(data)

db.saveDatabase()


var result = authCollection.find(data)
console.log('authCollection', result)

return

if (authModel.length) {
	console.log('updating', authModel, data)
	Object.assign(authModel, data)
	authCollection.update(authModel)
} else {
	console.log('inserting', data)
	authCollection.insert(data)
}

db.saveDatabase()