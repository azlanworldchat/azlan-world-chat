/* VIP SERVER — VIP Club: 12 levels (VIP1–VIP12).
  VIP12 is the NEW ultimate divine level — Divine Celestial Crown, 72 benefits,
  25,000,000 coins, 300,000 points, 30% discount, divine throne entrance.
  EXACT data from the user's Yalla VIP screenshots (rebuilt as original work —
  emblems are drawn with CSS/SVG/canvas in the app, no copied images):
   VIP1 Bronze Winged Medal, brown/bronze theme, 18 benefits, 2,400 points
   VIP2 Silver-Blue Winged Medal, blue-grey theme, 25 benefits
   VIP3 Blue-Gold Star Medal, blue theme, 30 benefits
   VIP4 Gold-Red Crown Medal (red gem), gold-red theme, 32 benefits
   VIP5 Purple Winged Medal (blue gem), purple theme, 34 benefits
   VIP6 Red-Gold Crown Medal (purple gem), red-gold theme, 37 benefits
   VIP7 Green-Teal WOLF head + crown, green theme, 40 benefits
   VIP8 Purple EAGLE head + crown, purple theme, 44 benefits
   VIP9 Golden LION head + crown + flames, gold-red theme, 51 benefits
   VIP10 Flaming DRAGON head, fire-gold theme, 58 benefits
   VIP11 Thunder Dragon, 65 benefits (not in the screenshots — kept from before)
   VIP12 Divine Celestial Crown, 72 benefits — the ultimate divine level
  Every level page: VIP Points 0, "V1 2,400" points bar, 31 days, Earn button,
  Bonus Points 0, VIP Offer 0, Bonus Points Store.
  Benefit tabs: Status / Decorations / Functions / Rewards / Discounts.
  Benefits shown FIRST on every level: Exclusive Entrance Effect, Exclusive
  Mic Animation, Exclusive Chat Box, Front Row on Online User List,
  Exclusive Gifts, Exclusive Stickers on Mic, Anonymous Display.
  Benefits that "work": protections, custom frames/entrance/mic/chat-box,
  lucky bags, discounts, double rewards, bonus points + store, custom ID,
  username colours, mic rings, VIP gifts, mic stickers, anonymous mode.
  Mounted by server.js at /api/v2/vip. */
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

/* The full 58-benefit set, grouped by tab (the VIP10 model). */
const BENEFIT_POOL = {
 Status: [
  'VIP Badge', 'Colored Username', 'Front Row on Online User List',
  'Room Activity Promotion', 'Customer Service Expert',
  'Customer Service Representatives Send Gifts',
  'Level-up Broadcast to the Whole Platform',
  'Honor Achievement Display', 'Celebration Party'
 ],
 Decorations: [
  'Exclusive VIP Profile Frame', 'Dating Theme Set', 'Party Theme Set',
  'Room Mic Style', 'Room Mic Wave', 'Mic Connection',
  'Exclusive Profile Card', 'Exclusive Entrance Effect',
  'Exclusive Mic Animation', 'Exclusive Chat Box',
  'Exclusive Gifting Banner & Broadcast', 'Exclusive Ride'
 ],
 Functions: [
  'Exclusive Gifts', 'Exclusive Stickers on Mic', 'Anonymous Display',
  'Custom Room Theme', 'Customize ID', 'Send Lucky Bags',
  'GIF Profile Photo', 'Send Items', 'Protection from Chat Restriction',
  'Protection from Removal from Room', 'Custom Profile Frame',
  'Customize Exclusive Chat Box', 'Customize the Exclusive Entrance Effect',
  'Customize an Exclusive Profile Card Skin', 'Customize Exclusive Gifts',
  'Chat Privately to Any Stranger', 'Protection from Removal from Mic',
  'View Anonymous Visitors', 'Customize Vehicle',
  'Remove Users from Room', 'Customize Honor Title'
 ],
 Rewards: [
  'Gift Code', 'Personal ID Coupon', 'Double Sign In and Task Rewards',
  'Get Bonus Points', 'Exclusive Birthday Gift', 'Bonus Recharge Golds',
  'Get Crystals', 'Free Custom Room Theme', 'Supreme Gifts',
  'Free Room Lock', 'Use New Items for Free', 'Get Golds',
  'Get Premium - Marquis', 'Gift Marquis to Friends'
 ],
 Discounts: ['Golds Items Discount', 'Bonus Points Items Discount']
};
const VIP11_EXTRA = {
 Status: ['Legend Title — Thunder Dragon'],
 Decorations: ['Thunder Dragon Throne', 'Eternal Crown Frame'],
 Functions: ['Unlimited Lucky Bags', 'Remove Any User from Any Room'],
 Rewards: ['Free Marquis for Life'],
 Discounts: ['Legend Discount — 25% Off Everything']
};
/* VIP12 extras — the divine level gets everything VIP11 has, plus these. */
const VIP12_EXTRA = {
 Status: ['Divine Title — Celestial Sovereign'],
 Decorations: ['Divine Throne Entrance', 'Cosmic Crown Frame'],
 Functions: ['Divine Protection — Cannot Be Removed', 'Ultimate Room Entrance'],
 Rewards: ['Divine Golds — 2,000,000 on Upgrade'],
 Discounts: ['Divine Discount — 30% Off Everything']
};
/* Entry animation type per level: 1–3 badge sweep, 4–6 gold wings,
   7–8 diamond portal + luxury car, 9 phoenix, 10 dragon, 11 cosmic portal,
   12 ULTIMATE DIVINE entrance (celestial gate, particles, aura). */
const ENTRY_TYPES = { 1: 'sweep', 2: 'sweep', 3: 'sweep', 4: 'wings', 5: 'wings', 6: 'wings', 7: 'portal-car', 8: 'portal-car', 9: 'phoenix', 10: 'dragon', 11: 'cosmic', 12: 'divine' };
/* EXACT cumulative benefit counts per level, from the screenshots. */
const LEVEL_COUNTS = { 1: 18, 2: 25, 3: 30, 4: 32, 5: 34, 6: 37, 7: 40, 8: 44, 9: 51, 10: 58, 11: 65, 12: 72 };

