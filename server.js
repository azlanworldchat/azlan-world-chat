/* ============================================================================
  AZLAN WORLD CHAT — backend (Node.js + Express)
  Original work. No Yalla / Saaky code or assets are used here.
  Data store: a single JSON file (data/db.json) — simple, portable, no
  native modules needed. Swap it for SQLite/PostgreSQL later if you wish.
  Owner: Azlan — enters DIRECTLY (no login) via the Owner Portal button
  using OWNER_SECRET. Everyone else must register / log in.
  SECURITY: change OWNER_SECRET, JWT_SECRET and the owner default
  password before you publish this anywhere.
============================================================================ */
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { isOn, giftEnabled, vipLevelEnabled } = require('./server/controls');
const { RECHARGE_BONUS, FIRST_RECHARGE_GIFTS } = require('./server/vip-extras');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-AZLAN';
const OWNER_SECRET = process.env.OWNER_SECRET || 'CHANGE-THIS-OWNER-SECRET';
const OWNER_EMAIL = 'owner@azlanworld.chat';
const OWNER_DEFAULT_PASSWORD = 'AzlanOwner#1'; // <-- CHANGE THIS after first login
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data', 'db.json');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------------- tiny JSON database ---------------- */
function blankDb() {
 return {
  users: [], rooms: [], gifts: [
   { id: 'g1', name: 'Rose', price: 1, icon: 'assets/gifts/rose.svg', charm: 10, svg: 'assets/gifts/rose.svg', anim: 'bloom', sound: 'chime' },
   { id: 'g2', name: 'Balloon', price: 3, icon: 'assets/gifts/balloon.svg', charm: 30, svg: 'assets/gifts/balloon.svg', anim: 'float', sound: 'pop' },
   { id: 'g3', name: 'Cake', price: 29, icon: 'assets/gifts/cake.svg', charm: 290, svg: 'assets/gifts/cake.svg', anim: 'bounce', sound: 'chime' },
   { id: 'g4', name: 'Crown', price: 2499, icon: 'assets/gifts/crown.svg', charm: 24990, svg: 'assets/gifts/crown.svg', anim: 'spin3d', sound: 'fanfare' },
   { id: 'g5', name: 'Rocket', price: 1999, icon: 'assets/gifts/rocket.svg', charm: 19990, svg: 'assets/gifts/rocket.svg', anim: 'fly', sound: 'whoosh' },
   { id: 'g6', name: 'Lion', price: 9999, icon: 'assets/gifts/lion.svg', charm: 99990, svg: 'assets/gifts/lion.svg', anim: 'run', sound: 'roar' },
   { id: 'g7', name: 'Golden Car', price: 1799, icon: 'assets/gifts/gold-car.svg', charm: 17990, svg: 'assets/gifts/gold-car.svg', anim: 'drive', sound: 'engine' },
   { id: 'g8', name: 'Perfume', price: 10000, icon: 'assets/gifts/perfume.svg', charm: 100000, svg: 'assets/gifts/perfume.svg', anim: 'sparkle', sound: 'spray' },
   { id: 'g9', name: 'Castle', price: 2499, icon: 'assets/gifts/castle.svg', charm: 24990, svg: 'assets/gifts/castle.svg', anim: 'zoom', sound: 'fanfare' },
   { id: 'g10', name: 'Diamond Heart', price: 199, icon: 'assets/gifts/diamond-heart.svg', charm: 1990, svg: 'assets/gifts/diamond-heart.svg', anim: 'sparkle', sound: 'chime' },
   { id: 'g11', name: 'Teapot', price: 6, icon: 'assets/gifts/teapot.svg', charm: 60, svg: 'assets/gifts/teapot.svg', anim: 'steam', sound: 'pop' },
   { id: 'g12', name: 'White Car', price: 1799, icon: 'assets/gifts/white-car.svg', charm: 17990, svg: 'assets/gifts/white-car.svg', anim: 'drive', sound: 'engine' },
   { id: 'g13', name: 'Medal', price: 9, icon: 'assets/gifts/medal.svg', charm: 90, svg: 'assets/gifts/medal.svg', anim: 'spin3d', sound: 'chime' },
   { id: 'g14', name: 'Macarons', price: 3, icon: 'assets/gifts/macarons.svg', charm: 30, svg: 'assets/gifts/macarons.svg', anim: 'bounce', sound: 'chime' },
   { id: 'g15', name: 'Treasure Chest', price: 299, icon: 'assets/gifts/treasure-chest.svg', charm: 2990, svg: 'assets/gifts/treasure-chest.svg', anim: 'zoom', sound: 'fanfare' },
   { id: 'g16', name: 'Golden Football', price: 19, icon: 'assets/gifts/golden-football.svg', charm: 190, svg: 'assets/gifts/golden-football.svg', anim: 'bounce', sound: 'pop' },
   { id: 'g17', name: 'Magic Lamp', price: 99, icon: 'assets/gifts/magic-lamp.svg', charm: 990, svg: 'assets/gifts/magic-lamp.svg', anim: 'sparkle', sound: 'magic' },
   { id: 'g18', name: 'Magic Carpet', price: 199, icon: 'assets/gifts/magic-carpet.svg', charm: 1990, svg: 'assets/gifts/magic-carpet.svg', anim: 'fly', sound: 'magic' },
   { id: 'g19', name: 'Clover', price: 19, icon: 'assets/gifts/clover.svg', charm: 190, svg: 'assets/gifts/clover.svg', anim: 'bloom', sound: 'chime' },
   { id: 'g20', name: 'Golden Bike', price: 1799, icon: 'assets/gifts/golden-bike.svg', charm: 17990, svg: 'assets/gifts/golden-bike.svg', anim: 'drive', sound: 'engine' },
   { id: 'g21', name: 'Swans', price: 499, icon: 'assets/gifts/swans.svg', charm: 4990, svg: 'assets/gifts/swans.svg', anim: 'float', sound: 'sparkle' },
   { id: 'g22', name: 'Heart Potion', price: 99, icon: 'assets/gifts/heart-potion.svg', charm: 990, svg: 'assets/gifts/heart-potion.svg', anim: 'sparkle', sound: 'magic' },
   { id: 'g23', name: 'Golden Vase', price: 299, icon: 'assets/gifts/golden-vase.svg', charm: 2990, svg: 'assets/gifts/golden-vase.svg', anim: 'zoom', sound: 'sparkle' },
   { id: 'g24', name: 'Heart Roses', price: 399, icon: 'assets/gifts/heart-roses.svg', charm: 3990, svg: 'assets/gifts/heart-roses.svg', anim: 'bloom', sound: 'chime' },
   { id: 'g25', name: 'CP Couple', price: 1799, icon: 'assets/gifts/cp-couple.svg', charm: 17990, svg: 'assets/gifts/cp-couple.svg', anim: 'float', sound: 'chime' },
   { id: 'g26', name: 'Drink', price: 1, icon: 'assets/gifts/drink.svg', charm: 10, svg: 'assets/gifts/drink.svg', anim: 'pop', sound: 'pop' },
   { id: 'g27', name: 'Red Rose', price: 6, icon: 'assets/gifts/red-rose.svg', charm: 60, svg: 'assets/gifts/red-rose.svg', anim: 'bloom', sound: 'chime' },
   { id: 'g28', name: 'White Rose', price: 3, icon: 'assets/gifts/white-rose.svg', charm: 30, svg: 'assets/gifts/white-rose.svg', anim: 'bloom', sound: 'chime' },
   { id: 'g29', name: 'Scales', price: 199, icon: 'assets/gifts/scales.svg', charm: 1990, svg: 'assets/gifts/scales.svg', anim: 'spin3d', sound: 'chime' },
   { id: 'g30', name: 'Key', price: 299, icon: 'assets/gifts/key.svg', charm: 2990, svg: 'assets/gifts/key.svg', anim: 'spin3d', sound: 'chime' },
   { id: 'g31', name: 'Golden Rose Heart', price: 39, icon: 'assets/gifts/golden-rose-heart.svg', charm: 390, svg: 'assets/gifts/golden-rose-heart.svg', anim: 'bloom', sound: 'chime' },
   { id: 'g32', name: 'Pink Palace', price: 299, icon: 'assets/gifts/pink-palace.svg', charm: 2990, svg: 'assets/gifts/pink-palace.svg', anim: 'zoom', sound: 'fanfare' },
   { id: 'g33', name: 'Sports Car', price: 2999, icon: 'assets/gifts/sports-car.svg', charm: 29990, svg: 'assets/gifts/sports-car.svg', anim: 'drive', sound: 'engine' },
   { id: 'g34', name: 'Dates', price: 39, icon: 'assets/gifts/dates.svg', charm: 390, svg: 'assets/gifts/dates.svg', anim: 'bloom', sound: 'chime' }
  ],
  shop: [
   { id: 's1', name: 'Golden Profile Frame', price: 20000, category: 'Frame', icon: 'assets/frames/gold-frame.svg', svg: 'assets/frames/gold-frame.svg' },
   { id: 's2', name: 'Dragon Frame', price: 30000, category: 'Frame', icon: 'assets/frames/dragon-frame.svg', svg: 'assets/frames/dragon-frame.svg' },
   { id: 's3', name: 'Dragon Ride', price: 8000, category: 'Ride', icon: 'assets/rides/dragon-ride.svg', svg: 'assets/rides/dragon-ride.svg' },
   { id: 's4', name: 'Blue Car Ride', price: 8000, category: 'Ride', icon: 'assets/rides/blue-car.svg', svg: 'assets/rides/blue-car.svg' },
   { id: 's5', name: 'CP Car Ride', price: 12000, category: 'Ride', icon: 'assets/rides/cp-car.svg', svg: 'assets/rides/cp-car.svg' },
   { id: 's6', name: 'VIP Room Theme — Starry Night', price: 2999, category: 'Theme', icon: 'assets/themes/starry-night.svg', svg: 'assets/themes/starry-night.svg' },
   { id: 's7', name: 'Party Theme Set', price: 4999, category: 'Theme', icon: 'assets/themes/party-lounge.svg', svg: 'assets/themes/party-lounge.svg' },
   { id: 's8', name: 'Dating Theme Set', price: 3499, category: 'Theme', icon: 'assets/themes/dating-heart.svg', svg: 'assets/themes/dating-heart.svg' },
   { id: 's9', name: 'Retro Record Player Theme', price: 2999, category: 'Theme', icon: 'assets/themes/retro-record.svg', svg: 'assets/themes/retro-record.svg' },
   { id: 's10', name: 'Gold Ship Theme', price: 2099, category: 'Theme', icon: 'assets/themes/gold-ship.svg', svg: 'assets/themes/gold-ship.svg' },
   { id: 's11', name: 'Sunset Lovers Theme', price: 3999, category: 'Theme', icon: 'assets/themes/sunset-lovers.svg', svg: 'assets/themes/sunset-lovers.svg' },
   { id: 's12', name: 'Luxury CP Ring', price: 99999, category: 'Relationship', icon: 'assets/icons/cp.svg' },
   { id: 's13', name: 'CP Ring', price: 999, category: 'Relationship', icon: 'assets/icons/cp.svg' },
   { id: 's14', name: 'Chat Box — Gold', price: 399, category: 'Chat Box', icon: 'assets/icons/chatbox.svg' },
   { id: 's15', name: 'Chat Box — Dragon Flame', price: 999, category: 'Chat Box', icon: 'assets/vip/vip10.svg' },
   { id: 's16', name: 'Profile Card — Dragon', price: 4999, category: 'Profile Card', icon: 'assets/icons/card.svg' },
   { id: 's17', name: 'Room Lock (1 month)', price: 6999, category: 'Room', icon: 'assets/icons/lock.svg' },
   { id: 's18', name: 'Pin on Top (2 hours)', price: 4000, category: 'Room', icon: 'assets/icons/pin.svg' },
   { id: 's19', name: 'Unique Room ID', price: 50000, category: 'Room', icon: 'assets/icons/id.svg' },
   { id: 's20', name: 'Unique Personal ID', price: 75000, category: 'Room', icon: 'assets/icons/id.svg' }
  ],
  coinPackages: [
   { id: 'p1', usd: 1, coins: 1000000 },
   { id: 'p2', usd: 5, coins: 5000000 },
   { id: 'p3', usd: 10, coins: 10000000 },
   { id: 'p4', usd: 20, coins: 20000000 },
   { id: 'p5', usd: 30, coins: 30000000 },
   { id: 'p6', usd: 50, coins: 50000000 },
   { id: 'p7', usd: 75, coins: 75000000 },
   { id: 'p8', usd: 100, coins: 100000000 }
  ],
  recharges: [], messages: [], moments: [], families: [], cpPairs: [],
  notifications: [], feedback: [], auditLog: [], settings: {
   appName: 'AZLAN WORLD CHAT', announcement: 'Welcome to AZLAN WORLD CHAT!',
   signupBonus: 1000000, masterWallet: 'unlimited',
   controls: { animations: true, sounds: true, gifts: true, vip: true, shop: true, rooms: true, payments: true, chat: true, moments: true, luckyDraw: true, daily: true, invite: true, ai: true, events: true, giftsDisabled: [], benefitsDisabled: [], vipDisabled: [], themesDisabled: [] },
   diamondStages: [
    { coins: 1000000, diamonds: 500000 },
    { coins: 5000000, diamonds: 2500000 },
    { coins: 10000000, diamonds: 5000000 },
    { coins: 30000000, diamonds: 15000000 },
    { coins: 60000000, diamonds: 30000000 }
   ]
  },
  bans: { users: [], devices: [] },
  broadcasts: [],
  events: [{ id: 1, name: 'AZLAN Season — Grand Opening', desc: 'Welcome to AZLAN WORLD CHAT! Join rooms, send gifts and climb the rankings.', startsAt: new Date().toISOString(), endsAt: null, members: [], createdBy: 'owner' }],
  tickets: [], reports: [],
  seq: { user: 10000001, room: 1880001 }
 };
}
let db = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : blankDb();
// Migrate older databases: add the new collections + owner controls if missing
db.broadcasts = db.broadcasts || [];
db.events = db.events || [{ id: 1, name: 'AZLAN Season — Grand Opening', desc: 'Welcome to AZLAN WORLD CHAT! Join rooms, send gifts and climb the rankings.', startsAt: new Date().toISOString(), endsAt: null, members: [], createdBy: 'owner' }];
db.tickets = db.tickets || [];
db.reports = db.reports || [];
if (!db.settings.controls) db.settings.controls = { animations: true, sounds: true, gifts: true, vip: true, shop: true, rooms: true, payments: true, chat: true, moments: true, luckyDraw: true, daily: true, invite: true, ai: true, events: true, giftsDisabled: [], benefitsDisabled: [], vipDisabled: [], themesDisabled: [] };
// Backfill new gifts/shop items for older databases
(function backfill() {
 const fresh = blankDb();
 let changed = false;
 for (const g of fresh.gifts) if (!db.gifts.find(x => x.id === g.id)) { db.gifts.push(g); changed = true; }
 for (const i of fresh.shop) if (!db.shop.find(x => x.id === i.id)) { db.shop.push(i); changed = true; }
 if (changed) save();
})();
function save() { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
function audit(actor, action, detail) {
 db.auditLog.unshift({ id: Date.now() + Math.random(), actor, action, detail: detail || '', at: new Date().toISOString() });
 if (db.auditLog.length > 500) db.auditLog.length = 500;
 save();
}
const uid = () => String(db.seq.user++);
const rid = () => String(db.seq.room++);

/* Seed owner account (only if missing) */
if (!db.users.find(u => u.email === OWNER_EMAIL)) {
 db.users.push({
  id: uid(), email: OWNER_EMAIL, name: 'Azlan', role: 'owner',
  password: bcrypt.hashSync(OWNER_DEFAULT_PASSWORD, 10),
  coins: 0, diamonds: 0, charm: 0, wealth: 0, vip: 0, vipUntil: null,
  level: 42, followers: [], following: [], inventory: [],
  bio: 'Owner of AZLAN WORLD CHAT', gender: 'Male', country: 'Pakistan',
  createdAt: new Date().toISOString(), banned: false, deviceId: null,
  lastDaily: null, inviteCode: 'AZLAN1', invitedBy: null, totalRecharged: 0
 });
 save();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
/* Web root IS the package root now (deployable PWA at the zip root).
   Serve ONLY the public web files explicitly — never serve server.js,
   server/, data/ or any other backend file. */
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));
const WEB_FILES = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css', '/sounds.js': 'sounds.js', '/manifest.json': 'manifest.json', '/sw.js': 'sw.js' };
for (const [route, file] of Object.entries(WEB_FILES)) app.get(route, (req, res) => res.sendFile(path.join(__dirname, file)));
app.use('/uploads', express.static(UPLOAD_DIR));
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 25 * 1024 * 1024 } });

