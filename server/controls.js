/* OWNER CONTROL SERVER — total owner control over the whole application.
   Master switches for animations, sounds, gifts, VIP, shop, rooms and
   payments, plus per-gift / per-benefit / per-VIP-level switches and
   editable prices. The owner can turn anything on/off, edit it or remove
   it. Enforced by the other services through the helpers exported here.
   Mounted by server.js at /api/controls (read, logged-in users) and
   /api/owner/controls (owner only). Original work. */
const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-AZLAN';

const DEFAULT_CONTROLS = {
  animations: true, sounds: true, gifts: true, vip: true, shop: true,
  rooms: true, payments: true, chat: true, moments: true, luckyDraw: true,
  daily: true, invite: true, ai: true, events: true,
  entryEffects: true, vipFrames: true,
  giftsDisabled: [], benefitsDisabled: [], vipDisabled: [], themesDisabled: []
};

function controlsOf(db) {
  if (!db.settings.controls) db.settings.controls = JSON.parse(JSON.stringify(DEFAULT_CONTROLS));
  const c = db.settings.controls;
  for (const k of Object.keys(DEFAULT_CONTROLS)) if (c[k] === undefined) c[k] = DEFAULT_CONTROLS[k];
  return c;
}
function isOn(db, key) { return !!controlsOf(db)[key]; }
function giftEnabled(db, giftId) { return !controlsOf(db).giftsDisabled.includes(giftId); }
function benefitEnabled(db, name) { return !controlsOf(db).benefitsDisabled.includes(name); }
function vipLevelEnabled(db, vip) { return !controlsOf(db).vipDisabled.includes(Number(vip)); }

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

module.exports = function (ctx) {
  const { db, save, audit } = ctx;
  const router = express.Router();

  // Read current controls (any logged-in user — the app needs them to hide off features)
  router.get('/', auth, (req, res) => res.json({ controls: controlsOf(db) }));

  const owner = express.Router();
  owner.use(auth, ownerOnly);
  // Full control panel data: switches + every gift/benefit/VIP level with its state
  owner.get('/', (req, res) => {
    const c = controlsOf(db);
    const { VIP_LEVELS } = require('./vip');
    res.json({
      controls: c,
      gifts: db.gifts.map(g => ({ id: g.id, name: g.name, price: g.price, enabled: giftEnabled(db, g.id) })),
      shop: db.shop.map(i => ({ id: i.id, name: i.name, price: i.price })),
      vipLevels: VIP_LEVELS.map(l => ({ vip: l.vip, emblem: l.emblem, price: l.price, enabled: vipLevelEnabled(db, l.vip), totalBenefits: l.totalBenefits })),
      benefits: [...new Set(VIP_LEVELS.flatMap(l => Object.values(l.benefits).flat()))].map(b => ({ name: b, enabled: benefitEnabled(db, b) }))
    });
  });
  // Master switch on/off
  owner.post('/switch', (req, res) => {
    const { key, value } = req.body || {};
    const c = controlsOf(db);
    if (!(key in DEFAULT_CONTROLS) || typeof c[key] !== 'boolean') return res.status(400).json({ error: 'Unknown switch: ' + key });
    c[key] = !!value; save(); audit(req.user.id, 'owner-control', `${key} = ${c[key]}`);
    res.json({ ok: true, controls: c });
  });
  // Enable / disable one gift
  owner.post('/gift', (req, res) => {
    const { giftId, enabled } = req.body || {};
    const c = controlsOf(db);
    if (!db.gifts.find(g => g.id === giftId)) return res.status(400).json({ error: 'Gift not found' });
    c.giftsDisabled = enabled ? c.giftsDisabled.filter(x => x !== giftId) : [...new Set([...c.giftsDisabled, giftId])];
    save(); audit(req.user.id, 'owner-control-gift', `${giftId} enabled=${!!enabled}`);
    res.json({ ok: true, enabled: !!enabled });
  });
  // Enable / disable one VIP benefit
  owner.post('/benefit', (req, res) => {
    const { benefit, enabled } = req.body || {};
    const c = controlsOf(db);
    c.benefitsDisabled = enabled ? c.benefitsDisabled.filter(x => x !== benefit) : [...new Set([...c.benefitsDisabled, benefit])];
    save(); audit(req.user.id, 'owner-control-benefit', `${benefit} enabled=${!!enabled}`);
    res.json({ ok: true, enabled: !!enabled });
  });
  // Enable / disable one VIP level
  owner.post('/vip-level', (req, res) => {
    const { vip, enabled } = req.body || {};
    const c = controlsOf(db);
    const v = Number(vip);
    c.vipDisabled = enabled ? c.vipDisabled.filter(x => x !== v) : [...new Set([...c.vipDisabled, v])];
    save(); audit(req.user.id, 'owner-control-vip', `VIP${v} enabled=${!!enabled}`);
    res.json({ ok: true, enabled: !!enabled });
  });
  // Edit a price (gift / shop item / VIP level)
  owner.post('/price', (req, res) => {
    const { kind, id, price } = req.body || {};
    const p = Number(price);
    if (!p || p < 0) return res.status(400).json({ error: 'Price must be a positive number' });
    if (kind === 'gift') {
      const g = db.gifts.find(x => x.id === id);
      if (!g) return res.status(400).json({ error: 'Gift not found' });
      g.price = p;
    } else if (kind === 'shop') {
      const i = db.shop.find(x => x.id === id);
      if (!i) return res.status(400).json({ error: 'Shop item not found' });
      i.price = p;
    } else if (kind === 'vip') {
      const { VIP_LEVELS } = require('./vip');
      const l = VIP_LEVELS.find(x => x.vip === Number(id));
      if (!l) return res.status(400).json({ error: 'VIP level not found' });
      l.price = p; // in-memory price table (restart resets to the built-in price)
      db.settings.vipPriceOverride = db.settings.vipPriceOverride || {};
      db.settings.vipPriceOverride[id] = p;
    } else return res.status(400).json({ error: 'kind must be gift, shop or vip' });
    save(); audit(req.user.id, 'owner-control-price', `${kind} ${id} = ${p}`);
    res.json({ ok: true, price: p });
  });
  // Remove a gift entirely
  owner.delete('/gift/:id', (req, res) => {
    db.gifts = db.gifts.filter(g => g.id !== req.params.id);
    save(); audit(req.user.id, 'owner-control-gift-del', req.params.id);
    res.json({ ok: true });
  });
  // Reset all controls to defaults
  owner.post('/reset', (req, res) => {
    db.settings.controls = JSON.parse(JSON.stringify(DEFAULT_CONTROLS));
    save(); audit(req.user.id, 'owner-control-reset', 'controls reset to defaults');
    res.json({ ok: true, controls: db.settings.controls });
  });

  router.use('/owner', owner);
  return router;
};
module.exports.DEFAULT_CONTROLS = DEFAULT_CONTROLS;
module.exports.controlsOf = controlsOf;
module.exports.isOn = isOn;
module.exports.giftEnabled = giftEnabled;
module.exports.benefitEnabled = benefitEnabled;
module.exports.vipLevelEnabled = vipLevelEnabled;
