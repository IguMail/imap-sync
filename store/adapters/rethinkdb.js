const RethinkDBAdapter = require("js-data-rethinkdb").RethinkDBAdapter;

// Create an instance of RethinkDBAdapter
const adapter = new RethinkDBAdapter({
  rOpts: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 28015,
    db: process.env.DB_DATABASE || "mail",
    authKey: process.env.DB_AUTH_KEY || ""
  },
  debug: process.env.DB_DEBUG || false
});

// custom table queries
// If changing adapters, you'll need to implement rethinkdbdash table interface
// https://github.com/neumino/rethinkdbdash
adapter.table = function(table) {
  return adapter.r.table(table)
}

module.exports = adapter;
