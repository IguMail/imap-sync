const nodemailer = require('nodemailer');
const express = require('express')
const router = express.Router()
const store = require("../../store")
const debug = require('debug')('mail-sync:account/accounts')
const { getUserByAccountId } = require('../../adapters/api')
const rethinkDBAdapter = store.rethinkDBAdapter

router.post("/:account/sendmail/:email", async function(req, res, next) {
  const account = req.params.account
  const email = req.params.email
  const mail = req.body.mail
  if (!account) return next(new Error('Account required'))
  if (!email) return next(new Error('Email required'))
  if (!mail) return next(new Error('Mail "mail" required in JSON post body'))
  if (!mail.to) return next(new Error('Mail "mail.to" required in JSON post body'))

  const userAccount = await getUserByAccountId(account, email)
  if (!userAccount || !userAccount.user) return next(new Error('Coult not find user'))
  const user = userAccount.user

  const transportOptions = {
    service: user.service,
    auth: {
      type: 'OAuth2',
      user: user.email,
      accessToken: user.accessToken
    }
  }
  
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport(transportOptions);

  debug('Mail transport', transportOptions)

  if (!user.displayName) {
    user.displayName = user.email.split('@')[0]
    user.displayName = (user.displayName[0] || '').toUpperCase() + user.displayName.substr(1)
  }
  
  // setup email data with unicode symbols
  let mailOptions = {
    ...mail,
    from: `"${user.displayName}" <${user.email}>`, // sender address
    replyTo: user.email
  };
  
  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return next(error)
    }
    res.json({
      info
    });
  });
  
});

module.exports = router