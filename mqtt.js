var MailSync = require("./index");
var debug = require("debug")("mail-sync:mqtt");

var xoauth2 =
  "dXNlcj1nYWJlQGZpaml3ZWJkZXNpZ24uY29tAWF1dGg9QmVhcmVyIHlhMjkuR2x1ZkJYQVV6OE43VWp0LTE1LU9tMEJJUXgxUktlYmJzYU9GUEtxMTdxRUQyZnU2Ujk2WFRDSVNVaHBncmhacHJHRUpyb0tFa3Blbnp2aURmcTdLWkhqZWhsZHVfNDl6dE5STldqS0ZIWDZXX1hmRzFzWVFZc3ZGR2h4cAEB";

startMail(xoauth2);

function startMail(xoauth2) {
  debug("Authenticating: ", xoauth2);
  var mailSync = new MailSync({
    xoauth2: xoauth2,
    host: "imap.gmail.com",
    port: 993, // imap port
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false
    },
    mailbox: "INBOX", // mailbox to monitor
    searchFilter: ["ALL"], // the search filter being used after an IDLE notification has been retrieved
    markSeen: false, // all fetched email willbe marked as seen and not fetched next time
    fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
    autoFetch: true,
    fetchLimit: 10,
    fetchLimitInitial: 50,
    fetchSort: "DESC",
    uidsSort: "ASC",
    mailParserOptions: {
      streamAttachments: true
    }, // options to be passed to mailParser lib.
    attachments: false, // download attachments as they are encountered to the project directory
    attachmentOptions: {
      directory: "attachments/"
    } // specify a download directory for attachments
  });

  mailSync.start(); // start listening

  mailSync.on("connected", function() {
    debug("imapConnected");
  });

  mailSync.on("mailbox", function(mailbox) {
    debug("mailbox open: ", mailbox);
  });

  mailSync.on("disconnected", function() {
    debug("imapDisconnected");
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
