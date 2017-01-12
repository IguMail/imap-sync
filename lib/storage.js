var loki = require('lokijs')
var db = new loki('../data/loki.db');

// todo

var auth = db.addCollection('auth')

users.insert({
    name: 'Odin',
    age: 50,
    address: 'Asgard'
});

// alternatively, insert array of documents
users.insert([{ name: 'Thor', age: 35}, { name: 'Loki', age: 30}]);

var results = users.find({ age: {'$gte': 35} });

var odin = users.findOne({ name:'Odin' });

var results = users.where(function(obj) {
    return (obj.age >= 35);
});

function Collection(name) {

	this.Col = db.addCollection(name)

	this.insert = function() {

	}

}

function Model(name) {

}

module.exports = {
	find: function() {

	},
	set: function() {

	}
}

