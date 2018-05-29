const express = require("express");
const store = require("./store");
const openurl = require("openurl").open;
const debug = require('debug')('mail-sync:store:server')

const PORT = process.env.PORT || 3030

// TODO: remove For debugging
if (process.env.CLEAN_STORE) {
  store.destroyAll("message");
  store.destroyAll("attachment");
}

const app = express();

var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get("/", function(req, res) {
  res.send("Mail Sync API");
});

app.use('/messages', require('./routes/messages'))
app.use('/attachments', require('./routes/attachments'))
app.use('/account', require('./routes/account/messages'))
app.use('/account', require('./routes/account/threads'))

app.listen(PORT, function() {
  console.log("Example app listening on port", PORT);
  process.env.OPEN && openurl("http://localhost:" + PORT + "/messages");
});

module.exports = app;
