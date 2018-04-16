var MailSync = require("./index");
var debug = require("debug")("mail-sync:mqtt");
var mqtt = require("mqtt");
var PromiseEmitter = require("./lib/PromiseEmitter");
var imapConfig = require("./config/imap");

var xoauth2 =
  "dXNlcj1nYWJlQGZpaml3ZWJkZXNpZ24uY29tAWF1dGg9QmVhcmVyIHlhMjkuR2x1ZkJRSzByd2JEbFFyc0FYQTFsb3hQbUN3WHhGLVNrNVlpNXZfUjM1RUpKVlNLSXBzNzFpZGdTN1ZBVTlqWF9MN3A3WVh1REtfY0tYNEN1dXF0clFqb1ZYWkk1U1I1bjlEQUVqdUg2ZmhfQURTQ1E5eXVLUkstalI3YgEB";

startMail(xoauth2);

function startMail(xoauth2) {
  debug("Authenticating: ", xoauth2);
  var mailSync = new MailSync({
    ...imapConfig,
    xoauth2
  });

  mailSync.start(); // start listening

  mailSync.on("connected", function() {
    debug("imapConnected");
  });

  mailSync.on("mailbox", function(mailbox) {
    debug("mailbox open: ", mailbox);
  });

  mailSync.on("disconnected", function() {
    debug("imapDisconnected, restart");
    mailSync.start();
  });

  mailSync.on("error", function(err) {
    debug("Error", err);
  });

  mailSync.on("uids", function(uids) {
    debug("uids", uids);
  });

  mailSync.on("mail", function(mail, seqno, attributes) {
    // do something with mail object including attachments
    debug("mail", attributes.uid, seqno, mail.subject, mail.date);
  });

  mailSync.on("attachment", function(attachment) {
    debug("attachement", attachment.path);
  });
}
