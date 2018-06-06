const express = require('express')
const router = express.Router()
const store = require("../../store")
const debug = require('debug')('mail-sync:account/threads')
const {
  findAllMessagesFromReq,
  getTheadId,
  findTheadMessages,
  getMessageListFormat,
  getMessageListDebugFormat
} = require('../utils')

router.get("/:account/threads", function(req, res) {
  const account = req.params.account
  const limit = req.query.limit || 20
  const threadReqLimit = 2 // TODO: remove when threads optimized
  const filter = {
    'account': {
      '==': account
    }
  }
  const threads = {}
  const threadMessages = (messages, threads = {}) => {
    messages.forEach(message => {
      const threadId = getTheadId(message)
      if (!threads[threadId]) threads[threadId] = []
      threads[threadId].push(message)
    })
    return threads
  }
  const flattenThreads = threads => {
    return Object.keys(threads).reduce((prev, key) => {
      return prev.concat(threads[key])
    }, [])
  }
  const getThreads = (reqLimit = 10, threads = {}) => {
    debug('getThreads: len %s reqLimit %s', Object.keys(threads).length, reqLimit)
    const messages = flattenThreads(threads)
    const req = {
      query: {
        limit: limit*2
      }
    }
    if (messages.length) {
      req.query.offset = messages.length
    }
    return findAllMessagesFromReq(req, filter)
      .then(messages => {
        if (!messages) {
          debug('findAllMessagesFromReq: no more messages found. End of messages.')
          return threads // end of collection
        }
        // merge messages into existing threads
        threads = threadMessages(messages, threads)
        const len = Object.keys(threads).length
        if(len < limit && reqLimit) {
          debug('getThreads: (more) reqLimit %s limit %s len %s', reqLimit, limit, len)
          return getThreads(reqLimit - 1, threads)
        }
        return threads
      })
  }
  
  getThreads(threadReqLimit)
  .then(threads => {
    debug('final threads', Object.keys(threads).length)
    res.json({
      threads: Object.keys(threads).map(key => {
        const messages = threads[key]
        return {
          subject: messages[0].subject,
          messages: getMessageListFormat(messages)
        }
      })
    });
  })
  .catch(err => {
    debug("Error", err);
    res.json({
      error: err.message  
    });
  })
});

router.get("/:account/threads/:id", function(req, res) {
  const account = req.params.account
  const id = req.params.id
  debug('thread for id', account, id)
  store
    .find("message", id)
    .then(message => {
      if (!message) {
        throw new Error('Could not find message to thread')
      }
      debug("thread:message", message.id);
      if ( !message || message.account !== account) {
        throw new Error('Failed to retrieve message')
      }
      return message
    })
    .then(message => {
      const subject = message.subject
      findTheadMessages(req, message)
      .then(messages => {
        debug("thread:messages", getMessageListDebugFormat(messages));
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

module.exports = router