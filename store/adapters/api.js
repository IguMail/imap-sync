const store = require("../store")
const debug = require('debug')('mail-sync:store:api')

function findUserAccountEmail(account, email) {
  return store.table('user')
    .filter({
      account,
      user: {
        email
      }
    })
    .limit(1)
    .run()
    .then((users) => {
      const user = (users && users.pop())
      debug('findUserAccountEmail', user)
      return user
    })
}

module.exports = {
  findUserAccountEmail
}