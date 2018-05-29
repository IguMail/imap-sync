const express = require('express')
const router = express.Router()
const store = require("../store")
const {
  findAllMessagesFromReq,
  getMessageListFormat,
  getMessageListDebugFormat
} = require('./utils')
const debug = require('debug')('mail-sync:messages/')

router.get("/", function(req, res) {
  findAllMessagesFromReq(req)
    .then(messages => {
      debug("messages", getMessageListDebugFormat(messages));
      res.json(getMessageListFormat(messages));
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

router.get("/:id", function(req, res) {
  store
    .find("message", req.params.id)
    .then(message => {
      debug("message", message.id);
      res.json(message);
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

router.post("/update/:id", function(req, res) {
  store
    .find("message", req.params.id)
    .then(message => {
      debug("message", message.id);
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

module.exports = router