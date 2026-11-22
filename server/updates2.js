/* UPDATES 2 SERVER — the 2026-11-22 upgrade batch (profile honors, rank banners,
   upgrade guide, room themes store, 3D emoji on mic, owner frame, room admins,
   VIP Center). Mounted by server.js at /api/v2/updates. Original work. */
const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-AZLAN';
const vipMod = require('./vip');
const { BANNERS, SVIP_BADGES, RANK_BADGES, rankBadgeSize, vipKit, honorTitleFor, UPGRADE_GUIDE, VIP_CENTER_BENEFITS, VIP_LEVELS, levelTier } = vipMod;

function auth(req, res, next) {
 const h = req.headers.authorization || '';
 const t = h.startsWith('Bearer ') ? h.slice(7) : null;
 if (!t) return res.status(401).json({ error: 'Login required' });
 try { req.user = jwt.verify(t, JWT_SECRET); next(); }
 catch (e) { return res.status(401).json({ error: 'Bad session' }); }
}

/* 9 luxury room background themes — store price: 1,000,000 coins;
   VIP users pay 500,000. Owner pays 0. */
const ROOM_THEMES = [
 { id: 'lux-bedroom', name: 'Golden Luxury Bedroom', tab: 'themes', svg: 'assets/themes/lux-bedroom.svg', desc: 'A golden bedroom with a crystal chandelier and gold coins everywhere.' },
 { id: 'lux-wedding-hall', name: 'White Wedding Hall', tab: 'romance', svg: 'assets/themes/lux-wedding-hall.svg', desc: 'A giant crystal chandelier over white flowers — a royal wedding hall.' },
 { id: 'lux-wedding-arch', name: 'Wedding Ceremony', tab: 'romance', svg: 'assets/themes/lux-wedding-arch.svg', desc: 'A white floral arch with chandeliers, drapes and candles.' },
 { id: 'lux-money', name: 'Money Flood', tab: 'themes', svg: 'assets/themes/lux-money.svg', desc: 'Dollar bills pouring out of a mansion door.' },
 { id: 'lux-jet', name: 'Private Jet Sunset', tab: 'modern', svg: 'assets/themes/lux-jet.svg', desc: 'A couple walking to a private jet at sunset.' },
 { id: 'lux-ring-sea', name: 'Diamond Ring over the Sea', tab: 'romance', svg: 'assets/themes/lux-ring-sea.svg', desc: 'A giant diamond ring over the sea, a couple on the diamond pier.' },
 { id: 'lux-ring-pier', name: 'Diamond Ring — Together', tab: 'romance', svg: 'assets/themes/lux-ring-pier.svg', desc: 'A man and a woman walking toward each other on the diamond pier.' },
 { id: 'lux-mansion', name: 'Luxury Mansion', tab: 'scenery', svg: 'assets/themes/lux-mansion.svg', desc: 'A luxury mansion at dusk — helicopter on the roof, cars and gates.' },
 { id: 'lux-palace', name: 'Black & Gold Palace', tab: 'scenery', svg: 'assets/themes/lux-palace.svg', desc: 'A black and gold palace hall with black marble columns and gold chandeliers.' }
];
const THEME_PRICE = 1000000, THEME_VIP_PRICE = 500000;
function themePriceFor(u) { if (!u) return THEME_PRICE; if (u.role === 'owner') return 0; return (u.vip || 0) > 0 ? THEME_VIP_PRICE : THEME_PRICE; }

/* 3D luxury emojis for the mic (original drawn faces, same style as the reference
   images the owner sent — crowns, sunglasses, gold, designer bags — NOT copied frames). */
