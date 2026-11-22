/* VIP EXTRAS SERVER — benefit detail features from the screenshot batches.
  Mic styles / waves / connection, Send Items themes store, Personal ID
  Coupon, GIF profile photo, Bonus Points history, Party & Dating themes,
  Bonus Recharge Golds, Golds Items Discount, Customer Service Expert,
  protections, gifting + level-up broadcasts, Honor Achievement Display,
  custom items (90 days), Get Golds.
  Mounted by server.js at /api/v2/vipx. Original work. */
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

/* A) Room Mic Style — Default, Racing (V1), Throne (V1), Mic (V2 golden mic) */
const MIC_STYLES = [
 { id: 'default', name: 'Default', minVip: 0, desc: 'Classic round microphone seat.', icon: 'assets/icons/mic.svg' },
 { id: 'racing', name: 'Racing', minVip: 1, desc: 'Red sports car mic — use an exclusive Mic Style to catch everyone\'s eye.', icon: 'assets/gifts/sports-car.svg' },
 { id: 'throne', name: 'Throne', minVip: 1, desc: 'Red-gold royal throne mic seat.', icon: 'assets/icons/crown.svg' },
 { id: 'mic-gold', name: 'Mic', minVip: 2, desc: 'Golden microphone — VIP2 and above.', icon: 'assets/icons/mic.svg' }
];
/* B) Room Mic Wave — Default, Racing (V1), Throne (V1), Kiss (V2 pink hearts) */
const MIC_WAVES = [
 { id: 'default', name: 'Default', minVip: 0, desc: 'Standard speaking wave.', icon: 'assets/icons/wave.svg' },
 { id: 'racing', name: 'Racing', minVip: 1, desc: 'Speed lines wave — use an exclusive Mic Wave to make your voice shine.', icon: 'assets/icons/wave.svg' },
 { id: 'throne', name: 'Throne', minVip: 1, desc: 'Royal gold wave.', icon: 'assets/icons/sparkle.svg' },
 { id: 'kiss', name: 'Kiss', minVip: 2, desc: 'Pink hearts wave — VIP2 and above.', icon: 'assets/icons/kiss.svg' }
];
/* C) Mic Connection — link mic seats in pairs with animated waveform lines */
const MIC_CONNECTIONS = [
 { id: 'pair-1-2', seats: [1, 2], name: 'Seats 1–2' },
 { id: 'pair-3-4', seats: [3, 4], name: 'Seats 3–4' },
 { id: 'pair-5-6', seats: [5, 6], name: 'Seats 5–6' },
 { id: 'pair-7-8', seats: [7, 8], name: 'Seats 7–8' }
];
/* D) Send Items — Themes store (New Themes / ModernLives / Romance / Nature) */
const THEME_ITEMS = [
 { id: 'ti1', name: 'Golden Lion Sports Car', price: 3999, tab: 'new', icon: 'assets/gifts/sports-car.svg', asset: 'assets/gifts/sports-car.svg', desc: 'A golden sports car with a lion emblem.' },
 { id: 'ti2', name: 'Starry Night Room', price: 2999, tab: 'new', icon: 'assets/themes/starry-night.svg', asset: 'assets/themes/starry-night.svg', desc: 'A room under a starry sky.' },
 { id: 'ti3', name: 'Retro Record Player', price: 2999, tab: 'modern', icon: 'assets/themes/retro-record.svg', asset: 'assets/themes/retro-record.svg', desc: 'Vintage vinyl vibes.' },
 { id: 'ti4', name: 'Gold Ship Theme', price: 2099, tab: 'modern', icon: 'assets/themes/gold-ship.svg', asset: 'assets/themes/gold-ship.svg', desc: 'Sail in gold.' },
 { id: 'ti5', name: 'Sunset Lovers', price: 3999, tab: 'romance', icon: 'assets/themes/sunset-lovers.svg', asset: 'assets/themes/sunset-lovers.svg', desc: 'Romance at sunset.' },
 { id: 'ti6', name: 'Dating Heart Room', price: 3499, tab: 'romance', icon: 'assets/themes/dating-heart.svg', asset: 'assets/themes/dating-heart.svg', desc: 'A pink heart-shaped room.' },
 { id: 'ti7', name: 'Party Lounge', price: 4999, tab: 'romance', icon: 'assets/themes/party-lounge.svg', asset: 'assets/themes/party-lounge.svg', desc: 'Luxury lounge with golden thrones.' },
 { id: 'ti8', name: 'Forest King Garden', price: 1999, tab: 'nature', icon: 'assets/gifts/clover.svg', asset: 'assets/gifts/clover.svg', desc: 'A green garden theme.' }
];
/* E) Personal ID Coupon — golds saved when customizing/buying a personal ID */
const ID_COUPONS = { 2: 10000, 3: 50000, 4: 100000, 5: 250000, 6: 500000, 7: 1000000, 8: 1000000, 9: 1500000, 10: 2000000 };
/* I) Bonus Recharge Golds — extra golds on recharge by VIP level */
const RECHARGE_BONUS = { 1: 0, 2: 0, 3: 5, 4: 5, 5: 10, 6: 10, 7: 15, 8: 15, 9: 20, 10: 40, 11: 40 };
const GOLD_PACKAGES = [
 { id: 'gp1', golds: 100, usd: 0.99 }, { id: 'gp2', golds: 1000, usd: 8.99 }, { id: 'gp3', golds: 5000, usd: 43.99 }
];
const FIRST_RECHARGE_GIFTS = [
 { name: 'Coins', qty: 28, icon: 'assets/icons/coin.svg' }, { name: 'Rose', qty: 30, icon: 'assets/gifts/rose.svg' },
 { name: 'Ring', qty: 1, icon: 'assets/icons/cp.svg' }, { name: 'Profile Frame', qty: 1, icon: 'assets/icons/frame.svg' }
];
/* H + L) Room themes */
const ROOM_THEMES = [
 { id: 'party', name: 'Party Theme Set', desc: 'Use the Party theme to experience a new vibe — luxury lounge room with golden throne seats, hookah and a food table.', asset: 'assets/themes/party-lounge.svg', icon: 'assets/themes/party-lounge.svg', minVip: 1 },
 { id: 'dating', name: 'Dating Theme Set', desc: 'Use the Dating theme to fill your room with romance — pink heart-shaped room with CP seats 1–2 in the middle and heart bubbles.', asset: 'assets/themes/dating-heart.svg', icon: 'assets/themes/dating-heart.svg', minVip: 1 },
 { id: 'starry', name: 'Starry Night', desc: 'A room under a starry sky.', asset: 'assets/themes/starry-night.svg', icon: 'assets/themes/starry-night.svg', minVip: 0 },
 { id: 'retro', name: 'Retro Record Player', desc: 'Vintage vinyl vibes.', asset: 'assets/themes/retro-record.svg', icon: 'assets/themes/retro-record.svg', minVip: 0 },
 { id: 'ship', name: 'Gold Ship', desc: 'Sail in gold.', asset: 'assets/themes/gold-ship.svg', icon: 'assets/themes/gold-ship.svg', minVip: 0 },
 { id: 'sunset', name: 'Sunset Lovers', desc: 'Romance at sunset.', asset: 'assets/themes/sunset-lovers.svg', icon: 'assets/themes/sunset-lovers.svg', minVip: 0 },
 /* FREE-ASSET ROOM THEMES (2026-11-22): FreeGameArt gold gradients (CC0),
    free for everyone — minVip 0. Background art: assets/free/backgrounds/. */
 { id: 'gold-shimmer', name: 'Gold Shimmer', desc: 'Shimmering gold light for your room.', asset: 'assets/free/backgrounds/freegameui_gr_gold-shimmer_01.svg', icon: 'assets/free/backgrounds/freegameui_gr_gold-shimmer_01.svg', minVip: 0 },
 { id: 'golden-hour', name: 'Golden Hour', desc: 'Warm golden-hour glow.', asset: 'assets/free/backgrounds/freegameui_gr_golden-hour_01_01.svg', icon: 'assets/free/backgrounds/freegameui_gr_golden-hour_01_01.svg', minVip: 0 },
 { id: 'royal-gold', name: 'Royal Gold', desc: 'Deep royal gold.', asset: 'assets/free/backgrounds/freegameui_gr_royal-gold_01.svg', icon: 'assets/free/backgrounds/freegameui_gr_royal-gold_01.svg', minVip: 0 },
 { id: 'molten-gold', name: 'Molten Gold', desc: 'Molten gold flow.', asset: 'assets/free/backgrounds/freegameui_gr_molten-gold_01.svg', icon: 'assets/free/backgrounds/freegameui_gr_molten-gold_01.svg', minVip: 0 },
 { id: 'champagne', name: 'Champagne Gold', desc: 'Soft champagne gold.', asset: 'assets/free/backgrounds/freegameui_gr_champagne_08.svg', icon: 'assets/free/backgrounds/freegameui_gr_champagne_08.svg', minVip: 0 },
 { id: 'rosegold', name: 'Rose Gold', desc: 'Elegant rose gold.', asset: 'assets/free/backgrounds/freegameui_gr_rosegold_10.svg', icon: 'assets/free/backgrounds/freegameui_gr_rosegold_10.svg', minVip: 0 }
];
/* J) Golds Items Discount — 50% off; screenshot example deals (fixed prices) */
const DISCOUNT_DEALS = [
 { id: 'dd1', name: 'Golden Frame (7 days)', was: 49, now: 34, icon: 'assets/icons/frame.svg' },
 { id: 'dd2', name: 'Chat Box — Gold (7 days)', was: 29, now: 20, icon: 'assets/icons/chatbox.svg' }
];
/* S) Get Golds — one-time free golds */
const GET_GOLDS = { 9: 500000, 10: 1000000 };
const RENEW_GOLDS_10 = 200000;

