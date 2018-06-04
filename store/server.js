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
  res.json({
    "welcome": "Mail Sync API",
    "documentation": "https://documenter.getpostman.com/view/1833462/RW1aKffZ"
  });
});

app.use('/messages', require('./routes/messages'))
app.use('/attachments', require('./routes/attachments'))
app.use('/account', require('./routes/account/messages'))
app.use('/account', require('./routes/account/threads'))
app.use('/account', require('./routes/account/accounts'))
app.use('/account', require('./routes/account/sendMail'))

// unhandled requests
app.use(function(req, res, next) {
  debug('404', req.url, req.params, req.query, req.body)
  res.status(404)
  res.json({ error: 'Not found' })
});

app.use(function (error, req, res, next) {
  debug('Error', error)
  res.status(error.status || 500)
  res.send({
    error: error.message,
    stack: error.stack
  })
})

process.on('uncaughtException', function(error) {
  debug('Error uncaughtException', error)
})

process.on('unhandledRejection', function(reason, p){
  debug('Error unhandledRejection', reason, p)
});

app.listen(PORT, function() {
  console.log("Example app listening on port", PORT)
  process.env.OPEN && openurl("http://localhost:" + PORT + "/messages")
  debug('Debugging enabled.')
});

module.exports = app;
