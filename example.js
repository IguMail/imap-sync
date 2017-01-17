var MailSync = require('./index')
var debug = require('debug')('mail-sync-example')
var storage = require('./lib/rethinkdb/rethinkDbStorage')

var dbConfig = { 
  host: 'localhost', 
  port: 28015,
  db: 'mail'
}
var peerId = 'test'

var Storage = new storage().connect(dbConfig, function() {
  var Auth = Storage.Model('auth')
    Auth.filter({ peerId: peerId }).load(
    function (err, auth) {
      debug('Auth: ', auth)
      if (!auth) {
        debug('No authentication creds available')
        Storage.close()
      } else {
        var xoauth2 = auth.getXOauth2
        startMail(xoauth2)
      }
    }
  )
})

function startMail(xoauth2) {
  var mailSync = new MailSync({
    xoauth2: xoauth2,
    host: 'smtp.gmail.com',
    port: 993, // imap port
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false
    },
    mailbox: 'INBOX', // mailbox to monitor
    searchFilter: ['UNSEEN'], // the search filter being used after an IDLE notification has been retrieved
    markSeen: true, // all fetched email willbe marked as seen and not fetched next time
    fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
    mailParserOptions: {
      streamAttachments: true
    }, // options to be passed to mailParser lib.
    attachments: false, // download attachments as they are encountered to the project directory
    attachmentOptions: {
      directory: 'attachments/'
    } // specify a download directory for attachments
  })

  mailSync.start() // start listening

  mailSync.on('connected', function () {
    debug('imapConnected')
  })

  mailSync.on('mailbox', function (mailbox) {
    debug('mailbox open: ', mailbox)
  })

  mailSync.on('disconnected', function () {
    debug('imapDisconnected')
  })

  mailSync.on('error', function (err) {
    debug('Error', err)
  })

  mailSync.on('mail', function (mail, seqno, attributes) {
    // do something with mail object including attachments
    debug('mail', attributes.uid, seqno, mail.subject, mail.date)
  })

  mailSync.on('attachment', function (attachment) {
    debug('attachement', attachment.path)
  })
}









