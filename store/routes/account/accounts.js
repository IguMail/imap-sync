const express = require('express')
const router = express.Router()
const store = require("../../store")
const debug = require('debug')('mail-sync:account/accounts')
const jwt = require("jsonwebtoken")
const secret = require("../../../config/secret").secret
const api = require('../../adapters/api')
const utils = require('../utils')

// user account profile
router.get("/:account/profile", function(req, res) {
  const account = req.params.account
  api.getUserByAccountId(account)
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

// user linked accounts
router.get("/:account/accounts", function(req, res) {
  const account = req.params.account
  if (!account) {
    throw new Error('Account required')
  }
  const query = utils.buildAccountsQuery(req.query)
  debug('accounts query', query)
  api.getAccountsByAccountId(account, query)
    .then(accounts => {
      debug("accounts", accounts);
      res.json(accounts);
    })
    .catch(err => {
      debug("Error", err);
      res.json(err);
    });
});

// create a user account
router.post("/:account/profile/create", function(req, res, next) {
  var user = req.body
  if (!user || !user.email || !user.password) {
    throw new Error(`
      User format required in POST body
      {
        name,
        email, 
        password,
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

// add a custom mail account (IMAP/SMTP)
router.post("/:account/add", function(req, res, next) {
  var user = req.body
  if (!user || !user.email || !user.password) {
    throw new Error(`
      Mail account format required in POST body
      {
        name,
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
    type: 'custom',
    user
  }
  store.create('account', account)
    .then(entry => {
      debug('saved mail account', entry)
      res.json({
        entry
      })
    })
    .catch(err => {
      debug('Error saving mail account', err)
      next(err)
    })
});

module.exports = router