/* Emblems exactly as in the screenshots — original CSS/SVG art in the app. */
const EMBLEMS = [
 null,
 { emblem: 'Sword Shield', kind: 'shield', svg: 'assets/vip/vip01/badge.gif', color: '#0d9488', color2: '#ffd24a', theme: 'teal-gold', themeBg: 'linear-gradient(160deg,#e6f7f5,#fff8e1)', effect: 'sword shield glow', gem: 'teal' },
 { emblem: 'Twin White Wolves', kind: 'wolf', svg: 'assets/vip/vip02/badge.gif', color: '#e8e8e8', color2: '#c0392b', theme: 'white-gold', themeBg: 'linear-gradient(160deg,#fff8e1,#fde8e8)', effect: 'twin wolf glow', gem: 'red' },
 { emblem: 'Emerald Sword', kind: 'sword', svg: 'assets/vip/vip03/badge.gif', color: '#16a34a', color2: '#ffd24a', theme: 'green-gold', themeBg: 'linear-gradient(160deg,#e6f7ee,#fff8e1)', effect: 'emerald sword glow', gem: 'green', crown: true },
 { emblem: 'Twin Blue Wolves', kind: 'wolf', svg: 'assets/vip/vip04/badge.gif', color: '#2563eb', color2: '#7dd3fc', theme: 'blue', themeBg: 'linear-gradient(160deg,#e8f0ff,#dbeafe)', effect: 'twin blue wolf glow', gem: 'blue' },
 { emblem: 'Dark Wings', kind: 'wings', svg: 'assets/vip/vip05/badge.gif', color: '#7c3aed', color2: '#111827', theme: 'purple-dark', themeBg: 'linear-gradient(160deg,#f3e8ff,#ede9fe)', effect: 'dark wing glow', gem: 'purple' },
 { emblem: 'Twin White Tigers', kind: 'tiger', svg: 'assets/vip/vip06/badge.gif', color: '#e8e8f0', color2: '#8b5cf6', theme: 'white-purple', themeBg: 'linear-gradient(160deg,#f3e8ff,#e9d5ff)', effect: 'twin tiger roar', gem: 'purple' },
 { emblem: 'Twin Lions', kind: 'lion', svg: 'assets/vip/vip07/badge.gif', color: '#8a5a28', color2: '#ff5a00', theme: 'fire', themeBg: 'linear-gradient(160deg,#ffede8,#ffd9cc)', effect: 'twin lion fire roar', flames: true },
 { emblem: 'Twin Golden Dragons', kind: 'dragon', svg: 'assets/vip/vip08/badge.gif', color: '#d99a00', color2: '#e63946', theme: 'gold-red', themeBg: 'linear-gradient(160deg,#ffede8,#ffd9cc)', effect: 'twin dragon fire glow', flames: true },
 { emblem: 'Golden Lion', kind: 'lion', svg: 'assets/vip/vip09/badge.gif', color: '#d99a00', color2: '#e63946', theme: 'gold-fire', themeBg: 'linear-gradient(160deg,#fff3e0,#ffe0b2)', effect: 'golden lion roar', flames: true, crown: true },
 { emblem: 'Golden Phoenix', kind: 'phoenix', svg: 'assets/vip/vip10/badge.gif', color: '#e85d00', color2: '#ffd24a', theme: 'fire-gold', themeBg: 'linear-gradient(160deg,#ffede8,#ffd9cc)', effect: 'golden phoenix fire wings', flames: true },
 { emblem: 'Fire Lion', kind: 'lion', svg: 'assets/vip/vip11/badge.gif', color: '#e85d00', color2: '#7a5cff', theme: 'fire-gold', themeBg: 'linear-gradient(160deg,#ffede8,#ffe0b2)', effect: 'fire lion roar, lava eruption', flames: true },
 { emblem: 'Hooded King', kind: 'king', svg: 'assets/vip/vip12/badge.gif', color: '#7a5cff', color2: '#ffd24a', theme: 'divine', themeBg: 'linear-gradient(160deg,#f3e8ff,#fff8e1)', effect: 'hooded king, lava eruption', gem: 'divine', crown: true, flames: true }
];
/* VIP points needed to REACH each level (VIP1 = 2,400, from the screenshots). */
const POINTS = { 1: 2400, 2: 6000, 3: 12000, 4: 20000, 5: 30000, 6: 45000, 7: 65000, 8: 90000, 9: 120000, 10: 160000, 11: 220000, 12: 300000 };
const DAYS = 31;
const PRICES = { 1: 500000, 2: 1000000, 3: 1500000, 4: 2000000, 5: 2500000, 6: 3000000, 7: 3500000, 8: 5000000, 9: 7000000, 10: 10000000, 11: 15000000, 12: 25000000 };
const DISCOUNTS = { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18, 10: 20, 11: 25, 12: 30 };

/* Colored Username — exact rules from the detail screenshots. */
const USERNAME_STYLES = {
 1: 'Single Color Username',
 2: 'Single Color and Shiny Username',
 3: 'Single Color and Shiny Username',
 4: 'Single Color and Shiny Username',
 5: 'Colorful and Shiny Username',
 6: 'Colorful and Shiny Username',
 7: 'Colorful and Shiny Username',
 8: 'Colorful and Shiny Username',
 9: 'Colorful and Shiny Username',
 10: 'Colorful and Shiny Username',
 11: 'Colorful and Shiny Username',
 12: 'Divine and Shiny Username'
};
const USERNAME_NOTE = 'VIP 1–3 users need the latest app version to see colorful usernames.';
/* Username display mode per level: single | shiny | colorful */
const USERNAME_MODE = { 1: 'single', 2: 'shiny', 3: 'shiny', 4: 'shiny', 5: 'colorful', 6: 'colorful', 7: 'colorful', 8: 'colorful', 9: 'colorful', 10: 'colorful', 11: 'colorful', 12: 'divine' };

/* Exclusive Mic Animation — speaking ring colour per VIP level. */
const MIC_RINGS = {
 1: { name: 'Bronze Ring', color: '#cd7f32' },
 2: { name: 'Teal Ring', color: '#2fb8a6' },
 3: { name: 'Silver-Gold Ring', color: '#d4af37' },
 4: { name: 'Gold-Green Ring', color: '#d4af37' },
 5: { name: 'Purple Ring', color: '#8b7bff' },
 6: { name: 'Red-Orange Ring', color: '#ff5a2a' },
 7: { name: 'Golden Ring', color: '#ff9d00' },
 8: { name: 'Teal Ring', color: '#2fd6c3' },
 9: { name: 'Gold Ring', color: '#ffd24a' },
 10: { name: 'Fire Ring', color: '#ff5a00' },
 11: { name: 'Thunder Ring', color: '#ffe600' },
 12: { name: 'Divine Halo Ring', color: '#ffd700' }
};

