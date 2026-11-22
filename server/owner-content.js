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
  db.settings.customization = db.settings.customization || { design: {}, vip: {}, gifts: {}, shop: {} };
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
  const { db, save, audit } = ctx;
  const router = express.Router();
  router.use(auth, ownerOnly);

  /* Full Studio data for the owner: current customization + every editable
     item (VIP levels with live art paths, gifts, shop). */
  router.get('/', (req, res) => {
    const { VIP_LEVELS, BANNERS } = require('./vip');
    const levels = VIP_LEVELS.map(l => {
      const o = applyVipOverrides(db, l);
      const banner = BANNERS[l.vip - 1] || {};
      return { vip: l.vip, name: o.emblem, badge: o.svg, frame: o.frameSvg, crown: o.crownSvg || ('assets/vip/vip' + String(l.vip).padStart(2, '0') + '/crown.png'), nameplate: (ensureCustomization(db).vip[String(l.vip)] || {}).nameplate || banner.svg || '', price: l.price, points: l.points };
    });
    res.json({ customization: publicCustomization(db), levels, gifts: db.gifts || [], shop: db.shop || [], aiConfigured: !!(process.env.IMAGE_GEN_API_KEY && process.env.IMAGE_GEN_API_URL) });
  });

  /* Save changes: design / VIP art+names / gift+shop edits / settings /
     apply a chosen image to a slot / reset to defaults. */
  router.post('/', (req, res) => {
    const c = ensureCustomization(db);
    const b = req.body || {};
    if (b.reset) {
      db.settings.customization = { design: {}, vip: {}, gifts: {}, shop: {} };
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
        for (const k of ['badge', 'frame', 'crown', 'nameplate']) if (ov[k] !== undefined && isSafeUrl(ov[k])) c.vip[String(n)][k] = ov[k];
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
    db.settings.customization = { design: {}, vip: {}, gifts: {}, shop: {} };
    save(); audit(req.user.id, 'studio-reset', 'Customization reset to defaults');
    res.json({ ok: true, customization: publicCustomization(db) });
  });

  return router;
};
module.exports.publicCustomization = publicCustomization;
module.exports.applyVipOverrides = applyVipOverrides;
module.exports.DESIGN_DEFAULTS = DESIGN_DEFAULTS;
