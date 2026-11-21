/* CHAT SERVER — private messages + room chat history.
   Mounted by server.js at /api/v2/chat. */
const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-AZLAN';

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'Login required' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'Bad session' }); }
}

module.exports = function (ctx) {
  const { db, save, notify } = ctx;
  const router = express.Router();
  router.use(auth);

  // Inbox: latest message per conversation
  router.get('/inbox', (req, res) => {
    const me = req.user.id;
    const conv = {};
    db.messages.forEach(m => {
      if (m.from !== me && m.to !== me) return;
      const other = m.from === me ? m.to : m.from;
      if (!conv[other] || conv[other].at < m.at) conv[other] = m;
    });
    res.json({ conversations: Object.values(conv).sort((a, b) => b.at.localeCompare(a.at)) });
  });
  // Delete one of my messages
  router.delete('/message/:id', (req, res) => {
    const i = db.messages.findIndex(m => m.id == req.params.id && m.from === req.user.id);
    if (i < 0) return res.status(404).json({ error: 'Message not found' });
    db.messages.splice(i, 1); save(); res.json({ ok: true });
  });
  // Room chat history (paged)
  router.get('/room/:roomId', (req, res) => {
    const room = db.rooms.find(r => r.id === req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ chat: room.chat.slice(-100), voiceNotes: room.voiceNotes.slice(-20) });
  });
  return router;
};
