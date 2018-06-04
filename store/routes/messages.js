const express = require('express')
const router = express.Router()
const store = require("../store")
const {
  findAllMessagesFromReq,
  getMessageListFormat,
  getMessageListDebugFormat
} = require('./utils')
const { updateMessage } = require('../adapters/api')
const publisher = require('../publisher')
const debug = require('debug')('mail-sync:messages/')

function publish(topic, payload) {
  return publisher
    .connect()
    .then(
      transport => transport.publish(topic, payload)
    )
}

router.get("/", function(req, res, next) {
  findAllMessagesFromReq(req)
    .then(messages => {
      debug("messages", getMessageListDebugFormat(messages));
      res.json(getMessageListFormat(messages));
    })
    .catch(err => {
      debug("Error", err);
      next(err);
    });
});

router.get("/:id", function(req, res, next) {
  store
    .find("message", req.params.id)
    .then(message => {
      debug("message", message.id);
      res.json(message);
    })
    .catch(err => {
      debug("Error", err);
      next(err);
    });
});

router.post("/update/:id", function(req, res, next) {
  store
    .find("message", req.params.id)
    .then(message => {
      if (!message) return next(new Error('Message not found'))
      debug("update message", message.id);
      var update = req.body
      if ('mail' in update || 'updates' in update) {
        return next(new Error('Immutable properties mail, updates cannot be updated'))
      }
      return updateMessage(message, update).then(() => {
        debug('updated message', message.id)
        res.json({
          message
        })
        publish('mail/action', 
          {
            type: 'update',
            message,
            update
          })
          .then(() => debug('pubished update', message.id))
      })
    })
    .catch(err => {
      debug("Error", err);
      return next(err);
    });
});

router.post("/delete/:id", function(req, res, next) {
  store
    .find("message", req.params.id)
    .then(message => {
      if (!message) return next(new Error('Could not find message'))
      debug("delete message", message.id);
      var update = {
        deleted: true
      }
      return updateMessage(message, update)
      .then(() => {
        debug("delete message", message.id, update);
        res.json({
          message
        });
        publish('mail/action', 
          {
            type: 'delete',
            message,
            update
          })
          .then(() => debug('pubished update', message.id))
      })
    })
    .catch(err => {
      debug("Error", err);
      return next(err);
    });
});

router.post("/restore/:id", function(req, res, next) {
  store
    .find("message", req.params.id)
    .then(message => {
      if (!message) return next(new Error('Could not find message'))
      debug("restore message", message.id);
      var update = {
        deleted: false
      }
      return updateMessage(message, update)
      .then(() => {
        debug("restore message", message.id, update);
        res.json({
          message
        });
        publish('mail/action', 
          {
            type: 'restore',
            message,
            update
          })
          .then(() => debug('pubished update', message.id))
      })
    })
    .catch(err => {
      debug("Error", err);
      return next(err);
    });
});

router.post("/spam/:id", function(req, res, next) {
  store
    .find("message", req.params.id)
    .then(message => {
      if (!message) return next(new Error('Could not find message'))
      debug("spam message", message.id);
      var update = {
        spam: true
      }
      updateMessage(message, update)
      .then(() => {
        debug("spam message", message.id, update);
        res.json({
          message
        });
        publish('mail/action', 
          {
            type: 'spam',
            message,
            update
          })
          .then(() => debug('pubished update', message.id))
      })
    })
    .catch(err => {
      debug("Error", err);
      return next(err);
    });
});

router.post("/unspam/:id", function(req, res, next) {
  store
    .find("message", req.params.id)
    .then(message => {
      if (!message) return next(new Error('Could not find message'))
      debug("unspam message", message.id);
      var update = {
        spam: false
      }
      updateMessage(message, update)
      .then(() => {
        debug("unspam message", message.id, update);
        res.json({
          message
        });
        publish('mail/action', 
          {
            type: 'unspam',
            message,
            update
          })
          .then(() => debug('pubished update', message.id))
      })
    })
    .catch(err => {
      debug("Error", err);
      return next(err);
    });
});

router.post("/labels/update/:id", function(req, res, next) {
  const labels = req.body.labels
  if (!labels) return next(new Error('Labels required in request body'))
  store
    .find("message", req.params.id)
    .then(message => {
      if (!message) return next(new Error('Could not find message'))
      debug("update labels message", message.id);
      var update = {
        labels
      }
      updateMessage(message, update)
      .then(() => {
        debug("update labels message", message.id, update);
        res.json({
          message
        });
        publish('mail/action', 
          {
            type: 'labels/update',
            message,
            update
          })
          .then(() => debug('pubished update', message.id))
      })
    })
    .catch(err => {
      debug("Error", err);
      next(err);
    });
});

router.post("/labels/add/:id", function(req, res, next) {
  const labels = req.body.labels
  if (!labels) return next(new Error('Labels required in request body'))
  store
    .find("message", req.params.id)
    .then(message => {
      if (!message) return next(new Error('Could not find message'))
      debug("add labels message", message.id);
      var update = {
        labels: [
          ...message.labels,
          ...labels
        ]
      }
      updateMessage(message, update)
      .then(() => {
        debug("add labels message", message.id, update);
        res.json({
          message
        });
        publish('mail/action', 
          {
            type: 'labels/add',
            message,
            update
          })
          .then(() => debug('pubished update', message.id))
      })
    })
    .catch(err => {
      debug("Error", err);
      next(err);
    });
});

router.post("/labels/delete/:id", function(req, res, next) {
  const labels = req.body.labels
  if (!labels) return next(new Error('Labels required in request body'))
  store
    .find("message", req.params.id)
    .then(message => {
      if (!message) return next(new Error('Could not find message'))
      debug("delete labels message", message.id);
      var update = {
        labels: (message.labels || []).filter(label => !labels.includes(label))
      }
      updateMessage(message, update)
      .then(() => {
        debug("delete labels message", message.id, update);
        res.json({
          message
        });
        publish('mail/action', 
          {
            type: 'labels/delete',
            message,
            update
          })
          .then(() => debug('pubished update', message.id))
      })
    })
    .catch(err => {
      debug("Error", err);
      next(err);
    });
});

module.exports = router