/* ---------------- auth helpers ---------------- */
function tokenFor(user) {
 return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}
function auth(req, res, next) {
 const h = req.headers.authorization || '';
 const t = h.startsWith('Bearer ') ? h.slice(7) : null;
 if (!t) return res.status(401).json({ error: 'Login required' });
 try { req.user = jwt.verify(t, JWT_SECRET); next(); }
 catch (e) { return res.status(401).json({ error: 'Invalid session — please log in again' }); }
}
function me(req) { return db.users.find(u => u.id === req.user.id); }
function ownerOnly(req, res, next) {
 if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' });
 next();
}
function publicUser(u) {
 if (!u) return null;
 const { password, ...rest } = u;
 return rest;
}
function notify(userId, text) {
 db.notifications.unshift({ id: Date.now() + Math.random(), userId, text, at: new Date().toISOString(), read: false });
 save();
}

/* ---------------- auth routes ---------------- */
app.post('/api/auth/register', (req, res) => {
 const { name, email, password, inviteCode } = req.body || {};
 if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
 if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
 const bonus = db.settings.signupBonus || 1000000;
 const user = {
  id: uid(), email, name, role: 'user', password: bcrypt.hashSync(password, 10),
  coins: bonus, diamonds: 0, charm: 0, wealth: 0, vip: 0, vipUntil: null,
  level: 1, followers: [], following: [], inventory: [],
  bio: '', gender: '', country: '', createdAt: new Date().toISOString(),
  banned: false, deviceId: req.body.deviceId || null,
  lastDaily: null, inviteCode: 'AZ' + Math.random().toString(36).slice(2, 7).toUpperCase(),
  invitedBy: inviteCode || null, totalRecharged: 0
 };
 db.users.push(user); save();
 // Invite & Earn: inviter gets 100,000 coins when the invite is used
 if (inviteCode) {
  const inviter = db.users.find(u => u.inviteCode === inviteCode);
  if (inviter) { inviter.coins += 100000; notify(inviter.id, `Your invite earned you 100,000 coins — ${name} joined!`); save(); }
 }
 audit(user.id, 'register', name);
 res.json({ token: tokenFor(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
 const { email, password } = req.body || {};
 const user = db.users.find(u => u.email === email);
 if (!user || !bcrypt.compareSync(password || '', user.password)) return res.status(400).json({ error: 'Wrong email or password' });
 if (user.banned || db.bans.users.includes(user.id)) return res.status(403).json({ error: 'This account is banned. Contact the owner.' });
 res.json({ token: tokenFor(user), user: publicUser(user) });
});

/* Owner enters DIRECTLY — no login screen. Protected by OWNER_SECRET. */
app.post('/api/owner/enter', (req, res) => {
 if ((req.body || {}).secret !== OWNER_SECRET) return res.status(403).json({ error: 'Wrong owner key' });
 const owner = db.users.find(u => u.role === 'owner');
 audit(owner.id, 'owner-enter', 'Owner entered directly');
 res.json({ token: tokenFor(owner), user: publicUser(owner) });
});

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(me(req)) }));
app.put('/api/me', auth, (req, res) => {
 const u = me(req); const { name, bio, gender, country } = req.body || {};
 if (name) u.name = name; if (bio !== undefined) u.bio = bio;
 if (gender) u.gender = gender; if (country) u.country = country;
 save(); res.json({ user: publicUser(u) });
});
app.get('/api/users/:id', auth, (req, res) => {
 const u = db.users.find(x => x.id === req.params.id);
 if (!u) return res.status(404).json({ error: 'User not found' });
 res.json({ user: publicUser(u) });
});
app.get('/api/users', auth, (req, res) => {
 const q = (req.query.q || '').toLowerCase();
 res.json({ users: db.users.filter(u => !q || u.name.toLowerCase().includes(q) || u.id.includes(q)).slice(0, 30).map(publicUser) });
});
app.post('/api/users/:id/follow', auth, (req, res) => {
 const target = db.users.find(u => u.id === req.params.id);
 const u = me(req);
 if (!target || target.id === u.id) return res.status(400).json({ error: 'Cannot follow' });
 if (!u.following.includes(target.id)) { u.following.push(target.id); target.followers.push(u.id); save(); }
 res.json({ ok: true });
});

