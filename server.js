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
   { id: 'g34', name: 'Dates', price: 39, icon: 'assets/gifts/dates.svg', charm: 390, svg: 'assets/gifts/dates.svg', anim: 'bloom', sound: 'chime' },
   { id: 'g35', name: 'Dragon Flame', price: 26999, icon: 'assets/gifts/dragon-flame.png', charm: 269990, svg: 'assets/gifts/dragon-flame.png', anim: 'fly', sound: 'roar' },
   { id: 'g36', name: 'Phoenix', price: 25999, icon: 'assets/gifts/phoenix.png', charm: 259990, svg: 'assets/gifts/phoenix.png', anim: 'fly', sound: 'roar' },
   { id: 'g37', name: 'Castle Fantasy', price: 20000, icon: 'assets/gifts/castle-fantasy.png', charm: 200000, svg: 'assets/gifts/castle-fantasy.png', anim: 'zoom', sound: 'fanfare' },
   { id: 'g38', name: 'Carriage', price: 28888, icon: 'assets/gifts/carriage.png', charm: 288880, svg: 'assets/gifts/carriage.png', anim: 'drive', sound: 'fanfare' },
   { id: 'g39', name: 'Star Rocket', price: 20000, icon: 'assets/gifts/rocket.png', charm: 200000, svg: 'assets/gifts/rocket.png', anim: 'fly', sound: 'whoosh' },
   { id: 'g40', name: 'Supercar', price: 29999, icon: 'assets/gifts/supercar.png', charm: 299990, svg: 'assets/gifts/supercar.png', anim: 'drive', sound: 'engine' },
   { id: 'g41', name: 'Shining Palace', price: 39999, icon: 'assets/gifts/shining-palace.png', charm: 399990, svg: 'assets/gifts/shining-palace.png', anim: 'zoom', sound: 'fanfare' },
   { id: 'g42', name: 'Shadow Queen', price: 34999, icon: 'assets/gifts/shadow-queen.png', charm: 349990, svg: 'assets/gifts/shadow-queen.png', anim: 'sparkle', sound: 'magic' },
   /* FREE-ASSET GIFTS g43–g54 (2026-11-22): free library art, gaps only —
      existing gifts/prices untouched. animFile = lazy lottie-web JSON
      animation played only in the big-gift overlay, never in the panel grid. */
   { id: 'g43', name: 'Teddy Bear', price: 9, icon: 'assets/free/gifts/teddy-bear.png', charm: 90, svg: 'assets/free/gifts/teddy-bear.png', anim: 'bounce', sound: 'pop' },
   { id: 'g44', name: 'Yacht', price: 4999, icon: 'assets/free/gifts/yacht.png', charm: 49990, svg: 'assets/free/gifts/yacht.png', anim: 'float', sound: 'fanfare' },
   { id: 'g45', name: 'Diamond Gem', price: 499, icon: 'assets/free/gifts/diamond-2.png', charm: 4990, svg: 'assets/free/gifts/diamond-2.png', anim: 'sparkle', sound: 'chime', animFile: 'assets/free/lottie-json/diamond-3d.json' },
   { id: 'g46', name: 'Diamond Ring', price: 999, icon: 'assets/free/gifts/diamond-ring.png', charm: 9990, svg: 'assets/free/gifts/diamond-ring.png', anim: 'sparkle', sound: 'chime' },
   { id: 'g47', name: 'Fire Flame', price: 19, icon: 'assets/free/gifts/fire.png', charm: 190, svg: 'assets/free/gifts/fire.png', anim: 'sparkle', sound: 'pop' },
   { id: 'g48', name: 'Flower Bouquet', price: 29, icon: 'assets/free/gifts/flower.png', charm: 290, svg: 'assets/free/gifts/flower.png', anim: 'bloom', sound: 'chime' },
   { id: 'g49', name: 'Gift Box', price: 49, icon: 'assets/free/gifts/gift.png', charm: 490, svg: 'assets/free/gifts/gift.png', anim: 'bounce', sound: 'chime', animFile: 'assets/free/lottie-json/gift-box-3d.json' },
   { id: 'g50', name: 'Perfume Bottle', price: 149, icon: 'assets/free/gifts/perfume-bottle.png', charm: 1490, svg: 'assets/free/gifts/perfume-bottle.png', anim: 'sparkle', sound: 'spray' },
   { id: 'g51', name: 'Royal Castle', price: 2999, icon: 'assets/free/gifts/castle.png', charm: 29990, svg: 'assets/free/gifts/castle.png', anim: 'zoom', sound: 'fanfare' },
   { id: 'g52', name: 'Rose Gift', price: 19, icon: 'assets/free/gifts/rose-gradient.svg', charm: 190, svg: 'assets/free/gifts/rose-gradient.svg', anim: 'bloom', sound: 'chime' },
   { id: 'g53', name: 'Gift Bag', price: 29, icon: 'assets/free/gifts/gift-bag-gradient.svg', charm: 290, svg: 'assets/free/gifts/gift-bag-gradient.svg', anim: 'bounce', sound: 'chime' },
   { id: 'g54', name: 'Gift Ribbon', price: 15, icon: 'assets/free/gifts/freegameui_ic_shop_gift-wrap-ribbon.svg', charm: 150, svg: 'assets/free/gifts/freegameui_ic_shop_gift-wrap-ribbon.svg', anim: 'bounce', sound: 'pop' },
   /* GIFT PARITY g55–g56 (2026-11-22): free library art, gaps only. The
      artifact gift list could not be read (no list/invoke action is
      exposed), so these two new gifts bring the source to 56 instead. */
   { id: 'g55', name: 'Candy Gift', price: 25, icon: 'assets/free/gifts/freegameui_gift-friend-candy.svg', charm: 250, svg: 'assets/free/gifts/freegameui_gift-friend-candy.svg', anim: 'bounce', sound: 'pop' },
   { id: 'g56', name: 'Gift Heart', price: 39, icon: 'assets/free/gifts/gift-heart-gradient.svg', charm: 390, svg: 'assets/free/gifts/gift-heart-gradient.svg', anim: 'bloom', sound: 'chime' },
   /* LEGENDARY TIER g57–g59 (2026-11-22): above all current gifts (the
      catalog sorts tier Legendary first). All three cost >=100,000 coins,
      so the existing big-gift banner (5s, auto-close) fires for each. */
   { id: 'g57', name: 'Royal Castle', price: 150000, icon: 'assets/free/gifts/castle.png', charm: 1500000, svg: 'assets/free/gifts/castle.png', anim: 'zoom', sound: 'fanfare', tier: 'Legendary' },
   { id: 'g58', name: 'Golden Yacht', price: 200000, icon: 'assets/free/gifts/yacht.png', charm: 2000000, svg: 'assets/free/gifts/yacht.png', anim: 'float', sound: 'fanfare', tier: 'Legendary' },
   { id: 'g59', name: 'Diamond Royal Ring', price: 120000, icon: 'assets/free/gifts/diamond-ring.png', charm: 1200000, svg: 'assets/free/gifts/diamond-ring.png', anim: 'sparkle', sound: 'chime', tier: 'Legendary' }
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
   { id: 's15', name: 'Chat Box — Dragon Flame', price: 999, category: 'Chat Box', icon: 'assets/vip/vip10/badge.png' },
   { id: 's16', name: 'Profile Card — Dragon', price: 4999, category: 'Profile Card', icon: 'assets/icons/card.svg' },
   { id: 's17', name: 'Room Lock (1 month)', price: 6999, category: 'Room', icon: 'assets/icons/lock.svg' },
   { id: 's18', name: 'Pin on Top (2 hours)', price: 4000, category: 'Room', icon: 'assets/icons/pin.svg' },
   { id: 's19', name: 'Unique Room ID', price: 50000, category: 'Room', icon: 'assets/icons/id.svg' },
   { id: 's20', name: 'Unique Personal ID', price: 75000, category: 'Room', icon: 'assets/icons/id.svg' },
   { id: 's21', name: 'Divine Universe Theme', price: 9999, category: 'Theme', icon: 'assets/themes/divine.jpg', svg: 'assets/themes/divine.jpg' },
   { id: 's22', name: 'Castle Night Theme', price: 4999, category: 'Theme', icon: 'assets/themes/castle-night.jpg', svg: 'assets/themes/castle-night.jpg' }
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
   controls: { animations: true, sounds: true, gifts: true, vip: true, shop: true, rooms: true, payments: true, chat: true, moments: true, luckyDraw: true, daily: true, invite: true, ai: true, events: true, entryEffects: true, vipFrames: true, giftsDisabled: [], benefitsDisabled: [], vipDisabled: [], themesDisabled: [] },
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
if (!db.settings.controls) db.settings.controls = { animations: true, sounds: true, gifts: true, vip: true, shop: true, rooms: true, payments: true, chat: true, moments: true, luckyDraw: true, daily: true, invite: true, ai: true, events: true, entryEffects: true, vipFrames: true, giftsDisabled: [], benefitsDisabled: [], vipDisabled: [], themesDisabled: [] };
// Backfill new gifts/shop items for older databases
(function backfill() {
 const fresh = blankDb();
 let changed = false;
 for (const u of db.users) {
  if (u.tag === undefined) { u.tag = ''; changed = true; }
  if (u.dob === undefined) { u.dob = null; changed = true; }
  if (u.frameId === undefined) { u.frameId = u.profileFrame || null; changed = true; }
  if (u.cardSkinId === undefined) { u.cardSkinId = null; changed = true; }
 }
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
  coins: 0, diamonds: 0, charm: 0, wealth: 0, vip: 11, vipUntil: null, // owner: VIP 11 PERMANENT (never "No VIP yet")
  level: 42, followers: [], following: [], inventory: [],
  bio: 'Owner of AZLAN WORLD CHAT', gender: 'Male', country: 'Pakistan', tag: '', dob: null, frameId: null, cardSkinId: null,
  createdAt: new Date().toISOString(), banned: false, deviceId: null, verified: true,
  lastDaily: null, inviteCode: 'AZLAN1', invitedBy: null, totalRecharged: 0
 });
 save();
}

