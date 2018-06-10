const store = require('../store') // TODO remove dep

function stripHtml(text) {
  return text.replace(/<(?:.|\n)*?>/gm, '')
}

function getTextSnippet(text, len = 200) {
  return text.replace(/[\r\n\s\t]+/ig, ' ').substr(0, len)
}

function findAllMessagesFromReq(req, filter = {}) {
  return new Promise((resolve, reject) => {
    const offset = req.query.offset || 0
    const limit = req.query.limit || 50
    const orderBy = req.query.orderBy && [ req.query.orderBy, req.query.order || 'ASC' ]
    let query = {
      offset,
      limit,
      orderBy: [
        orderBy || ['receivedDate', 'DESC']
      ],
      where: {}
    };
    if (filter) {
      if (typeof filter === 'function') {
        debug('got filter function', filter)
        query.filter = filter
      } else {
        query.where = Object.assign(query.where, filter);
      }
    }
    if (req.query.messageId) {
      query.where.messageId = {
        '==': req.query.messageId
      }
    }
    if (req.query.since) {
      store
        .find("message", req.query.since)
        .then(message => {
          if (message) {
            query.where.receivedDate = {
              '>=': message.receivedDate
            }
          } else {
            reject({err: 'Invalid since parameter'});
          }
          resolve(query)
        })
        .catch(err => {
          debug("Error", err);
        });
    } else {
      resolve(query)
    }
  })
  .then(query => store.findAll('message', query))
}

const getThreadFilter = (message) => {
  const subject = message.subject || ''
  return {
    account: message.account,
    subject: {
      in: [subject, subject.replace(/^re\:[ ]*/i, ''), 'Re: ' + subject]
    }
  }
}

const getTheadId = (message) => {
  const subject = message.subject || ''
  return JSON.stringify([message.account, subject.replace(/^re\:[ ]*/i, '')])
}

function findTheadMessages(req, message) {
  const filter = getThreadFilter(message)
  if (!req.query.orderBy) {
    req.query.orderBy = 'receivedDate'
    req.query.order = 'ASC'
  }
  return findAllMessagesFromReq(req, filter)
}

function getMessageListFormat(messages) {
  return messages.map(message => getMessageFormat(message))
}

function getMessageFormat(message) {
  return {
    id: message.id,
    messageId: message.messageId,
    account: message.account,
    subject: message.mail.headers.subject,
    from: message.mail.from,
    to: message.mail.to,
    deliveredTo: message.deliveredTo,
    date: message.mail.headers.date,
    receivedDate: message.mail.receivedDate,
    snippet: getTextSnippet(message.mail.text || stripHtml(message.mail.html)),
    attachments: message.mail.attachments
  }
}

function getMessageListDebugFormat(messages) {
  return messages.map(message => (
    {
      id: message.id,
      subject: message.subject
    }
  ))
}

function streamAttachment(attachment, res) {
  res.setHeader("content-type", attachment.contentType || 'application/octet-stream')
  res.attachment(attachment.fileName)
  res.send(attachment.content)
}

function buildAccountsQueryFromReq(req, filter = {}) {
  return new Promise((resolve, reject) => {
    const offset = req.query.offset || 0
    const limit = req.query.limit || 50
    let query = {
      offset,
      limit,
      orderBy: [
        ['createdOn', 'DESC']
      ],
      where: {}
    };
    if (filter) {
      if (typeof filter === 'function') {
        debug('got filter function', filter)
        query.filter = filter
      } else {
        query.where = Object.assign(query.where, filter);
      }
    }
    if (req.query.messageId) {
      query.where.messageId = {
        '==': req.query.messageId
      }
    }
    if (req.query.since) {
      store
        .find("user", req.query.since)
        .then(account => {
          if (account) {
            query.where.createdOn = {
              '>=': account.createdOn
            }
          } else {
            reject({err: 'Invalid since parameter'});
          }
          resolve(query)
        })
        .catch(err => {
          debug("Error", err);
        });
    } else {
      resolve(query)
    }
  })
}

module.exports = {
  stripHtml,
  getTextSnippet,
  findAllMessagesFromReq,
  getThreadFilter,
  getTheadId,
  findTheadMessages,
  getMessageListFormat,
  getMessageFormat,
  getMessageListDebugFormat,
  streamAttachment,
  buildAccountsQueryFromReq
}