const MIC_EMOJIS = [
 { id: 'emo-crown', name: 'Golden Crown', svg: 'assets/emoji/emo-crown.svg', desc: 'Smiling face with a golden crown and gold coins.' },
 { id: 'emo-shades', name: 'Cool Shades', svg: 'assets/emoji/emo-shades.svg', desc: 'Black sunglasses, gold coins and a gold chain.' },
 { id: 'emo-cigar', name: 'Boss Cigar', svg: 'assets/emoji/emo-cigar.svg', desc: 'Crown and sunglasses, smoking a cigar, holding a red car key fob.' },
 { id: 'emo-lvbag', name: 'Designer Bag', svg: 'assets/emoji/emo-lvbag.svg', desc: 'Smiling crowned face holding a designer bag.' },
 { id: 'emo-hbag', name: 'Red Bag 55', svg: 'assets/emoji/emo-hbag.svg', desc: 'Sunglasses and crown, red handbag marked H, in front of gold 55.' },
 { id: 'emo-kiss', name: 'Flying Kiss', svg: 'assets/emoji/emo-kiss.svg', desc: 'Blowing a kiss, with music notes.' }
];

/* OWNER-exclusive frame — golden winged frame, "OWNER" written on it (never CEO).
   Only the owner can use it. Shows on his profile photo, on the mic, and to
   anyone who visits his profile. */
const OWNER_FRAME = { id: 'owner-frame', name: 'Owner Frame', svg: 'assets/vip/owner-frame.svg', ownerOnly: true, desc: 'The golden winged OWNER frame — owner only, same animation as the photo.' };

