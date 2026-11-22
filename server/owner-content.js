/* OWNER CONTENT + CUSTOMIZATION STUDIO — no-code editing for the owner.
   Mounted by server.js at /api/owner/content (owner-only) and the public
   view at /api/content (logged-in users read the active design + overrides).
   Everything the owner changes here applies LIVE, immediately, with NO
   redeploy and NO coding:
   - DESIGN: app colours, fonts, backgrounds, app name (CSS variables the
     app applies on load).
   - CONTENT: VIP badge/frame/crown/nameplate photos + names, gift photos /
     names / prices, shop item names / prices, announcement + app settings.
   - ADD: new gifts and new shop items (written into db.gifts / db.shop, so
     they appear in the catalogue, the gift panel and the store at once).
   - AI SEARCH (owner-only): search the app's own design library by words
     ("golden dragon badge", "red fire frame") and apply a match to a slot.
     If an external image API is configured (IMAGE_GEN_API_URL +
     IMAGE_GEN_API_KEY env vars), the same search also generates brand-new
     designs; without it, the library search + photo upload work for free.
   - RESET: restore the default design + content.
   Storage: db.settings.customization (persisted in data/db.json by save()).
   Uploads: /uploads/content/* (served statically by server.js).
   PRIVACY: every route here is ownerOnly except the public /api/content
   view, which contains design + art paths only — never user data. */
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-AZLAN';

const CONTENT_DIR = path.join(__dirname, '..', 'uploads', 'content');
fs.mkdirSync(CONTENT_DIR, { recursive: true });

const DESIGN_DEFAULTS = {
  gold: '#a67c00', gold2: '#a67c00', text: '#1c1c1c', muted: '#6b6b6b',
  card: '#ffffff', border: '#e3d9b8', bg1: '#ffffff', bg2: '#fdf9ec',
  font: 'system-ui', appName: 'AZLAN WORLD CHAT', roomBg: 'purple'
};
const DESIGN_KEYS = Object.keys(DESIGN_DEFAULTS);
const VIP_NAMES = { 1: 'Sword Shield', 2: 'Twin White Wolves', 3: 'Emerald Sword', 4: 'Twin Blue Wolves', 5: 'Dark Wings', 6: 'Twin White Tigers', 7: 'Twin Lions', 8: 'Golden Dragons', 9: 'Golden Lion', 10: 'Golden Phoenix', 11: 'Fire Lion', 12: 'Hooded King' };
const VIP_TAGS = { 1: 'sword shield teal gold', 2: 'wolves wolf white gold', 3: 'sword emerald green gold', 4: 'wolves wolf blue dragon', 5: 'wings black purple dark', 6: 'tigers tiger white purple', 7: 'lions lion fire brown red', 8: 'dragons dragon gold red fire', 9: 'lion gold crown fire roar', 10: 'phoenix gold wings fire', 11: 'lion fire red gold', 12: 'king hooded throne crown fire wings divine' };

function ensureCustomization(db) {
  db.settings = db.settings || {};
  db.settings.customization = db.settings.customization || {};
  /* Fill any missing keys — the object may already exist in a partial
     shape (e.g. created by a list call before the Studio ran). */
  const c0 = db.settings.customization;
  c0.design = c0.design || {}; c0.vip = c0.vip || {}; c0.gifts = c0.gifts || {}; c0.shop = c0.shop || {};
  const lo = require('./list-order');
  lo.listsOf(db);
  return db.settings.customization;
}
function publicCustomization(db) {
  const c = ensureCustomization(db);
  return {
    design: { ...DESIGN_DEFAULTS, ...(c.design || {}) },
    vip: c.vip || {}, gifts: c.gifts || {}, shop: c.shop || {},
    aiConfigured: !!(process.env.IMAGE_GEN_API_KEY && process.env.IMAGE_GEN_API_URL)
  };
}
/* Merge owner VIP art/name overrides into a VIP_LEVELS entry (used by the
   VIP Club, plans and preview responses so every client sees the new art). */
