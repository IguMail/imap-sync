const store = require("../store")
const { adapter } = store
const debug = require('debug')('mail-sync:store:api')

function findUserAccountEmail(account, email) {
  const { r } = adapter
  return r.table('user')
    .filter({
      account,
      user: {
        email
      }
    })
    .orderBy(r.desc('createdOn'))
    .limit(1)
    .run()
    .then((users) => {
      const user = (users && users[0])
      debug('findUserAccountEmail', user)
      return user
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
  findUserAccountEmail,
  updateMessage
}