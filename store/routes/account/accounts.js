const express = require('express')
const router = express.Router()
const store = require("../../store")
const debug = require('debug')('mail-sync:account/accounts')
const {
  buildAccountsQueryFromReq
} = require('../utils')
const { getUserByAccountId } = require('../../adapters/api')
const rethinkDBAdapter = store.rethinkDBAdapter

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