var router = require('express').Router();
var jwt = require("jsonwebtoken")

function getRouter(passport, scope, secret) {
  // GET /auth/google
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  The first step in Google authentication will involve
  //   redirecting the user to google.com.  After authorization, Google
  //   will redirect the user back to this application at /auth/google/callback
  router.get(
    "/",
    passport.authenticate("google", { scope })
  );

  // GET /auth/google/callback
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  If authentication fails, the user will be redirected back to the
  //   login page.  Otherwise, the primary route function function will be called,
  //   which, in this example, will redirect the user to the home page.
  router.get(
    "/callback",
    passport.authenticate("google", {
      failureRedirect: "/"
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

  return router
}



module.exports = getRouter;