/* Exclusive Gifts (Privilege tab) — exact prices from the screenshots. */
const VIP_GIFTS = [
 { id: 'vg1', name: 'Flowers', price: 799, minVip: 1, icon: 'assets/gifts/flowers.svg', tab: 'privilege', svg: 'assets/gifts/flowers.svg', anim: 'bloom', sound: 'chime' },
 { id: 'vg2', name: 'Car', price: 1999, minVip: 1, icon: 'assets/gifts/white-car.svg', tab: 'privilege', svg: 'assets/gifts/white-car.svg', anim: 'drive', sound: 'engine' },
 { id: 'vg3', name: 'Blue Car', price: 3499, minVip: 1, icon: 'assets/gifts/blue-car.svg', tab: 'privilege', svg: 'assets/gifts/blue-car.svg', anim: 'drive', sound: 'engine' },
 { id: 'vg4', name: 'Castle', price: 2499, minVip: 1, icon: 'assets/gifts/castle.svg', tab: 'privilege', svg: 'assets/gifts/castle.svg', anim: 'zoom', sound: 'fanfare' },
 { id: 'vg5', name: 'Sports Car', price: 2999, minVip: 2, icon: 'assets/gifts/sports-car.svg', tab: 'privilege', svg: 'assets/gifts/sports-car.svg', anim: 'drive', sound: 'engine' },
 { id: 'vg6', name: 'Palace', price: 3999, minVip: 3, icon: 'assets/gifts/palace.svg', tab: 'privilege', svg: 'assets/gifts/palace.svg', anim: 'zoom', sound: 'fanfare' },
 { id: 'vg7', name: 'Blue Dragon', price: 4999, minVip: 4, icon: 'assets/gifts/blue-dragon.svg', tab: 'privilege', svg: 'assets/gifts/blue-dragon.svg', anim: 'fly', sound: 'roar' },
 { id: 'vg8', name: 'White Beast', price: 5999, minVip: 5, icon: 'assets/gifts/white-beast.svg', tab: 'privilege', svg: 'assets/gifts/white-beast.svg', anim: 'sparkle', sound: 'magic' },
 { id: 'vg9', name: 'Divine Throne', price: 9999, minVip: 12, icon: 'assets/vip/vip12/badge.gif', tab: 'privilege', svg: 'assets/vip/vip12/badge.gif', anim: 'sparkle', sound: 'fanfare' }
];

/* Exclusive Stickers on Mic — fun stickers shown on the mic seat while speaking. */
const MIC_STICKERS = [
 { id: 'st1', name: 'Yanto', icon: 'assets/gifts/pineapple.svg', desc: 'Pineapple character with sunglasses' },
 { id: 'st2', name: 'Cool Cat', icon: 'assets/gifts/cool-cat.svg', desc: 'Cat with cool sunglasses' },
 { id: 'st3', name: 'Fire Dragon', icon: 'assets/vip/vip10/badge.gif', desc: 'Little dragon breathing fire' },
 { id: 'st4', name: 'Golden Crown', icon: 'assets/icons/crown.svg', desc: 'Shiny golden crown' }
];

/* Benefit detail pages — title + description for each named benefit. */
const BENEFIT_DETAILS = {
 'Colored Username': { title: 'Colored Username', desc: 'Your name shows in a special colour. VIP 5–10: Colorful and Shiny Username. VIP 4, 3 and 2: Single Color and Shiny Username. VIP 1: Single Color Username.', note: USERNAME_NOTE },
 'Exclusive VIP Profile Frame': { title: 'Exclusive VIP Profile Frame', desc: 'Get more attention with your VIP exclusive profile frame — a dragon frame around your profile photo with a V10 badge below it.' },
 'Exclusive Profile Card': { title: 'Exclusive Profile Card', desc: 'Show your honor with a distinguished profile card — a wide honor card with the dragon frame on top and a VIP10 badge pill.' },
 'Exclusive Entrance Effect': { title: 'Exclusive Entrance Effect', desc: 'Attract everyone\'s attention with a cool entrance effect — when a VIP enters a room, a golden dragon banner shows "[Name] entered" across the room.' },
 'Exclusive Mic Animation': { title: 'Exclusive Mic Animation', desc: 'Show your status with special microphone animation when you speak — each VIP level has its own coloured speaking ring around the mic avatar: VIP 10 fire ring, VIP 9 gold ring, VIP 8 teal ring, VIP 7 light-blue ring, VIP 6 red-orange ring, VIP 5 purple-blue ring, VIP 4 gold-green ring, VIP 3 silver-blue ring, VIP 2 teal ring, VIP 1 bronze ring.' },
 'Exclusive Chat Box': { title: 'Exclusive Chat Box', desc: 'Make your messages stand out in a chat room — a dragon-flame chat bubble style for VIP messages.' },
 'Front Row on Online User List': { title: 'Front Row on Online User List', desc: 'Enjoy a front row on the online list of any rooms — VIP users appear at the very top of the room\'s Online Users list, first with their frame and level.' },
 'Exclusive Gifts': { title: 'Exclusive Gifts', desc: 'Send exclusive VIP gifts to show your honor — V5 white beast 5,999 coins, V4 blue dragon 4,999, V3 palace 3,999, V2 car 2,999, V1 flowers 799, car 1,999, blue car 3,499, castle 2,499.' },
 'Exclusive Stickers on Mic': { title: 'Exclusive Stickers on Mic', desc: 'Use exclusive stickers when you\'re speaking on Mic — fun stickers shown on the mic seat, like Yanto, the pineapple character with sunglasses.' },
 'Anonymous Display': { title: 'Anonymous Display', desc: 'When enabled, you appear as "Anonymous" in Visitors lists and in Top Gifters rankings (Hourly / Daily / Weekly / Monthly — Top Rooms, Top Gifters, Top Stars), and no platform honor post is sent for you.' }
};
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/* Benefits shown FIRST on every level (the screenshot benefit grid). */
const FEATURED = [
 'Exclusive Entrance Effect', 'Exclusive Mic Animation', 'Exclusive Chat Box',
 'Front Row on Online User List', 'Exclusive Gifts', 'Exclusive Stickers on Mic',
 'Anonymous Display'
];
/* Ordered master list: featured first, then the rest in tab order. */
const ORDERED_POOL = (() => {
 const seen = new Set(FEATURED);
 const rest = [];
 for (const tab of ['Status', 'Decorations', 'Functions', 'Rewards', 'Discounts']) {
  for (const b of BENEFIT_POOL[tab]) if (!seen.has(b)) { seen.add(b); rest.push(b); }
 }
 return [...FEATURED, ...rest];
})();
const TAB_OF = {};
for (const tab of Object.keys(BENEFIT_POOL)) for (const b of BENEFIT_POOL[tab]) TAB_OF[b] = tab;
for (const tab of Object.keys(VIP11_EXTRA)) for (const b of VIP11_EXTRA[tab]) TAB_OF[b] = tab;

