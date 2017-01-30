# Mail Sync #

NodeJS Email Realtime Sync via IMAP.

![status](https://codeship.com/projects/785aeff0-c8e6-0134-ebaf-3a0fd8dae151/status?branch=master)

### How it works ###

* Mail-Sync connects to the IMAP account securely (via TLS)
* Authenticates user via OAuth (XOAuth2), username/password or other supported authentication scheme
* The uid of the latest email is retrieved. 
* A SMTP IDLE command is issued so the IMAP server notifies when new email arrives
* A IMAP search is made for emails newer then the latest UID


### How do I get set up? ###

`git clone git@bitbucket.org:igumail/mail-sync.git`


```
#!javascript

var MailSync = require('./index')
var fs = require('fs')
var debug = console.log.bind(console)

var mailSync = new MailSync({
    username: 'user@gmail.com',
    password: 'pass!',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    mailbox: 'INBOX', // mailbox to monitor
    searchFilter: ['UNSEEN'], // the search filter being used after an IDLE notification has been retrieved
    markSeen: false,
    fetchUnreadOnStart: false,
    mailParserOptions: {
      streamAttachments: true
    }
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
      debug('attachement', attachment)

      var output = fs.createWriteStream('./attachments/' + attachment.generatedFileName)

      attachment.stream.pipe(output)

    }
  })
```




### Contribution guidelines ###

* Writing tests
* Code review
* Other guidelines

### Who do I talk to? ###

* Repo owner or admin
* Other community or team contact