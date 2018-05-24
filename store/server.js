const express = require("express");
const store = require("./store");
const openurl = require("openurl").open;
const debug = require('debug')('mail-sync:store:server')

const PORT = process.env.PORT || 3030

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
    const limit = req.query.limit || 20
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
          debug("Error", err);
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
    snippet: getTextSnippet(message.mail.text || stripHtml(message.mail.html)),
    attachments: message.mail.attachments
  }
}

function streamAttachment(attachment, res) {
  res.setHeader("content-type", attachment.contentType || 'application/octet-stream')
  res.attachment(attachment.fileName)
  res.send(attachment.content)
}

app.get("/messages", function(req, res) {
  findAllMessagesFromReq(req)
    .then(messages => {
      debug("messages", messages);
      res.json(getMessageListFormat(messages));
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

app.get("/messages/:id", function(req, res) {
  store
    .find("message", req.params.id)
    .then(message => {
      debug("message", message);
      res.json(message);
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

app.post("/messages/update/:id", function(req, res) {
  store
    .find("message", req.params.id)
    .then(message => {
      debug("message", message);
      var update = req.body

      var original = JSON.parse(JSON.stringify(message))
      message = Object.assign(message, update)

      var updatedAt = new Date()

      if (!message.updates) {
        message.updates = []
      }
      message.updates.push({
        updatedAt,
        update
      })

      if (!message.original) {
        message.original = original
      }

      return message.save().then(() => {
        res.json({
          updatedAt,
          message
        });
      })
      
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

app.get("/attachments/download/:id", function(req, res) {
  store
    .find("attachment", req.params.id)
    .then(attachment => {
      debug("attachment", attachment);
      streamAttachment(attachment.attachment, res)
    })
    .catch(err => {
      debug("Error", err);
      res.json({
        err: err.message
      });
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
      debug("messages", messages);
      res.json(getMessageListFormat(messages));
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

app.get("/account/:account/messages/:id", function(req, res) {
  const account = req.params.account
  store
    .find("message", req.params.id)
    .then(message => {
      debug("message", message);
      if ( message.account === account) {
        res.json(message);
      } else {
        res.json(null);
      }
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

app.get("/account/:account/thread/:id", function(req, res) {
  const account = req.params.account
  store
    .find("message", req.params.id)
    .then(message => {
      debug("message", message);
      if ( message.account !== account) {
        return new Error('Invalid message Id')
      }
      return message
    })
    .then(message => {
      const subject = message.mail.subject
      findAllMessagesFromReq(req, entry => {
        const _subject = entry.mail.subject
        return (_subject === subject || _subject.replace(/^re\:/i, '') === subject.replace(/^re\:/i, ''))
        && entry.account === message.account
      })
      .then(messages => {
        debug("messages", messages);
        res.json({
          subject,
          messages: getMessageListFormat(messages)
        });
      })
    })
    .catch(err => {
      debug("Error", err);
      res.json({
        error: err.message  
      });
    })
});

app.listen(PORT, function() {
  console.log("Example app listening on port", PORT);
  process.env.OPEN && openurl("http://localhost:" + PORT + "/messages");
});

module.exports = app;
