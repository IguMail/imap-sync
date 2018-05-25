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

module.exports = adapter;
