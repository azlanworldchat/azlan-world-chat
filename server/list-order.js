/* OWNER MANAGE LISTS (2026-11-22) — Add / Remove / Reorder for every list
   the owner manages, from inside the app (Owner Portal / Customization
   Studio), no coding, no redeploy.
   Storage: db.settings.customization.order / hidden / custom / vipArt
   (persisted in data/db.json by save()).
   - order[kind]: ids in the owner's display order. Items not listed keep
     their natural order after the ordered ones.
   - hidden[kind]: ids of BUILT-IN items the owner removed (hidden, restorable).
   - custom[kind]: ids of owner-ADDED items (removed = deleted for good).
   - vipArt[vip][slot]: art variant URLs for a VIP level's badge/frame/
     crown/nameplate; the FIRST variant is the active one.
   Kinds: vip (level numbers), gifts, shop, rooms, announcements.
   Reordering NEVER changes an item's own data — a VIP level keeps its own
   price, points and benefits; only its position in the list changes.
   Built-in seed ids (never deleted, only hidden): gifts g1–g42, shop s1–s22. */
const KINDS = ['vip', 'gifts', 'shop', 'rooms', 'announcements'];
const SEED_RANGES = { gifts: /^g([1-9]|[1-3][0-9]|4[0-2])$/, shop: /^s([1-9]|1[0-9]|2[0-2])$/ };

function listsOf(db) {
  const c = db.settings.customization || {};
  /* The full shape — design/vip/gifts/shop MUST exist too: this helper can
     run before the Studio ever does (e.g. a gift/shop list call), and a
     bare {} here would leave customization without design/vip, crashing
     the Studio's GET/POST. Always fill the missing keys. */
  c.design = c.design || {}; c.vip = c.vip || {}; c.gifts = c.gifts || {}; c.shop = c.shop || {};
  c.order = c.order || {}; c.hidden = c.hidden || {}; c.custom = c.custom || {}; c.vipArt = c.vipArt || {};
  db.settings.customization = c;
  return c;
}
function getOrder(db, kind) {
  const l = listsOf(db);
  return Array.isArray(l.order[kind]) ? l.order[kind].map(String) : [];
}
function setOrder(db, kind, order) {
  const l = listsOf(db);
  l.order[kind] = (order || []).map(String);
}
function isHidden(db, kind, id) {
  const l = listsOf(db);
  return (l.hidden[kind] || []).map(String).includes(String(id));
}
function hideItem(db, kind, id) {
  const l = listsOf(db);
  l.hidden[kind] = l.hidden[kind] || [];
  if (!l.hidden[kind].map(String).includes(String(id))) l.hidden[kind].push(String(id));
}
function unhideItem(db, kind, id) {
  const l = listsOf(db);
  l.hidden[kind] = (l.hidden[kind] || []).filter(x => String(x) !== String(id));
}
function registerCustom(db, kind, id) {
  const l = listsOf(db);
  l.custom[kind] = l.custom[kind] || [];
  if (!l.custom[kind].map(String).includes(String(id))) l.custom[kind].push(String(id));
}
function isCustom(db, kind, id) {
  const l = listsOf(db);
  if ((l.custom[kind] || []).map(String).includes(String(id))) return true;
  const re = SEED_RANGES[kind];
  if (re) return !re.test(String(id));
  return false;
}
function unregisterCustom(db, kind, id) {
  const l = listsOf(db);
  l.custom[kind] = (l.custom[kind] || []).filter(x => String(x) !== String(id));
}
/* Order items by the owner's stored order; unknown ids keep natural order. */
function applyOrder(db, kind, items, idOf) {
  const order = getOrder(db, kind);
  const byId = new Map(items.map(it => [String(idOf(it)), it]));
  const out = [];
  for (const id of order) { const it = byId.get(id); if (it) { out.push(it); byId.delete(id); } }
  for (const it of items) if (byId.has(String(idOf(it)))) out.push(it);
  return out;
}
/* What users see: hidden items removed, the rest in the owner's order. */
function visibleItems(db, kind, items, idOf) {
  return applyOrder(db, kind, items.filter(it => !isHidden(db, kind, idOf(it))), idOf);
}
function forgetId(db, kind, id) {
  const l = listsOf(db);
  l.order[kind] = (l.order[kind] || []).filter(x => String(x) !== String(id));
  unhideItem(db, kind, id);
  unregisterCustom(db, kind, id);
}
module.exports = {
  KINDS, SEED_RANGES, listsOf, getOrder, setOrder, isHidden, hideItem,
  unhideItem, registerCustom, isCustom, unregisterCustom, applyOrder,
  visibleItems, forgetId
};
