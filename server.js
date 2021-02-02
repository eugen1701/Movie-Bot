'use strict';

const express = require('express');
const bodyparser = require('body-parser');

const FBeamer = require('./fbeamer');
const config = require('./config');

const server = express();
const PORT = process.env.PORT || 3000;

const f = new FBeamer(config.FB);
console.log(f);
server.post('/', bodyparser.json({
  verify: f.verifySignature.call(f)
}));

server.post('/', (req, res) => {
  return f.incoming(req, res, async data => {
    data = f.messageHandler(data);
    console.log(data);
    try {
      if (data.content === 'the given text in facebook!') {
        await f.txt(data.sender, 'message received!');
        await f.img(data.sender, 'https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885__340.jpg');
      }
    } catch (e) {
      console.log(e);
    }
  });
});

server.get('/', (req, res) => f.registerHook(req, res));
server.listen(PORT, () =>
  console.log(`The bot server is running on port ${PORT}`));