/* ---------------- rooms ---------------- */
/* Front Row on Online User List: VIP users first, then everyone else.
  Anonymous users show as "Anonymous". Enriches seats with VIP info
  (mic ring colour, sticker, frame) so the app can draw them. */
function enrichRoom(room) {
 const info = (id) => {
  const u = db.users.find(x => x.id === id);
  if (!u) return { id, name: 'User ' + id, vip: 0, anonymous: false };
  return { id: u.id, name: u.anonymous ? 'Anonymous' : u.name, vip: u.vip || 0, anonymous: !!u.anonymous, micSticker: u.micSticker || null, micAnimation: u.micAnimation || null, vipCustom: u.vipCustom || {}, micStyle: u.micStyle || 'default', micWave: u.micWave || 'default' };
 };
 const members = (room.members || []).map(info)
  .sort((a, b) => (b.vip || 0) - (a.vip || 0)); // VIP first — front row
 const seats = (room.seats || []).map(s => ({ ...s, user: info(s.userId) }));
 return { ...room, members, seats };
}
app.get('/api/rooms', auth, (req, res) => res.json({ rooms: db.rooms.map(enrichRoom) }));
app.post('/api/rooms', auth, (req, res) => {
 const u = me(req);
 if (!isOn(db, 'rooms')) return res.status(403).json({ error: 'Rooms are turned off by the owner' });
 const { name, topic, isPrivate } = req.body || {};
 if (!name) return res.status(400).json({ error: 'Room name is required' });
 u.roomsCreated = (u.roomsCreated || 0) + 1;
 const room = {
  id: rid(), name, topic: topic || 'Chat', isPrivate: !!isPrivate, hostId: u.id,
  level: 1, xp: 0, members: [u.id], seats: [{ seat: 0, userId: u.id, micOn: true }],
  chat: [], voiceNotes: [], music: null, createdAt: new Date().toISOString()
 };
 db.rooms.push(room); save(); audit(u.id, 'room-create', name);
 res.json({ room: enrichRoom(room) });
});
app.post('/api/rooms/:id/join', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req);
 if (!room) return res.status(404).json({ error: 'Room not found' });
 if (room.blocked && room.blocked.includes(u.id)) return res.status(403).json({ error: 'You are blocked from this room.' });
 if (!room.members.includes(u.id)) room.members.push(u.id);
 save(); res.json({ room: enrichRoom(room), entrance: u.vip ? { name: u.anonymous ? 'Anonymous' : u.name, vip: u.vip, emblem: require('./server/vip').VIP_LEVELS[u.vip - 1].emblem } : null });
});
app.post('/api/rooms/:id/seat', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { seat, micOn } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 if (seat < 0 || seat > 7) return res.status(400).json({ error: 'Seats are 0–7 (8 seats)' });
 room.seats = room.seats.filter(s => s.userId !== u.id);
 if (room.seats.find(s => s.seat === seat)) return res.status(400).json({ error: 'Seat taken' });
 room.seats.push({ seat, userId: u.id, micOn: micOn !== false });
 save(); res.json({ room: enrichRoom(room) });
});
app.post('/api/rooms/:id/leave-seat', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req);
 room.seats = room.seats.filter(s => s.userId !== u.id); save(); res.json({ room: enrichRoom(room) });
});
app.post('/api/rooms/:id/chat', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { text } = req.body || {};
 if (!room || !text) return res.status(400).json({ error: 'Missing room or text' });
 if (!isOn(db, 'chat')) return res.status(403).json({ error: 'Chat is turned off by the owner' });
 if ((room.chatBanned || []).includes(u.id)) return res.status(403).json({ error: 'You are banned from chat in this room.' });
 // Anonymous Display: name shows as "Anonymous". VIP chat box: dragon-flame bubble.
 room.chat.push({ id: Date.now(), userId: u.id, name: u.anonymous ? 'Anonymous' : u.name, vip: u.vip || 0, chatBox: u.vip ? 'dragon-flame' : 'normal', text, at: new Date().toISOString() });
 if (room.chat.length > 200) room.chat = room.chat.slice(-200);
 room.xp += 1; room.level = 1 + Math.floor(room.xp / 1000);
 save(); res.json({ room: enrichRoom(room) });
});
app.post('/api/rooms/:id/voice-note', auth, upload.single('audio'), (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req);
 if (!room || !req.file) return res.status(400).json({ error: 'Missing room or audio file' });
 room.voiceNotes.push({ id: Date.now(), userId: u.id, name: u.name, url: '/uploads/' + req.file.filename, at: new Date().toISOString() });
 room.xp += 5; save(); res.json({ ok: true, url: '/uploads/' + req.file.filename });
});
app.post('/api/rooms/:id/music', auth, upload.single('audio'), (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req);
 if (!room || !req.file) return res.status(400).json({ error: 'Missing room or audio file' });
 if (room.hostId !== u.id && u.role !== 'owner') return res.status(403).json({ error: 'Only the host can set room music' });
 room.music = { url: '/uploads/' + req.file.filename, by: u.name, at: new Date().toISOString() };
 save(); res.json({ room });
});
app.post('/api/rooms/:id/block', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { userId } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 if (room.hostId !== u.id && u.role !== 'owner') return res.status(403).json({ error: 'Only the host can block' });
 // VIP benefit: Protection from Removal from Room (VIP6+) — only the owner can remove them
 const target = db.users.find(x => x.id === userId);
 if (target && (target.vip || 0) >= 6 && u.role !== 'owner') return res.status(403).json({ error: 'That user is protected from removal (VIP6+). Only the owner can remove them.' });
 room.blocked = room.blocked || [];
 if (!room.blocked.includes(userId)) room.blocked.push(userId);
 room.seats = room.seats.filter(s => s.userId !== userId);
 room.members = room.members.filter(m => m !== userId);
 save(); res.json({ room });
});

