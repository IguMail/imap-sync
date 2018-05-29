const express = require('express')
const router = express.Router()
const store = require("../../store")
const debug = require('debug')('mail-sync:account/messages')
const {
  findAllMessagesFromReq,
  getMessageListFormat,
  getMessageListDebugFormat
} = require('../utils')

router.get("/:account/messages", function(req, res) {
  const account = req.params.account
  const filter = {
    'account': {
      '==': account
    }
  }
  if (!account) {
    throw new Error('Account required')
  }
  findAllMessagesFromReq(req, filter)
    .then(messages => {
      debug("messages", getMessageListDebugFormat(messages));
      res.json(getMessageListFormat(messages));
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

router.get("/:account/messages/:id", function(req, res) {
  const account = req.params.account
  store
    .find("message", req.params.id)
    .then(message => {
      debug("message", message.id);
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

module.exports = router