const store = require("../store")
const { adapter } = store
const debug = require('debug')('mail-sync:store:api')

function getUserById(userId) {
  return store.find('user', userId)
}

function getUserByAccountId(account) {
  return store.findAll('user', {
    account,
    limit: 1,
    orderBy: [
      ['createdOn', 'DESC']
    ]
  })
    .then(users => users[0])
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
  getUserByAccountId
}