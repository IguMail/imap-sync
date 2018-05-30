// Use Container instead of DataStore on the server
const Container = require("js-data").DataStore;
const adapter = require("./adapters/rethinkdb");

// Create a store to hold your Mappers
const store = new Container();

store.registerAdapter("rethinkdb", adapter, { default: true });
store.defineMapper("message");
store.defineMapper("attachment");
store.defineMapper("user");

// custom queries
// same interface as https://github.com/neumino/rethinkdbdash
store.table = adapter.table

module.exports = store;