/* Take the first N benefits (featured first) and regroup them into tabs. */
function benefitsForLevel(vip) {
 const want = LEVEL_COUNTS[vip] || 0;
 const out = { Status: [], Decorations: [], Functions: [], Rewards: [], Discounts: [] };
 let taken = 0;
 for (const b of ORDERED_POOL) {
  if (taken >= want) break;
  out[TAB_OF[b]].push(b); taken++;
 }
 if (vip >= 11) {
  for (const tab of Object.keys(VIP11_EXTRA)) out[tab].push(...VIP11_EXTRA[tab]);
 }
 if (vip === 12) {
  for (const tab of Object.keys(VIP12_EXTRA)) out[tab].push(...VIP12_EXTRA[tab]);
 }
 return out;
}
function totalBenefits(vip) {
 const b = benefitsForLevel(vip);
 return Object.values(b).reduce((n, arr) => n + arr.length, 0);
}
function featuredForLevel(vip) {
 return FEATURED.slice(0, Math.min(FEATURED.length, LEVEL_COUNTS[vip] || 0));
}
const VIP_LEVELS = Array.from({ length: 12 }, (_, i) => {
 const v = i + 1;
 const e = EMBLEMS[v];
 return {
  vip: v, emblem: e.emblem, kind: e.kind, svg: e.svg,
  color: e.color, color2: e.color2, theme: e.theme, themeBg: e.themeBg,
  effect: e.effect, gem: e.gem || null, crown: !!e.crown, flames: !!e.flames,
  entry: ENTRY_TYPES[v],
  frameSvg: 'assets/vip/vip' + String(v).padStart(2, '0') + '/frame.png',
  price: PRICES[v], points: POINTS[v], pointsNeeded: POINTS[v], days: DAYS,
  discountPct: DISCOUNTS[v],
  usernameStyle: USERNAME_STYLES[v], usernameMode: USERNAME_MODE[v],
  micRing: MIC_RINGS[v],
  benefits: benefitsForLevel(v), totalBenefits: totalBenefits(v),
  featured: featuredForLevel(v)
 };
});

/* Bonus Points Store — buy with bonus points earned from tasks/sign-in. */
const BONUS_STORE = [
 { id: 'bp1', name: 'Room Lock (7 days)', points: 500, icon: 'assets/icons/lock.svg' },
 { id: 'bp2', name: 'Personal ID Coupon', points: 800, icon: 'assets/icons/ticket.svg' },
 { id: 'bp3', name: 'Golden Frame (7 days)', points: 1200, icon: 'assets/icons/frame.svg' },
 { id: 'bp4', name: '1,000,000 Coins', points: 1500, icon: 'assets/icons/coin.svg' },
 { id: 'bp5', name: 'Supreme Gift Box', points: 2500, icon: 'assets/icons/gift.svg' },
 { id: 'bp6', name: 'Marquis (7 days)', points: 5000, icon: 'assets/icons/crown.svg' }
];

/* ---------- NEW: rank banners, kits, honor titles, upgrade guide (2026-11-22) ---------- */
/* Rank banners — the banner shown depends on the user's RANK and shows with
   their ID. Original SVG art in assets/vip/banner*.svg (self-drawn). */
const BANNERS = [
 { vip: 1, name: 'VIP 1 Banner', animal: 'Sword Shield', svg: 'assets/vip/vip01/nameplate.jpg', colors: 'teal-gold', desc: 'Teal-gold banner with a sword shield on top.' },
 { vip: 2, name: 'VIP 2 Banner', animal: 'Twin White Wolves', svg: 'assets/vip/vip02/nameplate.jpg', colors: 'white-gold', desc: 'White-gold banner with twin white wolves and a golden sword.' },
 { vip: 3, name: 'VIP 3 Banner', animal: 'Emerald Sword', svg: 'assets/vip/vip03/nameplate.jpg', colors: 'green-gold', desc: 'Green-gold banner with an emerald sword on top.' },
 { vip: 4, name: 'VIP 4 Banner', animal: 'Twin Blue Wolves', svg: 'assets/vip/vip04/nameplate.jpg', colors: 'blue', desc: 'Blue banner with twin blue wolves and a golden sword.' },
 { vip: 5, name: 'VIP 5 Banner', animal: 'Dark Wings', svg: 'assets/vip/vip05/nameplate.jpg', colors: 'purple', desc: 'Purple banner with black wings and a golden sword.' },
 { vip: 6, name: 'VIP 6 Banner', animal: 'Twin White Tigers', svg: 'assets/vip/vip06/nameplate.jpg', colors: 'purple-gold', desc: 'Purple-gold banner with twin white tigers and a golden sword.' },
 { vip: 7, name: 'VIP 7 Banner', animal: 'Twin Lions', svg: 'assets/vip/vip07/nameplate.jpg', colors: 'orange fire', desc: 'Orange fire banner with twin roaring lions breathing fire.' },
 { vip: 8, name: 'VIP 8 Banner', animal: 'Twin Golden Dragons', svg: 'assets/vip/vip08/nameplate.jpg', colors: 'fire-gold', desc: 'Fire-gold banner with twin golden dragons and a golden sword.' },
 { vip: 9, name: 'VIP 9 Banner', animal: 'Golden Lion', svg: 'assets/vip/vip09/nameplate.jpg', colors: 'gold-red', desc: 'Gold-red banner with a golden roaring lion on top.' },
 { vip: 10, name: 'VIP 10 Banner', animal: 'Golden Phoenix', svg: 'assets/vip/vip10/nameplate.jpg', colors: 'fire-gold', desc: 'Fire-gold banner with a golden phoenix on top.' },
 { vip: 11, name: 'VIP 11 Banner', animal: 'Fire Lion', svg: 'assets/vip/vip11/nameplate.jpg', colors: 'fire-gold', desc: 'Fire-gold banner with a red fire lion and two golden lions.' },
 { vip: 12, name: 'VIP 12 Banner', animal: 'Hooded King', svg: 'assets/vip/vip12/nameplate.jpg', colors: 'gold-purple celestial', desc: 'Celestial banner with a hooded king and golden fire wings.' }
];
/* SVIP badges — shown WITH the user's name. SVIP9 is 3D animated. */
const SVIP_BADGES = {
 9: { name: 'SVIP9', animal: 'Flaming Phoenix', svg: 'assets/vip/vip09/badge.gif', animated3d: true, desc: 'Flaming phoenix with peacock feathers — 3D animated, shows with the name.' },
 10: { name: 'SVIP10', animal: 'Golden Dragon', svg: 'assets/vip/vip10/badge.gif', animated3d: true, desc: 'Golden dragon head with lightning — shows with the name.' }
};
/* Flaming winged rank badges — run ONLY on the PROFILE page where the VIP
   rank is written, in 3D animation, for VIP 1–7. Bigger rank = bigger animation. */
