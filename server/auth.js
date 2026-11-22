/* AUTH SERVER — registration, login, sessions, owner direct entry.
   Mounted by server.js at /api/v2/auth (the main routes live in server.js;
   this module documents and extends the auth service). */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-AZLAN';

module.exports = function (ctx) {
  const { db, save, audit } = ctx;
  const router = express.Router();
  /* PRIVACY (owner rule 2026-11-22): strip private fields from every user
     object this module returns — email/phone/verification/device never
     leave the server for another user. */
  const clean = (u) => { const { password, email, phone, verificationCode, verificationExpires, deviceId, ...r } = u; return r; };

  // Check whether an email is already registered (used by the app before signup)
  router.get('/check/:email', (req, res) => {
    res.json({ exists: !!db.users.find(u => u.email === req.params.email) });
  });
  // Change password (logged-in user)
  router.post('/change-password', (req, res) => {
    const h = req.headers.authorization || '';
    const t = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!t) return res.status(401).json({ error: 'Login required' });
    let decoded; try { decoded = jwt.verify(t, JWT_SECRET); } catch (e) { return res.status(401).json({ error: 'Bad session' }); }
    const u = db.users.find(x => x.id === decoded.id);
    const { oldPassword, newPassword } = req.body || {};
    if (!u || !bcrypt.compareSync(oldPassword || '', u.password)) return res.status(400).json({ error: 'Old password is wrong' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'New password must be 6+ characters' });
    u.password = bcrypt.hashSync(newPassword, 10); save();
    audit(u.id, 'password-change', u.name);
    res.json({ ok: true });
  });
  // Who is online (last activity is approximated by created order here)
  router.get('/online', (req, res) => res.json({ count: db.users.length, users: db.users.slice(0, 50).map(clean) }));
  return router;
};