module.exports = function (ctx) {
 const { db, save, notify, displayNameOf } = ctx;
 const router = express.Router();
 router.use(auth);
 const me = (req) => db.users.find(x => x.id === req.user.id);

 /* --- Upgrade Guide popup --- */
 router.get('/upgrade-guide', (req, res) => res.json({ guide: UPGRADE_GUIDE }));

 /* --- Rank banners + SVIP badges + rank badges + kits --- */
 router.get('/rank-banners', (req, res) => {
  const u = me(req);
  res.json({
   banners: BANNERS,
   svipBadges: SVIP_BADGES,
   rankBadges: { svg: 'assets/vip/rank-badge.svg', names: RANK_BADGES, sizeFor: (v) => rankBadgeSize(v), note: 'Runs ONLY on the profile page where the VIP rank is written, VIP 1–7, 3D animated. Bigger rank = bigger animation.' },
   kits: VIP_LEVELS.map(l => vipKit(l.vip)),
   myKit: vipKit(u.vip || 1),
   myBanner: (u.vip || 0) > 0 ? BANNERS[(u.vip || 1) - 1] : null,
   mySvipBadge: u.svip ? (SVIP_BADGES[10] || null) : null
  });
 });

 /* --- Room background themes store --- */
 router.get('/room-themes', (req, res) => {
  const u = me(req);
  const price = themePriceFor(u);
  res.json({
   tabs: ['Themes', 'ModernLives', 'Romance', 'Nature', 'Scenery'],
   themes: ROOM_THEMES.map(t => ({ ...t, price, owned: (u.ownedThemes || []).includes(t.id), applied: u.roomTheme === t.id })),
   myPrice: price, myCoins: u.coins, isVip: (u.vip || 0) > 0, isOwner: u.role === 'owner'
  });
 });
 router.post('/room-themes/buy', (req, res) => {
  const u = me(req);
  const t = ROOM_THEMES.find(x => x.id === (req.body || {}).themeId);
  if (!t) return res.status(400).json({ error: 'Theme not found' });
  u.ownedThemes = u.ownedThemes || [];
  if (u.ownedThemes.includes(t.id)) return res.json({ ok: true, owned: true, coins: u.coins, note: 'Already owned' });
  const price = themePriceFor(u);
  if (u.coins < price) return res.status(400).json({ error: 'Not enough coins — this theme costs ' + price.toLocaleString() + ' coins' });
  u.coins -= price; u.ownedThemes.push(t.id); save();
  res.json({ ok: true, theme: t, paid: price, coins: u.coins });
 });
 router.post('/room-themes/apply', (req, res) => {
  const u = me(req);
  const t = ROOM_THEMES.find(x => x.id === (req.body || {}).themeId);
  if (!t) return res.status(400).json({ error: 'Theme not found' });
  if (!(u.ownedThemes || []).includes(t.id) && u.role !== 'owner') return res.status(400).json({ error: 'Buy this theme first' });
  u.roomTheme = t.id; save();
  res.json({ ok: true, theme: t, note: 'Theme applied — open one of your rooms to see it.' });
 });

 /* --- 3D emoji on mic: one emoji at a time --- */
 router.get('/emoji-panel', (req, res) => {
  const u = me(req);
  res.json({ emojis: MIC_EMOJIS, mine: u.micEmoji || null, note: 'Only ONE emoji shows on the mic at a time — picking a new one replaces the old one.' });
 });
 router.post('/mic-emoji', (req, res) => {
  const u = me(req);
  const { emojiId } = req.body || {};
  if (!emojiId) { u.micEmoji = null; save(); return res.json({ ok: true, micEmoji: null }); }
  const e = MIC_EMOJIS.find(x => x.id === emojiId);
  if (!e) return res.status(400).json({ error: 'Emoji not found' });
  u.micEmoji = e; save(); /* single field = only one emoji on the mic at a time */
  res.json({ ok: true, micEmoji: e });
 });

 /* --- OWNER frame (store) --- */
 router.get('/owner-frame', (req, res) => {
  const u = me(req);
  res.json({ frame: OWNER_FRAME, canUse: u.role === 'owner', mine: u.profileFrame === 'owner-frame' });
 });
 router.post('/owner-frame/equip', (req, res) => {
  const u = me(req);
  if (u.role !== 'owner') return res.status(403).json({ error: 'This frame is for the owner only.' });
  u.profileFrame = 'owner-frame'; save();
  res.json({ ok: true, frame: OWNER_FRAME });
 });
 router.post('/owner-frame/unequip', (req, res) => {
  const u = me(req);
  if (u.profileFrame === 'owner-frame') { u.profileFrame = null; save(); }
  res.json({ ok: true });
 });

 /* --- Room admin: the host makes an admin; Admin tag shows on their ID --- */
 router.post('/rooms/:id/admin', (req, res) => {
  const u = me(req);
  const room = db.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.hostId !== u.id && u.role !== 'owner') return res.status(403).json({ error: 'Only the room owner can make admins' });
  const { userId, remove } = req.body || {};
  const target = db.users.find(x => x.id === userId);
  if (!target) return res.status(400).json({ error: 'User not found' });
  if (!(room.members || []).includes(userId)) return res.status(400).json({ error: 'That user is not in this room' });
  room.admins = room.admins || [];
  if (remove) room.admins = room.admins.filter(id => id !== userId);
  else if (!room.admins.includes(userId)) room.admins.push(userId);
  save();
  notify(userId, remove ? `${displayNameOf(u)} removed your admin role in room ${room.name}.` : `${displayNameOf(u)} made you an admin of room ${room.name}!`);
  res.json({ ok: true, admins: room.admins });
 });

 /* --- VIP Center: one level's 6 benefits, Identification (6/6), price --- */
 router.get('/vip-center/:level', (req, res) => {
  const u = me(req);
  const level = Number(req.params.level);
  const l = VIP_LEVELS.find(x => x.vip === level);
  if (!l) return res.status(400).json({ error: 'VIP level must be 1–12' });
  res.json({
   level: l,
   benefits: VIP_CENTER_BENEFITS.map(b => ({ ...b, color: l.color, color2: l.color2, animal: l.emblem })),
   identification: '6/6',
   price: l.price, days: l.days, totalBenefits: l.totalBenefits,
   myVip: u.vip || 0, myAnonymous: !!u.anonymous,
   note: 'Each VIP level gets its own version of these 6 benefits in its own colours and animal.'
  });
 });

 /* --- Honors profile: the full profile page data --- */
 router.get('/honors/:id', (req, res) => {
  const viewer = me(req);
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (viewer.id !== u.id) { u.visitors = (u.visitors || 0) + 1; save(); }
  const vip = u.vip || 0;
  const pair = (db.cpPairs || []).find(p => p.status === 'active' && (p.a === u.id || p.b === u.id));
  let cp = null;
  if (pair) {
   const otherId = pair.a === u.id ? pair.b : pair.a;
   const other = db.users.find(x => x.id === otherId);
   const days = Math.max(1, Math.floor((Date.now() - new Date(pair.createdAt).getTime()) / 86400000));
   cp = { partnerId: otherId, partnerName: other ? other.name : 'CP', tier: pair.tier, days, label: 'Devoted Love', intimacy: pair.intimacy || 0 };
  }
  const giftsBy = u.giftsReceivedBy || {};
  const giftGrid = Object.keys(giftsBy).map(gid => {
   const g = (db.gifts || []).find(x => x.id === gid) || (vipMod.VIP_GIFTS || []).find(x => x.id === gid) || { name: gid, price: 0, svg: 'assets/icons/gift.svg' };
   return { id: gid, name: g.name, price: g.price, svg: g.svg || g.icon, count: giftsBy[gid] };
  }).sort((a, b) => b.count - a.count);
  const fFollowing = (viewer.following || []).includes(u.id);
  const fFollowedBy = (u.following || []).includes(viewer.id);
  const fMutual = fFollowing && fFollowedBy;
  const followers = (u.followers || []).map(id => { const f = db.users.find(x => x.id === id); return f ? { id: f.id, name: f.name, vip: f.vip || 0 } : null; }).filter(Boolean);
  const following = (u.following || []).map(id => { const f = db.users.find(x => x.id === id); return f ? { id: f.id, name: f.name, vip: f.vip || 0 } : null; }).filter(Boolean);
  const moments = (db.moments || []).filter(m => m.userId === u.id).slice(-10).reverse();
  const rooms = (db.rooms || []).filter(r => r.hostId === u.id).map(r => ({ id: r.id, name: r.name, topic: r.topic, level: r.level || 1, members: (r.members || []).length }));
  res.json({
   user: {
    id: u.id, name: u.anonymous ? 'Anonymous' : displayNameOf(u), displayName: u.anonymous ? 'Anonymous' : displayNameOf(u), bio: u.bio || '',
    /* Gender is private — shown only on your own profile (isMe). Date of
       birth, phone and email are never sent here at all. */
    gender: viewer.id === u.id ? (u.gender || '') : '',
    country: u.country || '', tag: u.tag || '', frameId: u.frameId || u.profileFrame || null, cardSkinId: u.cardSkinId || null,
    vip, svip: !!u.svip, level: u.level || 1, levelTier: levelTier(u.level || 1),
    honorTitle: honorTitleFor(u.wealth || 0), banner: vip > 0 ? BANNERS[vip - 1] : null,
    svipBadge: u.svip ? (SVIP_BADGES[10] || null) : null,
    rankBadge: (vip >= 1 && vip <= 7) ? { svg: 'assets/vip/rank-badge.svg', name: RANK_BADGES[vip], size: rankBadgeSize(vip) } : null,
    kit: vipKit(vip || 1), profileFrame: u.profileFrame || null,
    isOwner: u.role === 'owner'
   },
   stats: { visitors: u.visitors || 0, followers: followers.length, following: following.length, coins: u.coins, charm: u.charm, wealth: u.wealth },
   giftsReceived: { total: u.giftsReceived || 0, coins: u.giftsReceivedCoins || 0, grid: giftGrid },
   followers, following, moments, rooms, cp,
   follow: { following: fFollowing, followedBy: fFollowedBy, mutual: fMutual, state: fMutual ? 'friends' : fFollowing ? 'following' : fFollowedBy ? 'follow-back' : 'follow' },
   isMe: viewer.id === u.id
  });
 });

 return router;
};