const app = express();
/* PERFORMANCE (heavy-server rule): gzip everything, and cache immutable
   images for a day. App code (HTML/JS/CSS) is never cached, so updates
   reach users immediately. */
try { app.use(require('compression')()); } catch (e) { console.log('compression not installed — responses are uncompressed'); }
app.use(cors());
app.use(express.json({ limit: '20mb' }));
/* Web root IS the package root now (deployable PWA at the zip root).
   Serve ONLY the public web files explicitly — never serve server.js,
   server/, data/ or any other backend file. */
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '1d', immutable: true }));
app.use('/icons', express.static(path.join(__dirname, 'icons'), { maxAge: '1d', immutable: true }));
const WEB_FILES = { '/': 'index.html', '/index.html': 'index.html', '/vip-preview.html': 'vip-preview.html', '/icon-library.html': 'icon-library.html', '/app.js': 'app.js', '/styles.css': 'styles.css', '/sounds.js': 'sounds.js', '/manifest.json': 'manifest.json', '/sw.js': 'sw.js' };
for (const [route, file] of Object.entries(WEB_FILES)) app.get(route, (req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, file)); });
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d' }));
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
 /* PRIVACY (owner rule 2026-11-22, extended 2026-11-22 profile edit):
    email, phone, verification code, device id, date of birth and gender are
    PRIVATE — visible only to the user themself (ownUser below, used only by
    GET/PUT /api/me). Every public response (profiles, user search,
    rankings, rooms, leaderboards) goes through this function, so private
    details can never leak to another user's client. */
 const { password, email, phone, verificationCode, verificationExpires, deviceId, dob, gender, ...rest } = u;
 /* NAME SAFETY (null-name fix 2026-11-22): a name can never leave the server
    as null/undefined/empty or the literal strings "null"/"undefined" — every
    consumer of a user record shows a real display name instead. */
 rest.name = displayNameOf(u);
 rest.displayName = rest.name;
 /* Profile fields every public view may show (never phone/email/dob/gender). */
 rest.country = u.country || '';
 rest.tag = u.tag || '';
 rest.bio = u.bio || '';
 rest.frameId = u.frameId || u.profileFrame || null;
 rest.cardSkinId = u.cardSkinId || null;
 rest.profileFrame = rest.frameId;
 rest.photo = u.photo || null; /* free default avatar (assets/free/avatars/) or null */
 /* OWNER VIP FLOOR: the owner is always at least VIP 11 (permanent). A fresh
    database seeds the owner at VIP 11, but an older record may still hold 0 —
    never report the owner as "no VIP". */
 if (u.role === 'owner') rest.vip = Math.max(u.vip || 0, 11);
 return rest;
}
/* Own-profile view: public fields PLUS gender and date of birth, which are
   private and shown only on the owner's own profile / edit screen.
   Used ONLY by GET /api/me and PUT /api/me (both derive the user from the
   session token). Never used on any route that shows another user. */
function ownUser(u) {
 if (!u) return null;
 const p = publicUser(u);
 p.gender = u.gender || '';
 p.dob = u.dob || null;
 return p;
}
/* Owner-only view: the owner sees email + phone in the Owner Portal
   (verification codes, VIP list, stats). Never used on public routes. */
function ownerUser(u) {
 if (!u) return null;
 const { password, verificationCode, verificationExpires, dob, gender, ...rest } = u;
 rest.name = displayNameOf(u);
 if (u.role === 'owner') rest.vip = Math.max(u.vip || 0, 11);
 return rest;
}
/* ---- display-name safety (null-name fix 2026-11-22) ----
   One rule for every name the server ever emits: null / undefined / blank /
   "null" / "undefined" are never valid names. The owner is always "Azlan",
   guests fall back to "Guest-XXXX", everyone else to "User <id>". */
function displayNameOf(u) {
 if (!u) return 'User';
 let n = u.name;
 if (typeof n !== 'string') n = '';
 n = n.trim();
 if (!n || n.toLowerCase() === 'null' || n.toLowerCase() === 'undefined') {
  if (u.role === 'owner') return 'Azlan';
  if (u.email && String(u.email).endsWith('@guest.azlanworld.chat')) return 'Guest-' + String(u.id).slice(-4);
  return u.id ? 'User ' + u.id : 'User';
 }
 return n;
}
/* Clean a name a user typed in (register / profile edit): trim it, and
   reject null/undefined/empty/"null"/"undefined" so a bad value can never
   be stored. Returns the clean name, or null when the input is unusable. */
function cleanNameInput(name) {
 if (typeof name !== 'string') return null;
 const n = name.trim();
 if (!n || n.toLowerCase() === 'null' || n.toLowerCase() === 'undefined') return null;
 return n;
}
/* ---------------- profile edit validation (2026-11-22) ----------------
   Fixed country list (client edit screen uses the same list). Gender and
   date of birth are private: they are stored, but publicUser() never emits
   them — only ownUser() (GET/PUT /api/me) does. */
