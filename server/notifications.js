/* NOTIFICATION SERVER — notifications, preferences, announcements.
   Mounted by server.js at /api/v2/notifications. */
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
  const { db, save } = ctx;
  const router = express.Router();
  router.use(auth);

  router.get('/', (req, res) => {
    res.json({ notifications: db.notifications.filter(n => n.userId === req.user.id).slice(0, 50) });
  });
  router.post('/read-all', (req, res) => {
    db.notifications.forEach(n => { if (n.userId === req.user.id) n.read = true; });
    save(); res.json({ ok: true });
  });
  // Notification preferences (stored on the user)
  router.get('/prefs', (req, res) => {
    const u = db.users.find(x => x.id === req.user.id);
    res.json({ prefs: u.notifPrefs || { friendRequests: true, messages: true, micInvites: true, gifts: true, mentions: true } });
  });
  router.post('/prefs', (req, res) => {
    const u = db.users.find(x => x.id === req.user.id);
    u.notifPrefs = { ...(u.notifPrefs || {}), ...(req.body || {}) };
    save(); res.json({ ok: true, prefs: u.notifPrefs });
  });
  // Owner announcement (everyone sees it on the home screen)
  router.get('/announcement', (req, res) => res.json({ announcement: db.settings.announcement }));
  return router;
};
