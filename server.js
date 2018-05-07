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
  jwt = require("jsonwebtoken"),
  debug = require('debug')('mail-sync:server'),
  store = require('./store/store');

const PORT = process.env.PORT || 3000;

// Passport session setup.
passport.serializeUser(function(user, done) {
  debug('serializeUser', user)
  store.create('user', user).then(entry => done(null, entry))
});

passport.deserializeUser(function(obj, done) {
  // Users.findById(obj, done);
  debug('deserializeUser', obj)
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

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/google");
}

app.get("/", ensureAuthenticated, function(req, res) {
  var jwtToken = jwt.sign({ id: req.user.id }, secret, {
    expiresIn: 86400 // expires in 24 hours
  });
  res.json({
    jwtToken,
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