const PROFILE_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const PROFILE_COUNTRIES = ['USA', 'Pakistan', 'UK', 'UAE', 'Saudi Arabia', 'Canada', 'Australia', 'India', 'Bangladesh', 'Brazil', 'Afghanistan', 'China', 'Egypt', 'France', 'Germany', 'Indonesia', 'Iran', 'Iraq', 'Italy', 'Japan', 'Kenya', 'Kuwait', 'Malaysia', 'Morocco', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Oman', 'Philippines', 'Qatar', 'Russia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Thailand', 'Turkey', 'Ukraine', 'Vietnam', 'Yemen'];
function validDob(v) {
 if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
 const [y, m, d] = v.split('-').map(Number);
 const dt = new Date(Date.UTC(y, m - 1, d));
 if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
 return dt.getTime() <= Date.now();
}
/* A frame / card skin may only be equipped if the user owns it: it is in
   their shop inventory, it is a VIP frame/card for a VIP level they hold,
   or (owner only) the owner frame. Anything else is rejected. */
function ownsFrameOrCard(u, id, kind) {
 if (!id) return true;
 /* FREE FRAMES (2026-11-22): free library frames, free for everyone to equip. */
 if (kind === 'frame' && (id === 'free-frame-circle' || id === 'free-frame-3d')) return true;
 const inv = u.inventory || [];
 if (inv.includes(id)) return true;
 if (id === 'owner-frame' && u.role === 'owner') return true;
 const m = /^vip-(frame|card)-(\d+)$/.exec(id);
 if (m && m[1] === kind && Number(m[2]) >= 1 && Number(m[2]) <= 12 && (u.vip || 0) >= Number(m[2])) return true;
 return false;
}
/* Validate a profile-edit body. Returns { error } on the first bad field,
   or { fields } with only the cleaned, storable values. The `displayName`
   field is strict (empty / too long / "null" -> 400); the legacy `name`
   field stays lenient (bad values are ignored, never stored) so the
   2026-11-22 null-name fix keeps passing. */
function validateProfileEdit(body, u) {
 const fields = {};
 if (body.displayName !== undefined) {
  const clean = cleanNameInput(body.displayName);
  if (!clean) return { error: 'Name cannot be empty' };
  if (clean.length > 30) return { error: 'Name must be 30 characters or fewer' };
  fields.name = clean;
 }
 if (body.gender !== undefined) {
  if (body.gender === '' || body.gender === null) fields.gender = '';
  else if (!PROFILE_GENDERS.includes(body.gender)) return { error: 'Gender must be Male, Female, Other, or Prefer not to say' };
  else fields.gender = body.gender;
 }
 if (body.dob !== undefined) {
  if (body.dob === '' || body.dob === null) fields.dob = null;
  else if (!validDob(body.dob)) return { error: 'Date of birth must be a real date (YYYY-MM-DD) and not in the future' };
  else fields.dob = body.dob;
 }
 if (body.country !== undefined) {
  if (body.country === '' || body.country === null) fields.country = '';
  else if (!PROFILE_COUNTRIES.includes(body.country)) return { error: 'Please pick a country from the list' };
  else fields.country = body.country;
 }
 if (body.tag !== undefined) {
  if (typeof body.tag !== 'string') return { error: 'Tag must be text' };
  if (body.tag.length > 20) return { error: 'Tag must be 20 characters or fewer' };
  fields.tag = body.tag.trim();
 }
 if (body.bio !== undefined) {
  if (typeof body.bio !== 'string') return { error: 'Bio must be text' };
  if (body.bio.length > 200) return { error: 'Bio must be 200 characters or fewer' };
  fields.bio = body.bio.trim();
 }
 if (body.frameId !== undefined) {
  const v = body.frameId === '' ? null : body.frameId;
  if (v !== null && (typeof v !== 'string' || !ownsFrameOrCard(u, v, 'frame'))) return { error: 'You do not own that profile frame yet — buy it in the shop first' };
  fields.frameId = v;
 }
 if (body.cardSkinId !== undefined) {
  const v = body.cardSkinId === '' ? null : body.cardSkinId;
  if (v !== null && (typeof v !== 'string' || !ownsFrameOrCard(u, v, 'card'))) return { error: 'You do not own that profile card skin yet — buy it in the shop first' };
  fields.cardSkinId = v;
 }
 /* FREE AVATAR PHOTO (2026-11-22): only the 6 bundled default avatars may be
    set this way — any other path is rejected, so nobody can point a profile
    photo at an arbitrary URL. '' clears it back to the initial letter. */
 if (body.photo !== undefined) {
  const v = body.photo === '' ? null : body.photo;
  if (v !== null && (typeof v !== 'string' || !/^assets\/free\/avatars\/[a-z0-9-]+\.svg$/.test(v))) return { error: 'Pick one of the default avatars' };
  fields.photo = v;
 }
 return { fields };
}
function applyProfileEdit(req, res) {
 const u = me(req);
 const body = req.body || {};
 /* The session token decides who is edited. A userId/id in the body that
    names anyone else is an attempt to edit another user's profile -> 403.
    (A matching id is harmless and ignored.) */
 const claimed = body.userId || body.id;
 if (claimed && String(claimed) !== String(u.id)) return res.status(403).json({ error: 'You can only edit your own profile' });
 const v = validateProfileEdit(body, u);
 if (v.error) return res.status(400).json({ error: v.error });
 /* Legacy `name` field: lenient — a clean value is accepted, a bad one
    ("null", empty) is ignored and never stored (null-name fix). */
 const legacy = cleanNameInput(body.name);
 if (legacy && !v.fields.name) v.fields.name = legacy;
 Object.assign(u, v.fields);
 if (v.fields.frameId !== undefined) u.profileFrame = v.fields.frameId;
 save();
 res.json({ user: ownUser(u) });
}
function notify(userId, text, extra) {
 db.notifications.unshift({ id: Date.now() + Math.random(), userId, text, at: new Date().toISOString(), read: false, ...(extra || {}) });
 save();
}

/* ---------------- auth routes ---------------- */
app.post('/api/auth/register', (req, res) => {
 const { name, email, password, inviteCode, phone, phoneNumber } = req.body || {};
 /* EMAIL-ONLY VERIFICATION (owner rule 2026-11-22): regular users verify by
    email + 6-digit code only. There is no phone/SMS verification path — any
    phone number sent with a signup is rejected, never stored. */
 if ((phone && String(phone).trim()) || (phoneNumber && String(phoneNumber).trim())) return res.status(400).json({ error: 'Phone verification is not available — verification is by email only.' });
 const cleanName = cleanNameInput(name);
 if (!cleanName || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
 if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
 const bonus = db.settings.signupBonus || 1000000;
 // Guest accounts (auto-created by Guest Mode) are verified at once — the
 // verification rule applies to IDs created with a real email.
 const isGuest = String(email).endsWith('@guest.azlanworld.chat');
 const code = String(Math.floor(100000 + Math.random() * 900000));
 const user = {
  id: uid(), email, name: cleanName, role: 'user', password: bcrypt.hashSync(password, 10),
  phone: null,
  verified: isGuest, verificationCode: isGuest ? null : code, verificationExpires: isGuest ? null : Date.now() + 10 * 60 * 1000,
  coins: bonus, diamonds: 0, charm: 0, wealth: 0, vip: 0, vipUntil: null,
  level: 1, followers: [], following: [], inventory: [],
  bio: '', gender: '', country: '', tag: '', dob: null, frameId: null, cardSkinId: null, createdAt: new Date().toISOString(),
  banned: false, deviceId: req.body.deviceId || null,
  lastDaily: null, inviteCode: 'AZ' + Math.random().toString(36).slice(2, 7).toUpperCase(),
  invitedBy: inviteCode || null, totalRecharged: 0
 };
 db.users.push(user); save();
 // Invite & Earn: inviter gets 100,000 coins when the invite is used
 if (inviteCode) {
  const inviter = db.users.find(u => u.inviteCode === inviteCode);
  if (inviter) { inviter.coins += 100000; notify(inviter.id, `Your invite earned you 100,000 coins — ${cleanName} joined!`); save(); }
 }
 audit(user.id, 'register', cleanName);
 // Mandatory verification: the account cannot log in until the 6-digit code
 // is entered. No SMS gateway is connected, so the code is shown in-app on
 // the verification screen itself (never pretend an SMS was sent).
 if (!user.verified) return res.json({ needsVerification: true, userId: user.id, email: user.email, code: user.verificationCode });
 res.json({ token: tokenFor(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
 const { email, password } = req.body || {};
 const user = db.users.find(u => u.email === email);
 if (!user || !bcrypt.compareSync(password || '', user.password)) return res.status(400).json({ error: 'Wrong email or password' });
 if (user.banned || db.bans.users.includes(user.id)) return res.status(403).json({ error: 'This account is banned. Contact the owner.' });
 // Server-enforced verification: unverified accounts cannot log in.
 if (user.verified === false) return res.status(403).json({ error: 'Please verify your account first — enter the 6-digit code.', needsVerification: true, userId: user.id, code: user.verificationCode });
 res.json({ token: tokenFor(user), user: publicUser(user) });
});

/* Mandatory verification: 6-digit code, shown in-app (no SMS gateway).
   Resend always works — a fresh code is generated every time. */
app.post('/api/auth/verify', (req, res) => {
 const { userId, code } = req.body || {};
 const user = db.users.find(u => u.id === userId);
 if (!user) return res.status(404).json({ error: 'Account not found' });
 if (user.verified) return res.json({ token: tokenFor(user), user: publicUser(user) });
 if (!user.verificationCode || String(user.verificationCode) !== String(code || '').trim()) return res.status(400).json({ error: 'Wrong code — check the 6 digits and try again, or tap Resend Code.' });
 if (user.verificationExpires && Date.now() > user.verificationExpires) return res.status(400).json({ error: 'Code expired — tap Resend Code for a new one.' });
 user.verified = true; user.verificationCode = null; user.verificationExpires = null; save();
 audit(user.id, 'verify', user.name);
 res.json({ token: tokenFor(user), user: publicUser(user) });
});
app.post('/api/auth/resend-code', (req, res) => {
 const { userId } = req.body || {};
 const user = db.users.find(u => u.id === userId);
 if (!user) return res.status(404).json({ error: 'Account not found' });
 if (user.verified) return res.json({ ok: true, verified: true });
 const code = String(Math.floor(100000 + Math.random() * 900000));
 user.verificationCode = code; user.verificationExpires = Date.now() + 10 * 60 * 1000; save();
 res.json({ ok: true, code, expiresInMinutes: 10 });
});

/* Owner enters DIRECTLY — no login screen. Protected by OWNER_SECRET. */
app.post('/api/owner/enter', (req, res) => {
 if ((req.body || {}).secret !== OWNER_SECRET) return res.status(403).json({ error: 'Wrong owner key' });
 const owner = db.users.find(u => u.role === 'owner');
 /* OWNER VIP FLOOR (null-name fix 2026-11-22): an older owner record may hold
    vip 0 — repair it to VIP 11 permanent on entry. Never downgrade: if the
    owner already holds VIP 12 (bought), it stays. */
 if (owner && (owner.vip || 0) < 11) { owner.vip = 11; owner.vipUntil = null; save(); }
 audit(owner.id, 'owner-enter', 'Owner entered directly');
 res.json({ token: tokenFor(owner), user: publicUser(owner) });
});

app.get('/api/me', auth, (req, res) => res.json({ user: ownUser(me(req)) }));
/* Profile edit — the user is derived ONLY from the session token. Editing
   anyone else's profile (body userId/id, or PUT /api/users/:otherId) is 403. */
app.put('/api/me', auth, applyProfileEdit);
app.put('/api/users/:id', auth, (req, res) => {
 if (String(req.params.id) !== String(me(req).id)) return res.status(403).json({ error: 'You can only edit your own profile' });
 applyProfileEdit(req, res);
});
app.get('/api/users/:id', auth, (req, res) => {
 const u = db.users.find(x => x.id === req.params.id);
 if (!u) return res.status(404).json({ error: 'User not found' });
 res.json({ user: publicUser(u) });
});
app.get('/api/users', auth, (req, res) => {
 const q = (req.query.q || '').toLowerCase();
 /* NAME SAFETY: a stored name may be null on an old record — never crash the
    search on .toLowerCase(). */
 res.json({ users: db.users.filter(u => !q || (u.name || '').toLowerCase().includes(q) || u.id.includes(q)).slice(0, 30).map(publicUser) });
});
/* Follow states (TikTok-style): Follow / Following / Follow Back / Friends (mutual) */
function followState(u, target) {
 const following = (u.following || []).includes(target.id);
 const followedBy = (target.following || []).includes(u.id);
 const mutual = following && followedBy;
 return { following, followedBy, mutual, state: mutual ? 'friends' : following ? 'following' : followedBy ? 'follow-back' : 'follow',
  followers: (target.followers || []).length, followingCount: (target.following || []).length };
}
app.post('/api/users/:id/follow', auth, (req, res) => {
 const target = db.users.find(u => u.id === req.params.id);
 const u = me(req);
 if (!target || target.id === u.id) return res.status(400).json({ error: 'Cannot follow' });
 if (!u.following.includes(target.id)) { u.following.push(target.id); target.followers.push(u.id); save(); }
 res.json({ ok: true, ...followState(u, target) });
});
app.post('/api/users/:id/unfollow', auth, (req, res) => {
 const target = db.users.find(u => u.id === req.params.id);
 const u = me(req);
 if (!target || target.id === u.id) return res.status(400).json({ error: 'Cannot unfollow' });
 u.following = (u.following || []).filter(id => id !== target.id);
 target.followers = (target.followers || []).filter(id => id !== u.id);
 save(); res.json({ ok: true, ...followState(u, target) });
});
app.get('/api/users/:id/follow-state', auth, (req, res) => {
 const target = db.users.find(u => u.id === req.params.id);
 const u = me(req);
 if (!target) return res.status(404).json({ error: 'User not found' });
 res.json(followState(u, target));
});
/* Friends = mutual follows (both follow each other) */
app.get('/api/friends', auth, (req, res) => {
 const u = me(req);
 const friends = db.users.filter(x => x.id !== u.id && (u.following || []).includes(x.id) && (x.following || []).includes(u.id))
  .map(x => ({ id: x.id, name: x.anonymous ? 'Anonymous' : displayNameOf(x), vip: x.vip || 0, level: x.level || 1 }));
 res.json({ friends });
});

/* ---------------- rooms ---------------- */
/* Front Row on Online User List: VIP users first, then everyone else.
  Anonymous users show as "Anonymous". Enriches seats with VIP info
  (mic ring colour, sticker, frame) so the app can draw them. */
function enrichRoom(room) {
 const info = (id) => {
  const u = db.users.find(x => x.id === id);
  if (!u) return { id, name: 'User ' + id, vip: 0, anonymous: false };
  /* NAME SAFETY: never emit a null name in a seat/member snapshot. */
  return { id: u.id, name: u.anonymous ? 'Anonymous' : displayNameOf(u), displayName: u.anonymous ? 'Anonymous' : displayNameOf(u), vip: u.role === 'owner' ? Math.max(u.vip || 0, 11) : (u.vip || 0), svip: !!u.svip, anonymous: !!u.anonymous, micSticker: u.micSticker || null, micAnimation: u.micAnimation || null, vipCustom: u.vipCustom || {}, micStyle: u.micStyle || 'default', micWave: u.micWave || 'default', micEmoji: u.micEmoji || null, profileFrame: u.frameId || u.profileFrame || null, frameId: u.frameId || u.profileFrame || null, cardSkinId: u.cardSkinId || null, country: u.country || '', tag: u.tag || '', bio: u.bio || '', level: u.level || 1, isOwner: u.role === 'owner', isHost: room.hostId === u.id, isAdmin: (room.admins || []).includes(u.id), honorTitle: require('./server/vip').honorTitleFor(u.wealth || 0) };
 };
 const members = (room.members || []).map(info)
  .sort((a, b) => (b.vip || 0) - (a.vip || 0)); // VIP first — front row
 const seats = (room.seats || []).map(s => ({ ...s, seat: s.seat === 0 ? 1 : s.seat, user: info(s.userId) }));
 const host = db.users.find(x => x.id === room.hostId);
 return { ...room, members, seats, hostTheme: host ? (host.roomTheme || null) : null, hostCountry: host ? (host.country || '') : '', admins: room.admins || [] };
}
app.get('/api/rooms', auth, (req, res) => res.json({ rooms: require('./server/list-order').visibleItems(db, 'rooms', db.rooms, r => r.id).map(enrichRoom) }));
/* PERFORMANCE — light room poll: one small request per room user every 5s
   (chat tail + members + seats + gift feed) instead of the full room list.
   The app polls this while inside a room, so text chat and gifts arrive in
   real time while voice is on, without hammering the server. */
app.get('/api/rooms/:id/poll', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 if (!room) return res.status(404).json({ error: 'Room not found' });
 const e = enrichRoom(room);
 res.json({ room: {
  id: e.id, name: e.name, topic: e.topic, hostId: e.hostId, level: e.level || 1,
  announce: e.announce || null, members: e.members, seats: e.seats,
  chat: (e.chat || []).slice(-30), giftFeed: ((db.roomGiftFeed && db.roomGiftFeed[e.id]) || []).slice(0, 10)
 } });
});
app.post('/api/rooms', auth, (req, res) => {
 const u = me(req);
 if (!isOn(db, 'rooms')) return res.status(403).json({ error: 'Rooms are turned off by the owner' });
 const { name, topic, isPrivate } = req.body || {};
 if (!name) return res.status(400).json({ error: 'Room name is required' });
 u.roomsCreated = (u.roomsCreated || 0) + 1;
 const room = {
  id: rid(), name, topic: topic || 'Chat', isPrivate: !!isPrivate, hostId: u.id,
  admins: [u.id],
  level: 1, xp: 0, members: [u.id], seats: [{ seat: 1, userId: u.id, micOn: true }],
  /* Normal User Voice Room: 8 mic seats (host seat 1 + mic seats 2–8).
     Older rooms created before this change have seatCount 11. */
  seatCount: 8, handRaised: [], micRequests: [], lockedSeats: [],
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
 save(); res.json({ room: enrichRoom(room), entrance: u.vip ? (() => { const lvl = require('./server/owner-content').applyVipOverrides(db, require('./server/vip').VIP_LEVELS[u.vip - 1]); const ov = (db.settings.customization && db.settings.customization.vip && db.settings.customization.vip[String(u.vip)]) || {}; return { name: u.anonymous ? 'Anonymous' : u.name, vip: u.vip, emblem: lvl.emblem, banner: ov.nameplate || require('./server/vip').BANNERS[u.vip - 1].svg, animal: require('./server/vip').BANNERS[u.vip - 1].animal, entry: lvl.entry, frame: lvl.frameSvg }; })() : null });
});
app.post('/api/rooms/:id/seat', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { seat, micOn } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 const maxSeat = room.seatCount || 11; // new rooms: 8 seats; older rooms: 11
 if (seat < 1 || seat > maxSeat) return res.status(400).json({ error: 'Seats are 1–' + maxSeat + ' in this room (host seat 1 + mic seats 2–' + maxSeat + ')' });
 if ((room.lockedSeats || []).includes(seat)) return res.status(403).json({ error: 'That seat is locked by the host.' });
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
/* Leave a room fully (background-mode "Leave Room"): removes the user from
   the members list and their mic seat, so the room no longer counts them. */
app.post('/api/rooms/:id/leave', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 if (!room) return res.status(404).json({ error: 'Room not found' });
 const u = me(req);
 room.members = (room.members || []).filter(m => m !== u.id);
 room.seats = (room.seats || []).filter(s => s.userId !== u.id);
 save(); res.json({ ok: true, room: enrichRoom(room) });
});
app.post('/api/rooms/:id/chat', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { text } = req.body || {};
 if (!room || !text) return res.status(400).json({ error: 'Missing room or text' });
 if (!isOn(db, 'chat')) return res.status(403).json({ error: 'Chat is turned off by the owner' });
 if ((room.chatBanned || []).includes(u.id)) return res.status(403).json({ error: 'You are banned from chat in this room.' });
 // Anonymous Display: name shows as "Anonymous". VIP chat box: dragon-flame bubble.
 room.chat.push({ id: Date.now(), userId: u.id, name: u.anonymous ? 'Anonymous' : displayNameOf(u), vip: u.vip || 0, chatBox: u.vip ? 'dragon-flame' : 'normal', text, at: new Date().toISOString() });
 if (room.chat.length > 200) room.chat = room.chat.slice(-200);
 room.xp += 1; room.level = 1 + Math.floor(room.xp / 1000);
 save(); res.json({ room: enrichRoom(room) });
});
app.post('/api/rooms/:id/voice-note', auth, upload.single('audio'), (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req);
 if (!room || !req.file) return res.status(400).json({ error: 'Missing room or audio file' });
 room.voiceNotes.push({ id: Date.now(), userId: u.id, name: displayNameOf(u), url: '/uploads/' + req.file.filename, at: new Date().toISOString() });
 room.xp += 5; save(); res.json({ ok: true, url: '/uploads/' + req.file.filename });
});
app.post('/api/rooms/:id/music', auth, upload.single('audio'), (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req);
 if (!room || !req.file) return res.status(400).json({ error: 'Missing room or audio file' });
 if (room.hostId !== u.id && u.role !== 'owner') return res.status(403).json({ error: 'Only the host can set room music' });
 room.music = { url: '/uploads/' + req.file.filename, by: displayNameOf(u), at: new Date().toISOString() };
 save(); res.json({ room });
});
/* Remove from mic / kick from room — ONLY the room owner or a room admin.
   VIP9 and VIP10 can NEVER be removed or kicked by ANYONE (absolute protection). */
function canRemoveFromRoom(room, u, target) {
 if (target && (target.vip || 0) >= 9) return { ok: false, error: 'VIP9 and VIP10 users are protected — they cannot be removed from the mic or kicked from any room.' };
 const isHost = room.hostId === u.id;
 const isAdmin = (room.admins || []).includes(u.id);
 const isOwner = u.role === 'owner';
 if (!isHost && !isAdmin && !isOwner) return { ok: false, error: 'Only the room owner or a room admin can remove someone from the mic.' };
 if (target && (target.vip || 0) >= 6 && !isOwner) return { ok: false, error: 'That user is protected from removal (VIP6+). Only the owner can remove them.' };
 return { ok: true };
}
app.post('/api/rooms/:id/block', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { userId } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 const target = db.users.find(x => x.id === userId);
 const check = canRemoveFromRoom(room, u, target);
 if (!check.ok) return res.status(403).json({ error: check.error });
 room.blocked = room.blocked || [];
 if (!room.blocked.includes(userId)) room.blocked.push(userId);
 room.seats = room.seats.filter(s => s.userId !== userId);
 room.members = room.members.filter(m => m !== userId);
 save(); res.json({ room });
});
/* Remove from the mic only (stays in the room, can take the mic again later) */
app.post('/api/rooms/:id/remove-seat', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { userId } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 const target = db.users.find(x => x.id === userId);
 const check = canRemoveFromRoom(room, u, target);
 if (!check.ok) return res.status(403).json({ error: check.error });
 room.seats = room.seats.filter(s => s.userId !== userId);
 save(); res.json({ room: enrichRoom(room) });
});

