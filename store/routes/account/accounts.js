const express = require('express')
const router = express.Router()
const store = require("../../store")
const debug = require('debug')('mail-sync:account/accounts')
const {
  buildAccountsQueryFromReq
} = require('../utils')
const { getUserByAccountId } = require('../../adapters/api')
const jwt = require("jsonwebtoken")
const secret = require("../../../config/secret").secret

router.get("/:account/accounts", function(req, res) {
  const account = req.params.account
  const filter = {
    'account': {
      '==': account
    }
  }
  if (!account) {
    throw new Error('Account required')
  }
  buildAccountsQueryFromReq(req, filter)
    .then(query => store.findAll('user', query))
    .then(accounts => {
      debug("accounts", accounts);
      res.json(accounts);
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

router.post("/:account/create", function(req, res, next) {
  var user = req.body
  if (!user || !user.email || !user.password) {
    throw new Error(`
      User format required in POST body
      {
        email, 
        password, 
        imap { host, port, protocol }, 
        imap { host, port, protocol }
      }
    `)
  }
  const account = {
    account: req.params.account,
    createdOn: new Date(),
    sessionToken: jwt.sign({ id: user.id }, secret, {
      expiresIn: 86400 // expires in 24 hours
    }),
    type: 'custom',
    user
  }
  store.create('user', account)
    .then(entry => {
      debug('saved user', entry)
      res.json({
        entry
      })
    })
    .catch(err => {
      debug('Error saving user', err)
      next(err)
    })
});

router.get("/:account/accounts/:email", function(req, res) {
  const account = req.params.account
  const email = req.params.email
  const limit = 1

  getUserByAccountId(account, email)
  .then(user => {
    res.json({
      ...user
    });
  })
  .catch((error) => {
    debug('error', error)
    res.json({
      error: error.message
    })
  })
});

module.exports = router