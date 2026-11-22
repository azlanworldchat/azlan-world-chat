/* EXTRAS SERVER — achievements, badges, honor titles, wealth levels,
  events, legal pages, block/report, public profiles, language, levels.
  Mounted by server.js at /api/v2/extras. Original work, AZLAN WORLD CHAT
  branding on every legal page. */
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

const LANGUAGES = ['English', 'Arabic', 'Turkish', 'Bahasa Indonesia', 'Portuguese', 'Spanish', 'Hindi', 'Urdu'];

const ACHIEVEMENTS = [
 { id: 'a1', name: 'First Room', desc: 'Create your first voice room', icon: 'assets/icons/mic.svg', test: u => (u.roomsCreated || 0) >= 1 },
 { id: 'a2', name: 'First Gift', desc: 'Send your first gift', icon: 'assets/icons/gift.svg', test: u => (u.giftsSent || 0) >= 1 },
 { id: 'a3', name: 'Gift Star', desc: 'Send 10 gifts', icon: 'assets/icons/star.svg', test: u => (u.giftsSent || 0) >= 10 },
 { id: 'a4', name: 'VIP Member', desc: 'Become a VIP', icon: 'assets/icons/crown.svg', test: u => (u.vip || 0) >= 1 },
 { id: 'a5', name: 'VIP10 Legend', desc: 'Reach VIP10', icon: 'assets/vip/vip10.svg', test: u => (u.vip || 0) >= 10 },
 { id: 'a6', name: 'Millionaire', desc: 'Hold 1,000,000+ wealth', icon: 'assets/icons/coin.svg', test: u => (u.wealth || 0) >= 1000000 },
 { id: 'a7', name: 'Charm Star', desc: 'Reach 100,000 charm', icon: 'assets/icons/heart.svg', test: u => (u.charm || 0) >= 100000 },
 { id: 'a8', name: 'Popular', desc: 'Get 10 followers', icon: 'assets/icons/users.svg', test: u => (u.followers || []).length >= 10 },
 { id: 'a9', name: 'Storyteller', desc: 'Post 5 moments', icon: 'assets/icons/camera.svg', test: u => (u.momentsPosted || 0) >= 5 },
 { id: 'a10', name: 'In Love', desc: 'Bind a CP partner', icon: 'assets/icons/cp.svg', test: u => (u.cpBound || 0) >= 1 },
 { id: 'a11', name: 'Family Man', desc: 'Join a family', icon: 'assets/icons/family.svg', test: u => (u.familyJoined || 0) >= 1 },
 { id: 'a12', name: 'Lucky One', desc: 'Win 50,000+ in the Lucky Draw', icon: 'assets/gifts/clover.svg', test: u => (u.biggestLucky || 0) >= 50000 }
];
const BADGES = [
 { id: 'b1', name: 'Gold Expert', desc: 'Recharged 1,000,000+ golds in total', icon: 'assets/gifts/medal.svg', test: u => (u.totalRechargedGolds || 0) >= 1000000 },
 { id: 'b2', name: 'Fruit Master', desc: 'Won 10 Lucky Draws', icon: 'assets/icons/fruit.svg', test: u => (u.luckyWins || 0) >= 10 },
 { id: 'b3', name: 'Crown of Eternity', desc: 'VIP for 90+ days in total', icon: 'assets/icons/crown.svg', test: u => (u.vipDays || 0) >= 90 },
 { id: 'b4', name: 'Forest King', desc: 'Created 5 rooms', icon: 'assets/icons/tree.svg', test: u => (u.roomsCreated || 0) >= 5 },
 { id: 'b5', name: 'Mark of Rarity', desc: 'Own a custom unique ID', icon: 'assets/icons/diamond.svg', test: u => !!u.customId },
 { id: 'b6', name: 'Customized Glory', desc: 'Customized a VIP item', icon: 'assets/icons/theme.svg', test: u => !!(u.vipCustom && Object.keys(u.vipCustom).length) },
 { id: 'b7', name: 'Millionaire', desc: 'Wealth over 10,000,000', icon: 'assets/icons/coin.svg', test: u => (u.wealth || 0) >= 10000000 },
 { id: 'b8', name: 'Super Star', desc: 'Charm over 1,000,000', icon: 'assets/icons/star.svg', test: u => (u.charm || 0) >= 1000000 },
 { id: 'b9', name: 'Gift Star', desc: 'Sent 100 gifts', icon: 'assets/icons/gift.svg', test: u => (u.giftsSent || 0) >= 100 },
 { id: 'b10', name: 'Winner Takes All', desc: 'Top 1 on any ranking', icon: 'assets/icons/trophy.svg', test: u => !!u.wasTop1 },
 { id: 'b11', name: 'Fishing Battle', desc: 'Played 5 room games', icon: 'assets/icons/game.svg', test: u => (u.gamesPlayed || 0) >= 5 },
 { id: 'b12', name: 'Celebration', desc: 'Joined 3 events', icon: 'assets/icons/party.svg', test: u => (u.eventsJoined || 0) >= 3 },
 { id: 'b13', name: 'Gift Skyscraper', desc: 'Sent a gift worth 100,000+ coins', icon: 'assets/icons/rooms.svg', test: u => (u.biggestGift || 0) >= 100000 },
 { id: 'b14', name: 'Glory Member', desc: 'Member for 30+ days', icon: 'assets/icons/medal.svg', test: u => (Date.now() - new Date(u.createdAt || Date.now()).getTime()) >= 30 * 86400000 },
 { id: 'b15', name: 'Charm Star', desc: 'Charm over 500,000', icon: 'assets/icons/star.svg', test: u => (u.charm || 0) >= 500000 },
 { id: 'b16', name: 'Top Room', desc: 'Own a room with 50+ members', icon: 'assets/icons/rooms.svg', test: u => !!u.bigRoom },
 { id: 'b17', name: 'Top Man', desc: 'Top 3 on the Wealth ranking', icon: 'assets/icons/crown.svg', test: u => !!u.top3Wealth },
 { id: 'b18', name: 'Pop Star', desc: '50+ followers', icon: 'assets/icons/mic.svg', test: u => (u.followers || []).length >= 50 }
];
const HONOR_TITLES = [
 'Elite User', 'Elite Patron', 'King of Gold', 'Ocean Party TOP', 'Fruit Party TOP',
 'Royal Love', 'Moonlight CP', 'Eternal Love', 'Sovereign VIP', 'Royal VIP',
 'Prestige VIP', 'Elite VIP', 'Soul Bond', 'Top Star', 'Top Gifter', 'Billionaire'
];
/* Wealth levels — Lv.1 to Lv.22, exp = wealth earned */
const WEALTH_LEVELS = [0, 1000, 5000, 15000, 30000, 60000, 100000, 160000, 250000, 400000, 600000, 900000, 1300000, 1800000, 2500000, 3500000, 5000000, 7000000, 10000000, 15000000, 22000000, 30000000];
function wealthLevel(wealth) {
 let lv = 1;
 for (let i = 0; i < WEALTH_LEVELS.length; i++) if ((wealth || 0) >= WEALTH_LEVELS[i]) lv = i + 1;
 const next = WEALTH_LEVELS[lv] || null;
 return { level: lv, current: wealth || 0, next, expToNext: next ? next - (wealth || 0) : 0 };
}

