var MailSync = require("../sync");
var imapConfig = require("../config/imap");
var debug = require("debug")("mail-sync:test:sync");

var xoauth2 = require("../session").xOAuth2; // mocked

var mailSync = createMailSync(xoauth2);

mailSync.on("mailbox", function() {
  mailSync.searchByMessageId(
    "001a1148c79a4135ca056a0f7394@google.com",
    uids => {
      debug("UIDs", uids);
    }
  );
});

function createMailSync(xoauth2) {
  debug("Authenticating: ", xoauth2);
  var mailSync = new MailSync({
    ...imapConfig,
    fetchUnreadOnStart: true,
    autoFetch: false,
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
    debug("received %s uids", uids.length);
  });

  mailSync.on("mail", function(mail, seqno, attributes) {
    // do something with mail object including attachments
    debug("mail", mail, seqno, attributes);
  });

  mailSync.on("attachment", function(attachment) {
    debug("attachment", attachment.path);
  });

  return mailSync;
}