/* ---- Normal User Voice Room actions: raise hand, request mic, host approval,
   room settings, close room. All real, server-enforced. ---- */
app.post('/api/rooms/:id/raise-hand', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req);
 if (!room) return res.status(404).json({ error: 'Room not found' });
 room.handRaised = room.handRaised || [];
 const i = room.handRaised.indexOf(u.id);
 if (i >= 0) room.handRaised.splice(i, 1); else room.handRaised.push(u.id);
 save(); res.json({ ok: true, raised: i < 0, handRaised: room.handRaised });
});
app.post('/api/rooms/:id/request-mic', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { seat } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 room.micRequests = room.micRequests || [];
 if ((room.seats || []).find(s => s.userId === u.id)) return res.status(400).json({ error: 'You are already on a mic seat' });
 if (room.micRequests.find(x => x.userId === u.id)) return res.status(400).json({ error: 'Your mic request is already waiting for the host' });
 const want = seat ? Number(seat) : null;
 if (want && (want < 1 || want > (room.seatCount || 11))) return res.status(400).json({ error: 'That seat does not exist in this room' });
 room.micRequests.push({ userId: u.id, name: u.name, seat: want, at: new Date().toISOString() });
 const host = db.users.find(x => x.id === room.hostId);
 if (host) notify(host.id, `${u.name} requested the mic in "${room.name}"${want ? ' (seat ' + want + ')' : ''}.`);
 save(); res.json({ ok: true, requests: room.micRequests });
});
function isRoomHostOrAdmin(room, u) { return room.hostId === u.id || (room.admins || []).includes(u.id) || u.role === 'owner'; }
app.post('/api/rooms/:id/approve-mic', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { userId, seat } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 if (!isRoomHostOrAdmin(room, u)) return res.status(403).json({ error: 'Only the room host or an admin can approve mic requests' });
 room.micRequests = room.micRequests || [];
 const reqIdx = room.micRequests.findIndex(x => x.userId === userId);
 if (reqIdx < 0) return res.status(400).json({ error: 'No mic request from that user' });
 const maxSeat = room.seatCount || 11;
 let s = seat ? Number(seat) : (room.micRequests[reqIdx].seat || null);
 if (!s) s = Array.from({ length: maxSeat }, (_, i) => i + 1).find(n => !(room.seats || []).find(x => x.seat === n) && !(room.lockedSeats || []).includes(n));
 if (!s || s < 1 || s > maxSeat) return res.status(400).json({ error: 'No free seat available' });
 if ((room.seats || []).find(x => x.seat === s)) return res.status(400).json({ error: 'Seat ' + s + ' is taken' });
 if ((room.lockedSeats || []).includes(s)) return res.status(403).json({ error: 'Seat ' + s + ' is locked' });
 room.micRequests.splice(reqIdx, 1);
 room.seats = (room.seats || []).filter(x => x.userId !== userId);
 room.seats.push({ seat: s, userId, micOn: true });
 save(); res.json({ ok: true, room: enrichRoom(room) });
});
app.post('/api/rooms/:id/deny-mic', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { userId } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 if (!isRoomHostOrAdmin(room, u)) return res.status(403).json({ error: 'Only the room host or an admin can deny mic requests' });
 room.micRequests = (room.micRequests || []).filter(x => x.userId !== userId);
 save(); res.json({ ok: true, requests: room.micRequests });
});
/* Room settings — host / admin / owner only: announcement, topic, seat locks. */
app.post('/api/rooms/:id/settings', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req); const { announce, topic, lockedSeats } = req.body || {};
 if (!room) return res.status(404).json({ error: 'Room not found' });
 if (!isRoomHostOrAdmin(room, u)) return res.status(403).json({ error: 'Only the room host or an admin can change room settings' });
 if (announce !== undefined) room.announce = String(announce).slice(0, 200);
 if (topic !== undefined) room.topic = String(topic).slice(0, 60);
 if (Array.isArray(lockedSeats)) {
  const maxSeat = room.seatCount || 11;
  room.lockedSeats = lockedSeats.map(Number).filter(n => n >= 2 && n <= maxSeat);
 }
 save(); res.json({ ok: true, room: enrichRoom(room) });
});
/* Close a room — host or owner only. */
app.delete('/api/rooms/:id', auth, (req, res) => {
 const room = db.rooms.find(r => r.id === req.params.id);
 const u = me(req);
 if (!room) return res.status(404).json({ error: 'Room not found' });
 if (room.hostId !== u.id && u.role !== 'owner') return res.status(403).json({ error: 'Only the room host or the owner can close this room' });
 db.rooms = db.rooms.filter(r => r.id !== req.params.id);
 save(); audit(u.id, 'room-close', room.name + ' (' + room.id + ')');
 res.json({ ok: true });
});