/* ---------------- gifts ---------------- */
app.get('/api/gifts', auth, (req, res) => res.json({ gifts: db.gifts }));
app.post('/api/gifts/send', auth, (req, res) => {
 const u = me(req); const { giftId, toUserId, roomId, qty } = req.body || {};
 const gift = db.gifts.find(g => g.id === giftId);
 const to = db.users.find(x => x.id === toUserId);
 if (!gift || !to) return res.status(400).json({ error: 'Gift or user not found' });
 if (!isOn(db, 'gifts')) return res.status(403).json({ error: 'Gifts are turned off by the owner' });
 if (!giftEnabled(db, giftId)) return res.status(403).json({ error: 'This gift is turned off by the owner' });
 const n = Math.max(1, Math.min(777, qty || 1));
 // VIP benefit: Golds Items Discount on gifts too
 const discountPct = DISCOUNTS[u.vip || 0] || 0;
 const cost = Math.floor(gift.price * n * (1 - discountPct / 100));
 if (u.coins < cost) return res.status(400).json({ error: 'Not enough coins' });
 u.coins -= cost; u.wealth += cost; to.charm += gift.charm * n; to.wealth += cost;
 u.giftsSent = (u.giftsSent || 0) + n; u.biggestGift = Math.max(u.biggestGift || 0, cost);
 // CP intimacy grows when partners gift each other
 const pair = db.cpPairs.find(p => (p.a === u.id && p.b === to.id) || (p.a === to.id && p.b === u.id));
 if (pair) pair.intimacy += gift.price * n;
 // Family XP grows when a family member sends a gift
 const fam = db.families.find(f => f.members.includes(u.id));
 if (fam) { fam.xp += gift.price * n; fam.level = 1 + Math.floor(fam.xp / 10000); }
 const room = roomId ? db.rooms.find(r => r.id === roomId) : null;
 if (room) room.xp += cost;
 const broadcast = cost >= 100000; // 100,000+ coin gifts are announced to everyone
 const bText = `${u.name} sent ${gift.name} x${n} to ${to.name} — ${cost.toLocaleString()} coins!`;
 if (broadcast) { db.broadcasts.unshift({ id: Date.now(), text: bText, kind: 'gift', at: new Date().toISOString() }); db.users.forEach(x => notify(x.id, bText)); }
 else notify(to.id, `${u.name} sent you ${gift.name} x${n}`);
 save();
 res.json({ ok: true, broadcast, coins: u.coins, gift: { id: gift.id, name: gift.name, svg: gift.svg, anim: gift.anim, sound: gift.sound, icon: gift.icon } });
});

