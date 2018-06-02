// Use Container instead of DataStore on the server
const Container = require("js-data").DataStore;
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