/* ---------------- mic & voice settings ---------------- */
/* Per-user voice settings, stored on the server and applied in rooms.
   Noise suppression is the browser's own processing ("standard") or off
   ("none"). Krisp-style AI suppression is NOT available — never pretend it is. */
const VOICE_DEFAULTS = {
 micOn: true, muted: false, speakerOn: true,
 micVolume: 50, speakerVolume: 100,
 sensitivity: 50, autoSensitivity: true,
 noiseSuppression: 'standard', echoCancellation: true, autoGain: true,
 voiceEnhancement: false, inputMode: 'voice',
 inputDeviceId: 'default', outputDeviceId: 'default'
};
function voiceSettingsOf(u) { return { ...VOICE_DEFAULTS, ...(u.voiceSettings || {}) }; }
function sanitizeVoiceSettings(body) {
 const b = body || {}; const out = {};
 if (typeof b.micOn === 'boolean') out.micOn = b.micOn;
 if (typeof b.muted === 'boolean') out.muted = b.muted;
 if (typeof b.speakerOn === 'boolean') out.speakerOn = b.speakerOn;
 if (typeof b.micVolume === 'number') out.micVolume = Math.max(0, Math.min(100, Math.round(b.micVolume)));
 if (typeof b.speakerVolume === 'number') out.speakerVolume = Math.max(0, Math.min(100, Math.round(b.speakerVolume)));
 if (typeof b.sensitivity === 'number') out.sensitivity = Math.max(0, Math.min(100, Math.round(b.sensitivity)));
 if (typeof b.autoSensitivity === 'boolean') out.autoSensitivity = b.autoSensitivity;
 if (b.noiseSuppression === 'none' || b.noiseSuppression === 'standard') out.noiseSuppression = b.noiseSuppression;
 if (typeof b.echoCancellation === 'boolean') out.echoCancellation = b.echoCancellation;
 if (typeof b.autoGain === 'boolean') out.autoGain = b.autoGain;
 if (typeof b.voiceEnhancement === 'boolean') out.voiceEnhancement = b.voiceEnhancement;
 if (b.inputMode === 'voice' || b.inputMode === 'ptt') out.inputMode = b.inputMode;
 if (typeof b.inputDeviceId === 'string') out.inputDeviceId = b.inputDeviceId.slice(0, 200);
 if (typeof b.outputDeviceId === 'string') out.outputDeviceId = b.outputDeviceId.slice(0, 200);
 return out;
}
app.get('/api/voice-settings', auth, (req, res) => res.json({ settings: voiceSettingsOf(me(req)) }));
app.put('/api/voice-settings', auth, (req, res) => {
 const u = me(req);
 u.voiceSettings = { ...voiceSettingsOf(u), ...sanitizeVoiceSettings(req.body) };
 save(); res.json({ ok: true, settings: u.voiceSettings });
});