const RANK_BADGES = { 1: 'Champion', 2: 'Runner-up', 3: 'Top 4', 4: 'Top 8', 5: 'Top 17', 6: 'Top 24', 7: 'Top 32' };
function rankBadgeSize(vip) { return 60 + (vip || 1) * 14; } /* px — grows with rank */
/* VIP kit per level — every level has its own full kit in its own colours/animal:
   profile badge/frame, chat bar, entry banner, name banner, profile cover,
   and the plain round golden mic ring that BLINKS/pulses in 3D while speaking. */
function vipKit(vip) {
 const e = EMBLEMS[vip] || EMBLEMS[1];
 const b = BANNERS[vip - 1] || BANNERS[0];
 const frameSvg = 'assets/vip/vip' + String(vip || 1).padStart(2, '0') + '/frame.png';
 return {
  vip, emblem: e.emblem, animal: b.animal, color: e.color, color2: e.color2, themeBg: e.themeBg,
  entry: ENTRY_TYPES[vip] || 'sweep',
  profileFrame: { name: e.emblem + ' Profile Frame', svg: frameSvg },
  chatBar: { name: e.emblem + ' Chat Bar', color: e.color, color2: e.color2 },
  entryBanner: { name: b.name, svg: b.svg, animal: b.animal },
  nameBanner: { name: e.emblem + ' Name Banner', svg: b.svg },
  profileCover: { name: e.emblem + ' Profile Cover', themeBg: e.themeBg, color: e.color },
  micRing: { name: (MIC_RINGS[vip] || MIC_RINGS[1]).name, color: (MIC_RINGS[vip] || MIC_RINGS[1]).color, animated3d: true, blink: true }
 };
}
/* Honor titles — earned by spending/gifting level (wealth). */
function honorTitleFor(wealth) {
 const w = wealth || 0;
 if (w >= 5000000) return { title: 'Billionaire', color: '#ffd24a', bg: 'linear-gradient(90deg,#7a5a00,#ffd24a,#7a5a00)' };
 if (w >= 1000000) return { title: 'King of Gold', color: '#ff2d55', bg: 'linear-gradient(90deg,#8a0000,#ff2d55,#8a0000)' };
 if (w >= 200000) return { title: 'Prestige VIP', color: '#a06bff', bg: 'linear-gradient(90deg,#5b2ea6,#a06bff,#5b2ea6)' };
 if (w >= 50000) return { title: 'Elite Patron', color: '#2fd6a3', bg: 'linear-gradient(90deg,#0f7a5c,#2fd6a3,#0f7a5c)' };
 return null;
}
/* Upgrade Guide — early upgrade needs fewer VIP points. */
const UPGRADE_GUIDE = {
 text: 'Upgrading early requires fewer VIP points. The VIP points required for different stages within your current VIP validity period are as follows:',
 stages: [
  { days: 'Day 1 - Day 30', points: 2400, remaining: '31 days remaining', discount: '20% OFF' },
  { days: 'Day 31 - Day 60', points: 2700, remaining: 'Not started', discount: '10% OFF' },
  { days: 'Day 61 - Day 90', points: 3000, remaining: 'Not started', discount: '0% OFF' }
 ]
};
/* VIP2 benefits example (VIP Center) — each level gets its own version in its
   own colours/animal: Membership, Customized Headwear, Entrance Effects,
   Mic Wave, Exclusive Bubble, Room Card. */
const VIP_CENTER_BENEFITS = [
 { id: 'membership', name: 'Membership', desc: 'Your VIP membership pill, shown with your name everywhere.' },
 { id: 'headwear', name: 'Customized Headwear', desc: 'A winged headwear ring in your VIP colours, worn on your avatar.' },
 { id: 'entrance', name: 'Entrance Effects', desc: '"User name is coming" — a winged banner when you enter a room.' },
 { id: 'micwave', name: 'Mic Wave', desc: 'A coloured circle wave around your avatar while you speak on mic.' },
 { id: 'bubble', name: 'Exclusive Bubble', desc: 'Your own VIP chat bubble with wings, in your VIP colours.' },
 { id: 'roomcard', name: 'Room Card', desc: 'A VIP profile card in your colours, shown when anyone opens you in a room.' }
];
/* Level tiers — colours start low and grow into more luxury as level rises. */
const LEVEL_TIERS = [
 { min: 1, max: 9, name: 'Bronze', color: '#cd7f32', bg: 'linear-gradient(90deg,#3a2410,#cd7f32)' },
 { min: 10, max: 19, name: 'Silver', color: '#aebfd6', bg: 'linear-gradient(90deg,#232c3d,#aebfd6)' },
 { min: 20, max: 29, name: 'Gold', color: '#ffd24a', bg: 'linear-gradient(90deg,#7a5a00,#ffd24a)' },
 { min: 30, max: 39, name: 'Purple', color: '#a06bff', bg: 'linear-gradient(90deg,#2b1155,#a06bff)' },
 { min: 40, max: 49, name: 'Red-Gold', color: '#ff6b4a', bg: 'linear-gradient(90deg,#571505,#ff6b4a)' },
 { min: 50, max: 9999, name: 'Legend', color: '#ff2d55', bg: 'linear-gradient(90deg,#ff2d55,#ffd24a,#7a5cff)' }
];
function levelTier(level) { return LEVEL_TIERS.find(t => level >= t.min && level <= t.max) || LEVEL_TIERS[0]; }

