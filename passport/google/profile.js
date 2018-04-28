const refresh = require('passport-oauth2-refresh')

/**
 * Retrieve a Accesstoken from RefreshToken
 * @param {String} refreshToken 
 * @param {Function} cb Node style callback
 * @param {Number} maxRetries 
 * @param {Number} retryWaitTime Wait time in MS before each retry
 */
function requestNewAccessToken(refreshToken, cb, maxRetries = 2, retryWaitTime = 100) {
  const makeRequest = () => {
    maxRetries--
    refresh.requestNewAccessToken('google', refreshToken, (err, accessToken) => {
      if(err) { 
        if(!maxRetries) {
          return cb(err, null)
        }
        setTimeout(() => makeRequest(), retryWaitTime)
      } else {
        cb(err, accessToken)
      }
    })
  }
  // Make the initial request.
  makeRequest()
}

module.exports = requestNewAccessToken