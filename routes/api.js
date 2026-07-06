'use strict';

const mongoose = require('mongoose');

mongoose.connect(process.env.DB);

const replySchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  delete_password: {
    type: String,
    required: true
  },
  created_on: {
    type: Date,
    default: Date.now
  },
  reported: {
    type: Boolean,
    default: false
  }
});

const threadSchema = new mongoose.Schema({
  board: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  delete_password: {
    type: String,
    required: true
  },
  created_on: {
    type: Date,
    required: true
  },
  bumped_on: {
    type: Date,
    required: true
  },
  reported: {
    type: Boolean,
    default: false
  },
  replies: [replySchema]
});

const Thread = mongoose.models.Thread || mongoose.model('Thread', threadSchema);

function cleanThread(thread, onlyThreeReplies) {
  const clean = thread.toObject ? thread.toObject() : thread;

  delete clean.delete_password;
  delete clean.reported;

  clean.replycount = clean.replies.length;

  let replies = clean.replies.sort(function (a, b) {
    return new Date(b.created_on) - new Date(a.created_on);
  });

  if (onlyThreeReplies) {
    replies = replies.slice(0, 3);
  }

  clean.replies = replies.map(function (reply) {
    delete reply.delete_password;
    delete reply.reported;
    return reply;
  });

  return clean;
}

function shouldRedirect(req) {
  return req.headers.accept && req.headers.accept.includes('text/html');
}

module.exports = function (app) {

  app.route('/api/threads/:board')

    .post(async function (req, res) {
      try {
        const board = req.params.board;
        const text = req.body.text;
        const delete_password = req.body.delete_password;

        const now = new Date();

        const thread = await Thread.create({
          board: board,
          text: text,
          delete_password: delete_password,
          created_on: now,
          bumped_on: now,
          reported: false,
          replies: []
        });

        if (shouldRedirect(req)) {
          return res.redirect('/b/' + board + '/');
        }

        res.json(thread);
      } catch (err) {
        res.status(500).json({ error: 'server error' });
      }
    })

    .get(async function (req, res) {
      try {
        const board = req.params.board;

        const threads = await Thread.find({ board: board })
          .sort({ bumped_on: -1 })
          .limit(10);

        const cleanThreads = threads.map(function (thread) {
          return cleanThread(thread, true);
        });

        res.json(cleanThreads);
      } catch (err) {
        res.status(500).json({ error: 'server error' });
      }
    })

    .delete(async function (req, res) {
      try {
        const board = req.params.board;
        const thread_id = req.body.thread_id;
        const delete_password = req.body.delete_password;

        const thread = await Thread.findOne({
          _id: thread_id,
          board: board
        });

        if (!thread || thread.delete_password !== delete_password) {
          return res.send('incorrect password');
        }

        await Thread.deleteOne({
          _id: thread_id,
          board: board
        });

        res.send('success');
      } catch (err) {
        res.send('incorrect password');
      }
    })

    .put(async function (req, res) {
      try {
        const board = req.params.board;
        const thread_id = req.body.thread_id;

        await Thread.findOneAndUpdate(
          {
            _id: thread_id,
            board: board
          },
          {
            reported: true
          }
        );

        res.send('reported');
      } catch (err) {
        res.status(500).json({ error: 'server error' });
      }
    });


  app.route('/api/replies/:board')

    .post(async function (req, res) {
      try {
        const board = req.params.board;
        const thread_id = req.body.thread_id;
        const text = req.body.text;
        const delete_password = req.body.delete_password;

        const now = new Date();

        const reply = {
          _id: new mongoose.Types.ObjectId(),
          text: text,
          delete_password: delete_password,
          created_on: now,
          reported: false
        };

        await Thread.findOneAndUpdate(
          {
            _id: thread_id,
            board: board
          },
          {
            $push: {
              replies: reply
            },
            $set: {
              bumped_on: now
            }
          }
        );

        if (shouldRedirect(req)) {
          return res.redirect('/b/' + board + '/' + thread_id);
        }

        res.json(reply);
      } catch (err) {
        res.status(500).json({ error: 'server error' });
      }
    })

    .get(async function (req, res) {
      try {
        const board = req.params.board;
        const thread_id = req.query.thread_id;

        const thread = await Thread.findOne({
          _id: thread_id,
          board: board
        });

        if (!thread) {
          return res.json({ error: 'thread not found' });
        }

        res.json(cleanThread(thread, false));
      } catch (err) {
        res.status(500).json({ error: 'server error' });
      }
    })

    .delete(async function (req, res) {
      try {
        const board = req.params.board;
        const thread_id = req.body.thread_id;
        const reply_id = req.body.reply_id;
        const delete_password = req.body.delete_password;

        const thread = await Thread.findOne({
          _id: thread_id,
          board: board
        });

        if (!thread) {
          return res.send('incorrect password');
        }

        const reply = thread.replies.id(reply_id);

        if (!reply || reply.delete_password !== delete_password) {
          return res.send('incorrect password');
        }

        reply.text = '[deleted]';

        await thread.save();

        res.send('success');
      } catch (err) {
        res.send('incorrect password');
      }
    })

    .put(async function (req, res) {
      try {
        const board = req.params.board;
        const thread_id = req.body.thread_id;
        const reply_id = req.body.reply_id;

        const thread = await Thread.findOne({
          _id: thread_id,
          board: board
        });

        if (thread) {
          const reply = thread.replies.id(reply_id);

          if (reply) {
            reply.reported = true;
            await thread.save();
          }
        }

        res.send('reported');
      } catch (err) {
        res.status(500).json({ error: 'server error' });
      }
    });

};