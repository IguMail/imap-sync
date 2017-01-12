var Imap = require('imap')
var util = require('util')
var EventEmitter = require('events').EventEmitter
var MailParser = require("mailparser").MailParser
var fs = require("fs")
var path = require('path')
var async = require('async')
var debug = require('debug')('mail-sync')

module.exports = MailSync

function MailSync(options) {
  EventEmitter.call(this)
  this.lastUid = 0
  this.markSeen = !! options.markSeen
  this.mailbox = options.mailbox || "INBOX"
  if ('string' === typeof options.searchFilter) {
    this.searchFilter = [options.searchFilter]
  } else {
    this.searchFilter = options.searchFilter || ["UNSEEN"]
  }
  this.fetchUnreadOnStart = !! options.fetchUnreadOnStart
  this.mailParserOptions = options.mailParserOptions || {}
  if (options.attachments && options.attachmentOptions && options.attachmentOptions.stream) {
    this.mailParserOptions.streamAttachments = true
  }
  this.attachmentOptions = options.attachmentOptions || {}
  this.attachments = options.attachments || false
  this.attachmentOptions.directory = (this.attachmentOptions.directory ? this.attachmentOptions.directory : '')
  this.imap = new Imap({
    xoauth2: options.xoauth2,
    user: options.username,
    password: options.password,
    host: options.host,
    port: options.port,
    tls: options.tls,
    tlsOptions: options.tlsOptions || {}
  })

  this.imap.once('ready', imapReady.bind(this))
  this.imap.once('close', imapClose.bind(this))
  this.imap.on('error', imapError.bind(this))
}

util.inherits(MailSync, EventEmitter)

MailSync.prototype.start = function() {
  this.imap.connect()
}

MailSync.prototype.stop = function() {
  this.imap.end()
}

function imapReady() {
  var self = this

  self.emit('connected', mailbox)

  this.imap.openBox(this.mailbox, false, function(err, mailbox) {
    if (err) {
      self.emit('error', err)
    } else {
      self.emit('mailbox', mailbox)
      if (self.fetchUnreadOnStart) {
        imapSearch.call(self)
      }
      self.imap.on('mail', imapSearch.bind(self))
    }
  })
}

MailSync.prototype.fetch = function(uids) {
  var self = this
  debug('Fetching mails by uids', uids)
  async.each(uids, function( uid, callback) {
    var f = self.imap.fetch(uid, {
      bodies: '',
      markSeen: self.markSeen
    })
    debug('Fetch: ', uid)
    f.on('message', function(msg, seqno) {
      var parser = new MailParser(self.mailParserOptions)
      var attributes = null

      parser.on("end", function(mail) {
        if (!self.mailParserOptions.streamAttachments && mail.attachments && self.attachments) {
          async.each(mail.attachments, function( attachment, callback) {
            fs.writeFile(self.attachmentOptions.directory + attachment.generatedFileName, attachment.content, function(err) {
              if(err) {
                self.emit('error', err)
                callback()
              } else {
                attachment.path = path.resolve(self.attachmentOptions.directory + attachment.generatedFileName)
                self.emit('attachment', attachment)
                callback()
              }
            })
          }, function(err){
            self.emit('mail', mail, seqno, attributes)
            callback()
          })
        } else {
          self.emit('mail',mail,seqno,attributes)
        }
      })
      parser.on("attachment", function (attachment) {
        self.emit('attachment', attachment)
      })
      msg.on('body', function(stream, info) {
        stream.pipe(parser)
      })
      msg.on('attributes', function(attrs) {
        attributes = attrs
      })
    })
    f.once('error', function(err) {
      self.emit('error', err)
    })
  }, function(err){
    if( err ) {
      self.emit('error', err)
    }
  })
}

function imapClose() {
  this.emit('disconnected')
}

function imapError(err) {
  this.emit('error', err)
}

function imapSearch() {
  var self = this
  var filter = [].concat(self.searchFilter)
  if (this.lastUid) {
    filter.push(['UID',  this.lastUid + ':*' ])
  }
  debug('Filter', filter)
  this.imap.search(filter, function(err, uids) {
    if (err) {
      self.emit('error', err)
    } else if (uids.length > 0) {
      self.lastUid = Math.max.apply(Math, uids)
      self.fetch(uids)
    }
  })
}