/* ---------------- gifts ---------------- */
const listOrder = require('./server/list-order');
app.get('/api/gifts', auth, (req, res) => res.json({ gifts: listOrder.visibleItems(db, 'gifts', db.gifts, g => g.id) }));
app.post('/api/gifts/send', auth, (req, res) => {
 const u = me(req); const { giftId, toUserId, roomId, qty } = req.body || {};
 const gift = db.gifts.find(g => g.id === giftId);
 const to = db.users.find(x => x.id === toUserId);
 if (!gift || !to) return res.status(400).json({ error: 'Gift or user not found' });
 if (listOrder.isHidden(db, 'gifts', giftId)) return res.status(400).json({ error: 'This gift was removed by the owner' });
 if (!isOn(db, 'gifts')) return res.status(403).json({ error: 'Gifts are turned off by the owner' });
 if (!giftEnabled(db, giftId)) return res.status(403).json({ error: 'This gift is turned off by the owner' });
 const n = Math.max(1, Math.min(777, qty || 1));
 // VIP benefit: Golds Items Discount on gifts too
 const discountPct = DISCOUNTS[u.vip || 0] || 0;
 // Owner is FREE — all gifts at 0 coins (standing owner rule).
 const cost = u.role === 'owner' ? 0 : Math.floor(gift.price * n * (1 - discountPct / 100));
 if (u.coins < cost) return res.status(400).json({ error: 'Not enough coins' });
 u.coins -= cost; u.wealth += cost; to.charm += gift.charm * n; to.wealth += cost;
 to.giftsReceived = (to.giftsReceived || 0) + n; to.giftsReceivedCoins = (to.giftsReceivedCoins || 0) + cost;
 to.giftsReceivedBy = to.giftsReceivedBy || {}; to.giftsReceivedBy[gift.id] = (to.giftsReceivedBy[gift.id] || 0) + n;
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
 const bText = `${displayNameOf(u)} sent ${gift.name} x${n} to ${displayNameOf(to)} — ${cost.toLocaleString()} coins!`;
 if (broadcast) { db.broadcasts.unshift({ id: Date.now(), text: bText, kind: 'gift', at: new Date().toISOString() }); db.users.forEach(x => notify(x.id, bText)); }
 else notify(to.id, `${displayNameOf(u)} sent you ${gift.name} x${n}`);
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
  id: Date.now() + Math.random(), userId: u.id, name: displayNameOf(u), packageId,
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
 plans: listOrder.visibleItems(db, 'vip', VIP_LEVELS, l => l.vip).map(l => { const o = require('./server/owner-content').applyVipOverrides(db, l); return { vip: o.vip, emblem: o.emblem, svg: o.svg, color: o.color, color2: o.color2, theme: o.theme, price: o.price, days: 31, points: o.points, totalBenefits: o.totalBenefits, discountPct: o.discountPct }; })
}));
app.post('/api/vip/buy', auth, (req, res) => {
 const u = me(req); const { vip } = req.body || {};
 const level = VIP_LEVELS.find(l => l.vip === vip);
 if (!level) return res.status(400).json({ error: 'VIP must be 1–11' });
 if (listOrder.isHidden(db, 'vip', vip)) return res.status(400).json({ error: `VIP${vip} was removed by the owner` });
 if (!isOn(db, 'vip')) return res.status(403).json({ error: 'VIP is turned off by the owner' });
 if (!vipLevelEnabled(db, vip)) return res.status(403).json({ error: `VIP${vip} is turned off by the owner` });
 const price = u.role === 'owner' ? 0 : ((db.settings.vipPriceOverride && db.settings.vipPriceOverride[vip]) || level.price);
 if (u.coins < price) return res.status(400).json({ error: 'Not enough coins' });
 const wasVip = u.vip || 0;
 u.coins -= price; u.vip = vip;
 u.vipPoints = (u.vipPoints || 0) + level.points;
 u.vipUntil = new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString();
 // Level-up Broadcast to the Whole Platform (fire-dragon banner to ALL users)
 const bText = `Congratulations to ${displayNameOf(u)} for leveling up to VIP${vip} (${level.emblem})!`;
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
app.get('/api/shop', auth, (req, res) => res.json({ items: listOrder.visibleItems(db, 'shop', db.shop, i => i.id) }));
app.post('/api/shop/buy', auth, (req, res) => {
 const u = me(req); const { itemId } = req.body || {};
 const item = db.shop.find(i => i.id === itemId);
 if (!item) return res.status(400).json({ error: 'Item not found' });
 if (listOrder.isHidden(db, 'shop', itemId)) return res.status(400).json({ error: 'This item was removed by the owner' });
 if (!isOn(db, 'shop')) return res.status(403).json({ error: 'Shop is turned off by the owner' });
 // Golds Items Discount: 50% off golds-priced items for VIPs; otherwise the
 // better of the VIP discount (2% per level, up to 25%) and Premium (15%).
 const vipPct = DISCOUNTS[u.vip || 0] || 0;
 const premiumPct = u.premium ? 15 : 0;
 const discountPct = u.vip ? Math.max(50, vipPct, premiumPct) : Math.max(vipPct, premiumPct);
 // Owner is FREE — all shop items at 0 coins (standing owner rule).
 const price = u.role === 'owner' ? 0 : Math.floor(item.price * (1 - discountPct / 100));
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
 notify(to.id, `${displayNameOf(u)} invited you to be CP (${tier}) — accept in the CP section.`);
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
 const m = { id: Date.now(), userId: u.id, name: displayNameOf(u), text: text || '', image: req.file ? '/uploads/' + req.file.filename : null, likes: [], comments: [], at: new Date().toISOString() };
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
 m.comments.push({ userId: u.id, name: displayNameOf(u), text, at: new Date().toISOString() });
 save(); res.json({ ok: true });
});

/* ---------------- messaging ---------------- */
/* Private messages need a MUTUAL follow (friends). The owner can message anyone. */
function canDM(u, other) {
 if (!u || !other) return false;
 if (u.role === 'owner' || other.role === 'owner') return true;
 return (u.following || []).includes(other.id) && (other.following || []).includes(u.id);
}
app.get('/api/messages/:userId', auth, (req, res) => {
 const u = me(req);
 const other = db.users.find(x => x.id === req.params.userId);
 if (!other) return res.status(404).json({ error: 'User not found' });
 if (!canDM(u, other)) return res.status(403).json({ error: 'Private messages unlock only when you follow each other — follow this user and wait for a follow-back.', locked: true });
 const list = db.messages.filter(m => (m.from === u.id && m.to === req.params.userId) || (m.from === req.params.userId && m.to === u.id));
 res.json({ messages: list });
});
app.post('/api/messages', auth, (req, res) => {
 const u = me(req); const { to, text } = req.body || {};
 if (!isOn(db, 'chat')) return res.status(403).json({ error: 'Messages are turned off by the owner' });
 if (!to || !text) return res.status(400).json({ error: 'Missing recipient or text' });
 const other = db.users.find(x => x.id === to);
 if (!other) return res.status(404).json({ error: 'User not found' });
 if (!canDM(u, other)) return res.status(403).json({ error: 'Private messages unlock only when you follow each other — follow this user and wait for a follow-back.', locked: true });
 const m = { id: Date.now(), from: u.id, to, text, at: new Date().toISOString() };
 db.messages.push(m); save(); notify(to, `New message from ${displayNameOf(u)}`);
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
 db.feedback.unshift({ id: Date.now(), userId: u.id, name: displayNameOf(u), text, at: new Date().toISOString() });
 save(); res.json({ ok: true });
});
app.get('/api/notifications', auth, (req, res) => {
 const u = me(req);
 res.json({ notifications: db.notifications.filter(n => n.userId === u.id).slice(0, 50) });
});
app.get('/api/settings', auth, (req, res) => res.json({ settings: db.settings }));

/* ---------------- OWNER PORTAL ---------------- */
/* Owner Portal: pending verification codes (accounts waiting to verify) */
app.get('/api/owner/verification-codes', auth, ownerOnly, (req, res) => {
 const pending = db.users.filter(u => u.verified === false).map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || null, code: u.verificationCode, expiresAt: u.verificationExpires ? new Date(u.verificationExpires).toISOString() : null, createdAt: u.createdAt }));
 res.json({ pending });
});
/* -------- Owner VIP Admin Panel (VIP 1–12) -------- */
app.get('/api/owner/vip/list', auth, ownerOnly, (req, res) => {
 const vips = db.users.filter(u => (u.vip || 0) > 0).map(u => ({ id: u.id, name: u.name, email: u.email, vip: u.vip, vipUntil: u.vipUntil || null }));
 res.json({ vips });
});
app.post('/api/owner/vip/set', auth, ownerOnly, (req, res) => {
 const { userId, vip, days } = req.body || {};
 const target = db.users.find(u => u.id === String(userId));
 if (!target) return res.status(400).json({ error: 'User not found' });
 const v = Number(vip);
 if (isNaN(v) || v < 0 || v > 12) return res.status(400).json({ error: 'VIP must be 0–12 (0 removes VIP)' });
 const d = Math.max(1, Number(days) || 31);
 target.vip = v;
 target.vipUntil = v > 0 ? new Date(Date.now() + d * 24 * 3600 * 1000).toISOString() : null;
 if (v > 0) { const lvl = require('./server/vip').VIP_LEVELS[v - 1]; target.vipPoints = Math.max(target.vipPoints || 0, lvl.points); }
 save(); audit(req.user.id, 'owner-vip-set', `VIP${v} to ${target.name} (${target.id}) for ${d} days`);
 res.json({ ok: true, user: ownerUser(target) });
});
app.post('/api/owner/vip/reward', auth, ownerOnly, (req, res) => {
 const { userId, coins, diamonds, bonusPoints } = req.body || {};
 const target = db.users.find(u => u.id === String(userId));
 if (!target) return res.status(400).json({ error: 'User not found' });
 if (coins) target.coins = Math.max(0, (target.coins || 0) + Number(coins));
 if (diamonds) target.diamonds = Math.max(0, (target.diamonds || 0) + Number(diamonds));
 if (bonusPoints) target.bonusPoints = Math.max(0, (target.bonusPoints || 0) + Number(bonusPoints));
 save(); audit(req.user.id, 'owner-vip-reward', `Reward to ${target.name} (${target.id}): ${coins || 0} coins, ${diamonds || 0} diamonds, ${bonusPoints || 0} bonus points`);
 res.json({ ok: true, user: ownerUser(target) });
});
app.post('/api/owner/vip/price', auth, ownerOnly, (req, res) => {
 const { vip, price } = req.body || {};
 const v = Number(vip), p = Number(price);
 if (isNaN(v) || v < 1 || v > 12 || !p || p < 0) return res.status(400).json({ error: 'VIP must be 1–12 and price a positive number' });
 db.settings.vipPriceOverride = db.settings.vipPriceOverride || {};
 db.settings.vipPriceOverride[v] = p;
 save(); audit(req.user.id, 'owner-vip-price', `VIP${v} price = ${p}`);
 res.json({ ok: true, vip: v, price: p });
});
app.get('/api/owner/vip/preview', auth, ownerOnly, (req, res) => {
 const { VIP_LEVELS } = require('./server/vip');
 res.json({ levels: VIP_LEVELS.map(l => { const o = require('./server/owner-content').applyVipOverrides(db, l); return { vip: o.vip, emblem: o.emblem, svg: o.svg, color: o.color, color2: o.color2, theme: o.theme, themeBg: o.themeBg, effect: o.effect, entry: o.entry, frameSvg: o.frameSvg, price: o.price, points: o.points, totalBenefits: o.totalBenefits, discountPct: o.discountPct }; }) });
});
app.get('/api/owner/stats', auth, ownerOnly, (req, res) => {
 res.json({
  totalUsers: db.users.length, totalRooms: db.rooms.length,
  pendingRecharges: db.recharges.filter(r => r.status === 'pending').length,
  masterWallet: db.settings.masterWallet,
  auditLog: db.auditLog.slice(0, 50), users: db.users.map(ownerUser)
 });
});
app.post('/api/owner/coins', auth, ownerOnly, (req, res) => {
 const { userId, amount } = req.body || {};
 const target = db.users.find(u => u.id === userId);
 if (!target) return res.status(400).json({ error: 'User not found' });
 target.coins = Math.max(0, target.coins + (amount || 0));
 save(); audit(req.user.id, 'owner-coins', `${amount} to ${target.name} (${target.id})`);
 notify(target.id, `The owner ${amount > 0 ? 'gave you' : 'took'} ${Math.abs(amount).toLocaleString()} coins.`);
 res.json({ ok: true, user: ownerUser(target) });
});
app.post('/api/owner/vip', auth, ownerOnly, (req, res) => {
 const { userId, vip, svip } = req.body || {};
 const target = db.users.find(u => u.id === userId);
 if (!target) return res.status(400).json({ error: 'User not found' });
 if (vip !== undefined) { target.vip = vip; target.vipUntil = vip > 0 ? new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString() : null; }
 if (svip !== undefined) target.svip = !!svip;
 save(); audit(req.user.id, 'owner-vip', `VIP ${vip} / SVIP ${svip} for ${target.name}`);
 res.json({ ok: true, user: ownerUser(target) });
});
app.post('/api/owner/uid', auth, ownerOnly, (req, res) => {
 const { userId, newId } = req.body || {};
 const target = db.users.find(u => u.id === userId);
 if (!target || !newId) return res.status(400).json({ error: 'User or new ID missing' });
 if (db.users.find(u => u.id === String(newId))) return res.status(400).json({ error: 'That ID is already taken' });
 target.id = String(newId);
 save(); audit(req.user.id, 'owner-uid', `${target.name} ID changed to ${newId}`);
 res.json({ ok: true, user: ownerUser(target) });
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
const ctx = { db, save, audit, notify, displayNameOf, listOrder: require('./server/list-order') };
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
app.use('/api/v2/updates', require('./server/updates2')(ctx)); // 2026-11-22 upgrade: honors profile, rank banners, room themes, mic emoji, owner frame, VIP Center
app.use('/api/owner/content', require('./server/owner-content')(ctx)); // Customization Studio: no-code design + content editing (owner-only)
/* Public customization view: the active design + owner art overrides, so the
   app applies them on load. Design + art paths only — never user data. */
app.get('/api/content', auth, (req, res) => res.json(require('./server/owner-content').publicCustomization(db)));

/* Catch-all LAST — serves the PWA for any non-API route. (Must stay after
  all /api mounts above, otherwise API GET requests would return index.html.) */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
