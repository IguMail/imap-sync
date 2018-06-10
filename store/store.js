// Use Container instead of DataStore on the server
// DataStore uses in-memory caching which can lead to stale results
const Container = require("js-data").Container;
const adapter = require("./adapters/rethinkdb");

// Create a store to hold your Mappers
const store = new Container();

store.registerAdapter("rethinkdb", adapter, { default: true });
store.defineMapper("message");
store.defineMapper("attachment");
store.defineMapper("user");

// expose adapter so you can create custom queries
store.adapter = adapter

module.exports = store;
