var Imap = require("imap");
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var MailParser = require("mailparser").MailParser;
var fs = require("fs");
var path = require("path");
var async = require("async");
var debug = require("debug")("mail-sync:sync");

module.exports = MailSync;

function MailSync(options) {
  EventEmitter.call(this);
  this.lastUid = options.lastUid || null;
  this.fetchLimit = options.fetchLimit || null;
  this.fetchLimitInitial = options.fetchLimitInitial || null;
  this.autoFetch = options.autoFetch || true;
  this.uidsSort = options.uidsSort || "ASC";
  this.fetchSort = options.fetchSort || "DESC";
  this.markSeen = !!options.markSeen;
  this.mailbox = options.mailbox || "INBOX";
  if ("string" === typeof options.searchFilter) {
    this.searchFilter = [options.searchFilter];
  } else {
    this.searchFilter = options.searchFilter || ["UNSEEN"];
  }
  this.fetchUnreadOnStart = !!options.fetchUnreadOnStart;
  this.mailParserOptions = options.mailParserOptions || {};
  if (
    options.attachments &&
    options.attachmentOptions &&
    options.attachmentOptions.stream
  ) {
    this.mailParserOptions.streamAttachments = true;
  }
  this.attachmentOptions = options.attachmentOptions || {};
  this.attachments = options.attachments || false;
  this.attachmentOptions.directory = this.attachmentOptions.directory
    ? this.attachmentOptions.directory
    : "";
  this.imap = new Imap({
    xoauth2: options.xoauth2,
    user: options.username,
    password: options.password,
    host: options.host,
    port: options.port,
    tls: options.tls,
    tlsOptions: options.tlsOptions || {}
  });

  this.imap.once("ready", imapReady.bind(this));
  this.imap.once("close", imapClose.bind(this));
  this.imap.on("error", imapError.bind(this));
}

util.inherits(MailSync, EventEmitter);

MailSync.prototype.start = function() {
  this.imap.connect();
};

MailSync.prototype.stop = function() {
  this.imap.end();
};

function imapReady() {
  var self = this;

  self.emit("connected", this.mailbox);

  this.imap.openBox(this.mailbox, false, function(err, mailbox) {
    if (err) {
      self.emit("error", err);
    } else {
      self.currentMailbox = mailbox;
      self.emit("mailbox", mailbox);
      if (self.fetchUnreadOnStart) {
        imapSync.call(self);
      }
      self.imap.on("mail", imapSync.bind(self));
    }
  });
}

MailSync.prototype.fetch = function(uids) {
  var self = this;
  debug("Fetching mails by uids", uids);
  async.each(uids, this.fetchByUid.bind(this), function(err) {
    if (err) {
      self.emit("error", err);
    }
  });
};

function imapClose() {
  this.emit("disconnected");
}

function imapError(err) {
  this.emit("error", err);
}

function imapSync() {
  var self = this;
  var filter = [].concat(self.searchFilter);
  if (this.lastUid) {
    filter.push(["UID", this.lastUid + ":*"]);
  } else {
    filter.push([
      "UID",
      this.currentMailbox.uidnext - self.fetchLimitInitial + ":*"
    ]);
  }
  debug("Filter", filter);
  this.imap.search(filter, function(err, uids) {
    if (err) {
      self.emit("error", err);
    } else if (uids.length > 0) {
      var initialFetch = self.lastUid === null;
      uids = uids.map(uid => parseInt(uid, 10));
      if (self.uidsSort === "ASC") {
        uids = uids.sort((a, b) => a - b);
        self.lastUid = uids[uids.length - 1];
      } else if (self.uidsSort === "DESC") {
        uids = uids.sort((a, b) => b - a);
        self.lastUid = uids[0];
      } else {
        self.lastUid = Math.max.apply(Math, uids);
      }

      self.emit("uids", uids);
      debug("lastUid", self.lastUid);

      if (self.autoFetch) {
        var fetchLimit = initialFetch
          ? self.fetchLimitInitial
          : self.fetchLimit;
        if (fetchLimit) {
          uids = uids.slice(uids.length - fetchLimit);
        }
        if (self.fetchSort) {
          if (self.fetchSort === "ASC") uids = uids.sort((a, b) => a - b);
          if (self.fetchSort === "DESC") uids = uids.sort((a, b) => b - a);
        }
        self.fetch(uids);
      }
    }
  });
}

MailSync.prototype.fetchHeadersByUid = function(uid, callback) {
  var self = this;
  var f = self.imap.fetch(uid, {
    bodies: "HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID IN-REPLY-TO)",
    struct: true,
    markSeen: self.markSeen
  });
  debug("Fetch: ", uid);
  self.onFetch(f, callback)
}

MailSync.prototype.fetchByUid = function(uid, callback) {
  var self = this;
  var f = self.imap.fetch(uid, {
    bodies: "",
    markSeen: self.markSeen
  });
  debug("Fetch: ", uid);
  self.onFetch(f, callback)
}

MailSync.prototype.onFetch = function(f, callback) {
  var self = this;
  f.on("message", (msg, seqno) => {
    var attributes = null;
    msg.on("body", function(stream, info) {
      parseMessage.call(self, stream, (err, mail) => {
        callback(err, mail, seqno, attributes);
        self.emit("mail", mail, seqno, attributes);
      });
    });
    msg.on("attributes", function(attrs) {
      attributes = attrs;
    });
  });
  f.once("error", function(err) {
    self.emit("error", err);
  });
}

function parseMessage(stream, callback) {
  var self = this;
  var parser = new MailParser(self.mailParserOptions);
  stream.pipe(parser);
  parser.on("end", function(mail) {
    emitAttachments.call(self, mail, mail.attachments);
    if (
      !self.mailParserOptions.streamAttachments &&
      mail.attachments &&
      self.attachments
    ) {
      self.saveAttachments(self.attachments, (err, attachments) => {
        callback(err, mail);
      });
    } else {
      callback(null, mail);
    }
  });
}

function emitAttachments(mail, attachments) {
  if (attachments) {
    attachments.forEach(attachment => {
      this.emit("attachment", { mail, attachment });
    })
  }
}

MailSync.prototype.saveAttachments = function(attachments, callback) {
  var self = this;
  async.each(
    attachments,
    function(attachment, done) {
      fs.writeFile(
        self.attachmentOptions.directory + attachment.generatedFileName,
        attachment.content,
        function(err) {
          if (err) {
            self.emit("error", err);
            done();
          } else {
            attachment.path = path.resolve(
              self.attachmentOptions.directory + attachment.generatedFileName
            );
            done();
          }
        }
      );
    },
    function(err) {
      // all attachment file writes complete
      self.emit("err", err);
      callback(err, attachments);
    }
  );
};

MailSync.prototype.searchByMessageId = function(messageId, cb) {
  var search = ["HEADER", "MESSAGE-ID", messageId];
  var filter = [];
  filter.push(search);
  var s = this.imap.search(filter, (err, uids) => {
    debug("searchByMessageId UIDS", uids);
    cb(err, uids);
  });
  return s;
};

MailSync.prototype.fetchByMessageId = function(messageId, cb) {
  var s = this.searchByMessageId(messageId, (err, uids => {
    uids.forEach(uid => this.fetchByUid(ui, cb))
  }));
};
