const debug = require("debug")("mail-sync:test:attachment");
const crypto = require("crypto");
const store = require('../store/store');
const MailSync = require("../sync");
const fs = require('fs')
const imapConfig = require("../config/imap");
const concat = require('concat-stream')
const pump = require('pump')

var xoauth2 = require("../session").xOAuth2; // mocked

const imapOptions = {
  ...imapConfig,
  xoauth2,
  fetchUnreadOnStart: false,
  autoFetch: false,
  mailParserOptions: {
    streamAttachments: false // set attachment.content to attachment buffer
  }, // options to be passed to mailParser lib.
  attachments: false, // download attachments as they are encountered to the project directory
  attachmentOptions: {
    directory: "./storage/attachments/"
  } // specify a download directory for attachments
}

var mailSync = new MailSync(imapOptions);

mailSync.on("mailbox", function(mailbox) {
  debug("mailbox open: ", mailbox);
  mailSync.fetchByMessageId('CAOn17ynr+RM8mB+DxzfR+bP+EgGet6t0U466NzE_h2=Bbwg9dw@mail.gmail.com', (err, message) => {
    debug('message', message.attachments)
    if (message.attachments) {
      message.attachments.map(attachment => {

        debug('attachment stream', attachment.stream)
        const path = __dirname + '/../storage/attachments/' + getUniqueFilename(attachment)
        fs.writeFile(path, attachment.content, (err) => {
          debug('Attachment save err', err)
        })
      })
    }
  })
});

function getStreamContents(stream, cb, timeout = 60000) {
  pump(stream, concat(buf => cb(null, buf)), (err) => cb(err))
  setTimeout(() => stream && stream.destroy && stream.destroy(), timeout)
}

function getUniqueFilename(attachment) {
  return attachment.contentId + '-' + attachment.fileName
}

mailSync.start();

mailSync.on("mail", function(mail, seqno, attributes) {
  // do something with mail object including attachments
  debug("mail", attributes.uid, seqno, mail.subject, mail.date);
});

function streamToBuffer(stream) {
  var buf = [];
  let resolver
  debug('stream to buffer', stream)
  stream.on('readable', function() {
    debug('stream readable')
    let data
    while (data = this.read()) {
      debug('stream read', data)
      buf.push(data)
    }
  })
  stream.on('data', data => {
    debug('read data', data)
    buf.push(data)
  });
  stream.on('end', () => {
    debug('stream end buffer', buf)
    resolver(Buffer.concat(buf))
  })
  return new Promise(resolve => {
    resolver = resolve
  })
}