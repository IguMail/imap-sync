var authConfig = require("./config/auth"),
  express = require("express"),
  passport = require("passport"),
  GoogleStrategy = require("passport-google-oauth").OAuth2Strategy,
  verifyToken = require("./middleware/verifyToken"),
  jwt = require("jsonwebtoken"),
  secret = require("./config/secret").secret,
  xoauth2 = require("xoauth2");

const PORT = process.env.PORT || 3000;

// Passport session setup.
//
//   For persistent logins with sessions, Passport needs to serialize users into
//   and deserialize users out of the session. Typically, this is as simple as
//   storing the user ID when serializing, and finding the user by ID when
//   deserializing.
passport.serializeUser(function(user, done) {
  // done(null, user.id);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  // Users.findById(obj, done);
  done(null, obj);
});

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
//   See http://passportjs.org/docs/configure#verify-callback
passport.use(
  new GoogleStrategy(
    // Use the API access settings stored in ./config/auth.json. You must create
    // an OAuth 2 client ID and secret at: https://console.developers.google.com
    authConfig.google,

    function(accessToken, refreshToken, profile, done) {
      // Typically you would query the database to find the user record
      // associated with this Google profile, then pass that object to the `done`

      // xoauth
      var email = profile.emails[0].value;
      var xOAuth2Token = buildXOAuth2Token(email, accessToken);
      console.log("AUTH XOAUTH2 " + xOAuth2Token, email, accessToken);

      // callback.
      profile = {
        ...profile,
        accessToken,
        refreshToken,
        xOAuth2Token,
        email
      };
      return done(null, profile);
    }
  )
);

// Express 4 boilerplate

var app = express();

var logger = require("morgan");
var cookieParser = require("cookie-parser");
var session = require("express-session");

app.use(logger("dev"));
app.use(cookieParser());
app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Application routes

app.get("/", function(req, res) {
  res.json({
    user: req.user,
    time: new Date()
  });
});

app.get("/login", function(req, res) {
  if (!req.user) {
    res.json({
      authUrl: "/auth/google"
    });
  } else {
    res.json({
      user: req.user,
      time: new Date()
    });
  }
});

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve
//   redirecting the user to google.com.  After authorization, Google
//   will redirect the user back to this application at /auth/google/callback
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: authConfig.google.scope })
);

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Authenticated successfully
    var token = jwt.sign({ id: req.user.id }, secret, {
      expiresIn: 86400 // expires in 24 hours
    });
    //res.redirect("/");
    res.json({
      token,
      user: req.user
    });
  }
);

app.get("/account", ensureAuthenticated, function(req, res) {
  res.json({
    user: req.user
  });
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.use(express.static(__dirname + "/public"));

app.listen(PORT, function() {
  console.log("Listening on " + PORT);
});

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// convert email, access_token to xoauth token
function buildXOAuth2Token(email, accessToken) {
  let authData = ["user=" + email, "auth=Bearer " + accessToken, "", ""];
  return Buffer.from(authData.join("\x01"), "utf-8").toString("base64");
}

function getXOauth2FromRefreshToken(email, refreshToken) {
  xoauth2gen = xoauth2.createXOAuth2Generator({
    user: "bucabay@gmail.com",
    clientId: authConfig.google.clientId,
    clientSecret: authConfig.google.clientSecret,
    refreshToken
  });

  xoauth2gen.getToken(function(err, xOAuth2Token) {
    if (err) {
      return console.log(err);
    }
    console.log("AUTH XOAUTH2 " + xOAuth2Token);
    return done(null, xOAuth2Token);
  });
}
