const store = require("../store")
const refresh = require('passport-oauth2-refresh')
const googleStrategy = require('../../passport/google/strategy')
const authConfig = require("../../config/auth")
const debug = require('debug')('mail-sync:store:api')

var strategy = googleStrategy(authConfig.google, profile => {
  debug('received profile', profile)
})
refresh.use(strategy)

function getUserById(userId) {
  debug('getUserById', userId)
  return store.find('user', userId)
}

function getUserByAccountId(account) {
  debug('getUserByAccountId', account)
  return store.findAll('user', {
    account,
    limit: 1
  })
    .then(users => users[0])
}

function getMailAccountByAccountIdAndEmail(account, email) {
  debug('getUserByAccountId', account)
  // todo: fix by creating a user for each guest
  return store.findAll('account', {
    account,
    limit: 1
  })
    .then(account => account[0])
}

function getAccountsByAccountId(account, query = {}) {
  const filter = {
    ...query, account
  }
  debug('getAccountsByAccountId', filter)
  return store.findAll('account', filter)
}

function getAccountsForUser(user) {
  debug('getAccountsForUser', user)
  return store.findAll('account', {
    account: user.account
  })
}

function updateMessage(message, update) {
  if (!message.original) {
    message.original = JSON.parse(JSON.stringify(message))
  }
  message = Object.assign(message, update)

  var updatedAt = new Date()

  if (!message.updates) {
    message.updates = []
  }
  message.updates.push({
    updatedAt,
    update
  })
  return message.save()
}

function refreshToken(provider, token, cb) {
  refresh.requestNewAccessToken(provider, token, cb)
}

// convert email, access_token to xoauth token
function buildXOAuth2Token(email, accessToken) {
  let authData = ["user=" + email, "auth=Bearer " + accessToken, "", ""];
  return Buffer.from(authData.join("\x01"), "utf-8").toString("base64");
}

module.exports = {
  updateMessage,
  getUserById,
  getUserByAccountId,
  getMailAccountByAccountIdAndEmail,
  getAccountsByAccountId,
  getAccountsForUser,
  refreshToken,
  buildXOAuth2Token
}