const express = require("express");
const store = require("./store");
const openurl = require("openurl").open;

const app = express();

app.get("/", function(req, res) {
  res.send("Hello!");
});

function stripHtml(text) {
  return text.replace(/<(?:.|\n)*?>/gm, '')
}

function getTextSnippet(text, len = 200) {
  return text.replace(/[\r\n\s\t]+/ig, ' ').substr(0, len)
}

function findAllMessagesFromReq(req, filter = {}) {
  return new Promise((resolve, reject) => {
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
    if (filter) {
      query.where = Object.assign(query.where, filter);
    }
    if (req.query.messageId) {
      query.where.messageId = {
        '==': req.query.messageId
      }
    }
    if (req.query.since) {
      store
        .find("message", req.query.since)
        .then(message => {
          if (message) {
            query.where.receivedDate = {
              '>=': message.receivedDate
            }
          } else {
            reject({err: 'Invalid since parameter'});
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
  .then(query => store.findAll('message', query))
}

function getMessageListFormat(messages) {
  return messages.map(message => getMessageForListFormat(message))
}

function getMessageForListFormat(message) {
  return {
    id: message.id,
    messageId: message.messageId,
    account: message.account,
    subject: message.mail.headers.subject,
    from: message.mail.from,
    to: message.mail.to,
    deliveredTo: message.deliveredTo,
    date: message.mail.headers.date,
    receivedDate: message.mail.receivedDate,
    snippet: getTextSnippet(message.mail.text || stripHtml(message.mail.html))
  }
}

app.get("/messages", function(req, res) {
  findAllMessagesFromReq(req)
    .then(messages => {
      console.log("messages", messages);
      res.json(getMessageListFormat(messages));
    })
    .catch(err => {
      console.log("Error", err);
      res.json(err);
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
      res.json(err);
    });
});

app.get("/account/:account/messages", function(req, res) {
  const account = req.params.account
  const filter = {
    'account': {
      '==': account
    }
  }
  findAllMessagesFromReq(req, filter)
    .then(messages => {
      console.log("messages", messages);
      res.json(getMessageListFormat(messages));
    })
    .catch(err => {
      console.log("Error", err);
      res.json(err);
    });
});

app.get("/account/:account/messages/:id", function(req, res) {
  const account = req.params.account
  store
    .find("message", req.params.id)
    .then(message => {
      console.log("message", message);
      if ( message.account === account) {
        res.json(message);
      } else {
        res.json(null);
      }
    })
    .catch(err => {
      console.log("Error", err);
      res.json(err);
    });
});

app.listen(3000, function() {
  console.log("Example app listening on port 3000!");
  process.env.OPEN && openurl("http://localhost:3000/messages");
});

module.exports = app;