const LEGAL = {
 privacy: { title: 'Privacy Policy — AZLAN WORLD CHAT', body: [
  '1. Information We Collect — AZLAN WORLD CHAT collects the information you give us: your name, email, profile photo, voice messages you record, chat messages and payment receipts you upload. We also collect device information (device model, app version) to keep the app working.',
  '2. How We Use It — To run voice rooms, deliver gifts and coins, show rankings, and keep the community safe. We never sell your personal information to anyone.',
  '3. Where Data Is Stored — Your account data is stored on the AZLAN WORLD CHAT server. Voice messages and photos you upload are stored on the same server.',
  '4. Who Sees It — Other users see your public profile (name, ID, level, VIP, badges). Your email, password and payment details are never shown to other users.',
  '5. Your Rights — You can ask for a copy of your data, correct it, or delete your account at any time from Settings, or by contacting the owner. We will answer within 15 working days.',
  '6. Children — AZLAN WORLD CHAT is not for children under 13. See our Child Safety Policy.',
  '7. Contact — For privacy questions, contact the owner of AZLAN WORLD CHAT through Customer Service in the app.',
  '8. Changes — If this policy changes, we will show the new version in the app before it takes effect.'
 ] },
 terms: { title: 'Terms of Service — AZLAN WORLD CHAT', body: [
  '1. Welcome — By using AZLAN WORLD CHAT you agree to these terms. The app is owned and operated by Azlan.',
  '2. Your Account — You are responsible for your account and password. Do not share your login. One account per person.',
  '3. Coins, Gifts and VIP — Coins, diamonds, gifts and VIP are virtual items for fun inside the app. They have no cash value and cannot be exchanged for real money, except through the official recharge and withdrawal rules set by the owner.',
  '4. Payments — Recharges are made through the payment methods shown in the app. Upload your receipt; coins are credited only after the owner approves it. Never send money to a stranger claiming to be staff.',
  '5. Be Kind — No harassment, hate, threats, or adult content. No spam, no scams, no fake accounts. Breaking the rules can get your account banned.',
  '6. Voice Rooms — Be respectful on the mic. The room host and the owner can mute, remove or ban users who break the rules.',
  '7. Your Content — You keep the rights to what you post. By posting, you allow AZLAN WORLD CHAT to show it inside the app.',
  '8. Changes and Ending — We may update the app and these terms. We may close accounts that break the rules.'
 ] },
 childsafety: { title: 'Child Safety Policy — AZLAN WORLD CHAT', body: [
  '1. No Children Under 13 — AZLAN WORLD CHAT is for users aged 13 and over. Children under 13 must not create an account.',
  '2. Protection — We do not allow any content that harms children, including grooming, sexual content involving minors, or bullying of children. Such content is removed and the account is banned immediately.',
  '3. Reporting — If you see anything that puts a child at risk, report it at once from the user profile (Report button) or through Customer Service. Reports are reviewed by the owner as a priority.',
  '4. Parents — Parents can ask us to delete a child\'s account by contacting Customer Service with proof of guardianship.',
  '5. Safety Tools — Block any user, report any message, and turn off messages from strangers in Settings > Privacy.'
 ] }
};

