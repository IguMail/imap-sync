var authConfig = require("./config/auth"),
  express = require("express"),
  passport = require("passport"),
  secret = require("./config/secret").secret,
  refresh = require('passport-oauth2-refresh'),
  googleStrategy = require('./passport/google/strategy'),
  jwt = require("jsonwebtoken"),
  debug = require('debug')('mail-sync:server'),
  store = require('./store/store'),
  ip = require('ip'),
  URL = require('url').URL

const PROTOCOL = process.env.PROTOCOL || 'http';
const HOST = process.env.HOST || ip.address() || 'localhost';
const PORT = process.env.PORT || 5000;

const BASE_URL = PROTOCOL + '://' + HOST + (PORT !== 80 ? ':' + PORT : '')

// Passport session setup.
passport.serializeUser(function(user, done) {
  debug('serializeUser', user)
  var sessionToken = jwt.sign({ id: user.id }, secret, {
    expiresIn: 86400 // expires in 24 hours
  });
  const entry = {
    createdOn: new Date(),
    user,
    account: user.email,
    sessionToken
  }
  store.create('account', entry)
    .then(entry => {
      debug('saved user', entry)
      done(null, entry.id)
    })
    .catch(err => {
      debug('Error saving user', err)
      done(err)
    })
});

passport.deserializeUser(function(id, done) {
  debug('deserializeUser', id)
  store.find('account', id)
    .then(entry => {
      debug('found user', entry)
      done(null, entry)
    })
    .catch(err => {
      debug('Error finding user', err)
      done(err)
    })
});

// default URL
authConfig.google.callbackURL = BASE_URL + '/auth/google/callback'
// wildcard magic dns
authConfig.google.callbackURL = 'http://' + HOST + ':5000/auth/google/callback'

if (process.env.NODE_ENV === 'production') {
  authConfig.google.callbackURL = 'https://auth.igumail.com/auth/google/callback'
}

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

// google passport auth
app.use('/auth/google', 
  function(req, res, next) {
    debug('/auth/google Query', req.query, 'sessionID', req.sessionID)
    if (req.query.returnUrl) {
      req.session.returnUrl = req.query.returnUrl
    }
    if (req.query.accountId) {
      req.session.accountId = req.query.accountId
    }
    next()
  },
  function(req, res, next) {
    debug('/auth/google passport.authenticate', req.query, 'sessionID', req.sessionID)
    passport.authenticate("google", {
      accessType: 'offline',
      prompt: 'consent',
    })(req, res, next)
  }
)

// google passport auth callback
app.get('/auth/google/callback',
  function(req, res, next) {
    debug('/auth/google/callback Session', req.session, 'Query', req.query)
    const returnUrl = req.session.returnUrl || req.query.state
    const accountId = req.session.accountId
    const userId = req.session.passport.user
    if (returnUrl) {
      store.find('account', userId)
        .then(user => {
          if (accountId) {
            user.account = accountId
            return user.save()
          } else {
            return user
          }
        })
        .then(user => {
          const url = new URL(returnUrl)
          url.searchParams.append('user', JSON.stringify(user))
          res.redirect(url)
        })
        .catch(error => next(error))
    } else {
      res.redirect("/account")
    }
  }
)

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/google");
}

app.get("/", function(req, res) {
  res.json({
    'help': 'Use /account for account info. /auth/google for Auth with Google.'
  });
});

app.get("/account", function(req, res) {
  res.json({
    account: req.user
  });
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.use(express.static(__dirname + "/public"));

console.log("Opening server on %s:%s", HOST, PORT)

app.listen(PORT, HOST, function() {
  console.log("Listening on %s:%s", HOST, PORT);
});
