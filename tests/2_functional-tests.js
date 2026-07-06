'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');

const assert = chai.assert;
chai.use(chaiHttp);

suite('Functional Tests', function () {

  const board = 'testboard' + Date.now();

  let threadId;
  let threadToDeleteId;
  let replyId;

  test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .send({
        text: 'Functional test thread',
        delete_password: 'threadpass'
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.property(res.body, 'reported');
        assert.property(res.body, 'delete_password');
        assert.property(res.body, 'replies');

        assert.equal(res.body.text, 'Functional test thread');
        assert.equal(res.body.delete_password, 'threadpass');
        assert.equal(res.body.reported, false);
        assert.isArray(res.body.replies);

        threadId = res.body._id;
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
    const replies = [
      {
        text: 'Reply 1',
        delete_password: 'replypass'
      },
      {
        text: 'Reply 2',
        delete_password: 'replypass'
      },
      {
        text: 'Reply 3',
        delete_password: 'replypass'
      },
      {
        text: 'Reply 4',
        delete_password: 'replypass'
      }
    ];

    let completed = 0;

    replies.forEach(function (reply) {
      chai.request(server)
        .post('/api/replies/' + board)
        .send({
          thread_id: threadId,
          text: reply.text,
          delete_password: reply.delete_password
        })
        .end(function () {
          completed++;

          if (completed === replies.length) {
            chai.request(server)
              .get('/api/threads/' + board)
              .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isArray(res.body);
                assert.isAtMost(res.body.length, 10);

                const thread = res.body.find(function (item) {
                  return item._id === threadId;
                });

                assert.isObject(thread);
                assert.notProperty(thread, 'delete_password');
                assert.notProperty(thread, 'reported');

                assert.property(thread, 'replycount');
                assert.isArray(thread.replies);
                assert.isAtMost(thread.replies.length, 3);

                thread.replies.forEach(function (reply) {
                  assert.notProperty(reply, 'delete_password');
                  assert.notProperty(reply, 'reported');
                });

                done();
              });
          }
        });
    });
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .send({
        text: 'Thread to delete',
        delete_password: 'correctpass'
      })
      .end(function (err, res) {
        threadToDeleteId = res.body._id;

        chai.request(server)
          .delete('/api/threads/' + board)
          .send({
            thread_id: threadToDeleteId,
            delete_password: 'wrongpass'
          })
          .end(function (err, res) {
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function (done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({
        thread_id: threadToDeleteId,
        delete_password: 'correctpass'
      })
      .end(function (err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    chai.request(server)
      .put('/api/threads/' + board)
      .send({
        thread_id: threadId
      })
      .end(function (err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
    chai.request(server)
      .post('/api/replies/' + board)
      .send({
        thread_id: threadId,
        text: 'Functional test reply',
        delete_password: 'replypass'
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'delete_password');
        assert.property(res.body, 'reported');

        assert.equal(res.body.text, 'Functional test reply');
        assert.equal(res.body.delete_password, 'replypass');
        assert.equal(res.body.reported, false);

        replyId = res.body._id;
        done();
      });
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
    chai.request(server)
      .get('/api/replies/' + board)
      .query({
        thread_id: threadId
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);

        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.property(res.body, 'replies');

        assert.notProperty(res.body, 'delete_password');
        assert.notProperty(res.body, 'reported');

        assert.isArray(res.body.replies);

        res.body.replies.forEach(function (reply) {
          assert.notProperty(reply, 'delete_password');
          assert.notProperty(reply, 'reported');
        });

        done();
      });
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function (done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: 'wrongpass'
      })
      .end(function (err, res) {
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function (done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: 'replypass'
      })
      .end(function (err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
    chai.request(server)
      .post('/api/replies/' + board)
      .send({
        thread_id: threadId,
        text: 'Reply to report',
        delete_password: 'reportpass'
      })
      .end(function (err, res) {
        const replyToReportId = res.body._id;

        chai.request(server)
          .put('/api/replies/' + board)
          .send({
            thread_id: threadId,
            reply_id: replyToReportId
          })
          .end(function (err, res) {
            assert.equal(res.text, 'reported');
            done();
          });
      });
  });

});