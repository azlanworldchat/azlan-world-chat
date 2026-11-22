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
 hot: ['g1', 'g2', 'g3', 'g10', 'g17', 'g18', 'g19', 'g26', 'g27', 'g28', 'g29', 'g30', 'g31', 'g34', 'g35', 'g36', 'g37', 'g38', 'g39', 'g40', 'g41', 'g42'],
 activity: ['g4', 'g5', 'g6', 'g7', 'g11', 'g12', 'g13', 'g14', 'g15', 'g16', 'g20', 'g33'],
 privilege: ['g8', 'g9', 'g32'],
 cp: ['g10', 'g3', 'g21', 'g22', 'g23', 'g24', 'g25']
};

module.exports = function (ctx) {
 const { db, save, notify, displayNameOf } = ctx;
 const router = express.Router();
 router.use(auth);

 // Full catalogue with category + animation size (small / big / huge).
 // OWNER MANAGE LISTS: hidden gifts are not shown; the rest follow the
 // owner's order (server-side, so every user sees the same list).
 router.get('/catalog', (req, res) => {
  const { listOrder } = ctx;
  const gifts = listOrder.visibleItems(db, 'gifts', db.gifts, g => g.id).map(g => ({
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
 // Live gift feed for a room — everyone in the room sees every gift sent there
 router.get('/room-feed', (req, res) => {
  const roomId = req.query.roomId;
  const feed = (db.roomGiftFeed && db.roomGiftFeed[roomId]) || [];
  res.json({ events: feed.slice(0, 20) });
 });
 // Send a gift with a custom animation + message
 router.post('/send', (req, res) => {
  const u = db.users.find(x => x.id === req.user.id);
  const { giftId, toUserId, qty, message, roomId } = req.body || {};
  const gift = db.gifts.find(g => g.id === giftId);
  const to = db.users.find(x => x.id === toUserId);
  if (!gift || !to) return res.status(400).json({ error: 'Gift or user not found' });
  if (ctx.listOrder.isHidden(db, 'gifts', giftId)) return res.status(400).json({ error: 'This gift was removed by the owner' });
  const { isOn, giftEnabled } = require('./controls');
  if (!isOn(db, 'gifts')) return res.status(403).json({ error: 'Gifts are turned off by the owner' });
  if (!giftEnabled(db, giftId)) return res.status(403).json({ error: 'This gift is turned off by the owner' });
  const n = Math.max(1, Math.min(777, qty || 1));
  const { DISCOUNTS } = require('./vip');
  const discountPct = DISCOUNTS[u.vip || 0] || 0;
  // Owner is FREE — all gifts at 0 coins (standing owner rule).
  const cost = u.role === 'owner' ? 0 : Math.floor(gift.price * n * (1 - discountPct / 100));
  if (u.coins < cost) return res.status(400).json({ error: 'Not enough coins' });
  u.coins -= cost; u.wealth += cost; to.charm += gift.charm * n; to.wealth += cost;
  to.giftsReceived = (to.giftsReceived || 0) + n; to.giftsReceivedCoins = (to.giftsReceivedCoins || 0) + cost;
  to.giftsReceivedBy = to.giftsReceivedBy || {}; to.giftsReceivedBy[gift.id] = (to.giftsReceivedBy[gift.id] || 0) + n;
  u.giftsSent = (u.giftsSent || 0) + n; u.biggestGift = Math.max(u.biggestGift || 0, cost);
  const broadcast = cost >= 100000;
  save();
  // Gift event: visible in the room for everyone, and notifies the recipient.
  const event = { id: Date.now() + '' + Math.floor(Math.random() * 1000), roomId: roomId || null,
   fromId: u.id, fromName: u.anonymous ? 'Anonymous' : displayNameOf(u), fromVip: u.vip || 0,
   toId: to.id, toName: displayNameOf(to), giftId: gift.id, giftName: gift.name, giftSvg: gift.svg,
   giftAnim: gift.anim, giftSound: gift.sound, qty: n, cost, at: new Date().toISOString() };
  if (roomId) {
   db.roomGiftFeed = db.roomGiftFeed || {};
   db.roomGiftFeed[roomId] = db.roomGiftFeed[roomId] || [];
   db.roomGiftFeed[roomId].unshift(event);
   if (db.roomGiftFeed[roomId].length > 20) db.roomGiftFeed[roomId] = db.roomGiftFeed[roomId].slice(0, 20);
  }
  const giftExtra = { kind: 'gift', giftEventId: event.id, gift: { id: gift.id, name: gift.name, svg: gift.svg, anim: gift.anim, sound: gift.sound }, from: event.fromName, fromId: u.id, to: displayNameOf(to), qty: n, cost };
  const text = broadcast
   ? `${event.fromName} sent ${gift.name} x${n} to ${to.name} — ${cost.toLocaleString()} coins!`
   : `${event.fromName} sent you ${gift.name} x${n}${message ? ': ' + message : ''} — you received a gift!`;
  if (broadcast) { db.broadcasts = db.broadcasts || []; db.broadcasts.unshift({ id: Date.now(), text, kind: 'gift', at: new Date().toISOString() }); db.users.forEach(x => notify(x.id, text, giftExtra)); }
  else notify(to.id, text, giftExtra);
  save();
  res.json({ ok: true, broadcast, broadcastText: text, animation: gift.price >= 5000 ? 'huge' : gift.price >= 500 ? 'big' : 'small', coins: u.coins, fromName: event.fromName, toName: to.name, event, gift: { id: gift.id, name: gift.name, svg: gift.svg, anim: gift.anim, sound: gift.sound, icon: gift.icon, price: gift.price } });
 });
 return router;
};
