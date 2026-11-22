/* ROOM + VOICE SERVER — rooms, mic seats, voice notes, room music.
   Mounted by server.js at /api/v2/rooms. Live voice goes through Agora
   (see server/agora.js); voice notes already work without it. */
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-AZLAN';
const upload = multer({ dest: path.join(__dirname, '..', 'uploads'), limits: { fileSize: 25 * 1024 * 1024 } });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'Login required' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'Bad session' }); }
}

module.exports = function (ctx) {
  const { db, save, displayNameOf } = ctx;
  const router = express.Router();
  router.use(auth);

  // Public rooms list (recommended / hot first by member count)
  router.get('/hot', (req, res) => {
    const rooms = [...db.rooms].sort((a, b) => (b.members.length - a.members.length));
    res.json({ rooms: rooms.slice(0, 20) });
  });
  // Search rooms by name / topic
  router.get('/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    res.json({ rooms: db.rooms.filter(r => r.name.toLowerCase().includes(q) || (r.topic || '').toLowerCase().includes(q)) });
  });
  // Mic on/off for my seat
  router.post('/:id/mic', (req, res) => {
    const room = db.rooms.find(r => r.id === req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const seat = room.seats.find(s => s.userId === req.user.id);
    if (!seat) return res.status(400).json({ error: 'Take a mic seat first' });
    seat.micOn = !!req.body.micOn; save();
    res.json({ ok: true, micOn: seat.micOn });
  });
  // Room info with member details
  router.get('/:id', (req, res) => {
    const room = db.rooms.find(r => r.id === req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const members = room.members.map(id => { const u = db.users.find(x => x.id === id); return u ? { id: u.id, name: u.anonymous ? 'Anonymous' : displayNameOf(u), vip: u.vip || 0 } : null; }).filter(Boolean);
    res.json({ room: { ...room, members } });
  });
  // Voice note with an effect label (normal / deep / robot / echo) — the
  // effect is applied at playback time in the app (see public/sounds.js)
  router.post('/:id/voice-note', upload.single('audio'), (req, res) => {
    const room = db.rooms.find(r => r.id === req.params.id);
    const u = db.users.find(x => x.id === req.user.id);
    if (!room || !req.file) return res.status(400).json({ error: 'Missing room or audio' });
    const note = { id: Date.now(), userId: u.id, name: displayNameOf(u),
      url: '/uploads/' + req.file.filename, effect: req.body.effect || 'normal',
      at: new Date().toISOString() };
    room.voiceNotes.push(note); room.xp += 5; save();
    res.json({ ok: true, note });
  });
  return router;
};
