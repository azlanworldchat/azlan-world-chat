/* RANKING SERVER — wealth, charm, level, room and CP rankings.
   Mounted by server.js at /api/v2/rankings. */
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
  const { db, displayNameOf } = ctx;
  const router = express.Router();
  router.use(auth);
  /* PRIVACY (owner rule 2026-11-22): rankings show public things only —
     email/phone/verification/device are stripped, never sent to clients. */
  const clean = (u) => { const { password, email, phone, verificationCode, verificationExpires, deviceId, ...r } = u; if (r.anonymous) r.name = 'Anonymous'; else r.name = displayNameOf(u); return r; }; // Anonymous Display: masked in Top Gifters / rankings
  const top = (key, n = 20) => [...db.users].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, n).map(clean);

  router.get('/wealth', (req, res) => res.json({ ranking: top('wealth') }));
  router.get('/charm', (req, res) => res.json({ ranking: top('charm') }));
  router.get('/level', (req, res) => res.json({ ranking: top('level') }));
  router.get('/rooms', (req, res) => res.json({
    ranking: [...db.rooms].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 20)
  }));
  router.get('/cp', (req, res) => res.json({
    ranking: [...db.cpPairs].filter(p => p.status === 'active').sort((a, b) => (b.intimacy || 0) - (a.intimacy || 0)).slice(0, 20)
  }));
  router.get('/families', (req, res) => res.json({
    ranking: [...db.families].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 20)
  }));
  return router;
};
