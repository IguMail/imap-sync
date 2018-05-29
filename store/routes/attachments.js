const express = require('express')
const router = express.Router()
const store = require("../store")
const { streamAttachment } = require('./utils')
const debug = require('debug')('mail-sync:attachments/')

router.get("/download/:id", function(req, res) {
  store
    .find("attachment", req.params.id)
    .then(attachment => {
      debug("attachment", attachment.id);
      streamAttachment(attachment.attachment, res)
    })
    .catch(err => {
      debug("Error", err);
      res.json({
        err: err.message
      });
    });
});

module.exports = router