module.exports = function (ctx) {
 const { db, save, notify } = ctx;
 const router = express.Router();
 router.use(auth);
 const me = (req) => db.users.find(x => x.id === req.user.id);
 const pub = (u) => {
  if (!u) return null;
  const { password, ...rest } = u;
  if (rest.anonymous) rest.name = 'Anonymous';
  return rest;
 };

 /* --- levels --- */
 router.get('/levels', (req, res) => {
  const u = me(req);
  const xp = (u.wealth || 0) + (u.charm || 0);
  const level = 1 + Math.floor(xp / 50000);
  res.json({ level, xp, nextLevelAt: level * 50000, wealthLevel: wealthLevel(u.wealth || 0) });
 });
 router.get('/wealth-levels', (req, res) => {
  const u = me(req);
  const w = wealthLevel(u.wealth || 0);
  res.json({ myWealthLevel: w, levels: WEALTH_LEVELS.map((exp, i) => ({ level: i + 1, expNeeded: exp })) });
 });

 /* --- achievements --- */
 router.get('/achievements', (req, res) => {
  const u = me(req);
  res.json({ achievements: ACHIEVEMENTS.map(a => ({ ...a, unlocked: !!a.test(u), test: undefined })) });
 });
 /* --- badges (wear up to 3) --- */
 router.get('/badges', (req, res) => {
  const u = me(req);
  res.json({ badges: BADGES.map(b => ({ ...b, unlocked: !!b.test(u), test: undefined })), worn: u.wornBadges || [] });
 });
 router.post('/badges/wear', (req, res) => {
  const u = me(req);
  const ids = (req.body || {}).badges || [];
  if (ids.length > 3) return res.status(400).json({ error: 'You can wear up to 3 badges at once' });
  const unlocked = BADGES.filter(b => b.test(u)).map(b => b.id);
  if (ids.some(id => !unlocked.includes(id))) return res.status(400).json({ error: 'You can only wear badges you have earned' });
  u.wornBadges = ids; save();
  res.json({ ok: true, worn: u.wornBadges });
 });
 /* --- honor titles --- */
 router.get('/honor-titles', (req, res) => {
  const u = me(req);
  res.json({ titles: HONOR_TITLES, mine: u.honorTitle || null, note: 'Honor titles are awarded by the owner and by events. Wear one to show it on your profile.' });
 });
 router.post('/honor-titles/wear', (req, res) => {
  const u = me(req);
  const { title } = req.body || {};
  if (title && !HONOR_TITLES.includes(title)) return res.status(400).json({ error: 'Unknown honor title' });
  u.honorTitle = title || null; save();
  res.json({ ok: true, honorTitle: u.honorTitle });
 });

 /* --- events --- */
 router.get('/events', (req, res) => {
  res.json({ events: (db.events || []).slice().reverse() });
 });
 router.post('/events/:id/join', (req, res) => {
  const u = me(req);
  const ev = (db.events || []).find(e => e.id == req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  ev.members = ev.members || [];
  if (!ev.members.includes(u.id)) { ev.members.push(u.id); u.eventsJoined = (u.eventsJoined || 0) + 1; }
  save();
  res.json({ ok: true, members: ev.members.length });
 });
 router.post('/events', (req, res) => {
  const u = me(req);
  if (u.role !== 'owner') return res.status(403).json({ error: 'Only the owner creates events' });
  const { name, desc, startsAt, endsAt } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Event name is required' });
  db.events = db.events || [];
  const ev = { id: Date.now(), name, desc: desc || '', startsAt: startsAt || new Date().toISOString(), endsAt: endsAt || null, members: [], createdBy: u.id };
  db.events.push(ev); save();
  res.json({ ok: true, event: ev });
 });

 /* --- legal pages --- */
 router.get('/legal/:page', (req, res) => {
  const p = LEGAL[req.params.page];
  if (!p) return res.status(404).json({ error: 'Page not found (privacy, terms, childsafety)' });
  res.json(p);
 });
 router.get('/about', (req, res) => res.json({
  app: 'AZLAN WORLD CHAT', version: '1.0.0', owner: 'Azlan',
  desc: 'A global real-time voice social platform — voice rooms, gifts, VIP, friends and fun, built for everyone.',
  contact: 'Customer Service inside the app',
  legal: ['privacy', 'terms', 'childsafety']
 }));

 /* --- language --- */
 router.get('/languages', (req, res) => res.json({ languages: LANGUAGES, mine: me(req).language || 'English' }));
 router.post('/language', (req, res) => {
  const u = me(req);
  const { lang } = req.body || {};
  if (!LANGUAGES.includes(lang)) return res.status(400).json({ error: 'Language not supported' });
  u.language = lang; save();
  res.json({ ok: true, language: lang });
 });

 /* --- block / report --- */
 router.post('/users/:id/block', (req, res) => {
  const u = me(req);
  const target = db.users.find(x => x.id === req.params.id);
  if (!target || target.id === u.id) return res.status(400).json({ error: 'Cannot block this user' });
  u.blocked = u.blocked || [];
  if (!u.blocked.includes(target.id)) u.blocked.push(target.id);
  save();
  res.json({ ok: true, blocked: u.blocked });
 });
 router.post('/users/:id/unblock', (req, res) => {
  const u = me(req);
  u.blocked = (u.blocked || []).filter(x => x !== req.params.id);
  save();
  res.json({ ok: true, blocked: u.blocked });
 });
 router.post('/users/:id/report', (req, res) => {
  const u = me(req);
  const { reason } = req.body || {};
  const target = db.users.find(x => x.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  db.reports = db.reports || [];
  db.reports.unshift({ id: Date.now(), reporterId: u.id, reporterName: u.name, userId: target.id, userName: target.name, reason: reason || 'No reason given', at: new Date().toISOString(), status: 'open' });
  save();
  res.json({ ok: true, note: 'Report sent to the owner. Thank you for keeping AZLAN WORLD CHAT safe.' });
 });

 /* --- public profile (followers / fans) --- */
 router.get('/profile/:id', (req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  const p = pub(u);
  const followers = (u.followers || []).map(id => { const f = db.users.find(x => x.id === id); return f ? { id: f.id, name: f.anonymous ? 'Anonymous' : f.name, vip: f.vip || 0 } : null; }).filter(Boolean);
  const following = (u.following || []).map(id => { const f = db.users.find(x => x.id === id); return f ? { id: f.id, name: f.anonymous ? 'Anonymous' : f.name, vip: f.vip || 0 } : null; }).filter(Boolean);
  res.json({
   user: p,
   followers, following,
   wealthLevel: wealthLevel(u.wealth || 0),
   badges: (u.wornBadges || []).map(id => BADGES.find(b => b.id === id)).filter(Boolean),
   honorTitle: u.honorTitle || null,
   gifPhoto: u.gifPhoto || null,
   stats: { coins: u.coins, diamonds: u.diamonds, charm: u.charm, wealth: u.wealth, level: u.level || 1, vip: u.vip || 0 }
  });
 });

 return router;
};
module.exports.WEALTH_LEVELS = WEALTH_LEVELS;
module.exports.wealthLevel = wealthLevel;