/* ---------------- wallet / recharge / diamonds ---------------- */
app.get('/api/wallet/packages', auth, (req, res) => res.json({ packages: db.coinPackages }));
app.post('/api/wallet/recharge', auth, upload.single('receipt'), (req, res) => {
 const u = me(req);
 if (!isOn(db, 'payments')) return res.status(403).json({ error: 'Payments are turned off by the owner' });
 const { packageId, method } = req.body || {};
 const pkg = db.coinPackages.find(p => p.id === packageId);
 if (!pkg || !method) return res.status(400).json({ error: 'Package and payment method are required' });
 if (!req.file) return res.status(400).json({ error: 'Please upload the payment receipt' });
 const rec = {
  id: Date.now() + Math.random(), userId: u.id, name: u.name, packageId,
  usd: pkg.usd, coins: pkg.coins, method, receipt: '/uploads/' + req.file.filename,
  status: 'pending', at: new Date().toISOString()
 };
 db.recharges.push(rec); save();
 res.json({ ok: true, recharge: rec, note: 'Receipt received. Coins are credited only after the owner approves it — never from the screenshot alone.' });
});
app.post('/api/wallet/diamonds', auth, (req, res) => {
 const u = me(req); const { stage } = req.body || {};
 const s = db.settings.diamondStages[stage];
 if (!s) return res.status(400).json({ error: 'Invalid conversion stage' });
 if (u.coins < s.coins) return res.status(400).json({ error: 'Not enough coins for this stage' });
 u.coins -= s.coins; u.diamonds += s.diamonds; save();
 res.json({ ok: true, coins: u.coins, diamonds: u.diamonds });
});

/* ---------------- VIP ---------------- */
const { VIP_LEVELS, DISCOUNTS } = require('./server/vip');
app.get('/api/vip', auth, (req, res) => res.json({
 plans: VIP_LEVELS.map(l => ({ vip: l.vip, emblem: l.emblem, svg: l.svg, color: l.color, color2: l.color2, theme: l.theme, price: l.price, days: 31, points: l.points, totalBenefits: l.totalBenefits, discountPct: l.discountPct }))
}));
app.post('/api/vip/buy', auth, (req, res) => {
 const u = me(req); const { vip } = req.body || {};
 const level = VIP_LEVELS.find(l => l.vip === vip);
 if (!level) return res.status(400).json({ error: 'VIP must be 1–11' });
 if (!isOn(db, 'vip')) return res.status(403).json({ error: 'VIP is turned off by the owner' });
 if (!vipLevelEnabled(db, vip)) return res.status(403).json({ error: `VIP${vip} is turned off by the owner` });
 const price = (db.settings.vipPriceOverride && db.settings.vipPriceOverride[vip]) || level.price;
 if (u.coins < price) return res.status(400).json({ error: 'Not enough coins' });
 const wasVip = u.vip || 0;
 u.coins -= price; u.vip = vip;
 u.vipPoints = (u.vipPoints || 0) + level.points;
 u.vipUntil = new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString();
 // Level-up Broadcast to the Whole Platform (fire-dragon banner to ALL users)
 const bText = `Congratulations to ${u.name} for leveling up to VIP${vip} (${level.emblem})!`;
 db.broadcasts.unshift({ id: Date.now(), text: bText, kind: 'levelup', at: new Date().toISOString() });
 db.users.forEach(x => notify(x.id, bText));
 // Get Golds (one-time): VIP9 500,000 / VIP10 1,000,000 on upgrade
 u.goldsClaimed = u.goldsClaimed || {};
 const golds = { 9: 500000, 10: 1000000 }[vip];
 if (golds && !u.goldsClaimed[vip]) { u.goldsClaimed[vip] = true; u.coins += golds; }
 // Bonus Points: VIP10 upgrade gives +700,000 bonus points (screenshot example)
 if (vip === 10) { u.bonusPoints = (u.bonusPoints || 0) + 700000; u.bonusHistory = u.bonusHistory || []; u.bonusHistory.unshift({ type: 'earn', text: 'Given for the VIP privilege', amount: 700000, at: new Date().toISOString() }); }
 // Renewing VIP extends custom items by another 90 days
 if (u.vipCustom && Object.keys(u.vipCustom).length) {
  const base = u.vipCustomUntil && new Date(u.vipCustomUntil) > new Date() ? new Date(u.vipCustomUntil) : new Date();
  u.vipCustomUntil = new Date(base.getTime() + 90 * 24 * 3600 * 1000).toISOString();
 }
 save(); res.json({ ok: true, vip: u.vip, vipUntil: u.vipUntil, goldsBonus: golds && !wasVip ? golds : 0 });
});

