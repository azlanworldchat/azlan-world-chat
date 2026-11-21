/* GIFT SERVER — gift catalogue, sending, broadcasts, charm/wealth.
  A gift of 100,000+ coins triggers a global broadcast.
  Mounted by server.js at /api/v2/gifts. */
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

const CATEGORIES = {
 hot: ['g1', 'g2', 'g3', 'g10', 'g17', 'g18', 'g19', 'g26', 'g27', 'g28', 'g29', 'g30', 'g31', 'g34'],
 activity: ['g4', 'g5', 'g6', 'g7', 'g11', 'g12', 'g13', 'g14', 'g15', 'g16', 'g20', 'g33'],
 privilege: ['g8', 'g9', 'g32'],
 cp: ['g10', 'g3', 'g21', 'g22', 'g23', 'g24', 'g25']
};

module.exports = function (ctx) {
 const { db, save, notify } = ctx;
 const router = express.Router();
 router.use(auth);

 // Full catalogue with category + animation size (small / big / huge)
 router.get('/catalog', (req, res) => {
  const gifts = db.gifts.map(g => ({
   ...g,
   animation: g.price >= 5000 ? 'huge' : g.price >= 500 ? 'big' : 'small',
   category: Object.keys(CATEGORIES).find(c => CATEGORIES[c].includes(g.id)) || 'hot'
  }));
  res.json({ gifts, categories: Object.keys(CATEGORIES) });
 });
 // Recent big-gift broadcasts (for the global banner feed)
 router.get('/broadcasts', (req, res) => {
  const notes = db.notifications.filter(n => n.text.includes(' sent ')).slice(0, 20);
  res.json({ broadcasts: notes });
 });
 // Send a gift with a custom animation + message
 router.post('/send', (req, res) => {
  const u = db.users.find(x => x.id === req.user.id);
  const { giftId, toUserId, qty, message } = req.body || {};
  const gift = db.gifts.find(g => g.id === giftId);
  const to = db.users.find(x => x.id === toUserId);
  if (!gift || !to) return res.status(400).json({ error: 'Gift or user not found' });
  const { isOn, giftEnabled } = require('./controls');
  if (!isOn(db, 'gifts')) return res.status(403).json({ error: 'Gifts are turned off by the owner' });
  if (!giftEnabled(db, giftId)) return res.status(403).json({ error: 'This gift is turned off by the owner' });
  const n = Math.max(1, Math.min(777, qty || 1));
  const { DISCOUNTS } = require('./vip');
  const discountPct = DISCOUNTS[u.vip || 0] || 0;
  const cost = Math.floor(gift.price * n * (1 - discountPct / 100));
  if (u.coins < cost) return res.status(400).json({ error: 'Not enough coins' });
  u.coins -= cost; u.wealth += cost; to.charm += gift.charm * n; to.wealth += cost;
  u.giftsSent = (u.giftsSent || 0) + n; u.biggestGift = Math.max(u.biggestGift || 0, cost);
  const broadcast = cost >= 100000;
  save();
  const text = broadcast
   ? `${u.name} sent ${gift.name} x${n} to ${to.name} — ${cost.toLocaleString()} coins!`
   : `${u.name} sent you ${gift.icon} ${gift.name} x${n}${message ? ': ' + message : ''}`;
  if (broadcast) { db.broadcasts = db.broadcasts || []; db.broadcasts.unshift({ id: Date.now(), text, kind: 'gift', at: new Date().toISOString() }); db.users.forEach(x => notify(x.id, text)); }
  else notify(to.id, text);
  save();
  res.json({ ok: true, broadcast, animation: gift.price >= 5000 ? 'huge' : gift.price >= 500 ? 'big' : 'small', coins: u.coins, gift: { id: gift.id, name: gift.name, svg: gift.svg, anim: gift.anim, sound: gift.sound, icon: gift.icon } });
 });
 return router;
};