function applyVipOverrides(db, level) {
  const ov = (ensureCustomization(db).vip || {})[String(level.vip)];
  if (!ov) return level;
  const out = { ...level };
  if (ov.badge) out.svg = ov.badge;
  if (ov.frame) out.frameSvg = ov.frame;
  if (ov.crown) out.crownSvg = ov.crown;
  if (ov.nameplate) out.nameplateSvg = ov.nameplate;
  if (ov.name) out.emblem = ov.name;
  return out;
}
function isSafeUrl(u) {
  if (typeof u !== 'string' || !u) return false;
  return u.startsWith('assets/') || u.startsWith('/uploads/') || u.startsWith('uploads/') || u.startsWith('http://') || u.startsWith('https://');
}
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'Login required' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'Bad session' }); }
}
function ownerOnly(req, res, next) {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' });
  next();
}
const upload = multer({
  dest: CONTENT_DIR,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

/* ---- AI SEARCH library: the app's own design library, searchable by words.
   Every VIP badge/frame/crown/nameplate, every gift and every theme is an
   option the owner can apply to any slot — free, no API key needed. ---- */
const LIBRARY_CACHE = { at: 0, items: [] };
function libraryItems() {
  if (Date.now() - LIBRARY_CACHE.at < 60000 && LIBRARY_CACHE.items.length) return LIBRARY_CACHE.items;
  const root = path.join(__dirname, '..');
  const items = [];
  const add = (url, label, kind, tags) => items.push({ url, label, kind, tags: (tags || '') + ' ' + label });
  for (let v = 1; v <= 12; v++) {
    const p = String(v).padStart(2, '0');
    add('assets/vip/vip' + p + '/badge.gif', 'VIP ' + v + ' badge — ' + (VIP_NAMES[v] || ''), 'badge', 'vip ' + v + ' badge ' + (VIP_TAGS[v] || ''));
    add('assets/vip/vip' + p + '/frame.png', 'VIP ' + v + ' frame', 'frame', 'vip ' + v + ' frame gold ring ' + (VIP_TAGS[v] || ''));
    add('assets/vip/vip' + p + '/crown.png', 'VIP ' + v + ' crown', 'crown', 'vip ' + v + ' crown gold royal ' + (VIP_TAGS[v] || ''));
    add('assets/vip/vip' + p + '/nameplate.jpg', 'VIP ' + v + ' nameplate', 'nameplate', 'vip ' + v + ' nameplate banner gold ' + (VIP_TAGS[v] || ''));
    add('assets/vip/vip' + p + '/entry.jpg', 'VIP ' + v + ' entry', 'entry', 'vip ' + v + ' entry portal fire ' + (VIP_TAGS[v] || ''));
  }
  const giftDir = path.join(root, 'assets', 'gifts');
  if (fs.existsSync(giftDir)) for (const f of fs.readdirSync(giftDir)) {
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(f)) add('assets/gifts/' + f, 'Gift — ' + f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), 'gift', 'gift ' + f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  }
  const themeDir = path.join(root, 'assets', 'themes');
  if (fs.existsSync(themeDir)) for (const f of fs.readdirSync(themeDir)) {
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(f)) add('assets/themes/' + f, 'Theme — ' + f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), 'theme', 'theme room background ' + f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  }
  LIBRARY_CACHE.at = Date.now(); LIBRARY_CACHE.items = items;
  return items;
}
function searchLibrary(q) {
  const tokens = String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1);
  const items = libraryItems();
  if (!tokens.length) return items.slice(0, 8);
  const scored = items.map(it => {
    const hay = (it.tags || '').toLowerCase();
    let score = 0;
    for (const t of tokens) { if (hay.includes(t)) score += 2; else if (hay.includes(t.slice(0, 4))) score += 1; }
    return { ...it, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map(({ score, ...rest }) => rest);
}
async function generateWithApi(q) {
  /* Optional external image generation (OpenAI-compatible images API).
     Only used when IMAGE_GEN_API_URL + IMAGE_GEN_API_KEY are set. The
     generated files are downloaded to /uploads/content/ so they persist. */
  const url = process.env.IMAGE_GEN_API_URL;
  const key = process.env.IMAGE_GEN_API_KEY;
  if (!url || !key) return { configured: false, options: [] };
  const prompt = 'Photorealistic 3D render, luxury game asset, real gold and gemstones, cinematic studio lighting, macro photography quality, ultra detailed, isolated on pure black background, no text: ' + q;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ prompt, n: 4, size: '1024x1024' })
    });
    if (!res.ok) return { configured: true, options: [], aiError: 'Image service returned ' + res.status };
    const d = await res.json();
    const out = [];
    for (let i = 0; i < (d.data || []).length; i++) {
      const item = d.data[i];
      const file = 'ai-' + Date.now() + '-' + i + '.png';
      const dest = path.join(CONTENT_DIR, file);
      if (item.b64_json) fs.writeFileSync(dest, Buffer.from(item.b64_json, 'base64'));
      else if (item.url) {
        const r = await fetch(item.url);
        if (!r.ok) continue;
        fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      } else continue;
      out.push({ url: '/uploads/content/' + file, label: q + ' (AI generated)', kind: 'generated', tags: q });
    }
    return { configured: true, options: out };
  } catch (e) {
    return { configured: true, options: [], aiError: 'Image service failed: ' + e.message };
  }
}