/* ---------------- shop ---------------- */
app.get('/api/shop', auth, (req, res) => res.json({ items: db.shop }));
app.post('/api/shop/buy', auth, (req, res) => {
 const u = me(req); const { itemId } = req.body || {};
 const item = db.shop.find(i => i.id === itemId);
 if (!item) return res.status(400).json({ error: 'Item not found' });
 if (!isOn(db, 'shop')) return res.status(403).json({ error: 'Shop is turned off by the owner' });
 // Golds Items Discount: 50% off golds-priced items for VIPs; otherwise the
 // better of the VIP discount (2% per level, up to 25%) and Premium (15%).
 const vipPct = DISCOUNTS[u.vip || 0] || 0;
 const premiumPct = u.premium ? 15 : 0;
 const discountPct = u.vip ? Math.max(50, vipPct, premiumPct) : Math.max(vipPct, premiumPct);
 const price = Math.floor(item.price * (1 - discountPct / 100));
 if (u.coins < price) return res.status(400).json({ error: 'Not enough coins' });
 u.coins -= price; u.inventory.push(item.id); save();
 res.json({ ok: true, inventory: u.inventory, paid: price, discountPct });
});

/* ---------------- families ---------------- */
app.get('/api/families', auth, (req, res) => res.json({ families: db.families }));
app.post('/api/families', auth, (req, res) => {
 const u = me(req); const { name } = req.body || {};
 if (!name) return res.status(400).json({ error: 'Family name is required' });
 const fam = { id: Date.now(), name, leaderId: u.id, members: [u.id], xp: 0, level: 1, createdAt: new Date().toISOString() };
 db.families.push(fam); save(); res.json({ family: fam });
});
app.post('/api/families/:id/join', auth, (req, res) => {
 const fam = db.families.find(f => f.id == req.params.id); const u = me(req);
 if (!fam) return res.status(404).json({ error: 'Family not found' });
 if (!fam.members.includes(u.id)) { fam.members.push(u.id); u.familyJoined = (u.familyJoined || 0) + 1; }
 save(); res.json({ family: fam });
});

/* ---------------- CP ---------------- */
app.get('/api/cp', auth, (req, res) => {
 const u = me(req);
 res.json({ pairs: db.cpPairs.filter(p => p.a === u.id || p.b === u.id) });
});
app.post('/api/cp/invite', auth, (req, res) => {
 const u = me(req); const { toUserId, tier } = req.body || {};
 const tiers = { basic: 100000, premium: 500000, luxury: 5000000 };
 const cost = tiers[tier];
 if (!cost) return res.status(400).json({ error: 'Tier must be basic, premium or luxury' });
 const to = db.users.find(x => x.id === toUserId);
 if (!to || to.id === u.id) return res.status(400).json({ error: 'Invalid partner' });
 if (u.coins < cost) return res.status(400).json({ error: 'Not enough coins for this CP tier' });
 u.coins -= cost;
 const pair = { id: Date.now(), a: u.id, b: to.id, tier, intimacy: cost, status: 'pending', createdAt: new Date().toISOString() };
 db.cpPairs.push(pair); save();
 notify(to.id, `${u.name} invited you to be CP (${tier}) — accept in the CP section.`);
 res.json({ ok: true, pair });
});
app.post('/api/cp/:id/accept', auth, (req, res) => {
 const pair = db.cpPairs.find(p => p.id == req.params.id); const u = me(req);
 if (!pair || pair.b !== u.id) return res.status(400).json({ error: 'Not your invitation' });
 pair.status = 'active'; u.cpBound = (u.cpBound || 0) + 1; const other = db.users.find(x => x.id === pair.a); if (other) other.cpBound = (other.cpBound || 0) + 1; save(); res.json({ ok: true, pair });
});

/* ---------------- rankings ---------------- */
app.get('/api/rankings', auth, (req, res) => {
 // Anonymous Display: anonymous users appear as "Anonymous" in rankings
 const mask = (u) => { const p = publicUser(u); if (p.anonymous) { p.name = 'Anonymous'; } return p; };
 const by = (k) => [...db.users].sort((a, b) => (b[k] || 0) - (a[k] || 0)).slice(0, 20).map(mask);
 res.json({ wealth: by('wealth'), charm: by('charm'), level: by('level') });
});

/* ---------------- Discover moments ---------------- */
app.get('/api/moments', auth, (req, res) => res.json({ moments: [...db.moments].reverse().slice(0, 50) }));
app.post('/api/moments', auth, upload.single('image'), (req, res) => {
 const u = me(req); const { text } = req.body || {};
 if (!isOn(db, 'moments')) return res.status(403).json({ error: 'Moments are turned off by the owner' });
 if (!text && !req.file) return res.status(400).json({ error: 'Write something or add a photo' });
 u.momentsPosted = (u.momentsPosted || 0) + 1;
 const m = { id: Date.now(), userId: u.id, name: u.name, text: text || '', image: req.file ? '/uploads/' + req.file.filename : null, likes: [], comments: [], at: new Date().toISOString() };
 db.moments.push(m); save(); res.json({ moment: m });
});
app.post('/api/moments/:id/like', auth, (req, res) => {
 const m = db.moments.find(x => x.id == req.params.id); const u = me(req);
 if (!m) return res.status(404).json({ error: 'Post not found' });
 if (!m.likes.includes(u.id)) m.likes.push(u.id);
 save(); res.json({ ok: true, likes: m.likes.length });
});
app.post('/api/moments/:id/comment', auth, (req, res) => {
 const m = db.moments.find(x => x.id == req.params.id); const u = me(req);
 const { text } = req.body || {};
 if (!m || !text) return res.status(400).json({ error: 'Missing post or text' });
 m.comments.push({ userId: u.id, name: u.name, text, at: new Date().toISOString() });
 save(); res.json({ ok: true });
});

