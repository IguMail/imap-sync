const store = require("../store")
const debug = require('debug')('mail-sync:store:api')

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

module.exports = {
  updateMessage,
  getUserById,
  getUserByAccountId,
  getAccountsByAccountId,
  getAccountsForUser
}