function broadcast(db, notify, text, kind) {
 db.broadcasts = db.broadcasts || [];
 db.broadcasts.unshift({ id: Date.now() + Math.random(), text, kind: kind || 'gift', at: new Date().toISOString() });
 if (db.broadcasts.length > 50) db.broadcasts.length = 50;
 db.users.forEach(u => notify(u.id, text));
}

module.exports = function (ctx) {
 const { db, save, notify, displayNameOf } = ctx;
 const router = express.Router();
 router.use(auth);
 const me = (req) => db.users.find(x => x.id === req.user.id);
 const needVip = (u, v) => (u.vip || 0) >= v;

 /* --- A) Mic Style --- */
 router.get('/mic-styles', (req, res) => {
  const u = me(req);
  res.json({ styles: MIC_STYLES.map(s => ({ ...s, locked: (u.vip || 0) < s.minVip })), mine: u.micStyle || 'default' });
 });
 router.post('/mic-style', (req, res) => {
  const u = me(req);
  const s = MIC_STYLES.find(x => x.id === (req.body || {}).style);
  if (!s) return res.status(400).json({ error: 'Mic style not found' });
  if ((u.vip || 0) < s.minVip) return res.status(403).json({ error: `Mic Style "${s.name}" needs VIP${s.minVip}` });
  u.micStyle = s.id; save();
  res.json({ ok: true, micStyle: s });
 });
 /* --- B) Mic Wave --- */
 router.get('/mic-waves', (req, res) => {
  const u = me(req);
  res.json({ waves: MIC_WAVES.map(w => ({ ...w, locked: (u.vip || 0) < w.minVip })), mine: u.micWave || 'default' });
 });
 router.post('/mic-wave', (req, res) => {
  const u = me(req);
  const w = MIC_WAVES.find(x => x.id === (req.body || {}).wave);
  if (!w) return res.status(400).json({ error: 'Mic wave not found' });
  if ((u.vip || 0) < w.minVip) return res.status(403).json({ error: `Mic Wave "${w.name}" needs VIP${w.minVip}` });
  u.micWave = w.id; save();
  res.json({ ok: true, micWave: w });
 });
 /* --- C) Mic Connection --- */
 router.get('/mic-connections', (req, res) => {
  const u = me(req);
  res.json({ connections: MIC_CONNECTIONS, mine: u.micConnection || null });
 });
 router.post('/mic-connection', (req, res) => {
  const u = me(req);
  if (!u.vip) return res.status(403).json({ error: 'Mic Connection needs VIP' });
  const c = MIC_CONNECTIONS.find(x => x.id === (req.body || {}).connectionId);
  if (!c) return res.status(400).json({ error: 'Connection not found' });
  u.micConnection = c; save();
  res.json({ ok: true, micConnection: c });
 });

 /* --- D) Send Items: Themes store --- */
 router.get('/themes-store', (req, res) => {
  const tab = (req.query.tab || 'new').toLowerCase();
  const tabs = ['new', 'modern', 'romance', 'nature'];
  const tabNames = { new: 'New Themes', modern: 'ModernLives', romance: 'Romance', nature: 'Nature' };
  res.json({ tabs: tabs.map(t => ({ id: t, name: tabNames[t] })), tab: tabs.includes(tab) ? tab : 'new', items: THEME_ITEMS.filter(i => i.tab === (tabs.includes(tab) ? tab : 'new')) });
 });
 // Step 1: ask for confirmation — returns the exact confirm text.
 // Step 2: send { itemId, toUserId, confirm: true } to actually pay + send.
 router.post('/send-item', (req, res) => {
  const u = me(req);
  const { itemId, toUserId, confirm } = req.body || {};
  const item = THEME_ITEMS.find(i => i.id === itemId);
  const to = db.users.find(x => x.id === toUserId);
  if (!item) return res.status(400).json({ error: 'Item not found' });
  if (!to) return res.status(400).json({ error: 'Choose a friend to send it to' });
  // Owner is FREE — theme gifts at 0 coins (standing owner rule).
  const price = u.role === 'owner' ? 0 : item.price;
  if (!confirm) return res.json({ ok: true, needsConfirm: true, confirmText: `Confirm to pay ${price.toLocaleString()} golds to ${item.name}`, item, to: { id: to.id, name: to.name } });
  if (u.coins < price) return res.status(400).json({ error: 'Not enough golds (coins)' });
  u.coins -= price;
  to.inventory = to.inventory || []; to.inventory.push(item.id);
  notify(to.id, `${displayNameOf(u)} sent you ${item.icon} ${item.name} — choose the item you like from the store and send it to your friends to show your love!`);
  save();
  res.json({ ok: true, sent: true, coins: u.coins });
 });

 /* --- E) Personal ID Coupon --- */
 router.get('/id-coupon', (req, res) => {
  const u = me(req);
  const v = u.vip || 0;
  const amount = ID_COUPONS[v] || 0;
  res.json({
   vip: v, coupon: amount,
   note: amount ? `Your VIP${v} Personal ID Coupon is worth ${amount.toLocaleString()} golds. Coupons save golds when customizing or buying a personal ID, and expire at the end of the VIP period.` : 'Reach VIP2 to get a Personal ID Coupon.',
   vipUntil: u.vipUntil || null,
   used: !!(u.couponUsed && u.couponUsed === u.vipUntil)
  });
 });
 router.post('/id-coupon/use', (req, res) => {
  const u = me(req);
  const v = u.vip || 0;
  const amount = ID_COUPONS[v] || 0;
  if (!amount) return res.status(403).json({ error: 'No coupon at your VIP level (VIP2+)' });
  if (u.couponUsed === u.vipUntil) return res.status(400).json({ error: 'Coupon already used for this VIP period' });
  const { newId } = req.body || {};
  if (!newId || !/^\d{2,8}$/.test(String(newId))) return res.status(400).json({ error: 'ID must be 2–8 digits' });
  if (db.users.find(x => x.id === String(newId))) return res.status(400).json({ error: 'That ID is already taken' });
  const cost = u.role === 'owner' ? 0 : Math.max(0, 100000 - amount);
  if (u.coins < cost) return res.status(400).json({ error: `Custom ID costs 100,000 golds — your coupon covers ${amount.toLocaleString()}, you still need ${cost.toLocaleString()}` });
  u.coins -= cost; u.id = String(newId); u.couponUsed = u.vipUntil; save();
  res.json({ ok: true, newId: u.id, saved: amount, paid: cost });
 });

 /* --- F) GIF Profile Photo --- */
 router.post('/gif-photo', (req, res) => {
  const u = me(req);
  if (!u.vip) return res.status(403).json({ error: 'GIF Profile Photo needs VIP' });
  const url = (req.body || {}).url || (req.file ? '/uploads/' + req.file.filename : null);
  if (!url) return res.status(400).json({ error: 'Give a GIF image URL' });
  if (!/\.gif(\?|$)/i.test(url) && !url.includes('gif')) return res.status(400).json({ error: 'Please choose an animated GIF image' });
  u.gifPhoto = url; save();
  res.json({ ok: true, gifPhoto: url, note: 'Stand out from the crowd with a GIF profile photo.' });
 });

 /* --- G) Bonus Points history + VIP10 upgrade/renew with points --- */
 router.get('/bonus-history', (req, res) => {
  const u = me(req);
  res.json({
   balance: u.bonusPoints || 0,
   activity: (u.bonusHistory || []).filter(h => h.type === 'earn'),
   redemptions: (u.bonusHistory || []).filter(h => h.type === 'spend'),
   upgradeVip10Cost: 150000, renewVip10Cost: 50000,
   note: 'Get bonus points to buy cool bonus points items! Upgrade to VIP 10: 150,000 Bonus Points; Renew VIP 10: 50,000 Bonus Points.'
  });
 });
 router.post('/bonus-points/upgrade-vip10', (req, res) => {
  const u = me(req);
  if ((u.bonusPoints || 0) < 150000) return res.status(400).json({ error: 'Upgrade to VIP10 needs 150,000 Bonus Points' });
  u.bonusPoints -= 150000; u.vip = 10;
  u.vipUntil = new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString();
  u.bonusHistory = u.bonusHistory || [];
  u.bonusHistory.unshift({ type: 'spend', text: 'Upgraded to VIP10 with Bonus Points', amount: -150000, at: new Date().toISOString() });
  save();
  res.json({ ok: true, vip: 10, vipUntil: u.vipUntil });
 });
 router.post('/bonus-points/renew-vip10', (req, res) => {
  const u = me(req);
  if (u.vip !== 10) return res.status(400).json({ error: 'Only VIP10 can be renewed this way' });
  if ((u.bonusPoints || 0) < 50000) return res.status(400).json({ error: 'Renew VIP10 needs 50,000 Bonus Points' });
  u.bonusPoints -= 50000;
  const base = u.vipUntil && new Date(u.vipUntil) > new Date() ? new Date(u.vipUntil) : new Date();
  u.vipUntil = new Date(base.getTime() + 31 * 24 * 3600 * 1000).toISOString();
  u.bonusHistory = u.bonusHistory || [];
  u.bonusHistory.unshift({ type: 'spend', text: 'Renewed VIP10 with Bonus Points', amount: -50000, at: new Date().toISOString() });
  save();
  res.json({ ok: true, vipUntil: u.vipUntil });
 });

 /* --- H + L) Room themes --- */
 router.get('/themes', (req, res) => {
  const u = me(req);
  res.json({ themes: ROOM_THEMES.map(t => ({ ...t, locked: (u.vip || 0) < t.minVip })), mine: u.roomTheme || 'default' });
 });
 router.post('/themes/apply', (req, res) => {
  const u = me(req);
  const t = ROOM_THEMES.find(x => x.id === (req.body || {}).theme);
  if (!t) return res.status(400).json({ error: 'Theme not found' });
  if ((u.vip || 0) < t.minVip) return res.status(403).json({ error: `Theme "${t.name}" needs VIP${t.minVip}` });
  u.roomTheme = t.id; save();
  res.json({ ok: true, theme: t });
 });

 /* --- I) Bonus Recharge Golds + gold packages + first recharge gifts --- */
 router.get('/recharge-bonus', (req, res) => {
  const u = me(req);
  const v = u.vip || 0;
  res.json({
   vip: v, bonusPct: RECHARGE_BONUS[v] || 0,
   table: [3, 4, 5, 6, 7, 8, 9, 10].map(x => ({ vip: x, bonusPct: RECHARGE_BONUS[x] })),
   goldPackages: GOLD_PACKAGES,
   firstRechargeGifts: FIRST_RECHARGE_GIFTS,
   firstRechargeDone: (u.totalRecharged || 0) > 0,
   note: 'Extra golds on recharge by VIP level: VIP3 5%, VIP4 5%, VIP5 10%, VIP6 10%, VIP7 15%, VIP8 15%, VIP9 20%, VIP10 40%.'
  });
 });
 router.get('/golds-packages', (req, res) => res.json({ packages: GOLD_PACKAGES, firstRechargeGifts: FIRST_RECHARGE_GIFTS }));

 /* --- J) Golds Items Discount --- */
 router.get('/discounts', (req, res) => {
  const u = me(req);
  const vipPct = { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18, 10: 20, 11: 25 }[u.vip || 0];
  const premiumPct = u.premium ? 15 : 0;
  res.json({
   vipDiscountPct: vipPct, premiumDiscountPct: premiumPct,
   bestPct: Math.max(vipPct, premiumPct),
   goldsItemsDiscountPct: 50,
   deals: DISCOUNT_DEALS,
   note: 'Enjoy the privilege of 50% discount to buy items. If you are also a Premium user, the better of the Premium / VIP discount applies.'
  });
 });

 /* --- K) Customer Service Expert --- */
 router.get('/support', (req, res) => {
  const u = me(req);
  res.json({
   vip: u.vip || 0,
   expert: (u.vip || 0) > 0,
   note: (u.vip || 0) > 0 ? 'Enjoy the best service from our customer service expert.' : 'Customer Service Expert is a VIP benefit.',
   tickets: (db.tickets || []).filter(t => t.userId === u.id).slice(0, 20)
  });
 });
 router.post('/support/ticket', (req, res) => {
  const u = me(req);
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Write your question' });
  db.tickets = db.tickets || [];
  const t = { id: Date.now(), userId: u.id, name: displayNameOf(u), text, vip: u.vip || 0, status: 'open', at: new Date().toISOString() };
  db.tickets.unshift(t); save();
  res.json({ ok: true, ticket: t, note: 'Your ticket was sent to the Customer Service Expert.' });
 });

 /* --- M + N) Protections --- */
 router.get('/protections', (req, res) => {
  const u = me(req);
  const v = u.vip || 0;
  const note = 'If you violate Community Guidelines in someone else\'s room, we may still ban you from chat in that room.';
  res.json({
   vip: v,
   chatRestriction: { protected: v >= 6, text: 'You can\'t ban users of this VIP level from chat.', note: 'Never worry about being banned from chat in any rooms. ' + note },
   removal: { protected: v >= 6, text: 'You can\'t remove users of this VIP level from the room.', note }
  });
 });
 router.post('/chat-ban', (req, res) => {
  const u = me(req);
  const { roomId, userId } = req.body || {};
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.hostId !== u.id && u.role !== 'owner') return res.status(403).json({ error: 'Only the host can ban from chat' });
  const target = db.users.find(x => x.id === userId);
  if (target && (target.vip || 0) >= 6 && u.role !== 'owner') return res.status(403).json({ error: 'You can\'t ban users of this VIP level from chat. (VIP6+ protection)' });
  room.chatBanned = room.chatBanned || [];
  if (!room.chatBanned.includes(userId)) room.chatBanned.push(userId);
  save();
  res.json({ ok: true, note: 'If they violate Community Guidelines in someone else\'s room, they may still be banned from chat in that room.' });
 });

 /* --- O + P) Broadcasts feed (owner's announcement order applies) --- */
 router.get('/broadcasts', (req, res) => res.json({ broadcasts: ctx.listOrder.applyOrder(db, 'announcements', db.broadcasts || [], b => b.id).slice(0, 20) }));
 /* --- Q) Honor Achievement Display --- */
 router.get('/honor', (req, res) => {
  const top = [...db.users].filter(x => !x.anonymous).sort((a, b) => (b.charm || 0) - (a.charm || 0))[0];
  res.json({
   banner: top ? `Most Influential User — ${top.name}` : 'Most Influential User — Azlan',
   user: top ? { id: top.id, name: top.name, vip: top.vip || 0, charm: top.charm || 0 } : null,
   note: 'Your personal information can be displayed on the banner by official in the Room-Recommend page, representing your distinguished honor.'
  });
 });

 /* --- R) Custom items (90-day validity) --- */
 router.get('/custom-items', (req, res) => {
  const u = me(req);
  res.json({
   vip: u.vip || 0,
   custom: u.vipCustom || {},
   validUntil: u.vipCustomUntil || null,
   note: 'Every customized item is valid 90 days. Renewing the VIP level extends it by another 90 days.'
  });
 });
 router.post('/custom-items', (req, res) => {
  const u = me(req);
  if (!u.vip) return res.status(403).json({ error: 'Custom items need VIP' });
  const { kind, color, effect, elements } = req.body || {};
  if (!['frame', 'chatBox', 'entrance', 'gift', 'cardSkin'].includes(kind)) return res.status(400).json({ error: 'kind must be frame, chatBox, entrance, gift or cardSkin' });
  u.vipCustom = u.vipCustom || {};
  u.vipCustom[kind] = { color: color || null, effect: effect || null, elements: elements || null, updatedAt: new Date().toISOString() };
  const base = u.vipCustomUntil && new Date(u.vipCustomUntil) > new Date() ? new Date(u.vipCustomUntil) : new Date();
  u.vipCustomUntil = new Date(base.getTime() + 90 * 24 * 3600 * 1000).toISOString();
  save();
  res.json({ ok: true, custom: u.vipCustom, validUntil: u.vipCustomUntil });
 });

 /* --- S) Get Golds (one-time) --- */
 router.post('/get-golds', (req, res) => {
  const u = me(req);
  const v = u.vip || 0;
  const amount = GET_GOLDS[v];
  if (!amount) return res.status(403).json({ error: 'Get Golds is for VIP9 (500,000) and VIP10 (1,000,000) — one time only' });
  u.goldsClaimed = u.goldsClaimed || {};
  if (u.goldsClaimed[v]) return res.status(400).json({ error: `You already claimed the VIP${v} golds bonus` });
  u.goldsClaimed[v] = true; u.coins += amount; save();
  res.json({ ok: true, golds: amount, coins: u.coins, note: `VIP${v} one-time free golds: ${amount.toLocaleString()}. Renewing VIP10 gives 200,000 golds.` });
 });
 router.post('/get-golds/renew10', (req, res) => {
  const u = me(req);
  if (u.vip !== 10) return res.status(400).json({ error: 'Only VIP10 renewals get 200,000 golds' });
  if (!u.vipUntil || new Date(u.vipUntil) <= new Date()) return res.status(400).json({ error: 'Renew your VIP10 first' });
  u.coins += RENEW_GOLDS_10; save();
  res.json({ ok: true, golds: RENEW_GOLDS_10, coins: u.coins });
 });

 return router;
};
module.exports.broadcast = broadcast;
module.exports.RECHARGE_BONUS = RECHARGE_BONUS;
module.exports.FIRST_RECHARGE_GIFTS = FIRST_RECHARGE_GIFTS;
