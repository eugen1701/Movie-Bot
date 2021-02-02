'use strict';

const crypto = require('crypto');
const request = require('request');
const apiVersion = 'v6.0';

class FBeamer {
  constructor({pageAccessToken, verifyToken, appSecret}) {
    try {
      if (pageAccessToken === undefined
        || verifyToken === undefined
        || appSecret === undefined) {
        throw new Error('Missing parameters');
      }
      this.pageAccessToken = pageAccessToken;
      this.verifyToken = verifyToken;
      this.appSecret = appSecret;
    } catch (e) {
      console.log(e);
    }
  }

  registerHook(req, res) {
    const params = req.query;
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];
    try {
      if (mode === 'subscribe' && token === this.verifyToken) {
        console.log('Webhook registered');
        return res.send(challenge);
      } else {
        console.log('Could not register webhook!');
        return res.sendStatus(200);
      }
    } catch (e) {
      console.log(e);
    }
  }

  verifySignature() {
    return (req, res, buf) => {
      if (req.method === 'POST') {
        try {
          const params = req.headers;
          const signature = params['x-hub-signature'];
          let tempo_hash = crypto.createHmac(
            'sha1',
            this.appSecret)
            .update(buf, 'utf-8');
          let hash = tempo_hash.digest('hex');
          if (signature.slice(5) !== hash) {
            throw new Error('Invalid app secret');
          }
        } catch (e) {
          console.log(e);
        }
      }
    };
  }

  messageHandler(obj) {
    const sender = obj.sender.id;
    const message = obj.message;
    if (message.text) {
      obj = {
        sender,
        type: 'text',
        content: message.text
      };
    }

    return obj;
  }

  sendMessage(payload) {
    return new Promise((resolve, reject) => {
      request({
        uri: `https://graph.facebook.com/${apiVersion}/me/messages`,
        qs: {
          access_token: this.pageAccessToken
        },
        method: 'POST',
        json: payload
      }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          resolve({
            mid: body.message_id
          });
        } else {
          reject(error);
        }
      });
    });
  }

  txt(id, text, messaging_type = 'RESPONSE') {
    const obj = {
      messaging_type,
      recipient: {
        id
      },
      message: {
        text
      }
    };
    return this.sendMessage(obj);
  }

  img(id, image, messaging_type = 'RESPONSE') {
    const obj = {
      messaging_type,
      recipient: {
        id
      },
      message: {
        attachment: {
          type: 'image',
          payload: {
            url: image,
            is_reusable: true
          }
        }
      }
    };
    return this.sendMessage(obj)
      .catch(error => console.log(error));
  }

  incoming(req, res, cb) {
    res.sendStatus(200);

    if (req.body.object === 'page' && req.body.entry) {
      let data = req.body;
      for (const message of data.entry) {
        for (const messageObj of message.messaging) {
          if (messageObj.postBack) {
            console.log('Postback');
          } else {
            // console.log(messageObj.message.text);
            return cb(messageObj)
              .catch(error => console.log(error));
          }
        }
      }
    }
  }
}

module.exports = FBeamer;