module.exports = function (ctx) {
 const { db, save, notify, displayNameOf } = ctx;
 const router = express.Router();
 router.use(auth);
 const me = (req) => db.users.find(x => x.id === req.user.id);

 // VIP Club: all 12 levels + my status + points + offers + detail data
 router.get('/club', (req, res) => {
  const u = me(req);
  /* OWNER VIP FLOOR: the owner is always at least VIP 11 — the Club must
     never tell the owner he has "no VIP yet". */
  const myVip = u.role === 'owner' ? Math.max(u.vip || 0, 11) : (u.vip || 0);
  const next = myVip < 12 ? VIP_LEVELS[myVip] : null; // next level (index myVip)
  const { applyVipOverrides } = require('./owner-content');
  const { listOrder } = ctx;
  /* OWNER MANAGE LISTS: VIP levels show in the owner's order; hidden levels
     are not shown. Reordering never changes a level's own price, points or
     benefits — only its position in the list. */
  res.json({
   levels: listOrder.visibleItems(db, 'vip', VIP_LEVELS, l => l.vip).map(l => applyVipOverrides(db, l)),
   myVip, myVipUntil: u.vipUntil || null, mySvip: !!u.svip,
   myPoints: u.vipPoints || 0, myBonusPoints: u.bonusPoints || 0,
   pointsToNext: next ? Math.max(0, next.points - (u.vipPoints || 0)) : 0,
   nextLevel: next,
   myAnonymous: !!u.anonymous, myMicAnimation: u.micAnimation || null,
   mySticker: u.micSticker || null, myVipCustom: u.vipCustom || {},
   usernameNote: USERNAME_NOTE,
   benefitDetails: BENEFIT_DETAILS,
   benefitsDisabled: (db.settings.controls && db.settings.controls.benefitsDisabled) || [],
   micRings: MIC_RINGS, vipGifts: VIP_GIFTS, micStickers: MIC_STICKERS,
   offers: {
    nextLevel: next ? `Upgrade to VIP${next.vip} (${next.emblem}) — ${next.price.toLocaleString()} coins, save 10% this week` : 'You are VIP12 — the highest, divine level!',
    crossLevel: myVip > 0 ? `Gift VIP${myVip} to a friend for 20% off` : 'First VIP purchase gets +500 bonus points'
   },
   bonusStore: BONUS_STORE
  });
 });

 // Benefit detail page: /api/v2/vip/benefit/exclusive-entrance-effect
 router.get('/benefit/:key', (req, res) => {
  const key = req.params.key;
  const name = Object.keys(BENEFIT_DETAILS).find(n => slug(n) === key);
  if (!name) return res.status(404).json({ error: 'Benefit not found' });
  const d = BENEFIT_DETAILS[name];
  res.json({ name, title: d.title, desc: d.desc, note: d.note || null });
 });

 // VIP gift shop (Privilege tab gifts + tabs for the shop panel)
 router.get('/vip-gifts', (req, res) => {
  const u = me(req);
  res.json({
   tabs: ['Hot', 'Privilege', 'Country', 'Member', 'Backpack'],
   gifts: VIP_GIFTS.map(g => ({ ...g, locked: (u.vip || 0) < g.minVip })),
   myVip: u.vip || 0
  });
 });

 // Send a VIP gift — to one user, or to "everyone" on mic in a room
 router.post('/vip-gifts/send', (req, res) => {
  const u = me(req);
  const { giftId, toUserId, roomId, qty } = req.body || {};
  const gift = VIP_GIFTS.find(g => g.id === giftId);
  if (!gift) return res.status(400).json({ error: 'VIP gift not found' });
  const { isOn, giftEnabled } = require('./controls');
  if (!isOn(db, 'gifts')) return res.status(403).json({ error: 'Gifts are turned off by the owner' });
  if (!giftEnabled(db, giftId)) return res.status(403).json({ error: 'This gift is turned off by the owner' });
  if ((u.vip || 0) < gift.minVip && u.role !== 'owner') return res.status(403).json({ error: `This gift needs VIP${gift.minVip} or higher` });
  const n = [1, 7, 17, 77, 777].includes(Number(qty)) ? Number(qty) : 1;
  const discountPct = DISCOUNTS[u.vip || 0] || 0;
  // Owner is FREE — all gifts at 0 coins (standing owner rule).
  const cost = u.role === 'owner' ? 0 : Math.floor(gift.price * n * (1 - discountPct / 100));
  if (u.coins < cost) return res.status(400).json({ error: 'Not enough coins' });
  let recipients = [];
  if (toUserId === 'everyone') {
   const room = db.rooms.find(r => r.id === roomId);
   if (!room) return res.status(400).json({ error: 'Join a room first to gift everyone on mic' });
   recipients = (room.seats || []).map(s => s.userId).filter(id => id !== u.id);
   if (!recipients.length) return res.status(400).json({ error: 'Nobody is on mic in this room' });
  } else {
   const to = db.users.find(x => x.id === toUserId);
   if (!to) return res.status(400).json({ error: 'User not found' });
   recipients = [to.id];
  }
  u.coins -= cost; u.wealth += cost;
  recipients.forEach(id => {
   const to = db.users.find(x => x.id === id);
   if (to) { to.charm += gift.price * n; to.wealth += cost; to.giftsReceived = (to.giftsReceived || 0) + n; to.giftsReceivedCoins = (to.giftsReceivedCoins || 0) + cost; to.giftsReceivedBy = to.giftsReceivedBy || {}; to.giftsReceivedBy[gift.id] = (to.giftsReceivedBy[gift.id] || 0) + n; }
  });
  const broadcast = cost >= 100000;
  u.giftsSent = (u.giftsSent || 0) + n; u.biggestGift = Math.max(u.biggestGift || 0, cost);
  save();
  // VIP gift event: visible in the room for everyone, and notifies each recipient.
  const toNames = recipients.map(id => { const t = db.users.find(x => x.id === id); return t ? displayNameOf(t) : id; });
  const event = { id: Date.now() + '' + Math.floor(Math.random() * 1000), roomId: roomId || null,
   fromId: u.id, fromName: u.anonymous ? 'Anonymous' : displayNameOf(u), fromVip: u.vip || 0,
   toId: toUserId === 'everyone' ? 'everyone' : recipients[0], toName: toUserId === 'everyone' ? 'Everyone on Mic' : (toNames[0] || ''),
   giftId: gift.id, giftName: gift.name, giftSvg: gift.svg, giftAnim: gift.anim, giftSound: gift.sound, qty: n, cost, at: new Date().toISOString() };
  if (roomId) {
   db.roomGiftFeed = db.roomGiftFeed || {};
   db.roomGiftFeed[roomId] = db.roomGiftFeed[roomId] || [];
   db.roomGiftFeed[roomId].unshift(event);
   if (db.roomGiftFeed[roomId].length > 20) db.roomGiftFeed[roomId] = db.roomGiftFeed[roomId].slice(0, 20);
  }
  const giftExtra = { kind: 'gift', giftEventId: event.id, gift: { id: gift.id, name: gift.name, svg: gift.svg, anim: gift.anim, sound: gift.sound }, from: event.fromName, fromId: u.id, to: event.toName, qty: n, cost };
  const text = broadcast
   ? `${u.anonymous ? 'Anonymous' : displayNameOf(u)} sent ${gift.name} x${n} to ${toUserId === 'everyone' ? 'everyone on mic' : toNames.join(', ')} — ${cost.toLocaleString()} coins!`
   : `${u.anonymous ? 'Anonymous' : displayNameOf(u)} sent you ${gift.name} x${n} (VIP gift) — you received a gift!`;
  // Exclusive Gifting Banner & Broadcast: fire-dragon banner across rooms
  if (broadcast) { db.broadcasts = db.broadcasts || []; db.broadcasts.unshift({ id: Date.now(), text, kind: 'gift', at: new Date().toISOString() }); db.users.forEach(x => notify(x.id, text, giftExtra)); }
  else recipients.forEach(id => notify(id, text, giftExtra));
  save();
  res.json({ ok: true, broadcast, broadcastText: text, animation: gift.price >= 5000 ? 'huge' : 'big', coins: u.coins, recipients: recipients.length, fromName: event.fromName, toName: event.toName, event, gift: { id: gift.id, name: gift.name, svg: gift.svg, anim: gift.anim, sound: gift.sound, icon: gift.icon, price: gift.price } });
 });

 // Anonymous Display — toggle (VIP benefit)
 router.post('/anonymous', (req, res) => {
  const u = me(req);
  // VIP10 benefit ONLY: hide your ID, name and identity — become mysterious/anonymous.
  if ((u.vip || 0) < 10) return res.status(403).json({ error: 'Anonymous Display is a VIP10 benefit — upgrade to VIP10 to hide your identity.' });
  u.anonymous = (req.body || {}).hasOwnProperty('on') ? !!req.body.on : !u.anonymous;
  save();
  res.json({ ok: true, anonymous: !!u.anonymous });
 });

 // Exclusive Mic Animation — choose / use my level's ring ("Use it Now")
 router.post('/mic-animation', (req, res) => {
  const u = me(req);
  if (!u.vip) return res.status(403).json({ error: 'Mic Animation needs VIP' });
  u.micAnimation = MIC_RINGS[u.vip];
  save();
  res.json({ ok: true, micAnimation: u.micAnimation });
 });

 // Exclusive Stickers on Mic — pick my speaking sticker
 router.post('/sticker', (req, res) => {
  const u = me(req);
  if (!u.vip) return res.status(403).json({ error: 'Mic Stickers need VIP' });
  const s = MIC_STICKERS.find(x => x.id === (req.body || {}).stickerId);
  if (!s) return res.status(400).json({ error: 'Sticker not found' });
  u.micSticker = s;
  save();
  res.json({ ok: true, sticker: s });
 });

 // My VIP settings (anonymous / mic animation / sticker / custom look)
 router.get('/settings', (req, res) => {
  const u = me(req);
  res.json({
   vip: u.vip || 0, anonymous: !!u.anonymous,
   micAnimation: u.micAnimation || (u.vip ? MIC_RINGS[u.vip] : null),
   sticker: u.micSticker || null, vipCustom: u.vipCustom || {},
   usernameStyle: u.vip ? USERNAME_STYLES[u.vip] : null
  });
 });

 // Buy / upgrade VIP (1–12, 31 days)
 router.post('/buy', (req, res) => {
  const u = me(req);
  const { vip } = req.body || {};
  const level = VIP_LEVELS.find(l => l.vip === vip);
  if (!level) return res.status(400).json({ error: 'VIP must be 1–12' });
  if (ctx.listOrder.isHidden(db, 'vip', vip)) return res.status(400).json({ error: `VIP${vip} was removed by the owner` });
  const { isOn, vipLevelEnabled } = require('./controls');
  if (!isOn(db, 'vip')) return res.status(403).json({ error: 'VIP is turned off by the owner' });
  if (!vipLevelEnabled(db, vip)) return res.status(403).json({ error: `VIP${vip} is turned off by the owner` });
  const price = u.role === 'owner' ? 0 : ((db.settings.vipPriceOverride && db.settings.vipPriceOverride[vip]) || level.price);
  if (u.coins < price) return res.status(400).json({ error: 'Not enough coins' });
  const wasVip = u.vip || 0;
  u.coins -= price; u.vip = vip;
  u.vipPoints = (u.vipPoints || 0) + level.points;
  u.vipUntil = new Date(Date.now() + DAYS * 24 * 3600 * 1000).toISOString();
  // Level-up Broadcast to the Whole Platform (fire-dragon banner to ALL users)
  const bText = `Congratulations to ${displayNameOf(u)} for leveling up to VIP${vip} (${level.emblem})!`;
  db.broadcasts = db.broadcasts || [];
  db.broadcasts.unshift({ id: Date.now(), text: bText, kind: 'levelup', at: new Date().toISOString() });
  db.users.forEach(x => notify(x.id, bText));
  // Get Golds (one-time): VIP9 500,000 / VIP10 1,000,000 on upgrade
  u.goldsClaimed = u.goldsClaimed || {};
  const golds = { 9: 500000, 10: 1000000, 12: 2000000 }[vip];
  let goldsBonus = 0;
  if (golds && !u.goldsClaimed[vip]) { u.goldsClaimed[vip] = true; u.coins += golds; goldsBonus = golds; }
  // Renewing VIP10 gives 200,000 golds
  if (vip === 10 && wasVip === 10) { u.coins += 200000; goldsBonus += 200000; }
  // Bonus Points: VIP10 upgrade gives +700,000 bonus points
  if (vip === 10 && wasVip !== 10) { u.bonusPoints = (u.bonusPoints || 0) + 700000; u.bonusHistory = u.bonusHistory || []; u.bonusHistory.unshift({ type: 'earn', text: 'Given for the VIP privilege', amount: 700000, at: new Date().toISOString() }); }
  // VIP12 upgrade gives +1,000,000 bonus points
  if (vip === 12 && wasVip !== 12) { u.bonusPoints = (u.bonusPoints || 0) + 1000000; u.bonusHistory = u.bonusHistory || []; u.bonusHistory.unshift({ type: 'earn', text: 'Given for the VIP12 divine privilege', amount: 1000000, at: new Date().toISOString() }); }
  // Renewing VIP extends custom items by another 90 days
  if (u.vipCustom && Object.keys(u.vipCustom).length) {
   const base = u.vipCustomUntil && new Date(u.vipCustomUntil) > new Date() ? new Date(u.vipCustomUntil) : new Date();
   u.vipCustomUntil = new Date(base.getTime() + 90 * 24 * 3600 * 1000).toISOString();
  }
  save();
  res.json({ ok: true, vip: u.vip, vipUntil: u.vipUntil, level, goldsBonus });
 });

 // Is my VIP still active? (31-day expiry, checked everywhere badges show)
 router.get('/status', (req, res) => {
  const u = me(req);
  const active = !!u.vip && !!u.vipUntil && new Date(u.vipUntil) > new Date();
  if (!active && u.vip) { u.vip = 0; u.vipUntil = null; save(); }
  res.json({ vip: active ? u.vip : 0, active, vipUntil: u.vipUntil, level: active ? VIP_LEVELS[u.vip - 1] : null, discountPct: DISCOUNTS[active ? u.vip : 0] });
 });

 // Earn VIP points (Earn button — daily task reward, once per day)
 router.post('/earn', (req, res) => {
  const u = me(req);
  const today = new Date().toISOString().slice(0, 10);
  if (u.lastVipEarn === today) return res.status(400).json({ error: 'Come back tomorrow to earn more points' });
  u.lastVipEarn = today;
  u.vipPoints = (u.vipPoints || 0) + 50;
  u.bonusPoints = (u.bonusPoints || 0) + 100;
  save();
  res.json({ ok: true, vipPoints: u.vipPoints, bonusPoints: u.bonusPoints });
 });

 // Bonus Points Store — buy with bonus points
 router.get('/bonus-store', (req, res) => res.json({ items: BONUS_STORE, myBonusPoints: (me(req).bonusPoints || 0) }));
 router.post('/bonus-store/buy', (req, res) => {
  const u = me(req);
  const item = BONUS_STORE.find(i => i.id === (req.body || {}).itemId);
  if (!item) return res.status(400).json({ error: 'Item not found' });
  if ((u.bonusPoints || 0) < item.points) return res.status(400).json({ error: 'Not enough bonus points' });
  u.bonusPoints -= item.points;
  if (item.id === 'bp4') u.coins += 1000000;
  else u.inventory.push(item.id);
  save();
  res.json({ ok: true, bonusPoints: u.bonusPoints, item });
 });

 // VIP Lucky Bags — only VIP users can send (gold to N recipients)
 router.post('/lucky-bag', (req, res) => {
  const u = me(req);
  if (!u.vip) return res.status(403).json({ error: 'Only VIP users can send lucky bags' });
  const { gold, recipients } = req.body || {};
  const g = Number(gold) || 0; const n = Math.min(30, Math.max(5, Number(recipients) || 5));
  if (g < 20 || g > 500) return res.status(400).json({ error: 'Lucky bag gold must be 20–500' });
  if (u.coins < g) return res.status(400).json({ error: 'Not enough coins' });
  u.coins -= g; save();
  const others = db.users.filter(x => x.id !== u.id).slice(0, n);
  others.forEach(o => { const share = Math.floor(g / others.length); o.coins += share; notify(o.id, `${displayNameOf(u)} sent you a lucky bag — ${share} coins!`); });
  save();
  res.json({ ok: true, sentTo: others.length, totalGold: g });
 });

 // Customize my VIP look (frame / entrance / mic animation / chat box / card skin)
 router.post('/customize', (req, res) => {
  const u = me(req);
  if (!u.vip) return res.status(403).json({ error: 'VIP required to customize' });
  const { frame, entrance, micAnim, chatBox, cardSkin, honorTitle, ride } = req.body || {};
  u.vipCustom = { ...(u.vipCustom || {}), frame, entrance, micAnim, chatBox, cardSkin, honorTitle, ride };
  // remove undefined keys
  Object.keys(u.vipCustom).forEach(k => u.vipCustom[k] === undefined && delete u.vipCustom[k]);
  // Every customized item is valid 90 days
  const base = u.vipCustomUntil && new Date(u.vipCustomUntil) > new Date() ? new Date(u.vipCustomUntil) : new Date();
  u.vipCustomUntil = new Date(base.getTime() + 90 * 24 * 3600 * 1000).toISOString();
  save();
  res.json({ ok: true, vipCustom: u.vipCustom, validUntil: u.vipCustomUntil });
 });

 // Customize my ID (VIP4+, 2–8 digits, costs 100,000 coins)
 router.post('/custom-id', (req, res) => {
  const u = me(req);
  if ((u.vip || 0) < 4 && u.role !== 'owner') return res.status(403).json({ error: 'Customize ID needs VIP4 or higher' });
  const { newId } = req.body || {};
  if (!newId || !/^\d{2,8}$/.test(String(newId))) return res.status(400).json({ error: 'ID must be 2–8 digits' });
  if (db.users.find(x => x.id === String(newId))) return res.status(400).json({ error: 'That ID is already taken' });
  if (u.coins < 100000 && u.role !== 'owner') return res.status(400).json({ error: 'Custom ID costs 100,000 coins' });
  if (u.role !== 'owner') u.coins -= 100000; u.id = String(newId); save();
  res.json({ ok: true, newId: u.id });
 });

 // VIP daily claims: gift code / birthday gift / crystals / golds (once a day each)
 router.post('/claim/:type', (req, res) => {
  const u = me(req);
  const type = req.params.type;
  if (!u.vip) return res.status(403).json({ error: 'VIP required' });
  const today = new Date().toISOString().slice(0, 10);
  u.claims = u.claims || {};
  const key = type + ':' + today;
  if (u.claims[key]) return res.status(400).json({ error: 'Already claimed today' });
  let reward = '';
  if (type === 'gift-code') { u.coins += 100000; reward = '100,000 coins gift code'; }
  else if (type === 'crystals') { u.diamonds += 5000; reward = '5,000 crystals'; }
  else if (type === 'golds') { u.coins += 500000; reward = '500,000 coins'; }
  else if (type === 'birthday') { u.coins += 1000000; u.diamonds += 10000; reward = 'Birthday gift: 1,000,000 coins + 10,000 crystals'; }
  else return res.status(400).json({ error: 'Unknown claim type' });
  u.claims[key] = true; save();
  res.json({ ok: true, reward, coins: u.coins, diamonds: u.diamonds });
 });

 // VIP removes a user from a room (VIP8+), or the host does it
 router.post('/remove-from-room', (req, res) => {
  const u = me(req);
  if ((u.vip || 0) < 8 && u.role !== 'owner') return res.status(403).json({ error: 'Remove Users from Room needs VIP8 or higher' });
  const { roomId, userId } = req.body || {};
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  room.seats = room.seats.filter(s => s.userId !== userId);
  room.members = room.members.filter(m => m !== userId);
  save();
  res.json({ ok: true });
 });

 return router;
};
module.exports.VIP_LEVELS = VIP_LEVELS;
module.exports.DISCOUNTS = DISCOUNTS;
module.exports.MIC_RINGS = MIC_RINGS;
module.exports.USERNAME_STYLES = USERNAME_STYLES;
module.exports.VIP_GIFTS = VIP_GIFTS;
module.exports.benefitsForLevel = benefitsForLevel;
module.exports.BANNERS = BANNERS;
module.exports.SVIP_BADGES = SVIP_BADGES;
module.exports.RANK_BADGES = RANK_BADGES;
module.exports.rankBadgeSize = rankBadgeSize;
module.exports.vipKit = vipKit;
module.exports.honorTitleFor = honorTitleFor;
module.exports.UPGRADE_GUIDE = UPGRADE_GUIDE;
module.exports.VIP_CENTER_BENEFITS = VIP_CENTER_BENEFITS;
module.exports.LEVEL_TIERS = LEVEL_TIERS;
module.exports.LEVEL_COUNTS = LEVEL_COUNTS;
module.exports.ENTRY_TYPES = ENTRY_TYPES;
module.exports.VIP12_EXTRA = VIP12_EXTRA;
module.exports.levelTier = levelTier;
