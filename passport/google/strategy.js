var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

function getStrategy(authOptions, cb) {
  // Use the GoogleStrategy within Passport.
  //   Strategies in Passport require a `verify` function, which accept
  //   credentials (in this case, an accessToken, refreshToken, and Google
  //   profile), and invoke a callback with a user object.
  //   See http://passportjs.org/docs/configure#verify-callback
  var strategy = new GoogleStrategy(
    // Use the API access settings stored in ./config/auth.json. You must create
    // an OAuth 2 client ID and secret at: https://console.developers.google.com
    authOptions,

    function(accessToken, refreshToken, profile, done) {
      // Typically you would query the database to find the user record
      // associated with this Google profile, then pass that object to the `done`

      // xoauth
      var email = profile.emails[0].value;
      var xOAuth2Token = buildXOAuth2Token(email, accessToken);

      const {
        name,
        emails,
        photos,
        provider,
      } = profile

      profile = {
        ...{
          name,
          emails,
          photos,
          provider,
        },
        accessToken,
        refreshToken,
        xOAuth2Token,
        email,
        service: 'Gmail'
      };

      cb && cb(profile)

      return done(null, profile);
    }
  )

  return strategy
}

// convert email, access_token to xoauth token
function buildXOAuth2Token(email, accessToken) {
  let authData = ["user=" + email, "auth=Bearer " + accessToken, "", ""];
  return Buffer.from(authData.join("\x01"), "utf-8").toString("base64");
}

module.exports = getStrategy;