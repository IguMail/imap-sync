const express = require("express");
const store = require("./store");
const openurl = require("openurl").open;

const app = express();

app.get("/", function(req, res) {
  res.send("Hello!");
});

function buildQuery(req) {
  return new Promise((resolve) => {
    const offset = req.query.offset || 0
    const limit = req.query.limit || 5
    let query = {
      offset,
      limit,
      orderBy: [
        ['receivedDate', 'DESC']
      ],
      where: {}
    };
    if (req.query.messageId) {
      query.where.messageId = {
        '=': req.query.messageId
      }
    }
    if (req.query.since) {
      store
        .find("message", req.query.since)
        .then(message => {
          query.where.receivedDate = {
            '>=': message.receivedDate
          }
          resolve(query)
        })
        .catch(err => {
          console.log("Error", err);
        });
    } else {
      resolve(query)
    }
  })
}

app.use(function(req, res, next) {
  buildQuery(req).then(query => {
    req.messagesQuery = query
    next()
  })
})

app.get("/messages", function(req, res) {
  const messagesQuery = req.messagesQuery
  store
    .findAll('message', messagesQuery)
    .then(message => {
      console.log("message", message);
      res.json(message);
    })
    .catch(err => {
      console.log("Error", err);
    });
});

app.get("/messages/:id", function(req, res) {
  store
    .find("message", req.params.id)
    .then(message => {
      console.log("message", message);
      res.json(message);
    })
    .catch(err => {
      console.log("Error", err);
    });
});

app.get("/account/:account/messages", function(req, res) {
  const messagesQuery = req.messagesQuery
  messagesQuery.deliveredTo = req.params.account
  store
    .findAll('message', messagesQuery)
    .then(message => {
      console.log("message", message);
      res.json(message);
    })
    .catch(err => {
      console.log("Error", err);
    });
});

app.get("/account/:account/messages/:id", function(req, res) {
  store
    .find("message", req.params.id)
    .then(message => {
      console.log("message", message);
      if (message.mail.deliveredTo === req.query.account) {
        res.json(message);
      } else {
        res.json(null);
      }
    })
    .catch(err => {
      console.log("Error", err);
    });
});

app.listen(3000, function() {
  console.log("Example app listening on port 3000!");
  process.env.OPEN && openurl("http://localhost:3000/messages");
});

module.exports = app;