module.exports = function (ctx) {
  const { db, save, audit, listOrder } = ctx;
  const router = express.Router();
  router.use(auth, ownerOnly);

  /* Full Studio data for the owner: current customization + every editable
     item (VIP levels with live art paths, gifts, shop) + the manage-lists
     state (order / hidden / custom / VIP art variants) + announcements
     (broadcast feed) + rooms (for reorder / remove). */
  router.get('/', (req, res) => {
    const { VIP_LEVELS, BANNERS } = require('./vip');
    const levels = VIP_LEVELS.map(l => {
      const o = applyVipOverrides(db, l);
      const banner = BANNERS[l.vip - 1] || {};
      return { vip: l.vip, name: o.emblem, badge: o.svg, frame: o.frameSvg, crown: o.crownSvg || ('assets/vip/vip' + String(l.vip).padStart(2, '0') + '/crown.png'), nameplate: (ensureCustomization(db).vip[String(l.vip)] || {}).nameplate || banner.svg || '', price: l.price, points: l.points };
    });
    const c = ensureCustomization(db);
    res.json({ customization: publicCustomization(db), levels, gifts: db.gifts || [], shop: db.shop || [], aiConfigured: !!(process.env.IMAGE_GEN_API_KEY && process.env.IMAGE_GEN_API_URL),
      lists: { order: c.order || {}, hidden: c.hidden || {}, custom: c.custom || {}, vipArt: c.vipArt || {} },
      announcements: db.broadcasts || [],
      rooms: (db.rooms || []).map(r => ({ id: r.id, name: r.name, topic: r.topic, hostId: r.hostId, members: (r.members || []).length, level: r.level || 1 })) });
  });

  /* Save changes: design / VIP art+names / gift+shop edits / settings /
     apply a chosen image to a slot / reset to defaults. */
  router.post('/', (req, res) => {
    const c = ensureCustomization(db);
    const b = req.body || {};
    if (b.reset) {
      db.settings.customization = { design: {}, vip: {}, gifts: {}, shop: {}, order: {}, hidden: {}, custom: {}, vipArt: {} };
      save(); audit(req.user.id, 'studio-reset', 'Customization reset to defaults');
      return res.json({ ok: true, customization: publicCustomization(db), note: 'Design and content reset to defaults. Added gifts/items were kept.' });
    }
    if (b.design) {
      for (const k of DESIGN_KEYS) if (b.design[k] !== undefined) c.design[k] = String(b.design[k]).slice(0, 120);
    }
    if (b.vip) {
      for (const [v, ov] of Object.entries(b.vip)) {
        const n = parseInt(v, 10);
        if (!(n >= 1 && n <= 12) || typeof ov !== 'object') continue;
        c.vip[String(n)] = c.vip[String(n)] || {};
        for (const k of ['badge', 'frame', 'crown', 'nameplate']) if (ov[k] !== undefined && isSafeUrl(ov[k])) {
          c.vip[String(n)][k] = ov[k];
          /* Keep the art-variant list in sync: a newly chosen photo becomes
             the first (active) variant, so it also shows in Manage Lists. */
          const lo = require('./list-order'); const vv = lo.listsOf(db);
          vv.vipArt[String(n)] = vv.vipArt[String(n)] || {};
          const variants = vv.vipArt[String(n)][k] = vv.vipArt[String(n)][k] || [];
          const at = variants.indexOf(ov[k]); if (at > 0) variants.splice(at, 1);
          if (at !== 0) variants.unshift(ov[k]);
        }
        if (ov.name !== undefined) c.vip[String(n)].name = String(ov.name).slice(0, 60);
        if (ov.desc !== undefined) c.vip[String(n)].desc = String(ov.desc).slice(0, 300);
      }
    }
    if (b.gifts) {
      for (const [id, ov] of Object.entries(b.gifts)) {
        const g = (db.gifts || []).find(x => x.id === id);
        if (!g || typeof ov !== 'object') continue;
        if (ov.name !== undefined) g.name = String(ov.name).slice(0, 80);
        if (ov.price !== undefined && Number(ov.price) >= 0) { g.price = Math.floor(Number(ov.price)); g.charm = g.price * 10; }
        if (ov.svg !== undefined && isSafeUrl(ov.svg)) g.svg = ov.svg;
        c.gifts[id] = { name: g.name, price: g.price, svg: g.svg };
      }
    }
    if (b.shop) {
      for (const [id, ov] of Object.entries(b.shop)) {
        const it = (db.shop || []).find(x => x.id === id);
        if (!it || typeof ov !== 'object') continue;
        if (ov.name !== undefined) it.name = String(ov.name).slice(0, 80);
        if (ov.price !== undefined && Number(ov.price) >= 0) it.price = Math.floor(Number(ov.price));
        if (ov.icon !== undefined && isSafeUrl(ov.icon)) it.icon = ov.icon;
        c.shop[id] = { name: it.name, price: it.price, icon: it.icon };
      }
    }
    if (b.settings) {
      if (b.settings.announcement !== undefined) db.settings.announcement = String(b.settings.announcement).slice(0, 200);
      if (b.settings.appName !== undefined) { db.settings.appName = String(b.settings.appName).slice(0, 60); c.design.appName = db.settings.appName; }
      if (b.settings.signupBonus !== undefined && Number(b.settings.signupBonus) >= 0) db.settings.signupBonus = Math.floor(Number(b.settings.signupBonus));
    }
    if (b.apply && b.apply.slot && b.apply.url && isSafeUrl(b.apply.url)) {
      const s = b.apply.slot;
      if (s.kind === 'vip-badge' || s.kind === 'vip-frame' || s.kind === 'vip-crown' || s.kind === 'vip-nameplate') {
        const n = parseInt(s.vip, 10);
        if (n >= 1 && n <= 12) {
          const key = { 'vip-badge': 'badge', 'vip-frame': 'frame', 'vip-crown': 'crown', 'vip-nameplate': 'nameplate' }[s.kind];
          c.vip[String(n)] = c.vip[String(n)] || {};
          c.vip[String(n)][key] = b.apply.url;
          const lo = require('./list-order'); const vv = lo.listsOf(db);
          vv.vipArt[String(n)] = vv.vipArt[String(n)] || {};
          const variants = vv.vipArt[String(n)][key] = vv.vipArt[String(n)][key] || [];
          const at = variants.indexOf(b.apply.url); if (at > 0) variants.splice(at, 1);
          if (at !== 0) variants.unshift(b.apply.url);
        }
      } else if (s.kind === 'gift') {
        const g = (db.gifts || []).find(x => x.id === s.id);
        if (g) { g.svg = b.apply.url; c.gifts[s.id] = { name: g.name, price: g.price, svg: g.svg }; }
      } else if (s.kind === 'shop') {
        const it = (db.shop || []).find(x => x.id === s.id);
        if (it) { it.icon = b.apply.url; c.shop[s.id] = { name: it.name, price: it.price, icon: it.icon }; }
      }
    }
    save(); audit(req.user.id, 'studio-save', 'Customization saved');
    res.json({ ok: true, customization: publicCustomization(db) });
  });

  /* Upload a photo from the owner's phone (VIP art, gift photo, background).
     Returns the URL to save into a slot. Images only, max 5 MB. */
  router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const ext = ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' })[req.file.mimetype] || '.png';
    const name = Date.now() + '-' + Math.floor(Math.random() * 10000) + ext;
    fs.renameSync(req.file.path, path.join(CONTENT_DIR, name));
    res.json({ ok: true, url: '/uploads/content/' + name });
  });

  /* Add a brand-new gift (appears in the catalogue + gift panel at once). */
  router.post('/add-gift', (req, res) => {
    const { name, price, svg, category } = req.body || {};
    if (!name || price === undefined) return res.status(400).json({ error: 'Gift name and price are required' });
    let n = 100;
    while ((db.gifts || []).find(g => g.id === 'g' + n)) n++;
    const p = Math.max(0, Math.floor(Number(price) || 0));
    const gift = { id: 'g' + n, name: String(name).slice(0, 80), price: p, charm: p * 10, category: category || 'hot', svg: isSafeUrl(svg) ? svg : 'assets/icons/gift.svg', anim: 'bloom' };
    db.gifts.push(gift); save(); audit(req.user.id, 'studio-add-gift', gift.name + ' (' + gift.id + ')');
    res.json({ ok: true, gift });
  });

  /* Add a brand-new store item. */
  router.post('/add-shop', (req, res) => {
    const { name, price, category, icon } = req.body || {};
    if (!name || price === undefined) return res.status(400).json({ error: 'Item name and price are required' });
    let n = 100;
    while ((db.shop || []).find(x => x.id === 's' + n)) n++;
    const item = { id: 's' + n, name: String(name).slice(0, 80), price: Math.max(0, Math.floor(Number(price) || 0)), category: category || 'Theme', icon: isSafeUrl(icon) ? icon : 'assets/icons/gift.svg', svg: isSafeUrl(icon) ? icon : 'assets/icons/gift.svg' };
    db.shop.push(item); save(); audit(req.user.id, 'studio-add-shop', item.name + ' (' + item.id + ')');
    res.json({ ok: true, item });
  });

  /* ============ OWNER MANAGE LISTS — Add / Remove / Reorder (2026-11-22) ==
     Every list the owner manages gets Add, Remove (with a confirm step in
     the app) and Move up / Move down. Changes apply live immediately and
     persist server-side; the order the owner sets is the order every user
     sees. Server-enforced: these routes are ownerOnly (router-wide).
     - VIP levels are fixed at 1–12 (their price/points/benefits never
       change): they can be REORDERED or HIDDEN, never added or deleted.
     - Built-in gifts/shop items are HIDDEN on remove (restorable); owner-
       added items are DELETED for good. Rooms are deleted on remove.
     - Announcements are the platform broadcast feed (db.broadcasts). */
  function listsState() {
    const c = ensureCustomization(db);
    return { order: c.order || {}, hidden: c.hidden || {}, custom: c.custom || {}, vipArt: c.vipArt || {} };
  }
  router.get('/lists', (req, res) => {
    res.json({ ok: true, lists: listsState(), announcements: db.broadcasts || [], rooms: (db.rooms || []).map(r => ({ id: r.id, name: r.name, topic: r.topic, hostId: r.hostId, members: (r.members || []).length, level: r.level || 1 })) });
  });
  /* Save a full display order for one list. The client sends the ordered
     ids (after a Move up / Move down); the server stores it as-is. */
  router.post('/lists/order', (req, res) => {
    const { kind, order } = req.body || {};
    if (!listOrder.KINDS.includes(kind)) return res.status(400).json({ error: 'Unknown list' });
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Order must be a list of ids' });
    listOrder.setOrder(db, kind, order.map(String).slice(0, 500));
    save(); audit(req.user.id, 'studio-list-order', kind + ' order saved (' + order.length + ' items)');
    res.json({ ok: true, lists: listsState() });
  });
  /* Add a new item to a list. Gifts/shop items appear in the catalogue,
     gift panel and store at once. kind 'ids' adds a Unique ID product
     (a shop item in the "Unique ID" category). */
  router.post('/lists/add', (req, res) => {
    const { kind, item } = req.body || {};
    const it = item || {};
    if (kind === 'vip') return res.status(400).json({ error: 'VIP levels are fixed at 1–12 — reorder them or hide one instead of adding a new level.' });
    if (kind === 'rooms') return res.status(400).json({ error: 'Create rooms from the Party tab — the Studio lists and reorders them here.' });
    if (kind === 'gifts') {
      if (!it.name || it.price === undefined) return res.status(400).json({ error: 'Gift name and price are required' });
      let n = 100;
      while ((db.gifts || []).find(g => g.id === 'g' + n)) n++;
      const p = Math.max(0, Math.floor(Number(it.price) || 0));
      const gift = { id: 'g' + n, name: String(it.name).slice(0, 80), price: p, charm: p * 10, category: it.category || 'hot', svg: isSafeUrl(it.svg) ? it.svg : 'assets/icons/gift.svg', anim: 'bloom' };
      db.gifts.push(gift); listOrder.registerCustom(db, 'gifts', gift.id);
      save(); audit(req.user.id, 'studio-list-add', 'gift ' + gift.name + ' (' + gift.id + ')');
      return res.json({ ok: true, gift });
    }
    if (kind === 'shop' || kind === 'ids') {
      if (!it.name || it.price === undefined) return res.status(400).json({ error: 'Item name and price are required' });
      let n = 100;
      while ((db.shop || []).find(x => x.id === 's' + n)) n++;
      const shopItem = { id: 's' + n, name: String(it.name).slice(0, 80), price: Math.max(0, Math.floor(Number(it.price) || 0)), category: kind === 'ids' ? 'Unique ID' : (it.category || 'Theme'), icon: isSafeUrl(it.icon) ? it.icon : 'assets/icons/id.svg', svg: isSafeUrl(it.icon) ? it.icon : 'assets/icons/id.svg' };
      db.shop.push(shopItem); listOrder.registerCustom(db, 'shop', shopItem.id);
      save(); audit(req.user.id, 'studio-list-add', 'shop item ' + shopItem.name + ' (' + shopItem.id + ')');
      return res.json({ ok: true, item: shopItem });
    }
    if (kind === 'announcements') {
      if (!it.text) return res.status(400).json({ error: 'Announcement text is required' });
      db.broadcasts = db.broadcasts || [];
      const note = { id: Date.now(), text: String(it.text).slice(0, 200), kind: 'announcement', at: new Date().toISOString() };
      db.broadcasts.unshift(note); listOrder.registerCustom(db, 'announcements', note.id);
      if (db.broadcasts.length > 50) db.broadcasts.length = 50;
      save(); audit(req.user.id, 'studio-list-add', 'announcement: ' + note.text.slice(0, 60));
      return res.json({ ok: true, announcement: note });
    }
    return res.status(400).json({ error: 'Unknown list' });
  });
  /* Remove an item from a list. Built-ins are hidden (Restore brings them
     back); owner-added gifts/shop items and rooms are deleted for good. */
  router.post('/lists/remove', (req, res) => {
    const { kind, id } = req.body || {};
    if (!listOrder.KINDS.includes(kind) || id === undefined) return res.status(400).json({ error: 'List and id are required' });
    const sid = String(id);
    if (kind === 'vip') {
      const v = parseInt(sid, 10);
      if (!(v >= 1 && v <= 12)) return res.status(400).json({ error: 'VIP must be 1–12' });
      listOrder.hideItem(db, 'vip', v);
      save(); audit(req.user.id, 'studio-list-remove', 'VIP' + v + ' hidden');
      return res.json({ ok: true, removed: 'hidden', lists: listsState() });
    }
    if (kind === 'rooms') {
      const before = (db.rooms || []).length;
      db.rooms = (db.rooms || []).filter(r => String(r.id) !== sid);
      if (db.roomGiftFeed) delete db.roomGiftFeed[sid];
      if (db.rooms.length === before) return res.status(404).json({ error: 'Room not found' });
      listOrder.forgetId(db, 'rooms', sid);
      save(); audit(req.user.id, 'studio-list-remove', 'room ' + sid + ' deleted');
      return res.json({ ok: true, removed: 'deleted' });
    }
    if (kind === 'announcements') {
      const before = (db.broadcasts || []).length;
      db.broadcasts = (db.broadcasts || []).filter(b => String(b.id) !== sid);
      if (db.broadcasts.length === before) return res.status(404).json({ error: 'Announcement not found' });
      listOrder.forgetId(db, 'announcements', sid);
      save(); audit(req.user.id, 'studio-list-remove', 'announcement ' + sid + ' deleted');
      return res.json({ ok: true, removed: 'deleted' });
    }
    if (kind === 'gifts' || kind === 'shop') {
      const arr = kind === 'gifts' ? db.gifts : db.shop;
      const found = (arr || []).find(x => String(x.id) === sid);
      if (!found) return res.status(404).json({ error: 'Item not found' });
      if (listOrder.isCustom(db, kind, sid)) {
        if (kind === 'gifts') db.gifts = db.gifts.filter(x => String(x.id) !== sid);
        else db.shop = db.shop.filter(x => String(x.id) !== sid);
        listOrder.forgetId(db, kind, sid);
        save(); audit(req.user.id, 'studio-list-remove', kind + ' ' + sid + ' deleted');
        return res.json({ ok: true, removed: 'deleted' });
      }
      listOrder.hideItem(db, kind, sid);
      save(); audit(req.user.id, 'studio-list-remove', kind + ' ' + sid + ' hidden');
      return res.json({ ok: true, removed: 'hidden', lists: listsState() });
    }
    return res.status(400).json({ error: 'Unknown list' });
  });
  /* Bring back a hidden built-in item. */
  router.post('/lists/restore', (req, res) => {
    const { kind, id } = req.body || {};
    if (!listOrder.KINDS.includes(kind) || id === undefined) return res.status(400).json({ error: 'List and id are required' });
    listOrder.unhideItem(db, kind, id);
    save(); audit(req.user.id, 'studio-list-restore', kind + ' ' + id + ' restored');
    res.json({ ok: true, lists: listsState() });
  });
  /* VIP art variants: each VIP level's badge / frame / crown / nameplate
     can hold several art options; the FIRST is the active one. Add a
     variant (upload or AI search URL), remove one, or move one up/down —
     moving one to the top makes it the active art everywhere, live. */
  router.post('/lists/vip-art', (req, res) => {
    const { vip, slot, url, action, index, dir } = req.body || {};
    const v = parseInt(vip, 10);
    if (!(v >= 1 && v <= 12)) return res.status(400).json({ error: 'VIP must be 1–12' });
    if (!['badge', 'frame', 'crown', 'nameplate'].includes(slot)) return res.status(400).json({ error: 'Art slot must be badge, frame, crown or nameplate' });
    const c = ensureCustomization(db);
    c.vipArt[String(v)] = c.vipArt[String(v)] || {};
    const variants = c.vipArt[String(v)][slot] = c.vipArt[String(v)][slot] || [];
    /* Seed the variant list from the current active art the first time. */
    if (!variants.length) {
      const cur = (c.vip[String(v)] || {})[slot];
      const fallback = { badge: 'assets/vip/vip' + String(v).padStart(2, '0') + '/badge.gif', frame: 'assets/vip/vip' + String(v).padStart(2, '0') + '/frame.png', crown: 'assets/vip/vip' + String(v).padStart(2, '0') + '/crown.png', nameplate: 'assets/vip/vip' + String(v).padStart(2, '0') + '/nameplate.jpg' }[slot];
      variants.push(cur && isSafeUrl(cur) ? cur : fallback);
    }
    const i = Number(index);
    if (action === 'add') {
      if (!isSafeUrl(url)) return res.status(400).json({ error: 'A valid image URL is required' });
      if (!variants.includes(url)) variants.push(url);
    } else if (action === 'remove') {
      if (!(i >= 0 && i < variants.length)) return res.status(400).json({ error: 'Bad variant index' });
      if (variants.length <= 1) return res.status(400).json({ error: 'A level needs at least one art option — add another one first.' });
      variants.splice(i, 1);
    } else if (action === 'move') {
      if (!(i >= 0 && i < variants.length)) return res.status(400).json({ error: 'Bad variant index' });
      const j = i + (dir === 'up' ? -1 : 1);
      if (j < 0 || j >= variants.length) return res.status(400).json({ error: 'Already at the edge' });
      const t = variants[i]; variants[i] = variants[j]; variants[j] = t;
    } else if (action === 'set-active') {
      if (!(i >= 0 && i < variants.length)) return res.status(400).json({ error: 'Bad variant index' });
      const t = variants.splice(i, 1)[0]; variants.unshift(t);
    } else return res.status(400).json({ error: 'Action must be add, remove, move or set-active' });
    /* The first variant is the active art everywhere — keep the override
       in sync so the badge/frame/crown/nameplate changes live, at once. */
    c.vip[String(v)] = c.vip[String(v)] || {};
    c.vip[String(v)][slot] = variants[0];
    save(); audit(req.user.id, 'studio-vip-art', 'VIP' + v + ' ' + slot + ' variants: ' + variants.length);
    res.json({ ok: true, variants, active: variants[0], lists: listsState() });
  });

  /* AI SEARCH (owner-only): type what you want, get design options, tap one
     to apply it to the slot. Free path: the app's own design library.
     If an image API is configured, it also generates brand-new designs. */
  router.post('/ai-search', async (req, res) => {
    const { q, slot } = req.body || {};
    if (!q || !String(q).trim()) return res.status(400).json({ error: 'Type what you want to search for' });
    const lib = searchLibrary(q);
    const gen = await generateWithApi(q);
    const options = [...(gen.options || []), ...lib];
    res.json({
      ok: true, configured: gen.configured, slot: slot || null,
      options: options.slice(0, 8),
      note: gen.configured
        ? (gen.aiError ? 'AI generation failed (' + gen.aiError + ') — showing designs from the app library instead.' : 'Showing AI-generated designs first, then designs from the app library.')
        : 'AI image generation is not connected (no image API key). Showing designs from the app library — tap one to apply it, or upload your own photo. To enable AI generation, set IMAGE_GEN_API_URL + IMAGE_GEN_API_KEY on the server.'
    });
  });

  router.post('/reset', (req, res) => {
    db.settings.customization = { design: {}, vip: {}, gifts: {}, shop: {}, order: {}, hidden: {}, custom: {}, vipArt: {} };
    save(); audit(req.user.id, 'studio-reset', 'Customization reset to defaults');
    res.json({ ok: true, customization: publicCustomization(db) });
  });

  return router;
};
module.exports.publicCustomization = publicCustomization;
module.exports.applyVipOverrides = applyVipOverrides;
module.exports.DESIGN_DEFAULTS = DESIGN_DEFAULTS;
