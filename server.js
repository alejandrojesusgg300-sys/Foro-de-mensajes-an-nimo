'use strict';

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

app.disable('x-powered-by');

app.use(function (req, res, next) {
  res.set({
    'X-Frame-Options': 'SAMEORIGIN',
    'X-DNS-Prefetch-Control': 'off',
    'Referrer-Policy': 'same-origin'
  });
  next();
});

app.use(cors({ origin: '*' }));

app.use('/public', express.static(process.cwd() + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });

app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

fccTestingRoutes(app);

apiRoutes(app);

app.use(function (req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const port = process.env.PORT || 3000;

const listener = app.listen(port, function () {
  console.log('Listening on port ' + port);

  if (process.env.NODE_ENV === 'test' && !process.env.MOCHA_TEST) {
    console.log('Running Tests...');

    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

module.exports = app;
