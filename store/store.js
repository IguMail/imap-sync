// Use Container instead of DataStore on the server
const Container = require("js-data").Container;
const adapter = require("./adapter");

// Create a store to hold your Mappers
const store = new Container();

store.registerAdapter("rethinkdb", adapter, { default: true });
store.defineMapper("message");
store.defineMapper("attachment");
store.defineMapper("user");

module.exports = store;