/* ---------------- messaging ---------------- */
app.get('/api/messages/:userId', auth, (req, res) => {
 const u = me(req);
 const list = db.messages.filter(m => (m.from === u.id && m.to === req.params.userId) || (m.from === req.params.userId && m.to === u.id));
 res.json({ messages: list });
});
app.post('/api/messages', auth, (req, res) => {
 const u = me(req); const { to, text } = req.body || {};
 if (!isOn(db, 'chat')) return res.status(403).json({ error: 'Messages are turned off by the owner' });
 if (!to || !text) return res.status(400).json({ error: 'Missing recipient or text' });
 const m = { id: Date.now(), from: u.id, to, text, at: new Date().toISOString() };
 db.messages.push(m); save(); notify(to, `New message from ${u.name}`);
 res.json({ message: m });
});

/* ---------------- daily / tasks / lucky draw / invite ---------------- */
app.post('/api/daily', auth, (req, res) => {
 const u = me(req);
 if (!isOn(db, 'daily')) return res.status(403).json({ error: 'Daily rewards are turned off by the owner' });
 const today = new Date().toISOString().slice(0, 10);
 if (u.lastDaily === today) return res.status(400).json({ error: 'Already claimed today' });
 u.lastDaily = today;
 // VIP benefit: Double Sign In and Task Rewards
 const bonus = u.vip ? 100000 : 50000;
 u.coins += bonus; u.bonusPoints = (u.bonusPoints || 0) + (u.vip ? 200 : 100);
 save();
 res.json({ ok: true, bonus, coins: u.coins });
});
app.post('/api/lucky', auth, (req, res) => {
 const u = me(req);
 if (!isOn(db, 'luckyDraw')) return res.status(403).json({ error: 'Lucky Draw is turned off by the owner' });
 if (u.coins < 1000) return res.status(400).json({ error: 'Lucky draw costs 1,000 coins' });
 u.coins -= 1000;
 const prizes = [0, 500, 1000, 5000, 50000, 100000];
 const prize = prizes[Math.floor(Math.random() * prizes.length)];
 u.coins += prize;
 if (prize > 0) { u.luckyWins = (u.luckyWins || 0) + 1; u.biggestLucky = Math.max(u.biggestLucky || 0, prize); }
 save();
 res.json({ ok: true, prize, coins: u.coins });
});
app.get('/api/invite', auth, (req, res) => {
 const u = me(req);
 res.json({ inviteCode: u.inviteCode, reward: 100000, rechargeBonusPct: 5, referred: db.users.filter(x => x.invitedBy === u.inviteCode).length });
});

/* ---------------- AI assistant (stub — plug in a real API key later) -------- */
app.post('/api/ai', auth, (req, res) => {
 const u = me(req); const { text } = req.body || {};
 const t = (text || '').toLowerCase();
 let reply = 'I am the AZLAN WORLD CHAT assistant. Ask me about rooms, coins, VIP or gifts!';
 if (t.includes('coin')) reply = `You have ${u.coins.toLocaleString()} coins. Buy more in the Wallet — $1 = 1,000,000 coins.`;
 else if (t.includes('vip')) reply = 'VIP1–VIP11 last 31 days each. VIP gives you badges, frames, exclusive gifts, mic rings and more — VIP10 has 58 benefits!';
 else if (t.includes('room')) reply = 'Open the Party tab, create a room, take a mic seat and talk. Rooms have 8 mic seats.';
 else if (t.includes('gift')) reply = 'Send gifts from a room or a profile. Gifts over 100,000 coins are announced to everyone.';
 else if (t.includes('owner')) reply = 'The owner is Azlan. The Owner Portal controls coins, VIP, bans and recharges.';
 res.json({ reply });
});

/* ---------------- feedback / notifications / settings ---------------- */
app.post('/api/feedback', auth, (req, res) => {
 const u = me(req); const { text } = req.body || {};
 if (!text) return res.status(400).json({ error: 'Write your feedback' });
 db.feedback.unshift({ id: Date.now(), userId: u.id, name: u.name, text, at: new Date().toISOString() });
 save(); res.json({ ok: true });
});
app.get('/api/notifications', auth, (req, res) => {
 const u = me(req);
 res.json({ notifications: db.notifications.filter(n => n.userId === u.id).slice(0, 50) });
});
app.get('/api/settings', auth, (req, res) => res.json({ settings: db.settings }));

