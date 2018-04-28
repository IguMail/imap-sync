var authConfig = require("./config/auth"),
  express = require("express"),
  passport = require("passport"),
  GoogleStrategy = require("passport-google-oauth").OAuth2Strategy,
  verifyToken = require("./middleware/verifyToken"),
  secret = require("./config/secret").secret,
  xoauth2 = require("xoauth2"),
  refresh = require('passport-oauth2-refresh'),
  googleStrategy = require('./passport/google/strategy'),
  googleRoute = require('./passport/google/route'),
  debug = require('debug')('mail-sync:server');

const PORT = process.env.PORT || 3000;

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/google");
}

// Passport session setup.
passport.serializeUser(function(user, done) {
  // done(null, user.id);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  // Users.findById(obj, done);
  done(null, obj);
});

var strategy = googleStrategy(authConfig.google, profile => {
  debug('received profile', profile)
})

passport.use(strategy);
refresh.use(strategy);

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

// google passport routes
app.use('/auth/google', googleRoute(passport, authConfig.google.scope, secret));

app.get("/", ensureAuthenticated, function(req, res) {
  res.json({
    user: req.user,
    time: new Date()
  });
});

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