/* ---------------- OWNER PORTAL ---------------- */
app.get('/api/owner/stats', auth, ownerOnly, (req, res) => {
 res.json({
  totalUsers: db.users.length, totalRooms: db.rooms.length,
  pendingRecharges: db.recharges.filter(r => r.status === 'pending').length,
  masterWallet: db.settings.masterWallet,
  auditLog: db.auditLog.slice(0, 50), users: db.users.map(publicUser)
 });
});
app.post('/api/owner/coins', auth, ownerOnly, (req, res) => {
 const { userId, amount } = req.body || {};
 const target = db.users.find(u => u.id === userId);
 if (!target) return res.status(400).json({ error: 'User not found' });
 target.coins = Math.max(0, target.coins + (amount || 0));
 save(); audit(req.user.id, 'owner-coins', `${amount} to ${target.name} (${target.id})`);
 notify(target.id, `The owner ${amount > 0 ? 'gave you' : 'took'} ${Math.abs(amount).toLocaleString()} coins.`);
 res.json({ ok: true, user: publicUser(target) });
});
app.post('/api/owner/vip', auth, ownerOnly, (req, res) => {
 const { userId, vip, svip } = req.body || {};
 const target = db.users.find(u => u.id === userId);
 if (!target) return res.status(400).json({ error: 'User not found' });
 if (vip !== undefined) { target.vip = vip; target.vipUntil = vip > 0 ? new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString() : null; }
 if (svip !== undefined) target.svip = !!svip;
 save(); audit(req.user.id, 'owner-vip', `VIP ${vip} / SVIP ${svip} for ${target.name}`);
 res.json({ ok: true, user: publicUser(target) });
});
app.post('/api/owner/uid', auth, ownerOnly, (req, res) => {
 const { userId, newId } = req.body || {};
 const target = db.users.find(u => u.id === userId);
 if (!target || !newId) return res.status(400).json({ error: 'User or new ID missing' });
 if (db.users.find(u => u.id === String(newId))) return res.status(400).json({ error: 'That ID is already taken' });
 target.id = String(newId);
 save(); audit(req.user.id, 'owner-uid', `${target.name} ID changed to ${newId}`);
 res.json({ ok: true, user: publicUser(target) });
});
app.post('/api/owner/ban', auth, ownerOnly, (req, res) => {
 const { userId, deviceId, unban } = req.body || {};
 if (userId) {
  const t = db.users.find(u => u.id === userId);
  if (t) t.banned = !unban;
  if (unban) db.bans.users = db.bans.users.filter(x => x !== userId);
  else if (!db.bans.users.includes(userId)) db.bans.users.push(userId);
 }
 if (deviceId) {
  if (unban) db.bans.devices = db.bans.devices.filter(x => x !== deviceId);
  else if (!db.bans.devices.includes(deviceId)) db.bans.devices.push(deviceId);
 }
 save(); audit(req.user.id, 'owner-ban', `user ${userId || ''} device ${deviceId || ''} unban=${!!unban}`);
 res.json({ ok: true });
});
app.get('/api/owner/recharges', auth, ownerOnly, (req, res) => res.json({ recharges: [...db.recharges].reverse() }));
app.post('/api/owner/recharges/:id', auth, ownerOnly, (req, res) => {
 const rec = db.recharges.find(r => r.id == req.params.id);
 const { status } = req.body || {};
 if (!rec || !['approved', 'rejected', 'refunded'].includes(status)) return res.status(400).json({ error: 'Bad recharge or status' });
 if (rec.status !== 'pending') return res.status(400).json({ error: 'Already decided' });
 rec.status = status;
 if (status === 'approved') {
  const user = db.users.find(u => u.id === rec.userId);
  if (user) {
   let coins = rec.coins;
   const firstTime = user.totalRecharged === 0;
   if (rec.usd === 1 && firstTime) coins += 1000000; // first $1: 1M bought + 1M bonus
   // Bonus Recharge Golds by VIP level (VIP3 5% ... VIP10 40%)
   const bonusPct = RECHARGE_BONUS[user.vip || 0] || 0;
   coins = Math.floor(coins * (1 + bonusPct / 100));
   if (firstTime) { // First Recharge gifts: coins x28, rose x30, ring x1, frame x1
    coins += 28000; user.inventory = user.inventory || [];
    user.inventory.push('rose-x30', 'ring-x1', 'frame-x1');
    notify(user.id, 'First Recharge gifts: 28,000 coins + Rose x30 + Ring x1 + Profile Frame x1!');
   }
   user.coins += coins; user.totalRecharged += rec.usd;
   user.totalRechargedGolds = (user.totalRechargedGolds || 0) + rec.coins;
   if (user.invitedBy) {
    const inviter = db.users.find(x => x.inviteCode === user.invitedBy);
    if (inviter) inviter.coins += Math.floor(rec.coins * 0.05); // 5% recharge bonus
   }
   notify(user.id, `Your recharge of $${rec.usd} was approved — ${coins.toLocaleString()} coins added.`);
  }
 }
 save(); audit(req.user.id, 'owner-recharge', `${rec.id} -> ${status}`);
 res.json({ ok: true, recharge: rec });
});
app.post('/api/owner/gift', auth, ownerOnly, (req, res) => {
 const g = { id: 'g' + Date.now(), ...req.body };
 db.gifts.push(g); save(); audit(req.user.id, 'owner-gift-add', g.name); res.json({ ok: true, gift: g });
});
app.delete('/api/owner/gift/:id', auth, ownerOnly, (req, res) => {
 db.gifts = db.gifts.filter(g => g.id !== req.params.id); save();
 audit(req.user.id, 'owner-gift-del', req.params.id); res.json({ ok: true });
});
app.post('/api/owner/shop', auth, ownerOnly, (req, res) => {
 const item = { id: 's' + Date.now(), ...req.body };
 db.shop.push(item); save(); audit(req.user.id, 'owner-shop-add', item.name); res.json({ ok: true, item });
});
app.delete('/api/owner/shop/:id', auth, ownerOnly, (req, res) => {
 db.shop = db.shop.filter(i => i.id !== req.params.id); save(); res.json({ ok: true });
});
app.post('/api/owner/room/:id', auth, ownerOnly, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 if (!room) return res.status(404).json({ error: 'Room not found' });
 Object.assign(room, req.body || {}); save();
 audit(req.user.id, 'owner-room-edit', room.id); res.json({ ok: true, room });
});
app.delete('/api/owner/room/:id', auth, ownerOnly, (req, res) => {
 db.rooms = db.rooms.filter(r => r.id !== req.params.id); save();
 audit(req.user.id, 'owner-room-del', req.params.id); res.json({ ok: true });
});
app.post('/api/owner/settings', auth, ownerOnly, (req, res) => {
 Object.assign(db.settings, req.body || {}); save();
 audit(req.user.id, 'owner-settings', JSON.stringify(req.body || {})); res.json({ ok: true, settings: db.settings });
});
app.post('/api/owner/master-wallet', auth, ownerOnly, (req, res) => {
 const { value } = req.body || {};
 db.settings.masterWallet = value === 'unlimited' ? 'unlimited' : String(value || 'unlimited');
 save(); audit(req.user.id, 'owner-wallet', db.settings.masterWallet);
 res.json({ ok: true, masterWallet: db.settings.masterWallet });
});

/* ---------------- start ---------------- */
app.listen(PORT, () => {
 console.log(`AZLAN WORLD CHAT running at http://localhost:${PORT}`);
 console.log(`Owner account: ${OWNER_EMAIL} (default password: ${OWNER_DEFAULT_PASSWORD} — CHANGE IT!)`);
 console.log('Owner direct entry: use the Owner Portal button + OWNER_SECRET (see README).');
});

/* ---------------- modular services (server/ folder) ----------------
  One module per function. They share the same database via ctx. */
const ctx = { db, save, audit, notify };
app.use('/api/voice', require('./server/agora')(ctx));     // Agora live-voice status + token
app.use('/api/v2/auth', require('./server/auth')(ctx));     // auth service
app.use('/api/v2/chat', require('./server/chat')(ctx));     // chat service
app.use('/api/v2/rooms', require('./server/rooms')(ctx));    // room + voice service
app.use('/api/v2/payments', require('./server/payments')(ctx)); // payment / recharge service
app.use('/api/v2/gifts', require('./server/gifts')(ctx));    // gift service
app.use('/api/v2/rankings', require('./server/rankings')(ctx)); // ranking service
app.use('/api/v2/notifications', require('./server/notifications')(ctx)); // notification service
app.use('/api/v2/vip', require('./server/vip')(ctx));      // VIP Club service
app.use('/api/v2/vipx', require('./server/vip-extras')(ctx));   // VIP extras: mic styles/waves, themes store, coupons, broadcasts
app.use('/api/controls', require('./server/controls')(ctx));    // owner control panel (read + owner)
app.use('/api/v2/extras', require('./server/extras')(ctx));    // achievements, badges, titles, wealth, events, legal, profiles

/* Catch-all LAST — serves the PWA for any non-API route. (Must stay after
  all /api mounts above, otherwise API GET requests would return index.html.) */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
