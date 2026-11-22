/* AZLAN WORLD CHAT — front-end app.
   Original work. Talks to the Node backend in server.js.
   Owner (Azlan) enters directly with NO login (Owner Portal button).
   Everyone else must register / log in. */
/* API BASE (null fix 2026-11-22): the APK bundles the app files and runs
   them in the Android WebView, where there is NO local server — a relative
   API path would call the WebView itself and fail, so the APK could never
   log in, open a room or create one (the "null" the owner saw). When the
   app runs inside Capacitor (native app), all API calls go to the live
   Render server; on the web the calls stay relative (same origin). */
const API = (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || (typeof location !== 'undefined' && location.hostname === 'localhost' && !location.port && location.protocol.indexOf('http') === 0)
  ? 'https://azlan-world-chat.onrender.com' : '';
let TOKEN = localStorage.getItem('awc_token') || '';
let ME = null;
let currentRoom = null;
let micOn = true;
let giftQty = 1;
let giftTarget = null; // { userId, name } or null = room
let giftCategory = 'hot';
let recording = null;
let vipClubData = null;
let vipSelected = 1;
let vipBenefitTab = 'Status';
let APP_CONTROLS = null;
let giftCatalog = [];
let shownGiftEventIds = new Set();
let roomGiftEvents = [];
let roomFeedTimer = null, notifTimer = null, lastNotifId = 0, notifInit = false;
let roomTabFilter = 'all';
let roomMuted = false;
let profileFromMic = false;
/* ---------------- BACKGROUND LIVE MODE (2026-11-22) ----------------
   Leaving a room to the menu does NOT kill the session: the user stays
   joined (voice keeps running), a mini-player stays visible in the app,
   and a persistent notification shows in the phone's notification bar.
   bgRoom = the room we are still joined to while looking at the menu.
   bgKicked = true when the server says we were removed from that room. */
let bgRoom = null;
let bgKicked = false;
let bgNotifOn = false;
/* Country list for the Edit Profile screen — same list as the server
   (server.js PROFILE_COUNTRIES); the server re-checks every value. */
const PROFILE_COUNTRIES = ['USA', 'Pakistan', 'UK', 'UAE', 'Saudi Arabia', 'Canada', 'Australia', 'India', 'Bangladesh', 'Brazil', 'Afghanistan', 'China', 'Egypt', 'France', 'Germany', 'Indonesia', 'Iran', 'Iraq', 'Italy', 'Japan', 'Kenya', 'Kuwait', 'Malaysia', 'Morocco', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Oman', 'Philippines', 'Qatar', 'Russia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Thailand', 'Turkey', 'Ukraine', 'Vietnam', 'Yemen'];
const PROFILE_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
let verifyUserId = null;
const VIP_ANIMALS = { 1: 'Sword Shield', 2: 'Twin White Wolves', 3: 'Emerald Sword', 4: 'Twin Blue Wolves', 5: 'Dark Wings', 6: 'White Tigers', 7: 'Twin Lions', 8: 'Golden Dragons', 9: 'Golden Lion', 10: 'Golden Phoenix', 11: 'Fire Lion', 12: 'Hooded King' };
/* Custom-drawn icons (original SVG art, no emoji anywhere in the app) */
function ic(name) { return '<img class="ic" src="assets/icons/' + name + '.svg" alt="">'; }
/* Categorised icon library (assets/icons/<category>/<name>.svg) */
function ic2(cat, name) { return '<img class="ic" src="assets/icons/' + cat + '/' + name + '.svg" alt="">'; }
function iconImg(v) { if (!v) return ic('gift'); if (typeof v === 'string' && (v.indexOf('.svg') !== -1 || v.indexOf('.png') !== -1 || v.indexOf('.jpg') !== -1 || v.indexOf('.jpeg') !== -1 || v.indexOf('.webp') !== -1)) return '<img class="ic" src="' + v + '" alt="">'; return ic('gift'); }
function vipPad(v) { return String(v || 1).padStart(2, '0'); }
/* ---------------- OWNER CUSTOMIZATION (no-code Studio) ----------------
   The owner changes design + content in the Owner Portal; the server stores
   them and the app applies them on load — no redeploy, no coding. */
let CONTENT_OVERRIDES = { design: {}, vip: {}, gifts: {}, shop: {}, aiConfigured: false };
function vipOverride(v, kind) { const o = (CONTENT_OVERRIDES.vip || {})[String(v || 1)]; return o && o[kind] ? o[kind] : null; }
async function loadCustomization() {
  try {
    const d = await api('/api/content', { headers: headers() });
    if (d) { CONTENT_OVERRIDES = d; applyDesign(CONTENT_OVERRIDES.design || {}); }
  } catch (e) { /* offline or guest — defaults stay */ }
}
function applyDesign(design) {
  if (!design) return;
  const r = document.documentElement.style;
  if (design.gold) r.setProperty('--gold', design.gold);
  if (design.gold2) r.setProperty('--gold2', design.gold2);
  if (design.text) r.setProperty('--text', design.text);
  if (design.muted) r.setProperty('--muted', design.muted);
  if (design.card) r.setProperty('--card', design.card);
  if (design.border) r.setProperty('--border', design.border);
  if (design.font) document.body.style.fontFamily = design.font;
  if (design.bg1 || design.bg2) document.body.style.background = 'linear-gradient(180deg, ' + (design.bg1 || '#ffffff') + ', ' + (design.bg2 || '#fdf9ec') + ')';
  if (design.appName) { document.title = design.appName; const b = document.querySelector('.brand span'); if (b) b.textContent = design.appName; }
}
/* Realistic VIP art lives in assets/vip/vipNN/ (photorealistic 3D-render style, not flat SVG). */
function vipBadgeSrc(v) { return vipOverride(v, 'badge') || ('assets/vip/vip' + vipPad(v) + '/badge.gif'); }
function vipEmblemImg(v) { const ov = vipOverride(v, 'badge'); return '<img class="vip-emblem-img" loading="lazy" decoding="async" src="' + vipBadgeSrc(v) + '" alt="VIP' + (v || 1) + '"' + (ov ? ' data-lb-override="' + (v || 1) + '"' : '') + '>'; }
function vipEmblemMini(v) { const ov = vipOverride(v, 'badge'); return '<img class="vip-emblem-mini" loading="lazy" decoding="async" src="' + vipBadgeSrc(v) + '" alt=""' + (ov ? ' data-lb-override="' + (v || 1) + '"' : '') + '>'; }
function vipFrameImg(v) { return vipOverride(v, 'frame') || ('assets/vip/vip' + vipPad(v) + '/frame.png'); }
function vipNameplateImg(v) { return vipOverride(v, 'nameplate') || ('assets/vip/vip' + vipPad(v) + '/nameplate.jpg'); }
function vipEntryImg(v) { return vipOverride(v, 'entry') || ('assets/vip/vip' + vipPad(v) + '/entry.jpg'); }
/* Rank banner (shows with the user's ID) + SVIP badge (shows with the name) */
function vipBannerImg(v, cls) { return '<img class="' + (cls || 'rank-banner-img') + '" src="' + vipNameplateImg(v) + '" alt="VIP' + (v || 1) + ' banner">'; }
function svipBadgeImg(cls) { return '<img class="' + (cls || 'svip-badge-img') + '" src="assets/vip/vip10/nameplate.jpg" alt="SVIP">'; }
/* Level pill — colours start low and grow into luxury as the level rises */
function levelTierOf(level) {
  const l = level || 1;
  if (l >= 50) return { name: 'Legend', cls: 'lv-legend' };
  if (l >= 40) return { name: 'Red-Gold', cls: 'lv-redgold' };
  if (l >= 30) return { name: 'Purple', cls: 'lv-purple' };
  if (l >= 20) return { name: 'Gold', cls: 'lv-gold' };
  if (l >= 10) return { name: 'Silver', cls: 'lv-silver' };
  return { name: 'Bronze', cls: 'lv-bronze' };
}
function levelPill(level) { const t = levelTierOf(level); return '<span class="level-pill ' + t.cls + '">Lv.' + (level || 1) + '</span>'; }
/* Owner / Admin tags — written with the user's ID */
function roleTag(u) {
  if (!u) return '';
  if (u.isOwner || u.role === 'owner') return '<span class="tag-owner">Owner</span>';
  if (u.isAdmin) return '<span class="tag-admin">Admin</span>';
  return '';
}
function vipTagHtml(u) {
  if (!u) return '';
  let h = '';
  if (u.svip) h += '<span class="tag-svip">SVIP</span>';
  else if (u.vip) h += '<span class="tag-vip">VIP' + u.vip + '</span>';
  return h;
}
function frameImgFor(u) {
  if (!u) return '';
  if (u.profileFrame === 'owner-frame') return '<img class="frame-img owner-frame-img" src="assets/vip/owner-frame.svg" alt="Owner frame">';
  return '';
}
let honorsData = null, honorsTab = 'honors';

function headers(json) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (TOKEN) h['Authorization'] = 'Bearer ' + TOKEN;
  return h;
}
async function api(path, opts) {
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || ('Request failed: ' + res.status)); e.data = data; throw e; }
  return data;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
/* Display name — NEVER "null" / "undefined" / blank (null-name fix 2026-11-22).
   The server already normalizes names; this is the client-side safety net
   for every place a name renders. Accepts a user object or a bare string. */
function displayName(u) {
  if (typeof u === 'string') u = { name: u };
  if (!u || typeof u !== 'object') return 'User';
  if (u.anonymous) return 'Anonymous';
  let n = (u.name == null ? '' : String(u.name)).trim();
  if (!n || n.toLowerCase() === 'null' || n.toLowerCase() === 'undefined') {
    if (u.role === 'owner' || u.isOwner) return 'Azlan';
    if (u.id) return 'User ' + u.id;
    return 'User';
  }
  return n;
}
/* ---------------- in-app prompt / confirm (null fix 2026-11-22) -----------
   The old code used the browser's native window.prompt() / window.confirm().
   In the Android WebView (Capacitor) those are not implemented the same way:
   prompt() returns null immediately — so "Create Room" silently did nothing
   — and on some Android versions the dialog itself shows the literal word
   "null" in the input field. Every prompt/confirm in the app now uses this
   in-app modal instead: it always works, on web and in the APK, and it can
   never show "null". */
let _appModalResolve = null;
function _appModalEl() {
  let el = document.getElementById('appModal');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'appModal'; el.className = 'app-modal hidden';
  el.innerHTML = '<div class="app-modal-card"><h3 id="appModalTitle"></h3><p id="appModalMsg"></p>' +
    '<input id="appModalInput" type="text">' +
    '<div class="app-modal-btns"><button class="btn ghost" id="appModalCancel">Cancel</button>' +
    '<button class="btn gold" id="appModalOk">OK</button></div></div>';
  document.body.appendChild(el);
  document.getElementById('appModalCancel').onclick = () => { _appModalClose(null); };
  document.getElementById('appModalOk').onclick = () => {
    const inp = document.getElementById('appModalInput');
    _appModalClose(inp.classList.contains('hidden') ? true : inp.value);
  };
  el.addEventListener('click', e => { if (e.target === el) _appModalClose(null); });
  return el;
}
function _appModalClose(val) {
  const el = document.getElementById('appModal'); if (el) el.classList.add('hidden');
  if (_appModalResolve) { const r = _appModalResolve; _appModalResolve = null; r(val); }
}
function _appModalOpen(title, msg, showInput, defVal, inputType) {
  const el = _appModalEl();
  document.getElementById('appModalTitle').textContent = title || '';
  document.getElementById('appModalMsg').textContent = msg || '';
  const inp = document.getElementById('appModalInput');
  inp.type = inputType || 'text';
  if (showInput) { inp.classList.remove('hidden'); inp.value = (defVal === undefined || defVal === null) ? '' : String(defVal); }
  else inp.classList.add('hidden');
  el.classList.remove('hidden');
  if (showInput) setTimeout(() => inp.focus(), 50);
  return new Promise(res => { _appModalResolve = res; });
}
/* In-app prompt: returns the typed text, or null on Cancel / tap outside.
   The input is NEVER pre-filled with "null" — an empty default stays empty. */
function appPrompt(title, msg, defVal, inputType) { return _appModalOpen(title, msg, true, defVal, inputType); }
/* In-app confirm: returns true for OK, false for Cancel / tap outside. */
function appConfirm(msg) { return _appModalOpen('Confirm', msg, false).then(v => v === true); }
function fmt(n) { return Number(n || 0).toLocaleString(); }
function show(id, on) { document.getElementById(id).classList.toggle('hidden', !on); }

/* ---------------- auth ---------------- */
function showAuth(which) {
  show('loginForm', which === 'login');
  show('registerForm', which === 'register');
  document.getElementById('tabLogin').classList.toggle('active', which === 'login');
  document.getElementById('tabRegister').classList.toggle('active', which === 'register');
}
async function doLogin(e) {
  e.preventDefault();
  try {
    const d = await api('/api/auth/login', { method: 'POST', headers: headers(true), body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPass').value }) });
    enterApp(d);
  } catch (err) {
    if (err.data && err.data.needsVerification) showVerifyScreen(err.data.userId, err.data.code);
    else { document.getElementById('authMsg').textContent = err.message; window.SFX && SFX.error(); }
  }
}
async function doRegister(e) {
  e.preventDefault();
  try {
    const d = await api('/api/auth/register', { method: 'POST', headers: headers(true), body: JSON.stringify({ name: document.getElementById('regName').value, email: document.getElementById('regEmail').value, password: document.getElementById('regPass').value, phone: document.getElementById('regPhone').value || undefined, inviteCode: document.getElementById('regInvite').value || undefined }) });
    if (d.needsVerification) showVerifyScreen(d.userId, d.code);
    else enterApp(d);
  } catch (err) { document.getElementById('authMsg').textContent = err.message; window.SFX && SFX.error(); }
}
/* Owner enters DIRECTLY — no login. Uses the owner key (change it in server.js / .env). */
/* Guest Mode — one tap creates a real guest account and logs in. */
async function guestLogin() {
  const tag = Math.random().toString(36).slice(2, 8);
  try {
    const d = await api('/api/auth/register', { method: 'POST', headers: headers(true), body: JSON.stringify({ name: 'Guest-' + tag.toUpperCase(), email: 'guest-' + tag + '@guest.azlanworld.chat', password: 'Guest!' + Math.random().toString(36).slice(2, 10) + '9' }) });
    enterApp(d);
  } catch (err) { document.getElementById('authMsg').textContent = err.message; }
}
/* Google / Facebook sign-in needs server keys, so these open email sign-up instead. */
function socialLogin(provider) {
  showAuth('register');
  document.getElementById('authMsg').textContent = provider === 'google'
    ? 'Google sign-in needs a server key — sign up with email below (takes 10 seconds).'
    : 'Facebook sign-in needs a server key — sign up with email below (takes 10 seconds).';
  document.getElementById('regName').focus();
}
/* ---------------- verification screen (6-digit code, shown in-app) ---------------- */
function showVerifyScreen(userId, code) {
  verifyUserId = userId;
  show('authScreen', false); show('verifyScreen', true); show('appScreen', false);
  document.getElementById('verifyCodeDisplay').textContent = code || '••••••';
  document.getElementById('verifyInput').value = '';
  document.getElementById('verifyMsg').textContent = '';
}
async function submitVerify() {
  const code = document.getElementById('verifyInput').value.trim();
  if (!/^\d{6}$/.test(code)) { document.getElementById('verifyMsg').textContent = 'Enter the 6-digit code.'; return; }
  try {
    const d = await api('/api/auth/verify', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId: verifyUserId, code }) });
    show('verifyScreen', false); enterApp(d);
  } catch (e) { document.getElementById('verifyMsg').textContent = e.message; }
}
async function resendVerifyCode() {
  try {
    const d = await api('/api/auth/resend-code', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId: verifyUserId }) });
    document.getElementById('verifyCodeDisplay').textContent = d.code || '••••••';
    document.getElementById('verifyMsg').textContent = 'New code sent — it is shown above.';
  } catch (e) { document.getElementById('verifyMsg').textContent = e.message; }
}
function backToAuth() { show('verifyScreen', false); show('authScreen', true); }
/* Icon for a VIP benefit name (keyword match). */
function benefitIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('entrance')) return ic('entrance');
  if (n.includes('mic animation') || n.includes('mic style')) return ic('mic');
  if (n.includes('mic wave')) return ic('wave');
  if (n.includes('mic connection')) return ic('link');
  if (n.includes('chat box')) return ic('chatbox');
  if (n.includes('front row')) return ic('users');
  if (n.includes('lucky bag')) return ic('lucky');
  if (n.includes('gift')) return ic('gift');
  if (n.includes('sticker')) return ic('sticker');
  if (n.includes('anonymous')) return ic('anonymous');
  if (n.includes('profile frame')) return ic('frame');
  if (n.includes('profile card')) return ic('card');
  if (n.includes('username') || n.includes('badge')) return ic('badge');
  if (n.includes('ride')) return iconImg('assets/rides/dragon-ride.svg');
  if (n.includes('theme')) return ic('theme');
  if (n.includes('customize id') || n.includes('custom id') || n.includes('personal id')) return ic('id');
  if (n.includes('honor') || n.includes('broadcast') || n.includes('level-up') || n.includes('level up')) return ic('trophy');
  if (n.includes('discount')) return ic('discount');
  if (n.includes('bonus point')) return ic('star');
  if (n.includes('golds') || n.includes('coin')) return ic('coin');
  if (n.includes('customer service')) return ic('support');
  if (n.includes('protection')) return ic('shield');
  return ic('sparkle');
}
/* OWNER PORTAL — COMPLETELY HIDDEN (owner rule 2026-11-22): no button, no
   menu entry, no link for anyone except the owner. The owner reveals the
   key field by tapping the Azlan logo 5 times within 3 seconds. The portal
   APIs reject every non-owner request server-side (ownerOnly), and the
   portal tab never renders for non-owners. */
let ownerLogoTaps = 0, ownerLogoTapTimer = null;
function ownerLogoTap() {
  ownerLogoTaps++;
  clearTimeout(ownerLogoTapTimer);
  ownerLogoTapTimer = setTimeout(() => { ownerLogoTaps = 0; }, 3000);
  if (ownerLogoTaps >= 5) {
    ownerLogoTaps = 0;
    const row = document.getElementById('ownerKeyRow');
    if (row) { row.classList.remove('hidden'); document.getElementById('ownerKeyInput').focus(); }
  }
}
async function ownerEnterKey() {
  const secret = (document.getElementById('ownerKeyInput') || {}).value || '';
  if (!secret) { document.getElementById('authMsg').textContent = 'Enter the owner key.'; return; }
  try {
    const d = await api('/api/owner/enter', { method: 'POST', headers: headers(true), body: JSON.stringify({ secret }) });
    enterApp(d, true);
  } catch (err) { document.getElementById('authMsg').textContent = 'Wrong owner key.'; }
}
async function ownerEnter() {
  const secret = await appPrompt('Owner Key', 'Owner key (OWNER_SECRET from the server — change the default before publishing):');
  if (!secret) return;
  try {
    const d = await api('/api/owner/enter', { method: 'POST', headers: headers(true), body: JSON.stringify({ secret }) });
    enterApp(d, true);
  } catch (err) { document.getElementById('authMsg').textContent = 'Wrong owner key.'; }
}
function enterApp(d, isOwner) {
  TOKEN = d.token; localStorage.setItem('awc_token', TOKEN); ME = d.user;
  show('authScreen', false); show('appScreen', true);
  showEntrance(ME);
  loadMe(); loadRooms(); loadAnnouncement(); loadNotifications(); loadControls();
  loadCustomization();
  /* Owner Portal button: visible ONLY to the owner, never to other users. */
  const ob = document.getElementById('ownerBtn');
  if (ob) ob.classList.toggle('hidden', !(isOwner || ME.role === 'owner'));
  initVip1FrameMotion(); initLivingBadges(); initRoomKeyboard();
  if (notifTimer) clearInterval(notifTimer);
  notifTimer = setInterval(loadNotifications, 8000);
  if (isOwner || ME.role === 'owner') openOwner();
}
function logout() { TOKEN = ''; ME = null; localStorage.removeItem('awc_token'); location.reload(); }
async function loadMe() {
  try {
    const d = await api('/api/me', { headers: headers() });
    ME = d.user;
    document.getElementById('myName').textContent = displayName(ME);
    document.getElementById('myName').className = 'vip-username vip-color-' + (ME.vip || 0);
    document.getElementById('myUid').textContent = 'ID: ' + ME.id + '  •  Level ' + (ME.level || 1);
    document.getElementById('myBio').textContent = ME.bio || '';
    const av = document.getElementById('myAvatar');
    av.className = 'avatar' + (ME.vip ? ' vip-frame' : '') + (ME.gifPhoto ? ' gif-photo' : '');
    if (ME.gifPhoto) av.innerHTML = '<img src="' + esc(ME.gifPhoto) + '" alt="profile">';
    else av.textContent = displayName(ME)[0].toUpperCase();
    document.getElementById('statCoins').textContent = fmt(ME.coins);
    document.getElementById('statDiamonds').textContent = fmt(ME.diamonds);
    document.getElementById('statCharm').textContent = fmt(ME.charm);
    document.getElementById('statWealth').textContent = fmt(ME.wealth);
    renderVipBadge();
  } catch (e) { /* session expired */ }
}
function renderVipBadge() {
  const el = document.getElementById('myVipBadge');
  if (!el) return;
  /* OWNER VIP FLOOR: the owner is always at least VIP 11 — the Me tab must
     never tell the owner he has "no VIP yet". */
  const v = ME && ME.role === 'owner' ? Math.max(ME.vip || 0, 11) : ((ME && ME.vip) || 0);
  if (v) {
    el.innerHTML = ic('crown') + ' VIP' + v + ' • ' + (VIP_ANIMALS[v] || '') + vipEmblemMini(v) + (ME && ME.svip ? ' • SVIP' : '');
  } else el.textContent = 'No VIP yet — open VIP Club';
}
/* VIP detail pages: when a detail page renders into #mePanel, bring its top
   (the "← Back to VIP Club" button) into view below the sticky app header,
   so the button never sits half-hidden under it. */
if (typeof MutationObserver !== 'undefined' && document.getElementById('mePanel')) {
  new MutationObserver(() => {
    const mp = document.getElementById('mePanel');
    if (mp && mp.innerHTML.indexOf('Back to VIP Club') !== -1) mp.scrollIntoView({ block: 'start' });
  }).observe(document.getElementById('mePanel'), { childList: true });
}
/* ---------------- Glory (My Badge / My Vehicle) ---------------- */
async function openGlory(kind) {
  const p = document.getElementById('mePanel');
  if (!ME) { p.innerHTML = '<p class="muted">Loading profile…</p>'; return; }
  if (kind === 'badge') {
    const cells = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => {
      const owned = ME.vip && v <= ME.vip;
      return '<div class="vip-art-cell' + (owned ? ' owned' : '') + '" style="' + (owned ? 'border-color:#d4af37;box-shadow:0 0 12px rgba(212,175,55,.5)' : 'opacity:.55') + '">' + vipEmblemMini(v) + '<span>VIP' + v + ' — ' + esc(VIP_ANIMALS[v] || '') + (owned ? ' • Owned' : ' • Locked') + '</span></div>';
    }).join('');
    p.innerHTML = '<div class="card"><h3>' + ic("medal") + ' Glory — My Badge</h3>' +
      '<p class="muted">Your badge: ' + (ME.vip ? 'VIP' + ME.vip + ' — ' + esc(VIP_ANIMALS[ME.vip]) : 'no VIP yet') + '</p>' +
      (ME.vip ? '<div style="text-align:center">' + vipEmblemImg(ME.vip) + '</div>' : '<p class="muted">Open the VIP Club to get your first badge.</p>') +
      '<div class="vip-art-row">' + cells + '</div>' +
      '<button class="btn gold" onclick="openVipClub()">Open VIP Club</button></div>';
  } else {
    try {
      const d = await api('/api/shop', { headers: headers() });
      const rides = d.items.filter(i => i.category === 'Ride');
      const owned = (ME.inventory || []).filter(id => rides.some(r => r.id === id));
      const rows = rides.map(r => {
        const has = owned.includes(r.id);
        return '<div class="user-row"><span>' + iconImg(r.icon) + ' <b>' + esc(r.name) + '</b> — ' + fmt(r.price) + ' coins ' + (has ? '• <b>Owned — in your garage</b>' : '') + '</span>' + (has ? '<button class="btn" disabled>Owned</button>' : '<button class="btn gold" onclick="buyShop(\'' + r.id + '\')">Buy</button>') + '</div>';
      }).join('');
      p.innerHTML = '<div class="card"><h3>' + iconImg('assets/gifts/gold-car.svg') + ' Glory — My Vehicle</h3>' +
        '<p class="muted">Your rides: ' + (owned.length ? owned.length + ' owned' : 'none yet — buy one below') + '</p>' + (rows || '<p class="muted">No vehicles in the store yet.</p>') + '</div>';
    } catch (e) { p.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; }
  }
}
/* ---------------- Low-performance mode ---------------- */
function isLowPerf() { try { return localStorage.getItem('awcLowPerf') === '1'; } catch (e) { return false; } }
function applyLowPerf() { document.body.classList.toggle('low-perf', isLowPerf()); }
function toggleLowPerf() { try { localStorage.setItem('awcLowPerf', isLowPerf() ? '0' : '1'); } catch (e) {} applyLowPerf(); }
/* ---------------- VIP 1 animated frame ---------------- */
/* The VIP 1 golden phoenix frame moves everywhere it appears: a slow golden shine
   sweeps the ring, the purple side gems twinkle, the phoenix flames flicker and its
   purple gem pulses, the crown glints. GPU-friendly (transform/opacity only), pauses
   off-screen via IntersectionObserver, and fully still in low-performance mode.
   Badge motion is the LIVING BADGES system (see below): breathing, blinking,
   head sway, wing shimmer, roar pulses and flame flicker over the photorealistic
   badge art — layered 2.5D motion, not a rendered 3D video. The golden owl is
   the emotion/motion reference for all badges. */
let vip1FrameObserver = null;
function enhanceVip1Frames(root) {
  const scope = root || document;
  const imgs = scope.querySelectorAll ? scope.querySelectorAll('img[src*="vip01/frame.png"]:not([data-v1f])') : [];
  imgs.forEach(img => {
    img.setAttribute('data-v1f', '1');
    const wrap = document.createElement('div');
    wrap.className = 'vip1-frame-anim ' + (img.className || '');
    img.className = '';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    ['v1f-shine', 'v1f-gem-l', 'v1f-gem-r', 'v1f-flame', 'v1f-crown'].forEach(c => {
      const s = document.createElement('span');
      s.className = 'v1f-fx ' + c;
      wrap.appendChild(s);
    });
    if (vip1FrameObserver) vip1FrameObserver.observe(wrap);
  });
}
function initVip1FrameMotion() {
  applyLowPerf();
  if ('IntersectionObserver' in window) {
    vip1FrameObserver = new IntersectionObserver(entries => {
      entries.forEach(en => en.target.classList.toggle('paused', !en.isIntersecting));
    }, { threshold: 0.05 });
  }
  enhanceVip1Frames(document);
  if ('MutationObserver' in window) {
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { enhanceVip1Frames(n); enhanceLivingBadges(n); } }));
    }).observe(document.body, { childList: true, subtree: true });
  }
}
/* ---------------- Living badges (2026-11-22) ---------------- */
/* REAL animated GIF badges (owner rule): each badge is a real .gif file with
   the motion baked in — breathing, blinking, fire from mouths, rim flames,
   embers, lava on VIP 10-12, VIP 12 walking to the throne. The GIF plays
   while visible; off-screen it swaps to the static PNG (a GIF cannot be
   paused by CSS). The layered CSS motion below is kept only as a fallback
   for PNG badges. The golden owl is the EMOTION/MOTION reference for all
   badges — every creature badge emotes like it. No emoji anywhere. */
const LB_EFFECT = { 1: 'lb-shield', 2: 'lb-beast lb-roar', 3: 'lb-shield', 4: 'lb-beast lb-roar', 5: 'lb-wings', 6: 'lb-beast lb-roar', 7: 'lb-beast lb-fire lb-roar', 8: 'lb-beast lb-fire lb-roar', 9: 'lb-beast lb-fire lb-roar', 10: 'lb-fire lb-wings lb-lava', 11: 'lb-beast lb-fire lb-roar lb-lava', 12: 'lb-fire lb-wings lb-lava' };
const LB_BLINK = [2, 4, 6, 7, 8, 9, 10, 11];
const LB_FIRE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const LB_LAVA = [10, 11, 12];
let livingBadgeObserver = null;
function enhanceLivingBadges(root) {
  const scope = root || document;
  const imgs = scope.querySelectorAll ? scope.querySelectorAll('img[src*="/badge.gif"]:not([data-lb]), img[src*="/badge.png"]:not([data-lb]), img[data-lb-override]:not([data-lb])') : [];
  imgs.forEach(img => {
    const ov = img.getAttribute('data-lb-override');
    const m = (img.getAttribute('src') || '').match(/vip(\d\d)\/badge\.(gif|png)/);
    const v = ov ? parseInt(ov, 10) : (m ? parseInt(m[1], 10) : 0);
    if (!v) return;
    const isGif = m ? m[2] === 'gif' : false; /* owner-uploaded badge art gets the layered living motion (CSS), not a GIF swap */
    img.setAttribute('data-lb', '1');
    const wrap = document.createElement('span');
    wrap.className = 'living-badge lb-vip' + v + (isGif ? ' lb-gif' : ' ' + (LB_EFFECT[v] || 'lb-beast'));
    if (isGif) {
      img.dataset.gif = img.getAttribute('src');
      img.dataset.png = img.getAttribute('src').replace('badge.gif', 'badge.png');
    }
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    if (isGif) { if (livingBadgeObserver) livingBadgeObserver.observe(wrap); return; }
    const glow = document.createElement('span'); glow.className = 'lb-fx lb-glow'; wrap.appendChild(glow);
    if (LB_FIRE.includes(v)) { const f = document.createElement('span'); f.className = 'lb-fx lb-flame'; wrap.appendChild(f); }
    const fx = document.createElement('span'); fx.className = 'lb-fx lb-firefx'; wrap.appendChild(fx);
    const em = document.createElement('span'); em.className = 'lb-fx lb-embers' + (LB_LAVA.includes(v) ? ' lb-lava-embers' : ''); wrap.appendChild(em);
    if (LB_LAVA.includes(v)) { const lv = document.createElement('span'); lv.className = 'lb-fx lb-lava'; wrap.appendChild(lv); }
    const sh = document.createElement('span'); sh.className = 'lb-fx lb-shine'; wrap.appendChild(sh);
    if (LB_BLINK.includes(v)) {
      const bl = document.createElement('span'); bl.className = 'lb-fx lb-blink-l'; wrap.appendChild(bl);
      const br = document.createElement('span'); br.className = 'lb-fx lb-blink-r'; wrap.appendChild(br);
    }
    if (livingBadgeObserver) livingBadgeObserver.observe(wrap);
  });
}
function initLivingBadges() {
  if ('IntersectionObserver' in window) {
    livingBadgeObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        en.target.classList.toggle('paused', !en.isIntersecting);
        // Real GIF badges: play the GIF while visible, freeze to the static
        // PNG frame while off-screen (a GIF cannot be paused by CSS).
        const im = en.target.querySelector('img');
        if (im && im.dataset.gif) {
          const want = en.isIntersecting ? im.dataset.gif : im.dataset.png;
          if (want && im.getAttribute('src') !== want) im.setAttribute('src', want);
        }
      });
    }, { threshold: 0.05 });
  }
  enhanceLivingBadges(document);
}
/* ---------------- Room keyboard shift (2026-11-22, corrected) ---------------- */
/* The room layout stays FIXED — no free scrolling of the room's inner content.
   ONLY when the keyboard opens to type does the screen move: the whole room
   shifts up as one unit (seats up, input visible, no split, no blank gap) and
   the fixed bottom nav hides; when the keyboard closes, the nav returns and the
   seats come back down. Handled via visualViewport (no keyboard plugin is
   installed); the Android manifest uses adjustResize so the WebView resizes
   instead of panning. */
let kbFullH = 0, kbShifted = false;
function roomKbUpdate() {
  const room = document.getElementById('roomView');
  if (!room || room.classList.contains('hidden')) return;
  const vv = window.visualViewport;
  const vh = vv ? vv.height : window.innerHeight;
  if (!kbFullH || kbFullH < vh) kbFullH = Math.max(kbFullH, vh);
  const kb = kbFullH - vh;
  const chat = document.getElementById('chatText');
  if (kb > 120 && document.activeElement === chat) {
    kbShifted = true;
    document.body.classList.add('kb-open');
    const bar = room.querySelector('.room-bottom-bar');
    if (bar) {
      const r = bar.getBoundingClientRect();
      if (r.bottom > vh - 4) bar.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  } else if (kb <= 120) {
    if (kbShifted) {
      kbShifted = false;
      document.body.classList.remove('kb-open');
      const grid = document.getElementById('micGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    kbFullH = window.innerHeight;
  }
}
function initRoomKeyboard() {
  kbFullH = window.innerHeight;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', roomKbUpdate);
    window.visualViewport.addEventListener('scroll', roomKbUpdate);
  }
  document.addEventListener('focusin', e => { if (e.target && e.target.id === 'chatText') setTimeout(roomKbUpdate, 250); });
  document.addEventListener('focusout', e => { if (e.target && e.target.id === 'chatText') setTimeout(roomKbUpdate, 250); });
}
async function loadAnnouncement() {
  try {
    const d = await api('/api/v2/notifications/announcement', { headers: headers() });
    const el = document.getElementById('announce');
    if (d.announcement) { el.innerHTML = ic('announce') + ' ' + esc(d.announcement); show('announce', true); }
  } catch (e) {}
}

/* ---------------- entrance effect ---------------- */
/* ENTRY EFFECT — RULE: the entry (animal, luxury car, anything) is SEPARATE and
   clearly VISIBLE on its own — one big standalone element, name below it.
   The whole entry lasts only 2–3 seconds, never more. It closes BY ITSELF
   1–2 seconds after the entry — auto-close, the user never closes it. */
/* Entry animation per level (tiered, one-time, auto-close — no loops):
   1-3 badge sweep, 4-6 gold wings, 7 fire phoenix, 8 diamond portal,
   9 phoenix, 10 dragon, 11 cosmic portal, 12 ULTIMATE DIVINE. */
/* Tiered entry durations (ms) — VIP 1-3: 2-3s, 4-6: 3-4s, 7-8: 4-5s,
   9-10: 5-7s, 11: 6-8s, 12: 8-10s. Entries auto-close and never block voice. */
const ENTRY_DUR = { 1: 2500, 2: 2500, 3: 3000, 4: 3500, 5: 3500, 6: 4000, 7: 4500, 8: 5000, 9: 6000, 10: 7000, 11: 7000, 12: 9000 };
function skipEntrance() { const fx = document.getElementById('entranceFx'); if (fx) fx.classList.add('hidden'); }
function showEntrance(user) {
  const fx = document.getElementById('entranceFx');
  if (APP_CONTROLS && APP_CONTROLS.entryEffects === false) { window.SFX && SFX.join(); return; }
  const dur = ENTRY_DUR[user.vip] || 2500;
  fx.style.setProperty('--entry-dur', (dur / 1000) + 's');
  /* Entry type per level — VIP 7 fire phoenix, VIP 8 diamond portal, VIP 9 phoenix, VIP 10 dragon, VIP 11 cosmic, VIP 12 divine. */
  const entry = user.entry || (user.vip >= 12 ? 'divine' : user.vip >= 11 ? 'cosmic' : user.vip === 10 ? 'dragon' : user.vip === 9 ? 'phoenix' : user.vip === 8 ? 'portal' : user.vip === 7 ? 'phoenix' : user.vip >= 4 ? 'wings' : 'sweep');
  if (user.vip) {
    const animCls = user.vip >= 5 ? ' vip5-anim' : '';
    /* REAL MOTION: the level's own entry art (1080x1920 photorealistic render) with a
       cinematic zoom + floating light particles + glowing rings. Layered 2.5D web motion
       (no Blender/GLB pipeline) — the art itself is a real 3D render. */
    const lowPerf = document.body.classList.contains('low-perf');
    const particles = lowPerf ? '' : '<div class="entrance-particles"><span></span><span></span><span></span><span></span><span></span><span></span></div>';
    let visual = '';
    if (user.banner) visual = '<img class="entrance-banner-img" src="' + user.banner + '" alt="VIP banner">';
    else visual = '<div class="entrance-art-wrap"><img class="entrance-motion-img" src="' + vipEntryImg(user.vip) + '" alt="VIP' + user.vip + ' entrance">' + particles + '</div>';
    fx.innerHTML = '<div class="entrance-standalone entry-' + entry + animCls + '">' + visual +
      '<div class="entrance-name' + animCls + '">' + esc(displayName(user)) + ' entered</div>' +
      '<div class="entrance-sub">' + ic('crown') + ' VIP' + user.vip + (user.animal ? ' • ' + esc(user.animal) : '') + '</div></div>';
  } else {
    fx.innerHTML = '<div class="entrance-standalone"><div class="entrance-text">' + ic('sparkle') + ' ' + esc(displayName(user)) + ' entered ' + ic('sparkle') + '<br><span style="font-size:13px">Welcome to AZLAN WORLD CHAT</span></div></div>';
  }
  fx.classList.remove('hidden'); fx.classList.remove('play'); void fx.offsetWidth; fx.classList.add('play');
  fx.innerHTML += '<button class="entrance-skip" onclick="skipEntrance()">Skip</button>';
  /* Auto-close after the tiered duration — the user never closes it. */
  setTimeout(() => fx.classList.add('hidden'), dur);
  window.SFX && SFX.join();
}

/* ---------------- tabs ---------------- */
function switchTab(tab) {
  /* Owner Portal is never shown to non-owners — not even an empty shell. */
  if (tab === 'owner' && (!ME || ME.role !== 'owner')) { switchTab('party'); return; }
  ['party', 'discover', 'messages', 'friends', 'me', 'owner'].forEach(t => show('tab-' + t, t === tab));
  show('roomView', false);
  show('voiceSettingsView', false);
  document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'party') loadRooms();
  if (tab === 'discover') loadMoments();
  if (tab === 'messages') loadInbox();
  if (tab === 'friends') { loadRankings('wealth'); loadFriends(); }
  if (tab === 'me') loadMe();
}
function openOwner() {
  if (!ME || ME.role !== 'owner') { alert('Owner only. Use the Owner Portal button on the login screen.'); return; }
  switchTab('owner');
  ownerStats();
}

/* ---------------- rooms ---------------- */
async function loadRooms() {
  try {
    const d = await api('/api/rooms', { headers: headers() });
    renderRooms(d.rooms);
    loadHonorBanner();
  } catch (e) { document.getElementById('roomList').innerHTML = '<p class="muted">Please log in first.</p>'; }
}
async function loadHonorBanner() {
  try {
    const d = await api('/api/v2/vipx/honor', { headers: headers() });
    const el = document.getElementById('honorBanner');
    if (el && d.banner) el.innerHTML = '<div class="honor-banner">' + ic("trophy") + ' ' + esc(d.banner) + '<br><span class="muted">Your personal information can be displayed on the banner by official in the Room-Recommend page.</span></div>';
  } catch (e) {}
}
function renderRooms(rooms) {
  const el = document.getElementById('roomList');
  if (!rooms.length) { el.innerHTML = '<div class="empty-state">' + ic("mic") + '<p>No rooms yet — create the first one!</p></div>'; return; }
  el.innerHTML = rooms.map(r =>
    '<div class="room-card" onclick="joinRoom(\'' + r.id + '\')"><h3>' + esc(r.name) + '</h3>' +
    '<div class="room-meta"><span class="chip">' + ic("mic") + ' ' + esc(r.topic || 'Chat') + '</span><span class="chip">' + ic("users") + ' ' + (r.members || []).length + ' members</span><span class="chip">Lv.' + (r.level || 1) + '</span><span class="chip">ID ' + r.id + '</span></div>' +
    '<button class="btn gold room-join">Join Room — tap to talk ›</button></div>'
  ).join('');
}
async function searchRooms() {
  const q = document.getElementById('roomSearch').value.trim();
  if (!q) return loadRooms();
  try { const d = await api('/api/v2/rooms/search?q=' + encodeURIComponent(q), { headers: headers() }); renderRooms(d.rooms); } catch (e) {}
}
async function createRoomPrompt() {
  const name = await appPrompt('Create Room', 'Room name:');
  if (!name) return;
  const topic = (await appPrompt('Create Room', 'Topic (e.g. Music, Chat, Games):', 'Chat')) || 'Chat';
  try {
    const d = await api('/api/rooms', { method: 'POST', headers: headers(true), body: JSON.stringify({ name, topic }) });
    joinRoom(d.room.id);
  } catch (e) { alert(e.message); }
}
async function joinRoom(id) {
  try {
    const d = await api('/api/rooms/' + id + '/join', { method: 'POST', headers: headers() });
    currentRoom = d.room;
    /* Joining a room clears any background room (we are back inside one). */
    if (bgRoom && bgRoom.id !== id) { bgRoom = null; bgKicked = false; renderBgMiniPlayer(); await clearBgNotification(); }
    else if (bgRoom) { bgRoom = null; bgKicked = false; renderBgMiniPlayer(); await clearBgNotification(); }
    roomTabFilter = 'all'; roomGiftEvents = [];
    show('roomView', true); show('voiceSettingsView', false);
    /* Hide EVERY other tab page (party/discover/messages/friends/me/owner):
       leaving one visible (e.g. the Owner tab) would steal the flex column
       height and squeeze the room to nothing. */
    ['party', 'discover', 'messages', 'friends', 'me', 'owner'].forEach(t => show('tab-' + t, false));
    /* BOTTOM NAV HIDDEN INSIDE ROOMS (owner rule): the Party / Discover /
       Messages / Friends / Me bar shows only OUTSIDE rooms. */
    document.body.classList.add('in-room');
    const stage = document.querySelector('.room-stage');
    if (stage) {
      /* Keep the dark luxury room class — joinRoom must not wipe it. */
      stage.className = 'room-stage dark-room' + (ME.roomTheme && ME.roomTheme !== 'default' ? ' theme-' + ME.roomTheme : '') + (currentRoom.hostTheme ? ' theme-' + currentRoom.hostTheme : '');
      const bg = document.getElementById('roomBg');
      if (bg) bg.style.backgroundImage = currentRoom.hostTheme ? 'url(assets/themes/' + currentRoom.hostTheme + '.svg)' : '';
    }
    renderRoomHeader(); renderMicGrid(); renderRoomChat(); renderVoiceNotes(); renderOnlineUsers();
    addWelcomeMessage(displayName(ME), false);
    startRoomFeedPoll();
    if (d.entrance) showEntrance({ name: displayName(d.entrance), vip: d.entrance.vip, banner: d.entrance.banner, animal: d.entrance.animal });
    window.SFX && SFX.join();
    joinAgoraChannel(currentRoom.id);
  } catch (e) { alert(e.message); }
}
/* ---------------- BACKGROUND LIVE MODE: mini-player + notification ----
   leaveRoom() = go to the menu but STAY IN THE ROOM (voice keeps running
   in the background). leaveRoomFully() = leave for real: voice stops, the
   mini-player and the phone notification go away. */
function bgRoomName() { return bgRoom ? bgRoom.name : ''; }
function renderBgMiniPlayer() {
  const bar = document.getElementById('bgMiniPlayer');
  if (!bar) return;
  if (!bgRoom) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
  bar.classList.remove('hidden');
  const kicked = bgKicked;
  bar.innerHTML = '<span class="bg-live-dot" aria-hidden="true"></span>' +
    '<span class="bg-mini-text"><b>' + (kicked ? 'You were removed from this room' : 'Live in background') + '</b>' +
    '<span>' + esc(bgRoom.name) + ' • Mic: ' + (micOn ? 'ON' : 'OFF') + '</span></span>' +
    '<button class="btn gold bg-mini-btn" onclick="returnToRoom()">Back to Room</button>' +
    (kicked ? '<button class="btn bg-mini-btn" onclick="rejoinBgRoom()">Rejoin</button>' : '<button class="btn bg-mini-btn" onclick="toggleMic();renderBgMiniPlayer()">' + (micOn ? 'Mute Mic' : 'Unmute Mic') + '</button>') +
    '<button class="btn danger bg-mini-btn" onclick="leaveRoomFully()">Leave Room</button>';
}
async function rejoinBgRoom() {
  if (!bgRoom) return;
  const id = bgRoom.id;
  bgRoom = null; bgKicked = false; renderBgMiniPlayer(); await clearBgNotification();
  await joinRoom(id);
}
function returnToRoom() {
  if (!bgRoom) return;
  currentRoom = bgRoom; bgRoom = null; bgKicked = false;
  renderBgMiniPlayer(); clearBgNotification();
  document.body.classList.add('in-room');
  ['party', 'discover', 'messages', 'friends', 'me', 'owner'].forEach(t => show('tab-' + t, false));
  show('voiceSettingsView', false); show('roomView', true);
  renderRoomHeader(); renderMicGrid(); renderRoomChat(); renderVoiceNotes(); renderOnlineUsers();
  startRoomFeedPoll();
}
/* The phone notification bar: on the APK this is a real persistent system
   notification via @capacitor/local-notifications (ongoing, tap = open the
   app). On the web there is no system notification, so the browser
   Notification API is used when the user allowed it — otherwise the
   in-app mini-player + "Background mode ON" banner is the indicator, and
   the app never pretends a system notification exists. */
function bgNotifPlugin() {
  try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || (window.LocalNotifications) || null; } catch (e) { return null; }
}
async function requestBgNotificationPermission() {
  const p = bgNotifPlugin();
  if (p && p.requestPermissions) { try { await p.requestPermissions(); } catch (e) {} return; }
  if ('Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) {} }
}
async function showBgNotification() {
  if (!bgRoom) return;
  const title = 'Azlan World Chat • Running in background';
  const body = bgKicked ? ('You were removed from ' + bgRoom.name) : ('Still live in ' + bgRoom.name + ' — tap to return to the room');
  const p = bgNotifPlugin();
  if (p && p.schedule) {
    try {
      await p.schedule({ notifications: [{ id: 1, title, body, ongoing: true, autoCancel: false, smallIcon: 'ic_launcher', sound: null }] });
      bgNotifOn = true; return;
    } catch (e) { /* fall through to the web path */ }
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body, tag: 'awc-bg-live' }); bgNotifOn = true; return; } catch (e) {}
  }
  bgNotifOn = false;
}
async function clearBgNotification() {
  const p = bgNotifPlugin();
  if (p && p.cancel) { try { await p.cancel({ notifications: [{ id: 1 }] }); } catch (e) {} }
  bgNotifOn = false;
}
async function leaveRoom() {
  /* Minimise to the menu — stay joined, voice keeps running in the
     background, mini-player + phone notification keep the room live. */
  if (!currentRoom) return;
  bgRoom = currentRoom; bgKicked = false; currentRoom = null;
  document.body.classList.remove('in-room');
  show('roomView', false); show('tab-party', true);
  renderBgMiniPlayer();
  await requestBgNotificationPermission();
  await showBgNotification();
  loadRooms();
}
async function leaveRoomFully() {
  /* Leave for real: stop voice, stop the poll, clear mini-player and the
     phone notification. */
  const id = (bgRoom && bgRoom.id) || (currentRoom && currentRoom.id);
  if (roomFeedTimer) { clearInterval(roomFeedTimer); roomFeedTimer = null; }
  try { await leaveAgoraChannel(); } catch (e) {}
  document.body.classList.remove('in-room');
  currentRoom = null; bgRoom = null; bgKicked = false;
  await clearBgNotification();
  renderBgMiniPlayer();
  show('roomView', false); show('tab-party', true); loadRooms();
  if (id) { try { await api('/api/rooms/' + id + '/leave', { method: 'POST', headers: headers() }); } catch (e) {} }
}
/* Room header — Yalla-style top bar: host photo + name + ID on the left,
   trophy/level pill + member count on the right, inbox / share / power
   icons top-right. The room name stays on top with the gold wing badge. */
function renderRoomHeader() {
  const el = document.getElementById('roomHeader'); if (!el || !currentRoom) return;
  const host = (currentRoom.members || []).find(m => m.id === currentRoom.hostId);
  const members = currentRoom.members || [];
  const hostInitial = esc((host ? displayName(host) : 'A')[0].toUpperCase());
  el.innerHTML = '<div class="room-topbar"><div class="rt-host"><span class="rt-host-av">' + hostInitial + '</span><div><div class="rt-name"><span class="rt-name-text">' + esc(currentRoom.name) + '</span> <img class="rt-wing" src="assets/icons/wing-badge.svg" alt="wing badge"></div>' +
    '<div class="rt-sub">' + (host ? '<span>' + esc(displayName(host)) + '</span>' : '') + ' <span class="muted">ID: ' + currentRoom.id + '</span></div></div></div>' +
    '<div class="rt-right"><span class="trophy-pill">' + ic('trophy') + ' Lv.' + (currentRoom.level || 1) + '</span>' +
    '<span class="member-pill">' + ic('users') + ' ' + members.length + '</span>' +
    '<button class="icon-btn" onclick="showNotifications()" title="Inbox">' + ic('bell') + '</button>' +
    '<button class="icon-btn" onclick="shareRoom()" title="Share room">' + ic('invite') + '</button>' +
    '<button class="icon-btn" onclick="leaveRoom()" title="Go to menu — stay live in this room in the background"><img class="ic" src="assets/icons/power.svg" alt="Exit to menu"></button></div></div>';
  renderPkBar(); renderRoomTabs(); renderWelcomeBox();
}
/* Welcome message box under the announcement (always visible in the room). */
function renderWelcomeBox() {
  const el = document.getElementById('roomWelcome'); if (!el || !currentRoom) return;
  el.innerHTML = '<div class="welcome-box">Welcome to ' + esc(currentRoom.name) + ' — please respect each other and chat in a decent manner.</div>';
}
/* Announcement box below the mic seats (Yalla style, with an edit icon for
   the host). Saved on the server, so every member sees the same text. */
function renderPkBar() {
  const el = document.getElementById('roomPkBar'); if (!el || !currentRoom) return;
  const text = currentRoom.announce || ('Welcome to ' + currentRoom.name + ' — enjoy the party!');
  const canEdit = currentRoom.hostId === ME.id || ME.role === 'owner';
  el.innerHTML = '<div class="pk-bar announce-box" onclick="pkBarTap()"><span class="pk-badge">Announcement</span><span class="pk-text">' + esc(text) + '</span>' + (canEdit ? '<span class="pk-edit">' + ic('edit') + '</span>' : '') + '</div>';
}
async function pkBarTap() {
  if (currentRoom && (currentRoom.hostId === ME.id || ME.role === 'owner')) {
    const a = await appPrompt('Room Announcement', 'Room announcement (shows to everyone in the room):', currentRoom.announce || '');
    if (a !== null) {
      try { const d = await api('/api/rooms/' + currentRoom.id + '/settings', { method: 'POST', headers: headers(true), body: JSON.stringify({ announce: a }) }); currentRoom = d.room; renderPkBar(); }
      catch (e) { alert(e.message); }
    }
  }
}
/* All / Chat / Gift tabs under the mics */
function renderRoomTabs() {
  const el = document.getElementById('roomTabs'); if (!el) return;
  el.innerHTML = ['all', 'chat', 'gift'].map(t => '<button class="room-tab' + (roomTabFilter === t ? ' active' : '') + '" onclick="setRoomTab(\'' + t + '\')">' + t[0].toUpperCase() + t.slice(1) + '</button>').join('');
}
function setRoomTab(t) { roomTabFilter = t; renderRoomTabs(); renderRoomChat(); }
/* Share the room (copies an invite) */
function shareRoom() {
  if (!currentRoom) return;
  const text = 'Join my room "' + currentRoom.name + '" on AZLAN WORLD CHAT! Room ID: ' + currentRoom.id;
  if (navigator.clipboard) { navigator.clipboard.writeText(text); alert('Room invite copied — share it anywhere!'); }
  else alert(text);
}
/* Speaker button: mute the WHOLE room's sound */
function toggleRoomSound() {
  roomMuted = !roomMuted;
  window.SFX_MUTED = roomMuted;
  const btn = document.getElementById('roomSoundBtn');
  if (btn) { btn.style.opacity = roomMuted ? '0.45' : '1'; btn.title = roomMuted ? 'Room sound OFF — tap to unmute' : 'Mute the whole room'; }
}
/* ---------------- ROOM BOTTOM BAR — exactly 8 controls (owner rule) --------
   (1) Speaker — mutes the WHOLE room. (2) Mic mute/unmute. (3) Emoji.
   (4) Comment bar ("Say some..." typing box). (5) Hamburger — music and
   everything playable from it. (6) Raise hand. (7) Gift bag. (8) Grid —
   a menu with everything, including gifts. Nothing else in the bar. */
/* Emoji tray: tap an emoji to insert it into the room chat box. (Emoji here
   are user-typed chat content only — app icons are always original SVG.) */
const ROOM_EMOJIS = ['😀', '😂', '😍', '🔥', '👏', '❤️', '🎉', '👍', '😮', '😢', '😎', '🙏'];
function toggleEmojiTray() {
  const tray = document.getElementById('emojiTray'); if (!tray) return;
  if (tray.classList.contains('hidden')) {
    tray.innerHTML = ROOM_EMOJIS.map(e => '<button class="emoji-btn" onclick="insertRoomEmoji(\'' + e + '\')">' + e + '</button>').join('');
    tray.classList.remove('hidden');
  } else tray.classList.add('hidden');
}
function insertRoomEmoji(e) {
  const inp = document.getElementById('chatText'); if (!inp) return;
  inp.value += e; inp.focus();
}
/* Room menus: hamburger = music + room controls; grid = everything,
   including gifts. The old .room-controls row is hidden — its actions live
   here now, so the room screen stays clean. */
function openRoomMenu(mode) {
  const card = document.getElementById('roomMenuCard'); const modal = document.getElementById('roomMenu');
  if (!card || !modal) return;
  const item = (fn, iconHtml, label) => '<button class="btn room-menu-item" onclick="closeRoomMenu();' + fn + '">' + iconHtml + ' ' + label + '</button>';
  let html = '<h3>' + (mode === 'all' ? ic('grid') + ' Everything' : ic('menu') + ' Room Menu') + '</h3>';
  html += item('playRoomMusic()', ic('music'), 'Play Music');
  html += item('startVoiceNote()', ic('mic'), 'Voice Message');
  html += item('openVoiceSettings(true)', ic2('room', 'microphone'), 'Mic Settings');
  html += item('openRoomSettings()', ic2('admin', 'settings'), 'Room Settings');
  html += item('openMicStyles()', ic('mic'), 'Mic Style');
  html += item('openMicWaves()', ic('wave'), 'Mic Wave');
  html += item('openVoiceSettings(true)', ic2('room', 'speaker'), 'Voice Settings');
  html += item('renderOnlineUsers()', ic('users'), 'Online Users');
  if (mode === 'all') {
    html += item('showGiftPanel()', ic('gift'), 'Send Gift');
    html += item('openRoomThemes()', ic('theme'), 'Room Themes');
    html += item('openEmojiPanel()', ic('smile'), '3D Emoji');
    html += item('leaveRoom()', ic('power'), 'Leave Room');
  }
  html += '<button class="btn ghost" onclick="closeRoomMenu()">Close</button>';
  card.innerHTML = html;
  modal.classList.remove('hidden');
}
function closeRoomMenu() { const m = document.getElementById('roomMenu'); if (m) m.classList.add('hidden'); }
/* Welcome message when a real user comes into the room */
function addWelcomeMessage(name, onMount) {
  const box = document.getElementById('roomChat'); if (!box) return;
  const div = document.createElement('p');
  div.className = 'welcome-msg';
  div.innerHTML = 'Welcome <b>' + esc(displayName(name)) + '</b> come into the room' + (onMount ? ' on a mount' : '');
  box.appendChild(div); box.scrollTop = box.scrollHeight;
}
/* Room gift feed: every gift shows in the room with sender photo + gift +
   recipient photo, so everyone sees WHO sent WHAT to WHOM. No silent sends. */
function appendRoomGiftEvent(ev) {
  const feed = document.getElementById('roomGiftFeed'); if (!feed || !ev) return;
  roomGiftEvents.push(ev);
  if (roomGiftEvents.length > 20) roomGiftEvents = roomGiftEvents.slice(-20);
  const div = document.createElement('div');
  div.className = 'gift-feed-item';
  div.innerHTML = roomChatAvatar(displayName(ev.fromName)) + (ev.giftSvg ? '<img src="' + ev.giftSvg + '" alt="">' : '') + roomChatAvatar(displayName(ev.toName)) + '<span><b>' + esc(displayName(ev.fromName)) + '</b> sent <b>' + esc(ev.giftName) + '</b>' + (ev.qty > 1 ? ' ×' + ev.qty : '') + ' to <b>' + esc(displayName(ev.toName)) + '</b></span>';
  feed.appendChild(div);
  while (feed.children.length > 5) feed.removeChild(feed.firstChild);
  renderRoomChat();
}
/* Small-gift toast: a clear animated display (sender photo + gift +
   recipient photo) that floats over the room for 3 seconds. Big gifts
   (>=100,000 coins) get the big 3D banner + sound instead (5s, auto-close). */
function showGiftToast(ev) {
  const stage = document.querySelector('.room-stage'); if (!stage) return;
  const old = stage.querySelector('.room-gift-toast'); if (old) old.remove();
  const g = ev.gift || {};
  const div = document.createElement('div');
  div.className = 'room-gift-toast';
  div.innerHTML = roomChatAvatar(displayName(ev.fromName)) + (g.svg ? '<img src="' + g.svg + '" alt="">' : '') + roomChatAvatar(displayName(ev.toName)) +
    '<span><b>' + esc(displayName(ev.fromName)) + '</b> sent <b>' + esc(g.name || 'a gift') + '</b>' + (ev.qty > 1 ? ' ×' + ev.qty : '') + ' to <b>' + esc(displayName(ev.toName)) + '</b></span>';
  stage.appendChild(div);
  setTimeout(() => div.remove(), 3000);
  if (!APP_CONTROLS || APP_CONTROLS.sounds) { if (window.SFX) SFX.gift(); }
}
function startRoomFeedPoll() {
  if (roomFeedTimer) clearInterval(roomFeedTimer);
  roomFeedTimer = setInterval(pollRoomGiftFeed, 5000);
  pollRoomGiftFeed();
}
async function pollRoomGiftFeed() {
  const room = currentRoom || bgRoom;
  if (!room) return;
  try {
    /* PERFORMANCE: one light poll request (chat + members + seats + gift
       feed) instead of the full room list every 5 seconds. While the room
       is in the background (mini-player), the same poll watches for a kick:
       if we are no longer a member, the mini-player + notification say so. */
    const d = await api('/api/rooms/' + room.id + '/poll', { headers: headers() });
    const fresh = d.room;
    if (!fresh) return;
    if (bgRoom && !currentRoom) {
      const stillIn = (fresh.members || []).some(m => m.id === ME.id);
      bgRoom = fresh; /* keep the background room's member list fresh */
      if (!stillIn && !bgKicked) {
        bgKicked = true;
        renderBgMiniPlayer(); await showBgNotification();
        if (roomFeedTimer) { clearInterval(roomFeedTimer); roomFeedTimer = null; }
      } else renderBgMiniPlayer();
      return;
    }
    const oldMembers = (currentRoom.members || []).map(m => m.id);
    fresh.members.forEach(m => { if (!oldMembers.includes(m.id)) addWelcomeMessage(m.name, false); });
    const prevChatId = lastChatId;
    const hadChat = (currentRoom.chat || []).length;
    currentRoom.members = fresh.members; currentRoom.seats = fresh.seats;
    currentRoom.chat = fresh.chat; currentRoom.level = fresh.level;
    if (fresh.announce !== undefined && fresh.announce !== currentRoom.announce) { currentRoom.announce = fresh.announce; renderPkBar(); }
    renderMicGrid(); renderRoomHeader();
    const chat = currentRoom.chat || [];
    if (chat.length !== hadChat || (chat.length && chat[chat.length - 1].id !== prevChatId)) renderRoomChat();
    (fresh.giftFeed || []).forEach(ev => {
      if (!shownGiftEventIds.has(ev.id)) {
        shownGiftEventIds.add(ev.id);
        appendRoomGiftEvent(ev);
        if (ev.fromId !== ME.id) {
          if ((ev.cost || 0) >= 100000) showGiftBroadcast3D({ fromName: ev.fromName, toName: ev.toName, gift: { name: ev.giftName, svg: ev.giftSvg, anim: ev.giftAnim, sound: ev.giftSound, price: ev.cost }, qty: ev.qty });
          else showGiftToast({ fromName: ev.fromName, toName: ev.toName, gift: { name: ev.giftName, svg: ev.giftSvg }, qty: ev.qty });
        }
      }
    });
  } catch (e) {}
}
function renderMicGrid() {
  const grid = document.getElementById('micGrid');
  let html = '';
  /* Host seat 1 sits in the MIDDLE of the top row (like the example room),
     seats 2–8 around it. 8 mic seats total (host + 7) — rooms start EMPTY,
     only real users appear. */
  const order = [2, 3, 1, 4, 5, 6, 7, 8];
  for (const s of order) {
    const seat = (currentRoom.seats || []).find(x => x.seat === s);
    if (seat) {
      const u = seat.user || {};
      const name = displayName({ ...u, id: u.id || seat.userId });
      const vip = u.vip || 0;
      const ring = MIC_RING_COLORS[vip] || '';
      const styleCls = u.micStyle && u.micStyle !== 'default' ? ' style-' + u.micStyle : '';
      const waveCls = u.micWave && u.micWave !== 'default' ? ' wave-' + u.micWave : '';
      const sticker = u.micSticker ? '<span class="seat-sticker">' + iconImg(u.micSticker.icon) + '</span>' : '';
      const emoji = u.micEmoji ? '<span class="seat-emoji"><img src="' + u.micEmoji.svg + '" alt="' + esc(u.micEmoji.name) + '"></span>' : '';
      const ringStyle = ring ? ' style="border-color:' + ring + ';box-shadow:0 0 16px ' + ring + '"' : '';
      const speaking = seat.micOn ? ' speaking' : '';
      /* Golden winged badge ABOVE the host seat (the marked badge). */
      const wing = s === 1 ? '<img class="host-wing-badge" src="assets/icons/wing-badge.svg" alt="Host badge">' : '';
      /* VIP icon + rank at the SIDE of the mic — never on top of the photo. */
      const vipSide = vip ? '<span class="seat-vip-side">' + vipEmblemMini(vip) + '<span>VIP' + vip + '</span></span>' : '';
      /* The user's photo (initial) stays clear in the middle of the seat. */
      const photo = u.micEmoji ? '' : '<span class="seat-avatar seat-photo">' + esc((name || 'U')[0].toUpperCase()) + '</span>';
      html += '<div class="mic-seat ufo taken vip' + vip + styleCls + waveCls + speaking + (s === 1 ? ' host-seat' : '') + '" data-userid="' + esc(seat.userId) + '" onclick="takeSeat(' + s + ')">' +
        '<div class="seat-circle"' + ringStyle + '>' + wing + sticker + emoji + vipSide + photo +
        '<span class="seat-micstate">' + (seat.micOn ? '' + ic('volume') + '' : '' + ic('mic-off') + '') + '</span></div>' +
        '<span class="seat-name vip-color-' + vip + '">' + esc(name) + '</span>' +
        '<span class="seat-num">' + s + '</span></div>';
    } else {
      html += '<div class="mic-seat ufo" onclick="takeSeat(' + s + ')"><div class="seat-circle seat-empty"><span class="seat-avatar">' + ic('mic') + '</span></div><span class="seat-num">' + s + '</span></div>';
    }
  }
  grid.innerHTML = html;
  const conn = ME.micConnection;
  const note = document.getElementById('micConnNote');
  if (note) note.innerHTML = conn ? ic('link') + ' Mic Connection: ' + esc(conn.name) + ' — animated waveform line links the seats.' : '';
}
/* Front Row on Online User List — VIP users first, with frame + level */
function renderOnlineUsers() {
  const el = document.getElementById('onlineUsers');
  if (!el || !currentRoom) return;
  const members = (currentRoom.members || []).slice().sort((a, b) => (b.vip || 0) - (a.vip || 0));
  const total = members.length;
  el.innerHTML = '<p class="muted">'+ic("users")+' Online Users: ' + total + '</p>' + members.map(m =>
    '<span class="online-user' + (m.vip ? ' vip-first' : '') + '" onclick="openProfile(\'' + m.id + '\')"><span class="ou-avatar">' + esc(displayName(m)[0].toUpperCase()) + '</span><span class="' + (m.vip ? 'vip-color-' + m.vip : '') + '">' + esc(displayName(m)) + '</span>' + roleTag(m) + ' ' + vipTagHtml(m) + ' ' + levelPill(m.level) + (m.micSticker ? '<span class="ou-sticker">' + iconImg(m.micSticker.icon) + '</span>' : '') + (m.micEmoji ? '<span class="ou-sticker"><img src="' + m.micEmoji.svg + '" alt=""></span>' : '') + '</span>'
  ).join('') +
  (currentRoom.hostId === ME.id || ME.role === 'owner' ? '<p class="muted">Host tools: tap a user above to open their profile, or <button class="btn ghost" onclick="makeRoomAdminPrompt()">Make Admin</button></p>' : '');
}
async function takeSeat(s) {
  const seat = (currentRoom.seats || []).find(x => x.seat === s);
  if (seat) { openMicProfile(seat.userId); return; }
  try {
    const d = await api('/api/rooms/' + currentRoom.id + '/seat', { method: 'POST', headers: headers(true), body: JSON.stringify({ seat: s, micOn }) });
    currentRoom = d.room; renderMicGrid();
  } catch (e) { alert(e.message); }
}
/* Profile opened from the mic seat — shows Mic Mute / Mic Leave for my own
   seat, or Remove from Mic for host/admin viewing someone else. */
function openMicProfile(userId) { openProfile(userId, true); }
function backToRoom() { if (bgRoom && !currentRoom) { returnToRoom(); return; } if (currentRoom) { ['party', 'discover', 'messages', 'friends', 'me', 'owner'].forEach(t => show('tab-' + t, false)); show('voiceSettingsView', false); show('roomView', true); } }
async function micMuteFromProfile() { if (micOn) await toggleMic(); backToRoom(); }
async function micLeaveFromProfile() {
  try { const d = await api('/api/rooms/' + currentRoom.id + '/leave-seat', { method: 'POST', headers: headers() }); currentRoom = d.room; renderMicGrid(); }
  catch (e) { alert(e.message); }
  profileFromMic = false; backToRoom();
}
async function removeFromMic(userId) {
  if (!(await appConfirm('Remove this user from the mic?'))) return;
  try {
    const d = await api('/api/rooms/' + currentRoom.id + '/remove-seat', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId }) });
    currentRoom = d.room; renderMicGrid(); profileFromMic = false; backToRoom();
  } catch (e) { alert(e.message); }
}
function micProfileActionsHtml(d, u) {
  if (!currentRoom) return '';
  if (d.isMe) return '<div class="mic-profile-actions"><button class="btn gold" onclick="micMuteFromProfile()">' + ic("mic-off") + ' Mic Mute</button><button class="btn danger" onclick="micLeaveFromProfile()">Mic Leave</button><button class="btn" onclick="backToRoom()">Back to Room</button></div>';
  const canRemove = currentRoom.hostId === ME.id || (currentRoom.admins || []).includes(ME.id) || ME.role === 'owner';
  if (canRemove) return '<div class="mic-profile-actions"><button class="btn danger" onclick="removeFromMic(\'' + u.id + '\')">Remove from Mic</button><button class="btn" onclick="backToRoom()">Back to Room</button></div>';
  return '<div class="mic-profile-actions"><button class="btn" onclick="backToRoom()">Back to Room</button></div>';
}
async function setMicState(on, opts) {
  micOn = !!on;
  const btn = document.getElementById('micBtn');
  if (btn) btn.innerHTML = micOn ? '' + ic("mic") + ' Mic: ON' : '' + ic("mic-off") + ' Mic: OFF';
  syncMicBarBtn();
  window.SFX && (micOn ? SFX.micOn() : SFX.micOff());
  /* Live voice: mute/unmute the Agora microphone track too. */
  if (window.AGORA && AGORA.localTrack) { try { await AGORA.localTrack.setMuted(!micOn); } catch (e) {} }
  if (!currentRoom) return;
  try { await api('/api/v2/rooms/' + currentRoom.id + '/mic', { method: 'POST', headers: headers(true), body: JSON.stringify({ micOn }) }); } catch (e) {}
  renderMicGrid();
}
/* Bottom-bar mic button (room): shows the live mic state. */
function syncMicBarBtn() {
  const b = document.getElementById('micBarBtn'); if (!b) return;
  b.innerHTML = '<img src="assets/icons/' + (micOn ? 'mic' : 'mic-off') + '.svg" alt="Mic">';
  b.style.opacity = micOn ? '1' : '0.45';
  b.title = micOn ? 'Mute my mic' : 'Unmute my mic';
}
async function toggleMic() { await setMicState(!micOn); }
/* TEXT CHAT ALONGSIDE VOICE (owner rule): the message list + typing box stay
   visible on the same room screen while people talk on voice — the chat
   never disappears when voice is on. Yalla format: avatar on the left,
   name + VIP badge + level, message bubble below. */
function roomChatAvatar(name) { return '<span class="chat-av">' + esc(((name || 'U')[0] || 'U').toUpperCase()) + '</span>'; }
function roomChatLevel(userId) {
  const m = (currentRoom.members || []).find(x => x.id === userId);
  return m ? (m.level || 1) : 1;
}
let lastChatId = 0;
function renderRoomChat() {
  const box = document.getElementById('roomChat');
  if (!box || !currentRoom) return;
  const head = '<div class="room-chat-head">' + ic('chat') + ' Room Chat <span class="muted">(' + ((currentRoom.chat || []).length) + ')</span></div>';
  let html = head;
  if (roomTabFilter === 'all' || roomTabFilter === 'chat') {
    html += (currentRoom.chat || []).slice(-30).map(m =>
      '<div class="chat-msg-row"><div class="chat-av-wrap">' + roomChatAvatar(displayName(m)) + '</div>' +
      '<div class="chat-body"><div class="chat-name-line"><b class="chat-name vip-color-' + (m.vip || 0) + '">' + esc(displayName(m)) + '</b>' +
      (m.vip ? ' <span class="chat-vip-pill">' + ic('crown') + 'VIP' + m.vip + '</span>' : '') +
      ' <span class="chat-lv-pill">Lv.' + roomChatLevel(m.userId) + '</span></div>' +
      '<div class="chat-bubble' + (m.chatBox === 'dragon-flame' ? ' vip-bubble' : '') + '">' + esc(m.text) + '</div></div></div>'
    ).join('');
  }
  if (roomTabFilter === 'all' || roomTabFilter === 'gift') {
    html += roomGiftEvents.slice(-10).map(ev =>
      '<div class="chat-msg-row gift-line">' + roomChatAvatar(displayName(ev.fromName)) + '<img class="gift-line-img" src="' + esc(ev.giftSvg || 'assets/icons/gift.svg') + '" alt="">' + roomChatAvatar(displayName(ev.toName)) +
      '<span class="gift-line-text"><b>' + esc(displayName(ev.fromName)) + '</b> sent <b>' + esc(ev.giftName) + '</b>' + (ev.qty > 1 ? ' ×' + ev.qty : '') + ' to <b>' + esc(displayName(ev.toName)) + '</b></span></div>'
    ).join('');
  }
  box.innerHTML = html || head + '<p class="muted">No messages yet — say hello!</p>';
  const chat = currentRoom.chat || [];
  lastChatId = chat.length ? chat[chat.length - 1].id : lastChatId;
  box.scrollTop = box.scrollHeight;
}
async function sendRoomChat() {
  const inp = document.getElementById('chatText');
  const text = inp.value.trim();
  if (!text || !currentRoom) return;
  inp.value = '';
  try {
    const d = await api('/api/rooms/' + currentRoom.id + '/chat', { method: 'POST', headers: headers(true), body: JSON.stringify({ text }) });
    currentRoom = d.room; renderRoomChat();
  } catch (e) { alert(e.message); }
}
function renderVoiceNotes() {
  const el = document.getElementById('voiceNotes');
  el.innerHTML = (currentRoom.voiceNotes || []).slice(-5).map(n =>
    '<div class="voice-note"><span>'+ic("mic")+' ' + esc(displayName(n)) + ' (' + (n.effect || 'normal') + ')</span>' +
    '<button class="btn" onclick="playVoiceNote(\'' + n.url + '\', \'' + (n.effect || 'normal') + '\')">'+ic("play")+' Play</button></div>'
  ).join('');
}
function playVoiceNote(url, effect) { window.playVoiceWithEffect ? playVoiceWithEffect(url, effect) : new Audio(url).play(); }
function startVoiceNote() {
  if (!currentRoom) return;
  const effect = document.getElementById('voiceEffect').value;
  alert('Recording 5 seconds — speak now! Effect: ' + effect);
  const recFn = window.recordVoiceNoteEx
    ? (cb, err) => window.recordVoiceNoteEx(vsRecordOpts(), cb, err)
    : window.recordVoiceNote;
  const rec = recFn(async (blob) => {
    const fd = new FormData();
    fd.append('audio', blob, 'voice.webm');
    fd.append('effect', effect);
    const res = await fetch(API + '/api/v2/rooms/' + currentRoom.id + '/voice-note', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: fd });
    const d = await res.json();
    if (res.ok) { currentRoom.voiceNotes.push(d.note); renderVoiceNotes(); window.SFX && SFX.coin(); }
    else alert(d.error || 'Upload failed');
  }, (err) => alert(err));
  if (rec) setTimeout(() => rec.stop(), 5000);
}
function playRoomMusic() { document.getElementById('musicFile').click(); }
async function uploadRoomMusic(e) {
  const f = e.target.files[0];
  if (!f || !currentRoom) return;
  const fd = new FormData(); fd.append('audio', f);
  const res = await fetch(API + '/api/rooms/' + currentRoom.id + '/music', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: fd });
  const d = await res.json();
  if (res.ok) { alert(' Room music set!'); const a = new Audio(d.room.music.url); a.play(); }
  else alert(d.error || 'Upload failed');
}
/* ---------------- AGORA LIVE VOICE — two-way, worldwide, AUDIO ONLY --------
   Anyone anywhere who joins a room talks and is heard by everyone in the
   room, and hears everyone else. The app joins the Agora channel for the
   room with a token from the server (GET /api/voice/token). The SDK is
   lazy-loaded ONLY when Agora is configured, so the app stays light without
   it. NEVER a video track: only the microphone audio track is published. */
let AGORA = { client: null, localTrack: null, remoteTracks: {}, sdkLoading: null, uid: 0, joined: false };
function agoraUid() { return Number((ME.id || '1').replace(/\D/g, '') || 1); }
function loadAgoraSdk() {
  if (window.AgoraRTC) return Promise.resolve(window.AgoraRTC);
  if (AGORA.sdkLoading) return AGORA.sdkLoading;
  AGORA.sdkLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js';
    s.onload = () => window.AgoraRTC ? resolve(window.AgoraRTC) : reject(new Error('Agora SDK did not load'));
    s.onerror = () => reject(new Error('Agora SDK failed to load (check internet)'));
    document.head.appendChild(s);
  });
  return AGORA.sdkLoading;
}
async function joinAgoraChannel(roomId) {
  try {
    const d = await api('/api/voice/status', { headers: headers() });
    if (!d.configured) { console.log('Agora not configured — voice notes mode. ' + d.note); return; }
    const t = await api('/api/voice/token?channel=' + roomId + '&uid=' + agoraUid(), { headers: headers() });
    if (!t.configured || !t.token) { console.log('Agora token unavailable — voice notes mode.'); return; }
    const AgoraRTC = await loadAgoraSdk();
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    AGORA.client = client; AGORA.uid = agoraUid();
    client.on('user-published', async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') { user.audioTrack.play(); AGORA.remoteTracks[user.uid] = user.audioTrack; }
      } catch (e) {}
    });
    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio' && AGORA.remoteTracks[user.uid]) { try { AGORA.remoteTracks[user.uid].stop(); } catch (e) {} delete AGORA.remoteTracks[user.uid]; }
    });
    client.on('token-privilege-will-expire', async () => {
      try { const nt = await api('/api/voice/token?channel=' + roomId + '&uid=' + AGORA.uid, { headers: headers() }); if (nt.token) await client.renewToken(nt.token); } catch (e) {}
    });
    try { client.enableAudioVolumeIndicator(); client.on('volume-indicator', markSpeakingSeats); } catch (e) {}
    await client.join(t.appId, roomId, t.token, AGORA.uid);
    /* AUDIO ONLY — publish the microphone track, never a camera track. */
    const micTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
    AGORA.localTrack = micTrack;
    if (!micOn) micTrack.setMuted(true);
    await client.publish(micTrack);
    AGORA.joined = true;
    console.log('Agora live voice joined channel', roomId);
  } catch (e) { console.log('Agora unavailable (voice notes mode):', e.message); }
}
async function leaveAgoraChannel() {
  try {
    if (AGORA.localTrack) { try { AGORA.localTrack.stop(); AGORA.localTrack.close(); } catch (e) {} AGORA.localTrack = null; }
    for (const uid of Object.keys(AGORA.remoteTracks)) { try { AGORA.remoteTracks[uid].stop(); } catch (e) {} }
    AGORA.remoteTracks = {};
    if (AGORA.client && AGORA.joined) { try { await AGORA.client.leave(); } catch (e) {} }
    AGORA.client = null; AGORA.joined = false;
  } catch (e) {}
}
/* Live speaking rings: while someone talks on Agora, their mic seat glows. */
function markSpeakingSeats(volumes) {
  const grid = document.getElementById('micGrid'); if (!grid) return;
  const active = new Set();
  (volumes || []).forEach(v => { if (v.level > 5) active.add(String(v.uid)); });
  grid.querySelectorAll('.mic-seat[data-userid]').forEach(seat => {
    const uid = String(seat.dataset.userid || '').replace(/\D/g, '') || seat.dataset.userid;
    seat.classList.toggle('speaking', active.has(String(uid)));
  });
}

/* ---------------- mic & voice settings (dark screen, real Web Audio) ----------------
   Audio only: getUserMedia({ audio: ... }) — never video. Noise suppression is
   the browser's own processing ("standard") or off ("none"); Krisp AI is NOT
   available and is never claimed. Settings are saved per user on the server
   and applied in rooms (mic state, speaker volume, recorder constraints). */
const VS_DEFAULTS = { micOn: true, muted: false, speakerOn: true, micVolume: 50, speakerVolume: 100, sensitivity: 50, autoSensitivity: true, noiseSuppression: 'standard', echoCancellation: true, autoGain: true, voiceEnhancement: false, inputMode: 'voice', inputDeviceId: 'default', outputDeviceId: 'default' };
let voiceSettings = null, vsReturnToRoom = false;
let vsStream = null, vsAudioCtx = null, vsAnalyser = null, vsRaf = null, vsTestRec = null, vsTestUrl = null, vsSaveTimer = null, vsDevicesLoaded = false;
function vsEffective() {
  const s = voiceSettings || VS_DEFAULTS;
  const enh = !!s.voiceEnhancement;
  return { echoCancellation: enh ? true : !!s.echoCancellation, noiseSuppression: enh ? 'standard' : s.noiseSuppression, autoGain: enh ? true : !!s.autoGain };
}
function vsConstraints() {
  const s = voiceSettings || VS_DEFAULTS, e = vsEffective();
  const a = { echoCancellation: e.echoCancellation, noiseSuppression: e.noiseSuppression === 'standard', autoGainControl: e.autoGain };
  if (s.inputDeviceId && s.inputDeviceId !== 'default') a.deviceId = { exact: s.inputDeviceId };
  return { audio: a };
}
function vsRecordOpts() {
  const s = voiceSettings || VS_DEFAULTS, e = vsEffective();
  return { echoCancellation: e.echoCancellation, noiseSuppression: e.noiseSuppression, autoGain: e.autoGain, deviceId: s.inputDeviceId, micVolume: s.micVolume };
}
async function ensureVoiceSettings() {
  if (voiceSettings) return voiceSettings;
  try { const d = await api('/api/voice-settings', { headers: headers() }); voiceSettings = { ...VS_DEFAULTS, ...(d.settings || {}) }; }
  catch (e) { voiceSettings = { ...VS_DEFAULTS }; }
  vsApplyLocal();
  return voiceSettings;
}
function vsApplyLocal() {
  const s = voiceSettings || VS_DEFAULTS;
  window.AWC_SPEAKER_VOL = s.speakerOn ? s.speakerVolume / 100 : 0;
  if (micOn !== !!s.micOn) { micOn = !!s.micOn; const b = document.getElementById('micBtn'); if (b) b.innerHTML = micOn ? '' + ic("mic") + ' Mic: ON' : '' + ic("mic-off") + ' Mic: OFF'; }
}
function vsSaveNote(msg) { const el = document.getElementById('vsSaveNote'); if (el) el.textContent = msg; }
async function vsSave() {
  if (!voiceSettings) return;
  try {
    const d = await api('/api/voice-settings', { method: 'PUT', headers: headers(true), body: JSON.stringify(voiceSettings) });
    voiceSettings = { ...VS_DEFAULTS, ...(d.settings || {}) };
    vsApplyLocal();
    vsSaveNote('Saved ' + new Date().toLocaleTimeString());
    vsUpdateStatus();
  } catch (e) { vsSaveNote('Save failed: ' + e.message); }
}
function vsSaveDebounced() { clearTimeout(vsSaveTimer); vsSaveTimer = setTimeout(vsSave, 400); }
function vsCollect() {
  const g = id => document.getElementById(id);
  voiceSettings = {
    micOn: g('vsMicOn').checked, muted: g('vsMuted').checked, speakerOn: g('vsSpeakerOn').checked,
    micVolume: +g('vsMicVol').value, speakerVolume: +g('vsSpkVol').value,
    sensitivity: +g('vsSens').value, autoSensitivity: g('vsAutoSens').checked,
    noiseSuppression: g('vsNS').value, echoCancellation: g('vsEcho').checked, autoGain: g('vsAGC').checked,
    voiceEnhancement: g('vsEnhance').checked,
    inputMode: document.querySelector('input[name="vsMode"]:checked').value,
    inputDeviceId: g('vsInputDev').value, outputDeviceId: g('vsOutputDev').value
  };
  g('vsMicVolVal').textContent = voiceSettings.micVolume + '%';
  g('vsSpkVolVal').textContent = voiceSettings.speakerVolume + '%';
  g('vsSensVal').textContent = voiceSettings.sensitivity + '%';
  const ptt = document.getElementById('vsPttWrap');
  if (ptt) ptt.classList.toggle('hidden', voiceSettings.inputMode !== 'ptt');
}
function vsChanged(restartMeter) {
  vsCollect();
  vsApplyLocal();
  if (restartMeter) vsStartMeter();
  vsSaveDebounced();
  vsUpdateStatus();
}
function renderVoiceSettings() {
  const s = voiceSettings || VS_DEFAULTS;
  const el = document.getElementById('voiceSettingsView');
  const chk = (id, on, label) => '<label class="vs-row"><span>' + label + '</span><input type="checkbox" class="vs-switch" id="' + id + '"' + (on ? ' checked' : '') + ' onchange="vsChanged(' + (id === 'vsMicOn' || id === 'vsMuted' ? 'true' : 'false') + ')"></label>';
  el.innerHTML = '<div class="vs-wrap">' +
    '<div class="vs-head"><button class="btn ghost" onclick="closeVoiceSettings()">← Back</button>' +
    '<h2>' + ic2('room', 'microphone') + ' Mic &amp; Voice Chat Settings</h2>' +
    '<p class="vs-sub">Audio only — your microphone is captured with audio, never video. No camera, no video calls.</p>' +
    '<p id="vsSaveNote" class="vs-saved"></p></div>' +
    '<div class="vs-status" id="vsStatus"></div>' +
    '<div class="vs-grid">' +
    '<div class="vs-card"><h3>' + ic2('room', 'microphone') + ' Microphone</h3>' +
    chk('vsMicOn', s.micOn, 'Mic On / Off') + chk('vsMuted', s.muted, 'Mute / Unmute') +
    '<label class="vs-row"><span>Mic volume <b id="vsMicVolVal">' + s.micVolume + '%</b></span><input type="range" class="vs-range" id="vsMicVol" min="0" max="100" value="' + s.micVolume + '" oninput="vsChanged(false)"></label>' +
    '<div class="vs-meter-box"><canvas id="vsLevelCanvas" class="vs-meter" width="520" height="64"></canvas>' +
    '<div class="vs-level-bar"><div class="vs-level-fill" id="vsLevelFill"></div></div>' +
    '<p class="vs-meter-line"><span id="vsSpeakDot" class="vs-dot"></span> Level <b id="vsLevelPct">0%</b> <span id="vsSpeakState" class="muted">— silent</span></p></div></div>' +
    '<div class="vs-card"><h3>' + ic2('room', 'speaker') + ' Speaker</h3>' +
    chk('vsSpeakerOn', s.speakerOn, 'Speaker On / Off') +
    '<label class="vs-row"><span>Speaker volume <b id="vsSpkVolVal">' + s.speakerVolume + '%</b></span><input type="range" class="vs-range" id="vsSpkVol" min="0" max="100" value="' + s.speakerVolume + '" oninput="vsChanged(false)"></label>' +
    '<button class="btn gold" id="vsSpkTestBtn" onclick="vsSpeakerTest()">' + ic2('room', 'speaker') + ' Test Speaker — play test tone</button>' +
    '<p class="muted">Plays a short tone at your speaker volume, on the selected output device.</p></div>' +
    '<div class="vs-card"><h3>' + ic2('room', 'volume') + ' Sensitivity</h3>' +
    '<label class="vs-row"><span>Mic sensitivity <b id="vsSensVal">' + s.sensitivity + '%</b></span><input type="range" class="vs-range" id="vsSens" min="0" max="100" value="' + s.sensitivity + '" oninput="vsChanged(false)"></label>' +
    chk('vsAutoSens', s.autoSensitivity, 'Auto-detect sensitivity') +
    '<p class="muted">Higher sensitivity picks up quieter speech. Auto-detect adjusts it for you.</p></div>' +
    '<div class="vs-card"><h3>' + ic2('admin', 'settings') + ' Voice Processing</h3>' +
    '<label class="vs-row"><span>Noise suppression</span><select id="vsNS" class="vs-select" onchange="vsChanged(true)"><option value="standard"' + (s.noiseSuppression === 'standard' ? ' selected' : '') + '>Standard (browser)</option><option value="none"' + (s.noiseSuppression === 'none' ? ' selected' : '') + '>None</option></select></label>' +
    '<p class="muted">Browser processing only. Krisp AI suppression is not available.</p>' +
    chk('vsEcho', s.echoCancellation, 'Echo cancellation') + chk('vsAGC', s.autoGain, 'Automatic gain control') + chk('vsEnhance', s.voiceEnhancement, 'Voice enhancement (all processing on)') + '</div>' +
    '<div class="vs-card"><h3>' + ic2('room', 'raise-hand') + ' Input Mode</h3>' +
    '<label class="vs-row"><span>Voice activity (mic always live)</span><input type="radio" name="vsMode" value="voice" class="vs-switch"' + (s.inputMode !== 'ptt' ? ' checked' : '') + ' onchange="vsChanged(false)"></label>' +
    '<label class="vs-row"><span>Push-to-talk (hold to talk)</span><input type="radio" name="vsMode" value="ptt" class="vs-switch"' + (s.inputMode === 'ptt' ? ' checked' : '') + ' onchange="vsChanged(false)"></label>' +
    '<div id="vsPttWrap" class="' + (s.inputMode === 'ptt' ? '' : 'hidden') + '"><button class="vs-ptt" id="vsPttBtn" onpointerdown="vsPttDown(event)" onpointerup="vsPttUp()" onpointerleave="vsPttUp()">HOLD TO TALK</button><p class="muted">Hold the button — your mic is live only while you hold it.</p></div></div>' +
    '<div class="vs-card"><h3>' + ic2('room', 'mic-seat') + ' Mic Test</h3>' +
    '<button class="btn gold" id="vsTestBtn" onclick="vsMicTest()">Record 5-second mic test</button> ' +
    '<button class="btn" id="vsTestPlay" onclick="vsTestPlay()" disabled>Play back my test</button>' +
    '<p class="muted" id="vsTestNote">Records with your current settings, then plays it back so you can hear yourself.</p>' +
    '<audio id="vsTestAudio" controls class="vs-audio hidden"></audio></div>' +
    '<div class="vs-card"><h3>' + ic2('room', 'invite') + ' Audio Devices</h3>' +
    '<label class="vs-row"><span>Microphone</span><select id="vsInputDev" class="vs-select" onchange="vsChanged(true)"><option value="default">Default microphone</option></select></label>' +
    '<label class="vs-row"><span>Speaker</span><select id="vsOutputDev" class="vs-select" onchange="vsChanged(false)"><option value="default">Default speaker</option></select></label>' +
    '<button class="btn" onclick="vsRefreshDevices()">Refresh devices</button>' +
    '<p class="muted" id="vsDevNote">Device names appear after microphone permission is granted.</p></div>' +
    '<div class="vs-card"><h3>' + ic2('support', 'help') + ' Voice Connection</h3>' +
    '<p id="vsConnText" class="vs-conn">Checking…</p>' +
    '<button class="btn danger" onclick="vsReset()">Reset to default settings</button></div>' +
    '<div class="vs-card"><h3>' + ic2('admin', 'settings') + ' Performance</h3>' +
    '<label class="vs-row"><span>Low-performance mode — turns off entry particles and frame animations (voice is never affected)</span><input type="checkbox" class="vs-switch" id="vsLowPerf"' + (isLowPerf() ? ' checked' : '') + ' onchange="toggleLowPerf()"></label>' +
    '<p class="muted">For older phones: fewer animations, same voice quality.</p></div>' +
    '</div></div>';
  vsUpdateStatus();
}
async function openVoiceSettings(fromRoom) {
  vsReturnToRoom = !!fromRoom;
  ['party', 'discover', 'messages', 'friends', 'me', 'owner'].forEach(t => show('tab-' + t, false));
  show('roomView', false);
  show('voiceSettingsView', true);
  await ensureVoiceSettings();
  renderVoiceSettings();
  vsStartMeter();
  vsRefreshDevices();
}
function closeVoiceSettings() {
  vsStopMeter();
  if (vsTestRec) { try { vsTestRec.stop(); } catch (e) {} vsTestRec = null; }
  show('voiceSettingsView', false);
  if (vsReturnToRoom && currentRoom) { show('roomView', true); vsReturnToRoom = false; }
  else switchTab('me');
}
function vsUpdateStatus() {
  const s = voiceSettings || VS_DEFAULTS;
  const el = document.getElementById('vsStatus');
  if (el) el.innerHTML = '<b>Status:</b> Mic ' + (s.micOn ? (s.muted ? 'ON — muted' : 'ON') : 'OFF') + ' • Speaker ' + (s.speakerOn ? 'ON ' + s.speakerVolume + '%' : 'OFF') + ' • Mode ' + (s.inputMode === 'ptt' ? 'Push-to-talk' : 'Voice activity') + ' • Noise suppression ' + (s.noiseSuppression === 'standard' ? 'Standard (browser)' : 'None') + ' • Settings saved on server for <b>' + esc(ME ? displayName(ME) : '') + '</b>';
  const c = document.getElementById('vsConnText');
  if (c) {
    const dev = vsStream ? (vsStream.getAudioTracks()[0] || {}).label || 'microphone' : 'none';
    c.innerHTML = 'Mic stream: <b>' + (vsStream ? 'LIVE (' + esc(dev) + ')' : 'off — enable Mic to start it') + '</b><br>' +
      'Server: logged in as <b>' + esc(ME ? displayName(ME) : '?') + '</b> (ID ' + esc(ME ? ME.id : '?') + ')<br>' +
      'Room: ' + (currentRoom ? '<b>in “' + esc(currentRoom.name) + '”</b>' : 'not in a room') + '<br>' +
      'Live multi-party voice: <span id="vsLiveVoice">' + (window.AGORA && AGORA.joined ? '<b>LIVE — talking in the room now (Agora)</b>' : 'checking…') + '</span>';
    /* Live voice status from the server (Agora configured or voice-notes mode). */
    api('/api/voice/status', { headers: headers() }).then(d => {
      const t = document.getElementById('vsLiveVoice');
      if (t) t.innerHTML = d.configured
        ? (window.AGORA && AGORA.joined ? '<b>LIVE — talking in the room now (Agora)</b>' : '<b>READY — Agora connected. Join a room to talk live, worldwide.</b>')
        : 'voice-notes mode (Agora voice server not configured — add AGORA_APP_ID + AGORA_APP_CERTIFICATE to enable live voice).';
    }).catch(e => {});
  }
}
function vsStopMeter() {
  if (vsRaf) cancelAnimationFrame(vsRaf);
  vsRaf = null;
  if (vsStream) { vsStream.getTracks().forEach(t => t.stop()); vsStream = null; }
  if (vsAudioCtx) { vsAudioCtx.close().catch(() => {}); vsAudioCtx = null; }
  vsAnalyser = null;
}
async function vsStartMeter() {
  vsStopMeter();
  const s = voiceSettings || VS_DEFAULTS;
  const canvas = document.getElementById('vsLevelCanvas');
  if (!canvas) return;
  const ctx2d = canvas.getContext('2d');
  const drawFlat = () => { ctx2d.fillStyle = '#0d0518'; ctx2d.fillRect(0, 0, canvas.width, canvas.height); ctx2d.strokeStyle = '#6b4fa1'; ctx2d.beginPath(); ctx2d.moveTo(0, 32); ctx2d.lineTo(canvas.width, 32); ctx2d.stroke(); };
  const setLevel = pct => {
    const f = document.getElementById('vsLevelFill'); if (f) f.style.width = pct + '%';
    const p = document.getElementById('vsLevelPct'); if (p) p.textContent = Math.round(pct) + '%';
    const dot = document.getElementById('vsSpeakDot'); if (dot) dot.style.background = pct > 5 ? '#4ade80' : '#5b5470';
    const st = document.getElementById('vsSpeakState'); if (st) st.textContent = pct > 5 ? '— speaking' : '— silent';
  };
  if (!s.micOn || s.muted) { drawFlat(); setLevel(0); vsUpdateStatus(); return; }
  try {
    vsStream = await navigator.mediaDevices.getUserMedia(vsConstraints());
    vsAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = vsAudioCtx.createMediaStreamSource(vsStream);
    vsAnalyser = vsAudioCtx.createAnalyser();
    vsAnalyser.fftSize = 2048;
    src.connect(vsAnalyser);
    const data = new Uint8Array(vsAnalyser.fftSize);
    const thresh = s.autoSensitivity ? 0.02 : (1 - s.sensitivity / 100) * 0.25 + 0.005;
    const loop = () => {
      if (!vsAnalyser) return;
      vsAnalyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / data.length);
      const pct = Math.min(100, rms * 400);
      ctx2d.fillStyle = '#0d0518'; ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      ctx2d.strokeStyle = '#ffd24a'; ctx2d.lineWidth = 2; ctx2d.beginPath();
      for (let x = 0; x < canvas.width; x++) { const v = data[Math.floor(x / canvas.width * data.length)]; const y = (v / 255) * canvas.height; x === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y); }
      ctx2d.stroke();
      setLevel(pct);
      const dot = document.getElementById('vsSpeakDot'); if (dot) dot.style.background = rms > thresh ? '#4ade80' : '#5b5470';
      const st = document.getElementById('vsSpeakState'); if (st) st.textContent = rms > thresh ? '— speaking' : '— silent';
      vsRaf = requestAnimationFrame(loop);
    };
    loop();
  } catch (e) {
    drawFlat(); setLevel(0);
    const st = document.getElementById('vsSpeakState'); if (st) st.textContent = '— mic unavailable: ' + e.message;
  }
  vsUpdateStatus();
}
async function vsRefreshDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const s = voiceSettings || VS_DEFAULTS;
    const fill = (id, kind, cur) => {
      const sel = document.getElementById(id); if (!sel) return;
      const list = devs.filter(d => d.kind === kind);
      sel.innerHTML = '<option value="default">Default ' + (kind === 'audioinput' ? 'microphone' : 'speaker') + '</option>' +
        list.map((d, i) => '<option value="' + esc(d.deviceId) + '"' + (d.deviceId === cur ? ' selected' : '') + '>' + esc(d.label || (kind === 'audioinput' ? 'Microphone ' : 'Speaker ') + (i + 1)) + '</option>').join('');
      if (!list.some(d => d.label)) { const n = document.getElementById('vsDevNote'); if (n) n.textContent = 'Device names are hidden until microphone permission is granted — enable the mic above, then tap Refresh devices.'; }
    };
    fill('vsInputDev', 'audioinput', s.inputDeviceId);
    fill('vsOutputDev', 'audiooutput', s.outputDeviceId);
    vsDevicesLoaded = true;
  } catch (e) {}
}
async function vsSpeakerTest() {
  const s = voiceSettings || VS_DEFAULTS;
  if (!s.speakerOn) { alert('Speaker is OFF — turn Speaker On first.'); return; }
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    if (s.outputDeviceId && s.outputDeviceId !== 'default' && a.setSinkId) { try { await a.setSinkId(s.outputDeviceId); } catch (e) {} }
    const vol = s.speakerVolume / 100;
    [880, 1318].forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.25 * vol, a.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + i * 0.25 + 0.22);
      o.connect(g); g.connect(a.destination);
      o.start(a.currentTime + i * 0.25); o.stop(a.currentTime + i * 0.25 + 0.25);
    });
    setTimeout(() => a.close().catch(() => {}), 800);
  } catch (e) { alert('Speaker test failed: ' + e.message); }
}
function vsMicTest() {
  const btn = document.getElementById('vsTestBtn');
  const note = document.getElementById('vsTestNote');
  if (!window.recordVoiceNoteEx) { alert('Recorder not available in this browser.'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Recording… speak now (5s)'; }
  if (note) note.textContent = 'Recording for 5 seconds with your current settings…';
  vsTestRec = window.recordVoiceNoteEx(vsRecordOpts(), blob => {
    if (vsTestUrl) URL.revokeObjectURL(vsTestUrl);
    vsTestUrl = URL.createObjectURL(blob);
    const au = document.getElementById('vsTestAudio');
    if (au) {
      au.src = vsTestUrl; au.classList.remove('hidden');
      const s = voiceSettings || VS_DEFAULTS;
      if (s.outputDeviceId && s.outputDeviceId !== 'default' && au.setSinkId) au.setSinkId(s.outputDeviceId).catch(() => {});
      au.volume = (voiceSettings || VS_DEFAULTS).speakerVolume / 100;
    }
    const play = document.getElementById('vsTestPlay'); if (play) play.disabled = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Record 5-second mic test'; }
    if (note) note.textContent = 'Test recorded — tap “Play back my test” to hear yourself.';
  }, err => {
    if (btn) { btn.disabled = false; btn.textContent = 'Record 5-second mic test'; }
    if (note) note.textContent = 'Mic test failed: ' + err;
  });
  if (vsTestRec) setTimeout(() => { if (vsTestRec) { vsTestRec.stop(); vsTestRec = null; } }, 5000);
}
function vsTestPlay() { const au = document.getElementById('vsTestAudio'); if (au && vsTestUrl) au.play(); }
function vsPttDown(e) { if (e) e.preventDefault(); setMicState(true); const b = document.getElementById('vsPttBtn'); if (b) b.classList.add('holding'); }
function vsPttUp() { const b = document.getElementById('vsPttBtn'); if (b) b.classList.remove('holding'); if ((voiceSettings || VS_DEFAULTS).inputMode === 'ptt') setMicState(false); }
async function vsReset() {
  if (!(await appConfirm('Reset all voice settings to defaults?'))) return;
  voiceSettings = { ...VS_DEFAULTS };
  await vsSave();
  renderVoiceSettings();
  vsStartMeter();
  vsRefreshDevices();
}
/* ---------------- room actions (normal user voice room) ---------------- */
async function requestMic() {
  if (!currentRoom) { alert('Join a room first.'); return; }
  const seat = await appPrompt('Request Mic', 'Which seat number do you want? (leave empty for any seat)', '');
  try {
    await api('/api/rooms/' + currentRoom.id + '/request-mic', { method: 'POST', headers: headers(true), body: JSON.stringify({ seat: seat ? Number(seat) : undefined }) });
    alert('Mic request sent to the host.');
  } catch (e) { alert(e.message); }
}
async function raiseHand() {
  if (!currentRoom) { alert('Join a room first.'); return; }
  try {
    const d = await api('/api/rooms/' + currentRoom.id + '/raise-hand', { method: 'POST', headers: headers() });
    alert(d.raised ? 'Hand raised — the host can see you.' : 'Hand lowered.');
    pollRoomGiftFeed();
  } catch (e) { alert(e.message); }
}
async function openRoomSettings() {
  if (!currentRoom) { alert('Join a room first.'); return; }
  const can = currentRoom.hostId === ME.id || (currentRoom.admins || []).includes(ME.id) || ME.role === 'owner';
  if (!can) { alert('Only the room host or an admin can change room settings.'); return; }
  const announce = await appPrompt('Room Settings', 'Room announcement (PK bar):', currentRoom.announce || '');
  if (announce === null) return;
  const topic = await appPrompt('Room Settings', 'Room topic:', currentRoom.topic || 'Chat');
  if (topic === null) return;
  const locks = await appPrompt('Room Settings', 'Locked seats (numbers separated by commas, e.g. 3,4 — empty = none):', (currentRoom.lockedSeats || []).join(','));
  if (locks === null) return;
  try {
    const d = await api('/api/rooms/' + currentRoom.id + '/settings', { method: 'POST', headers: headers(true), body: JSON.stringify({ announce, topic, lockedSeats: locks.split(',').map(x => Number(x.trim())).filter(n => n >= 2 && n <= 8) }) });
    currentRoom = d.room; renderRoomHeader(); renderMicGrid();
    alert('Room settings saved.');
  } catch (e) { alert(e.message); }
}

/* ---------------- gifts ---------------- */
function showGiftPanel() {
  if (!currentRoom && !giftTarget) { alert('Join a room first, or pick a user to gift.'); return; }
  document.getElementById('giftPanel').classList.remove('hidden');
  document.getElementById('giftTarget').textContent = giftTarget ? displayName(giftTarget) : ('room ' + (currentRoom ? currentRoom.name : ''));
  loadGiftCatalog();
}
function closeGiftPanel() { document.getElementById('giftPanel').classList.add('hidden'); }
function setQty(n) { giftQty = n; document.getElementById('qtyLabel').textContent = 'x' + n; }
function giftIconHtml(g) {
  /* NOTE: the old onerror fallback embedded an <img> (with double quotes)
     inside the onerror="..." attribute — the quotes ended the attribute
     early and leaked '"> text before every gift name. No inline fallback:
     the gift SVGs are bundled and verified to serve 200. */
  if (g.svg) return '<img class="gift-svg-img" src="' + g.svg + '" alt="' + esc(g.name) + '">';
  return '<span class="g-icon">' + iconImg(g.icon) + '</span>';
}
async function loadGiftCatalog() {
  try {
    if (giftCategory === 'privilege') {
      const d = await api('/api/v2/vip/vip-gifts', { headers: headers() });
      giftCatalog = d.gifts;
      document.getElementById('giftGrid').innerHTML = d.gifts.map(g =>
        '<div class="gift-item" onclick="sendVipGift(\'' + g.id + '\')">' + giftIconHtml(g) + '<span>' + esc(g.name) + '</span><br><span class="g-price">' + fmt(g.price) + ' coins</span><br><span class="muted">' + (g.locked ? ''+ic("lock")+' Needs VIP' + g.minVip : 'VIP' + g.minVip + '+') + '</span></div>'
      ).join('') || '<p class="muted">No VIP gifts here.</p>';
      return;
    }
    const d = await api('/api/v2/gifts/catalog', { headers: headers() });
    giftCatalog = d.gifts;
    const gifts = d.gifts.filter(g => g.category === giftCategory || giftCategory === 'hot');
    document.getElementById('giftGrid').innerHTML = gifts.map(g =>
      '<div class="gift-item" onclick="sendGift(\'' + g.id + '\')">' + giftIconHtml(g) + '<span>' + esc(g.name) + '</span><br><span class="g-price">' + fmt(g.price) + ' coins</span></div>'
    ).join('') || '<p class="muted">No gifts in this category.</p>';
  } catch (e) { document.getElementById('giftGrid').innerHTML = '<p class="muted">Could not load gifts.</p>'; }
}
function giftCat(cat, btn) {
  giftCategory = cat;
  document.querySelectorAll('#giftPanel .mini-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadGiftCatalog();
}
async function sendGift(giftId) {
  const toUserId = giftTarget ? giftTarget.userId : (currentRoom ? (currentRoom.seats[0] || {}).userId || ME.id : ME.id);
  try {
    const d = await api('/api/v2/gifts/send', { method: 'POST', headers: headers(true), body: JSON.stringify({ giftId, toUserId, qty: giftQty, roomId: currentRoom ? currentRoom.id : null }) });
    closeGiftPanel();
    if (d.event) { shownGiftEventIds.add(d.event.id); appendRoomGiftEvent(d.event); }
    /* GIFT VISIBILITY (owner rule): big gifts (>=100,000 coins) get the big
       3D banner + sound for 5 seconds; smaller gifts get the animated toast
       with sender + gift + recipient. Every gift is visible to the room. */
    if (d.broadcast) showGiftBroadcast3D({ fromName: d.fromName, toName: d.toName, gift: d.gift, qty: giftQty });
    else showGiftToast({ fromName: d.fromName, toName: d.toName, gift: d.gift, qty: giftQty });
    if (d.broadcastText) showBroadcast(d.broadcastText);
    loadMe();
  } catch (e) { alert(e.message); }
}
/* 3D gift BROADCAST — big animated banner with sound across the whole screen,
   naming sender, gift and recipient. Runs 5 seconds, then closes by itself. */
function showGiftBroadcast3D(ev) {
  const fx = document.getElementById('giftFx3d');
  if (!fx) return;
  const g = ev.gift || {};
  fx.className = 'play big-gift';
  fx.classList.remove('hidden');
  fx.innerHTML = '<div class="gift-broadcast-3d">' +
    (g.svg ? '<img class="gift3d-img anim-' + (g.anim || 'bloom') + '" src="' + g.svg + '" alt="' + esc(g.name || 'gift') + '">' : '<img class="gift3d-img anim-bloom" src="assets/icons/gift.svg" alt="gift">') +
    '<div class="gift3d-name">' + esc(displayName(ev.fromName)) + ' sent ' + esc(g.name || 'a gift') + (ev.qty > 1 ? ' ×' + ev.qty : '') + ' to ' + esc(displayName(ev.toName)) + '</div>' +
    (g.price ? '<div class="gift3d-sub">' + fmt(g.price * (ev.qty || 1)) + ' coins</div>' : '') + '</div>';
  if (!APP_CONTROLS || APP_CONTROLS.sounds) {
    if (window.SFX && SFX.giftSound) SFX.giftSound(g.sound || 'gift');
    else if (window.SFX) SFX.gift();
  }
  setTimeout(() => { fx.classList.add('hidden'); fx.classList.remove('play'); }, 5000);
}
/* 3-second 3D gift animation WITH SOUND — every gift has its own animation
   (lion runs and roars, rocket flies, car drives, crown spins in 3D...).
   Big gifts play full-screen. Respects the owner's animation/sound switches. */
function playGift3D(gift) {
  if (APP_CONTROLS && !APP_CONTROLS.animations && !APP_CONTROLS.sounds) return;
  const fx = document.getElementById('giftFx3d');
  if (!fx) { playGiftFx('big'); return; }
  const big = gift && ((gift.price || 0) >= 5000 || ['run', 'fly'].includes(gift.anim));
  fx.className = 'play' + (big ? ' big-gift' : '');
  fx.classList.remove('hidden');
  const img = gift && gift.svg
    ? '<img class="gift3d-img anim-' + (gift.anim || 'bloom') + '" src="' + gift.svg + '" alt="' + esc(gift.name || 'gift') + '">'
    : '<img class="gift3d-img anim-bloom" src="assets/icons/gift.svg" alt="gift">';
  fx.innerHTML = img + '<div class="gift3d-name">' + esc(gift && gift.name || '') + '</div><div class="gift3d-sub">' + (gift && gift.price ? fmt(gift.price) + ' coins' : '') + '</div>';
  if (!APP_CONTROLS || APP_CONTROLS.sounds) {
    if (window.SFX && SFX.giftSound) SFX.giftSound(gift && gift.sound || 'gift');
    else if (window.SFX) SFX.gift();
  }
  setTimeout(() => { fx.classList.add('hidden'); fx.classList.remove('play'); }, 5000);
}
function playGiftFx(size) {
  const fx = document.getElementById('giftFx');
  fx.innerHTML = '<div style="text-align:center">' + ic('gift') + '</div>';
  fx.classList.remove('hidden'); fx.classList.remove('play'); void fx.offsetWidth; fx.classList.add('play');
  setTimeout(() => fx.classList.add('hidden'), 2300);
}
function showBroadcast(text) {
  const bar = document.getElementById('broadcastBar');
  bar.textContent = text; bar.classList.remove('hidden');
  setTimeout(() => bar.classList.add('hidden'), 5000);
}

/* ---------------- wallet ---------------- */
async function openWallet() {
  const p = document.getElementById('mePanel');
  try {
    const d = await api('/api/wallet/packages', { headers: headers() });
    const s = await api('/api/v2/payments/diamond-stages', { headers: headers() });
    p.innerHTML = '<div class="card"><h3>'+ic("wallet")+' Wallet — ' + fmt(ME.coins) + ' coins • ' + fmt(ME.diamonds) + ' diamonds</h3>' +
      d.packages.map(pkg => '<div class="user-row"><span><b>$' + pkg.usd + '</b> = ' + fmt(pkg.coins) + ' coins' + (pkg.usd === 1 ? ' <small>(first time: +1,000,000 bonus!)</small>' : '') + '</span><button class="btn gold" onclick="buyPackage(\'' + pkg.id + '\')">Buy</button></div>').join('') +
      '<h3>'+ic("diamond")+' Diamond Conversion (5 stages)</h3>' +
      s.stages.map((st, i) => '<div class="user-row"><span>' + fmt(st.coins) + ' coins → ' + fmt(st.diamonds) + ' diamonds</span><button class="btn" onclick="convertDiamonds(' + i + ')">Convert</button></div>').join('') +
      '</div>';
  } catch (e) { p.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; }
}
async function buyPackage(pkgId) {
  const method = await appPrompt('Payment Method', 'Payment method: Easypaisa, JazzCash, Visa or Google Play?', 'Easypaisa');
  if (!method) return;
  alert('After paying, you must upload the receipt. The owner approves it — coins are never credited from the screenshot alone.');
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const fd = new FormData();
    fd.append('packageId', pkgId); fd.append('method', method); fd.append('receipt', input.files[0]);
    const res = await fetch(API + '/api/wallet/recharge', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: fd });
    const d = await res.json();
    alert(res.ok ? 'Receipt sent! Wait for the owner to approve.' : (d.error || 'Failed'));
  };
  input.click();
}
async function convertDiamonds(stage) {
  try {
    const d = await api('/api/wallet/diamonds', { method: 'POST', headers: headers(true), body: JSON.stringify({ stage }) });
    alert('Converted! Diamonds: ' + fmt(d.diamonds)); loadMe();
  } catch (e) { alert(e.message); }
}

/* ---------------- VIP CLUB (VIP1–VIP11, exact screenshot emblems) ---------------- */
const VIP_EMBLEMS = { 1: 'Bronze Winged Medal', 2: 'Silver-Blue Winged Medal', 3: 'Blue-Gold Star Medal', 4: 'Gold-Red Crown Medal', 5: 'Purple Winged Medal', 6: 'Red-Gold Crown Medal', 7: 'Wolf Head', 8: 'Eagle Head', 9: 'Lion Head', 10: 'Flaming Dragon Head', 11: 'Thunder Dragon', 12: 'Divine Celestial Crown' };
const MIC_RING_COLORS = { 1: '#cd7f32', 2: '#2fb8a6', 3: '#d4af37', 4: '#d4af37', 5: '#8b7bff', 6: '#ff5a2a', 7: '#ff9d00', 8: '#2fd6c3', 9: '#ffd24a', 10: '#ff5a00', 11: '#ffe600', 12: '#ffd700' };
let vipGiftTab = 'Privilege';
let giftEveryone = false;
async function openVipClub() {
  const p = document.getElementById('mePanel');
  p.innerHTML = '<p class="muted">Loading VIP Club...</p>';
  try {
    const d = await api('/api/v2/vip/club', { headers: headers() });
    vipClubData = d;
    vipSelected = d.myVip || 1;
    renderVipClub();
  } catch (e) { p.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; }
}
function renderVipClub() {
  const d = vipClubData;
  const p = document.getElementById('mePanel');
  const sel = d.levels.find(l => l.vip === vipSelected) || d.levels[0];
  const disabled = new Set(d.benefitsDisabled || []);
  const benefits = (sel.benefits[vipBenefitTab] || []).filter(b => !disabled.has(b));
  const myLevel = d.levels.find(l => l.vip === d.myVip);
  const pointsNeeded = Math.max(0, sel.pointsNeeded - (d.myPoints || 0));
  const featured = (sel.featured || []).filter(b => !disabled.has(b));
  const nextVip = d.levels.find(l => l.vip === sel.vip + 1) || null;
  const vipPct = Math.min(100, Math.round(((d.myPoints || 0) / (sel.points || 1)) * 100));
  const moreCount = Math.max(0, sel.totalBenefits - featured.length);
  const nn = String(sel.vip).padStart(2, '0');
  const isHot = sel.vip === 7, isRoyal = sel.vip >= 10;
  const nextPct = d.nextLevel ? Math.min(100, Math.round((d.myPoints / d.nextLevel.points) * 100)) : 100;
  /* --- Hero: per-level gradient, composed art (frame + badge + crown) --- */
  let h = '<div class="vip-hero" style="background:' + sel.themeBg + ';box-shadow:0 16px 40px ' + sel.color + '44, 0 4px 12px rgba(0,0,0,.06)">' +
    '<span class="eyebrow">VIP Club</span>' +
    '<div class="vip-hero-art"><img class="vip-hero-frame" src="assets/vip/vip' + nn + '/frame.png" alt="VIP' + sel.vip + ' frame"><img class="vip-hero-badge" src="assets/vip/vip' + nn + '/badge.gif" alt="VIP' + sel.vip + ' badge"><img class="vip-hero-crown" src="assets/vip/vip' + nn + '/crown.png" alt="VIP' + sel.vip + ' crown"></div>' +
    '<h2 style="color:' + sel.color + '">VIP' + sel.vip + '</h2>' +
    '<p class="vip-hero-emblem">' + esc(sel.emblem) + (isHot ? ' — Fire Wings' : '') + (sel.vip === 10 ? ' — Golden Dragon' : '') + (sel.vip === 12 ? ' — Divine Sovereign' : '') + '</p>' +
    '<p class="vip-hero-points">' + (d.myVip ? 'You are VIP' + d.myVip + (myLevel ? ' (' + esc(myLevel.emblem) + ')' : '') : 'You have no VIP yet') + ' • ' + fmt(d.myPoints) + ' VIP points</p>' +
    '<div class="vip-progress"><div style="width:' + vipPct + '%;background:linear-gradient(90deg,' + sel.color + ',' + sel.color2 + ')"></div></div>' +
    '<p class="vip-hero-next">' + (d.nextLevel ? fmt(d.pointsToNext) + ' more points to VIP' + d.nextLevel.vip + ' (' + esc(d.nextLevel.emblem) + ') — ' + nextPct + '%' : (d.myVip >= 12 ? 'You are VIP12 — the highest, divine level!' : 'You are VIP11 — one level from the divine!')) + '</p>' +
    '<div class="vip-stat-grid">' +
    '<div class="vip-stat"><b>' + fmt(sel.price) + '</b><span>Coins</span></div>' +
    '<div class="vip-stat"><b>31 days</b><span>Duration</span></div>' +
    '<div class="vip-stat"><b>' + sel.totalBenefits + '</b><span>Benefits</span></div>' +
    '<div class="vip-stat"><b>' + sel.discountPct + '%</b><span>Discount</span></div></div>' +
    (d.myVip === sel.vip ? '<span class="vip-current-chip">' + ic("check") + ' Your current level</span>'
      : '<button class="btn gold vip-buy-btn" onclick="buyVip(' + sel.vip + ')">' + ic("crown") + ' Buy VIP' + sel.vip + ' — ' + fmt(sel.price) + ' coins</button>') +
    '<p class="vip-hero-links"><a href="vip-preview.html">View VIP 1–12 Preview — badges, frames, entries &amp; room themes</a></p></div>';
  /* --- Level rail: 12 chips --- */
  h += '<div class="vip-rail">' + d.levels.map(l =>
    '<button class="vip-rail-chip' + (l.vip === vipSelected ? ' active' : '') + (l.vip === 7 ? ' vip-hot' : '') + (l.vip >= 10 ? ' vip-royal' : '') + '" onclick="selectVip(' + l.vip + ')">' + vipEmblemMini(l.vip) + ' VIP' + l.vip + '</button>'
  ).join('') + '</div>';
  /* --- What you get: badge / crown / frame / nameplate --- */
  h += '<div class="vip-sec"><div class="sec-head"><span class="eyebrow">What you get</span><h3>VIP' + sel.vip + ' Identity</h3></div>' +
    '<div class="vip-art-row">' +
    '<div class="vip-art-cell"><img src="assets/vip/vip' + nn + '/badge.gif" alt="Badge"><span>Badge</span></div>' +
    '<div class="vip-art-cell"><img src="assets/vip/vip' + nn + '/crown.png" alt="Crown"><span>Crown</span></div>' +
    '<div class="vip-art-cell"><img src="assets/vip/vip' + nn + '/frame.png" alt="Frame"><span>Frame</span></div>' +
    '<div class="vip-art-cell"><img src="assets/vip/vip' + nn + '/nameplate.jpg" alt="Nameplate"><span>Nameplate</span></div></div>' +
    '<p class="vip-note">Effect: ' + esc(sel.effect) + ' • Username: ' + esc(sel.usernameStyle) + ' • Mic ring: ' + esc(sel.micRing.name) + ' • Entry: ' + esc(sel.entry || '') + '</p>' +
    '<p class="vip-note">' + ic("lock") + ' ' + fmt(pointsNeeded) + ' more VIP points needed for this level &nbsp;•&nbsp; <a href="javascript:void(0)" onclick="openUpgradeGuide()">Upgrade Guide ›</a></p></div>';
  /* --- Status card: points, bonus points, offer, actions --- */
  h += '<div class="card vip-status-card"><div class="sec-head"><span class="eyebrow">Your status</span><h3>Points &amp; Rewards</h3></div>' +
    '<div class="vip-points-row"><span class="vip-points-avatar">' + esc(displayName(ME)[0].toUpperCase()) + '</span><span>VIP Points: <b>' + fmt(d.myPoints) + '</b> • Bonus Points: <b>' + fmt(d.myBonusPoints) + '</b></span><button class="btn earn-pill" style="background:' + sel.color + '" onclick="earnVipPoints()">Earn</button></div>' +
    '<div class="vip-progress-bar"><div style="width:' + nextPct + '%;background:' + sel.color + '"></div></div>' +
    '<p class="vip-points-sub">Progress to ' + (d.nextLevel ? 'VIP' + d.nextLevel.vip : 'the top') + ' • 31 days per level</p>' +
    '<div class="action-row"><button class="btn gold" onclick="earnVipPoints()">' + ic("star") + ' Earn Points</button> ' +
    '<button class="btn" onclick="openBonusStore()">' + ic("gift") + ' Bonus Points Store</button></div>' +
    '<p class="vip-note">' + ic("gift") + ' Offer: ' + esc(d.offers.nextLevel) + '<br>' + ic("invite") + ' ' + esc(d.offers.crossLevel) + '</p></div>';
  /* --- Benefits --- */
  h += '<div class="vip-sec"><div class="sec-head"><span class="eyebrow">' + sel.totalBenefits + ' benefits</span><h3>VIP' + sel.vip + ' Benefits</h3><button class="link-btn" onclick="vipTab(\'Status\')">All ›</button></div>' +
    '<div class="benefit-row">' +
    featured.map(b => '<div class="benefit-cell" onclick="openBenefitDetail(\'' + esc(b).replace(/'/g, "\\'") + '\')"><span class="benefit-ico">' + benefitIcon(b) + '</span><span>' + esc(b) + '</span></div>').join('') +
    (moreCount > 0 ? '<div class="benefit-cell" onclick="vipTab(\'Status\')"><span class="benefit-ico">•••</span><span>' + moreCount + ' More Benefits</span></div>' : '') +
    '</div><p class="vip-note">' + esc(d.usernameNote || '') + '</p></div>' +
    '<div class="tabs-mini">' + ['Status', 'Decorations', 'Functions', 'Rewards', 'Discounts'].map(t =>
      '<button class="mini-tab' + (t === vipBenefitTab ? ' active' : '') + '" onclick="vipTab(\'' + t + '\')">' + t + ' (' + sel.benefits[t].length + ')</button>'
    ).join('') + '</div>' +
    '<div class="card"><h3>' + vipBenefitTab + ' benefits — VIP' + sel.vip + '</h3>' +
    (benefits.length ? '<ul>' + benefits.map(b => '<li><a href="javascript:void(0)" onclick="openBenefitDetail(\'' + esc(b).replace(/'/g, "\\'") + '\')">' + ic("check") + ' ' + esc(b) + '</a></li>').join('') + '</ul>' : '<p class="vip-note">No benefits in this tab at this level yet — upgrade for more!</p>') +
    '<p class="vip-note">VIP' + sel.vip + ' has ' + sel.totalBenefits + ' benefits in total.' + (sel.vip === 10 ? ' VIP10 has all 58 benefits! ' + ic("party") : sel.vip === 11 ? ' VIP11 has 65 benefits! ' + iconImg("assets/vip/vip11/badge.gif") : sel.vip === 12 ? ' VIP12 has 72 benefits — the most, divine level! ' + iconImg("assets/vip/vip12/badge.gif") : '') + '</p></div>';
  /* --- VIP gifts + daily claims --- */
  h += '<div class="vip-sec"><div class="sec-head"><span class="eyebrow">Exclusive</span><h3>VIP Gifts &amp; Daily Claims</h3></div>' +
    '<div class="card"><h3>' + ic("gift") + ' Exclusive VIP Gifts</h3><p class="vip-note">Privilege gifts — V5 white beast 5,999 • V4 blue dragon 4,999 • V3 palace 3,999 • V2 car 2,999 • V1 flowers 799</p><button class="btn gold" onclick="openVipGiftShop()">Open VIP Gift Shop</button></div>' +
    '<div class="card"><h3>' + ic("gift") + ' Daily VIP Claims</h3><div class="vip-claim-grid">' +
    '<button class="btn" onclick="vipClaim(\'gift-code\')">Gift Code (+100,000 coins)</button>' +
    '<button class="btn" onclick="vipClaim(\'crystals\')">Crystals (+5,000)</button>' +
    '<button class="btn" onclick="vipClaim(\'golds\')">Golds (+500,000 coins)</button>' +
    '<button class="btn" onclick="vipClaim(\'birthday\')">' + iconImg("assets/gifts/cake.svg") + ' Birthday Gift</button></div></div></div>';
  /* --- Lucky bags + anonymous + mic --- */
  h += '<div class="card"><h3>' + ic("lucky") + ' Lucky Bags (VIP only)</h3>' +
    '<input id="lbGold" type="number" placeholder="Gold 20–500" value="100"><input id="lbCount" type="number" placeholder="Recipients 5–30" value="10">' +
    '<button class="btn gold" onclick="sendLuckyBag()">Send Lucky Bag</button></div>' +
    '<div class="card"><h3>' + ic("anonymous") + ' Anonymous Display — VIP10 benefit</h3><p class="vip-note">When ON, you appear as "Anonymous" in Visitors lists and Top Gifters rankings, and no honor post is sent for you.</p>' +
    (d.myVip >= 10 ? '<button class="btn" onclick="toggleAnonymous()">' + (d.myAnonymous ? '' + ic("eye") + ' Anonymous: ON — tap to turn OFF' : '' + ic("anonymous") + ' Anonymous: OFF — tap to turn ON') + '</button>' : '<p class="vip-note">' + ic("lock") + ' VIP10 benefit — upgrade to VIP10 to unlock Anonymous Display.</p>') + '</div>' +
    '<div class="card"><h3>' + ic("mic") + ' Exclusive Mic Animation</h3><p class="vip-note">Your ring: <b>' + (d.myVip ? (d.levels[d.myVip - 1].micRing.name + ' (' + d.levels[d.myVip - 1].micRing.color + ')') : 'no VIP yet') + '</b></p>' +
    '<button class="btn gold" onclick="useMicAnimation()">Use it Now</button> ' +
    '<span id="stickerRow">' + (d.micStickers || []).map(s => '<button class="btn" onclick="pickSticker(\'' + s.id + '\')">' + iconImg(s.icon) + ' ' + esc(s.name) + '</button>').join('') + '</span></div>';
  /* --- Customize + extras --- */
  h += '<div class="card"><h3>' + ic("theme") + ' Customize My VIP Look</h3>' +
    '<input id="vcFrame" placeholder="Profile frame (e.g. Dragon Frame)"><input id="vcEntrance" placeholder="Entrance effect (e.g. Dragon fire)"><input id="vcTitle" placeholder="Honor title (e.g. Thunder King)">' +
    '<button class="btn gold" onclick="customizeVip()">Save My VIP Style</button></div>' +
    '<div class="card"><h3>' + ic("sparkle") + ' VIP Extras</h3><div class="grid-btns">' +
    '<button class="btn" onclick="openMicStyles()">' + ic("mic") + ' Mic Style</button>' +
    '<button class="btn" onclick="openMicWaves()">' + ic("wave") + ' Mic Wave</button>' +
    '<button class="btn" onclick="openMicConnections()">' + ic("link") + ' Mic Connection</button>' +
    '<button class="btn" onclick="openThemesStore()">' + ic("theme") + ' Send Items — Themes Store</button>' +
    '<button class="btn" onclick="openThemes()">' + iconImg("assets/themes/party-lounge.svg") + ' Room Themes</button>' +
    '<button class="btn" onclick="openCoupons()">' + ic("ticket") + ' Personal ID Coupon</button>' +
    '<button class="btn" onclick="openGifPhoto()">' + ic("frame") + ' GIF Profile Photo</button>' +
    '<button class="btn" onclick="openBonusHistory()">' + ic("star") + ' Bonus Points History</button>' +
    '<button class="btn" onclick="openRechargeBonus()">' + ic("coin") + ' Bonus Recharge Golds</button>' +
    '<button class="btn" onclick="openDiscounts()">' + ic("discount") + ' Golds Items Discount</button>' +
    '<button class="btn" onclick="openSupport()">' + ic("support") + ' Customer Service Expert</button>' +
    '<button class="btn" onclick="openProtections()">' + ic("shield") + ' My Protections</button>' +
    '<button class="btn" onclick="openCustomItems()">' + ic("theme") + ' Custom Items (90 days)</button>' +
    '<button class="btn" onclick="openGetGolds()">' + ic("coin") + ' Get Golds (VIP9/10)</button>' +
    '<button class="btn" onclick="openBroadcasts()">' + ic("announce") + ' Broadcasts</button>' +
    '</div></div>';
  /* --- Bonus Points Store teaser --- */
  h += '<div class="card vip-benefits-card"><div class="vip-sec-head"><h3>Bonus Points Store</h3><button class="link-btn" onclick="openBonusStore()">View More ›</button></div>' +
    '<div class="benefit-row">' +
    '<div class="benefit-cell" onclick="openBonusStore()"><span class="benefit-ico">' + ic('lock') + '</span><span>Room Lock</span></div>' +
    '<div class="benefit-cell" onclick="openBonusStore()"><span class="benefit-ico">' + ic('ticket') + '</span><span>ID Coupon</span></div>' +
    '<div class="benefit-cell" onclick="openBonusStore()"><span class="benefit-ico">' + ic('frame') + '</span><span>Golden Frame</span></div>' +
    '<div class="benefit-cell" onclick="openBonusStore()"><span class="benefit-ico">' + ic('coin') + '</span><span>1,000,000 Coins</span></div>' +
    '</div></div>';
  p.innerHTML = h;
}

/* Benefit detail page — dark header "VIP Benefits", 5 round icons on top,
   cream card below with the benefit title in the middle. */
const BENEFIT_TOP_ICONS = ['crown', 'mic', 'gift', 'star', 'sparkle'];
async function openBenefitDetail(name) {
  try {
    const d = await api('/api/v2/vip/benefit/' + encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')), { headers: headers() });
    const p = document.getElementById('mePanel');
    let extra = '';
    if (name === 'Colored Username') {
      extra = '<h4>How your name looks at each level</h4>' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v =>
        '<div class="user-row"><span class="vip-color-' + v + '"><b>' + esc(displayName(ME)) + '</b></span><span class="muted">VIP' + v + ' — ' + (v === 1 ? 'Single Color' : v <= 4 ? 'Single Color and Shiny' : 'Colorful and Shiny') + '</span></div>').join('') +
        '<p class="muted">VIP 1–3 users need the latest app version to see colorful usernames.</p>';
    }
    if (name === 'Exclusive Entrance Effect') {
      extra = '<h4>Your entrance</h4><p>When you enter a room, your rank banner sweeps across the room with your name — for 2–3 seconds only, then it closes by itself.</p>' +
        (ME && ME.vip ? vipBannerImg(ME.vip) : '<p class="muted">Get VIP to unlock your entrance banner.</p>');
    }
    if (name === 'Exclusive Gifts') {
      extra = '<h4>Privilege gifts</h4><p class="muted">V5 white beast 5,999 • V4 blue dragon 4,999 • V3 palace 3,999 • V2 car 2,999 • V1 flowers 799, car 1,999, blue car 3,499, castle 2,499</p><button class="btn gold" onclick="openVipGiftShop()">Open VIP Gift Shop</button>';
    }
    p.innerHTML = '<div class="benefit-detail"><div class="benefit-detail-head"><button class="btn ghost" onclick="renderVipClub()">← Back to VIP Club</button><h3>VIP Benefits</h3><div class="benefit-top-icons">' +
      BENEFIT_TOP_ICONS.map(i => '<span class="benefit-top-ico">' + ic(i) + '</span>').join('') + '</div></div>' +
      '<div class="benefit-cream-card"><h3>' + ic("sparkle") + ' ' + esc(d.title) + '</h3><p>' + esc(d.desc) + '</p>' +
      (d.note ? '<p class="muted">' + esc(d.note) + '</p>' : '') + extra +
      (name === 'Exclusive Mic Animation' ? '<button class="btn gold" onclick="useMicAnimation()">Use it Now</button>' : '') +
      (name === 'Anonymous Display' ? ((vipClubData && vipClubData.myVip >= 10) ? '<button class="btn gold" onclick="toggleAnonymous()">Toggle Anonymous Display</button>' : '<p class="muted">'+ic("lock")+' Anonymous Display is a VIP10 benefit — upgrade to VIP10 to unlock it.</p>') : '') +
      '</div></div>';
  } catch (e) {
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="renderVipClub()">← Back to VIP Club</button><h3>'+ic("sparkle")+' ' + esc(name) + '</h3><p class="muted">A VIP' + vipSelected + ' benefit. Upgrade your VIP level to unlock more!</p></div>';
  }
}
/* VIP Center — one level's 6 benefits, Identification (6/6), price, Join VIP */
async function openVipCenter(level) {
  try {
    const d = await api('/api/v2/updates/vip-center/' + level, { headers: headers() });
    const l = d.level;
    const p = document.getElementById('mePanel');
    const icons = ['crown', 'frame', 'sparkle', 'wave', 'chatbox', 'card'];
    const nn = String(level).padStart(2, '0');
    p.innerHTML = '<div class="vip-hero vip-center-hero" style="background:' + l.themeBg + ';box-shadow:0 16px 40px ' + l.color + '44, 0 4px 12px rgba(0,0,0,.06)">' +
      '<button class="btn ghost" onclick="renderVipClub()">← Back to VIP Club</button>' +
      '<div class="vip-hero-art"><img class="vip-hero-frame" src="assets/vip/vip' + nn + '/frame.png" alt="VIP' + level + ' frame"><img class="vip-hero-badge" src="assets/vip/vip' + nn + '/badge.gif" alt="VIP' + level + ' badge"><img class="vip-hero-crown" src="assets/vip/vip' + nn + '/crown.png" alt="VIP' + level + ' crown"></div>' +
      '<span class="eyebrow">VIP Center</span>' +
      '<h2 style="color:' + l.color + '">VIP' + level + ' — ' + esc(l.emblem) + '</h2>' +
      '<div class="identification-banner">' + ic("crown") + ' Identification (' + d.identification + ')</div>' +
      '<div class="vip-stat-grid">' +
      '<div class="vip-stat"><b>' + fmt(d.price) + '</b><span>Coins / 30 days</span></div>' +
      '<div class="vip-stat"><b>' + d.benefits.length + '</b><span>Privileges</span></div>' +
      '<div class="vip-stat"><b>' + esc(l.effect || '—') + '</b><span>Effect</span></div>' +
      '<div class="vip-stat"><b>' + esc(l.micRing ? l.micRing.name : '—') + '</b><span>Mic ring</span></div></div>' +
      '<div class="vip-art-row">' +
      '<div class="vip-art-cell"><img src="assets/vip/vip' + nn + '/badge.gif" alt="Badge"><span>Badge</span></div>' +
      '<div class="vip-art-cell"><img src="assets/vip/vip' + nn + '/crown.png" alt="Crown"><span>Crown</span></div>' +
      '<div class="vip-art-cell"><img src="assets/vip/vip' + nn + '/frame.png" alt="Frame"><span>Frame</span></div>' +
      '<div class="vip-art-cell"><img src="assets/vip/vip' + nn + '/nameplate.jpg" alt="Nameplate"><span>Nameplate</span></div></div>' +
      (d.myVip === level ? '<span class="vip-current-chip">' + ic("check") + ' Your current level</span>' : '<button class="btn gold vip-buy-btn" onclick="buyVip(' + level + ')">' + ic("crown") + ' Join VIP' + level + ' — ' + fmt(d.price) + ' Coins / 30 Days</button>') +
      '</div>' +
      '<div class="vip-rail">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => '<button class="vip-rail-chip' + (v === level ? ' active' : '') + (v === 7 ? ' vip-hot' : '') + (v >= 10 ? ' vip-royal' : '') + '" onclick="openVipCenter(' + v + ')">' + vipEmblemMini(v) + ' VIP' + v + '</button>').join('') + '</div>' +
      '<div class="vip-sec"><div class="sec-head"><span class="eyebrow">6 privileges</span><h3>What VIP' + level + ' Unlocks</h3></div>' +
      '<div class="benefit-grid-6">' + d.benefits.map((b, i) => '<div class="benefit-cell"><span class="benefit-ico">' + ic(icons[i]) + '</span><span>' + esc(b.name) + '</span><br><span class="vip-note">' + esc(b.desc) + '</span></div>').join('') + '</div>' +
      '<p class="vip-note">Exclusive privilege — each VIP level gets its own version of these 6 benefits in its own colours and animal.</p></div>' +
      (d.myVip >= 10 ? '<div class="card"><h3>' + ic("anonymous") + ' Anonymous Display — VIP10 benefit</h3><button class="btn" onclick="toggleAnonymous()">' + (d.myAnonymous ? 'Anonymous: ON — tap to turn OFF' : 'Anonymous: OFF — tap to turn ON') + '</button></div>' : '');
  } catch (e) { alert(e.message); }
}

/* Upgrade Guide popup — exact stages from the screenshot */
async function openUpgradeGuide() {
  try {
    const d = await api('/api/v2/updates/upgrade-guide', { headers: headers() });
    const g = d.guide;
    const p = document.getElementById('mePanel');
    p.innerHTML = '<div class="card upgrade-guide"><button class="btn ghost close-x" onclick="renderVipClub()">✕ Close</button>' +
      '<h3>Upgrade Guide</h3><p>' + esc(g.text) + '</p>' +
      '<table class="guide-table"><tr><th>Stage</th><th>VIP Points Required</th><th>Remaining</th><th>Discount</th></tr>' +
      g.stages.map(s => '<tr><td>' + esc(s.days) + '</td><td><b>' + fmt(s.points) + '</b></td><td>' + esc(s.remaining) + '</td><td><b>' + esc(s.discount) + '</b></td></tr>').join('') +
      '</table><p class="muted">Upgrading early needs fewer VIP points.</p></div>';
  } catch (e) { alert(e.message); }
}
async function openVipGiftShop() {
  try {
    const d = await api('/api/v2/vip/vip-gifts', { headers: headers() });
    const p = document.getElementById('mePanel');
    const tabs = d.tabs;
    const gifts = vipGiftTab === 'Privilege' ? d.gifts : (vipGiftTab === 'Backpack' ? [] : d.gifts.filter(() => false));
    p.innerHTML = '<div class="card"><button class="btn ghost" onclick="renderVipClub()">← Back to VIP Club</button><h3>'+ic("gift")+' VIP Gift Shop</h3>' +
      '<div class="tabs-mini">' + tabs.map(t => '<button class="mini-tab' + (t === vipGiftTab ? ' active' : '') + '" onclick="vipGiftTab=\'' + t + '\';openVipGiftShop()">' + t + '</button>').join('') + '</div>' +
      (vipGiftTab === 'Privilege'
        ? '<div class="gift-grid">' + d.gifts.map(g => '<div class="gift-item" onclick="sendVipGift(\'' + g.id + '\')"><span class="g-icon">' + iconImg(g.icon) + '</span><span>' + esc(g.name) + '</span><br><span class="g-price">' + fmt(g.price) + ' coins</span><br><span class="muted">' + (g.locked ? ''+ic("lock")+' Needs VIP' + g.minVip : 'VIP' + g.minVip + '+') + '</span></div>').join('') + '</div>'
        : vipGiftTab === 'Backpack'
          ? '<p class="muted">Your backpack is empty — buy gifts and they appear here.</p>'
          : '<p class="muted">No ' + esc(vipGiftTab) + ' VIP gifts here — open the Privilege tab for VIP-exclusive gifts.</p>') +
      '<p class="muted">Send to: <b>' + (giftEveryone ? 'Everyone on Mic' : 'one user') + '</b> <button class="btn" onclick="giftEveryone=!giftEveryone;openVipGiftShop()">Switch target</button></p>' +
      '<p class="muted">Qty: 1 / 7 / 17 / 77 / 777 — pick in the gift panel.</p></div>';
  } catch (e) { alert(e.message); }
}
async function sendVipGift(giftId) {
  try {
    const body = { giftId, qty: giftQty || 1 };
    if (giftEveryone) { body.toUserId = 'everyone'; body.roomId = currentRoom ? currentRoom.id : null; }
    else if (giftTarget) body.toUserId = giftTarget.userId;
    else { alert('Pick a user to gift, or switch target to Everyone on Mic (join a room first).'); return; }
    const d = await api('/api/v2/vip/vip-gifts/send', { method: 'POST', headers: headers(true), body: JSON.stringify(body) });
    if (d.event) { shownGiftEventIds.add(d.event.id); appendRoomGiftEvent(d.event); }
    showGiftBroadcast3D({ fromName: d.fromName, toName: d.toName, gift: d.gift, qty: giftQty });
    if (d.broadcastText) showBroadcast(d.broadcastText);
    loadMe();
  } catch (e) { alert(e.message); }
}
async function toggleAnonymous() {
  try { const d = await api('/api/v2/vip/anonymous', { method: 'POST', headers: headers(true), body: JSON.stringify({}) }); alert(d.anonymous ? ' Anonymous Display is now ON — you appear as "Anonymous" in Visitors and Top Gifters.' : ' Anonymous Display is now OFF.'); openVipClub(); loadMe(); }
  catch (e) { alert(e.message); }
}
async function useMicAnimation() {
  try { const d = await api('/api/v2/vip/mic-animation', { method: 'POST', headers: headers(true), body: JSON.stringify({}) }); alert('Mic animation active: ' + d.micAnimation.name + ' — your mic ring will glow ' + d.micAnimation.color + ' when you speak!'); }
  catch (e) { alert(e.message); }
}
async function pickSticker(id) {
  try { const d = await api('/api/v2/vip/sticker', { method: 'POST', headers: headers(true), body: JSON.stringify({ stickerId: id }) }); alert('Mic sticker: ' + d.sticker.name + ' — ' + d.sticker.desc); }
  catch (e) { alert(e.message); }
}
function selectVip(v) { vipSelected = v; renderVipClub(); }
function vipTab(t) { vipBenefitTab = t; renderVipClub(); }
async function buyVip(v) {
  try { const d = await api('/api/v2/vip/buy', { method: 'POST', headers: headers(true), body: JSON.stringify({ vip: v }) }); alert(' You are now VIP' + v + ' (' + VIP_ANIMALS[v] + ') for 31 days!' + (d.goldsBonus ? '  +' + fmt(d.goldsBonus) + ' free golds!' : '')); window.SFX && SFX.levelUp(); openVipClub(); loadMe(); }
  catch (e) { alert(e.message); }
}
async function earnVipPoints() {
  try { const d = await api('/api/v2/vip/earn', { method: 'POST', headers: headers() }); alert('+50 VIP points, +100 bonus points!'); openVipClub(); }
  catch (e) { alert(e.message); }
}
async function openBonusStore() {
  try {
    const d = await api('/api/v2/vip/bonus-store', { headers: headers() });
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("gift")+' Bonus Points Store — you have ' + fmt(d.myBonusPoints) + ' points</h3>' +
      d.items.map(i => '<div class="user-row"><span>' + iconImg(i.icon) + ' ' + esc(i.name) + ' — <b>' + fmt(i.points) + ' pts</b></span><button class="btn gold" onclick="buyBonusItem(\'' + i.id + '\')">Buy</button></div>').join('') +
      '<button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button></div>';
  } catch (e) { alert(e.message); }
}
async function buyBonusItem(id) {
  try { const d = await api('/api/v2/vip/bonus-store/buy', { method: 'POST', headers: headers(true), body: JSON.stringify({ itemId: id }) }); alert('Bought: ' + d.item.name); openBonusStore(); }
  catch (e) { alert(e.message); }
}
async function vipClaim(type) {
  try { const d = await api('/api/v2/vip/claim/' + type, { method: 'POST', headers: headers() }); alert(' ' + d.reward); loadMe(); }
  catch (e) { alert(e.message); }
}
async function sendLuckyBag() {
  try {
    const d = await api('/api/v2/vip/lucky-bag', { method: 'POST', headers: headers(true), body: JSON.stringify({ gold: Number(document.getElementById('lbGold').value), recipients: Number(document.getElementById('lbCount').value) }) });
    alert(' Lucky bag sent to ' + d.sentTo + ' people!'); window.SFX && SFX.giftBig(); loadMe();
  } catch (e) { alert(e.message); }
}
async function customizeVip() {
  try {
    const d = await api('/api/v2/vip/customize', { method: 'POST', headers: headers(true), body: JSON.stringify({ frame: document.getElementById('vcFrame').value, entrance: document.getElementById('vcEntrance').value, honorTitle: document.getElementById('vcTitle').value }) });
    alert(' Your VIP style is saved!');
  } catch (e) { alert(e.message); }
}

/* ---------------- shop / families / CP ---------------- */
async function openShop(cat) {
  const p = document.getElementById('mePanel');
  try {
    const d = await api('/api/shop', { headers: headers() });
    const disc = ME.vip ? ' (your VIP' + ME.vip + ' discount applies!)' : '';
    const items = cat ? d.items.filter(i => i.category === cat) : d.items;
    const mallTile = (label, icon, fn) => '<button class="btn" onclick="' + fn + '">' + icon + ' ' + label + '</button>';
    p.innerHTML = '<div class="card"><h3>'+ic("shop")+' Premium Shop' + disc + '</h3>' +
      '<div class="sec-head"><span class="eyebrow">Mall</span><h3>Shop by Category</h3></div>' +
      '<div class="grid-btns">' +
      mallTile('Vehicles', ic("gift"), "openShop('Ride')") +
      mallTile('Avatar Frame', ic("frame"), "openShop('Frame')") +
      mallTile('Banners', ic("theme"), "openShop('Theme')") +
      mallTile('Home Page', ic("theme"), "openShop('Theme')") +
      mallTile('Relationship', ic("cp"), "openCP()") +
      mallTile('Seat Effect', ic2('room', 'mic-seat'), "openVoiceSettings(false)") +
      mallTile('Puzzle Mall', ic("target"), "openLucky()") +
      mallTile('Items', ic("shop"), "openShop()") +
      mallTile('Chat Bubble', ic("chat"), "openCustomItems()") +
      mallTile('Special ID', ic("id"), "openShop('Room')") +
      '</div>' +
      '<p class="muted">Special ID: Unique Room ID (50,000 coins) and Unique Personal ID (75,000 coins) are sold in the Room section — the assigned-number display is a follow-up.</p>' +
      '<div class="sec-head"><span class="eyebrow">Popular Recommendation</span><h3>Most Loved</h3></div>' +
      '<div class="user-row"><span>' + vipEmblemMini(7) + ' <b>VIP 7 — Twin Lions</b> — twin roaring lions, fire breath, golden sword</span><button class="btn gold" onclick="openVipClub();selectVip(7)">View</button></div>' +
      '<div class="user-row"><span>' + iconImg('assets/themes/divine.jpg') + ' <b>Divine Universe Theme</b> — VIP 12 room theme, 9,999 coins</span><button class="btn gold" onclick="buyShop(\'s21\')">Buy</button></div>' +
      '<div class="user-row"><span>' + iconImg('assets/themes/castle-night.jpg') + ' <b>Castle Night Theme</b> — music-room castle sky, 4,999 coins</span><button class="btn gold" onclick="buyShop(\'s22\')">Buy</button></div>' +
      '<div class="user-row"><span>' + iconImg('assets/frames/dragon-frame.svg') + ' <b>Dragon Frame</b> — 30,000 coins</span><button class="btn gold" onclick="buyShop(\'s2\')">Buy</button></div>' +
      '<div class="user-row"><span><img class="gift-svg-img" src="assets/vip/owner-frame.svg" alt="Owner frame"> <b>Owner Frame</b> — golden winged frame, "OWNER" written on it — <b>Owner only</b></span>' +
      (ME.role === 'owner' ? '<button class="btn gold" onclick="equipOwnerFrame()">Equip — FREE</button>' : '<button class="btn" disabled>Owner only</button>') + '</div>' +
      '<div class="user-row"><span><img class="gift-svg-img" src="assets/frames/special-user.svg" alt="Special User frame"> <b>Special User Frame</b> — crown frame for your profile</span><button class="btn gold" onclick="alert(\'Special User frames are in the store — pick one from the VIP Club custom items.\')">View</button></div>' +
      '<div class="user-row"><span>' + ic("theme") + ' <b>Room Background Themes</b> — 9 luxury themes, 1,000,000 coins (VIP 500,000)</span><button class="btn gold" onclick="openRoomThemes()">Open Themes</button></div>' +
      items.map(i => '<div class="user-row"><span>' + iconImg(i.icon || 'assets/icons/shop.svg') + ' <b>' + esc(i.name) + '</b> — ' + i.category + ' — <b>' + fmt(i.price) + ' coins</b></span><button class="btn gold" onclick="buyShop(\'' + i.id + '\')">Buy</button></div>').join('') + '</div>';
  } catch (e) { p.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; }
}
async function buyShop(id) {
  try { const d = await api('/api/shop/buy', { method: 'POST', headers: headers(true), body: JSON.stringify({ itemId: id }) }); alert('Bought! Paid ' + fmt(d.paid) + ' coins' + (d.discountPct ? ' (' + d.discountPct + '% VIP discount)' : '')); }
  catch (e) { alert(e.message); }
}
async function openFamilies() {
  const p = document.getElementById('mePanel');
  try {
    const d = await api('/api/families', { headers: headers() });
    p.innerHTML = '<div class="card"><h3>'+ic("family")+' Families</h3>' +
      (d.families.map(f => '<div class="user-row"><span><b>' + esc(f.name) + '</b> — Lv.' + f.level + ' • ' + fmt(f.xp) + ' XP • ' + f.members.length + ' members</span><button class="btn" onclick="joinFamily(' + f.id + ')">Join</button></div>').join('') || '<p class="muted">No families yet.</p>') +
      '<input id="famName" placeholder="New family name"><button class="btn gold" onclick="createFamily()">Create Family</button></div>';
  } catch (e) { p.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; }
}
async function createFamily() {
  const name = document.getElementById('famName').value.trim();
  if (!name) return alert('Enter a family name');
  await api('/api/families', { method: 'POST', headers: headers(true), body: JSON.stringify({ name }) });
  openFamilies();
}
async function joinFamily(id) { await api('/api/families/' + id + '/join', { method: 'POST', headers: headers() }); openFamilies(); }
async function openCP() {
  const p = document.getElementById('mePanel');
  try {
    const d = await api('/api/cp', { headers: headers() });
    p.innerHTML = '<div class="card"><h3>'+ic("cp")+' CP — Couple System</h3>' +
      '<p>Basic 100,000 • Premium 500,000 • Luxury 5,000,000 coins</p>' +
      (d.pairs.map(cp => '<p>'+ic("cp")+' CP with ' + cp.a + ' / ' + cp.b + ' — ' + cp.tier + ' • Intimacy ' + fmt(cp.intimacy) + ' • ' + cp.status + '</p>').join('') || '<p class="muted">No CP yet.</p>') +
      '<input id="cpUser" placeholder="Partner user ID"><select id="cpTier"><option value="basic">Basic — 100,000</option><option value="premium">Premium — 500,000</option><option value="luxury">Luxury — 5,000,000</option></select>' +
      '<button class="btn gold" onclick="inviteCP()">Send CP Invite</button></div>';
  } catch (e) { p.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; }
}
async function inviteCP() {
  try {
    const d = await api('/api/cp/invite', { method: 'POST', headers: headers(true), body: JSON.stringify({ toUserId: document.getElementById('cpUser').value, tier: document.getElementById('cpTier').value }) });
    alert(' CP invite sent!');
  } catch (e) { alert(e.message); }
}

/* ---------------- daily / lucky / invite / AI / feedback / settings ---------------- */
async function doDaily() {
  try { const d = await api('/api/daily', { method: 'POST', headers: headers() }); alert(' Daily reward: +' + fmt(d.bonus) + ' coins' + (ME.vip ? ' (VIP double!)' : '')); window.SFX && SFX.coin(); loadMe(); }
  catch (e) { alert(e.message); }
}
function openLucky() { document.getElementById('luckyModal').classList.remove('hidden'); }
async function spinLucky() {
  const wheel = document.getElementById('luckyWheel');
  wheel.classList.remove('spin'); void wheel.offsetWidth; wheel.classList.add('spin');
  window.SFX && SFX.lucky();
  try {
    const d = await api('/api/lucky', { method: 'POST', headers: headers() });
    setTimeout(() => { document.getElementById('luckyResult').textContent = ' You won ' + fmt(d.prize) + ' coins!'; if (d.prize > 0) window.SFX && SFX.levelUp(); loadMe(); }, 3000);
  } catch (e) { document.getElementById('luckyResult').textContent = e.message; }
}
async function openInvite() {
  try {
    const d = await api('/api/invite', { headers: headers() });
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("invite")+' Invite &amp; Earn</h3><p>Your code: <b>' + esc(d.inviteCode) + '</b></p><p>• 100,000 coins per friend who joins<br>• 5% of every recharge your friends make<br>• Friends joined: <b>' + d.referred + '</b></p></div>';
  } catch (e) { alert(e.message); }
}
async function openAI() {
  const q = await appPrompt('AI Assistant', 'Ask the AI assistant (rooms, coins, VIP, gifts...):');
  if (!q) return;
  try {
    const d = await api('/api/ai', { method: 'POST', headers: headers(true), body: JSON.stringify({ text: q }) });
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("ai")+' AI Assistant</h3><p><b>You:</b> ' + esc(q) + '</p><p><b>AI:</b> ' + esc(d.reply) + '</p></div>';
  } catch (e) { alert(e.message); }
}
async function openFeedback() {
  const text = await appPrompt('Feedback', 'Your feedback for the owner:');
  if (!text) return;
  await api('/api/feedback', { method: 'POST', headers: headers(true), body: JSON.stringify({ text }) });
  alert(' Thank you! Your feedback was sent to the owner.');
}
async function openSettings() {
  const p = document.getElementById('mePanel');
  p.innerHTML = '<div class="card"><h3>'+ic("settings")+' Settings</h3>' +
    '<label>Sound effects <input type="checkbox" id="setSound" checked onchange="toggleSound(this.checked)"> ON</label><br>' +
    '<button class="btn" onclick="changePassword()">Change Password</button> ' +
    '<button class="btn" onclick="openNotifPrefs()">Notification Preferences</button></div>';
}
function toggleSound(on) { window.SFX_MUTED = !on; }
async function changePassword() {
  const oldP = await appPrompt('Change Password', 'Old password:', '', 'password'); const newP = await appPrompt('Change Password', 'New password (6+ characters):', '', 'password');
  if (!oldP || !newP) return;
  try { await api('/api/v2/auth/change-password', { method: 'POST', headers: headers(true), body: JSON.stringify({ oldPassword: oldP, newPassword: newP }) }); alert('Password changed!'); }
  catch (e) { alert(e.message); }
}
async function openNotifPrefs() {
  try {
    const d = await api('/api/v2/notifications/prefs', { headers: headers() });
    const prefs = d.prefs;
    const key = await appPrompt('Notifications', 'Which notification to toggle? (friendRequests / messages / micInvites / gifts / mentions)\nCurrent: ' + JSON.stringify(prefs));
    if (!key || !(key in prefs)) return;
    await api('/api/v2/notifications/prefs', { method: 'POST', headers: headers(true), body: JSON.stringify({ [key]: !prefs[key] }) });
    alert('Preference saved.');
  } catch (e) { alert(e.message); }
}

/* ---------------- moments / messages / rankings / users ---------------- */
async function loadMoments() {
  try {
    const d = await api('/api/moments', { headers: headers() });
    document.getElementById('momentList').innerHTML = d.moments.map(m =>
      '<div class="moment"><b>' + esc(displayName(m)) + '</b> <span class="muted">' + new Date(m.at).toLocaleString() + '</span><p>' + esc(m.text) + '</p>' +
      (m.image ? '<img src="' + m.image + '" alt="moment photo">' : '') +
      '<div class="m-actions"><button onclick="likeMoment(' + m.id + ')">'+ic("heart")+' ' + m.likes.length + '</button><button onclick="commentMoment(' + m.id + ')">'+ic("chat")+' ' + m.comments.length + '</button></div>' +
      m.comments.map(c => '<p class="muted"><b>' + esc(displayName(c)) + ':</b> ' + esc(c.text) + '</p>').join('') + '</div>'
    ).join('') || '<p class="muted">No moments yet — post the first one!</p>';
  } catch (e) {}
}
async function postMoment() {
  const text = document.getElementById('momentText').value.trim();
  if (!text) return alert('Write something first');
  await api('/api/moments', { method: 'POST', headers: headers(true), body: JSON.stringify({ text }) });
  document.getElementById('momentText').value = '';
  loadMoments();
}
async function likeMoment(id) { await api('/api/moments/' + id + '/like', { method: 'POST', headers: headers() }); loadMoments(); }
async function commentMoment(id) {
  const text = await appPrompt('Comment', 'Your comment:');
  if (!text) return;
  await api('/api/moments/' + id + '/comment', { method: 'POST', headers: headers(true), body: JSON.stringify({ text }) });
  loadMoments();
}
async function loadInbox() {
  try {
    const d = await api('/api/v2/chat/inbox', { headers: headers() });
    document.getElementById('inboxList').innerHTML = d.conversations.map(m => {
      const other = m.from === ME.id ? m.to : m.from;
      return '<div class="user-row"><span>'+ic("chat")+' Chat with <b>' + esc(other) + '</b><br><span class="muted">' + esc(m.text) + '</span></span><button class="btn" onclick="openThread(\'' + other + '\')">Open</button></div>';
    }).join('') || '<p class="muted">No conversations yet — find a friend and say hello!</p>';
  } catch (e) {}
}
let threadWith = null;
async function openThread(userId) {
  threadWith = userId;
  show('inboxList', false); show('chatThread', true);
  document.getElementById('threadName').textContent = 'Chat with ' + userId;
  try {
    const d = await api('/api/messages/' + userId, { headers: headers() });
    document.getElementById('threadBox').innerHTML = d.messages.map(m => '<p><b>' + (m.from === ME.id ? 'You' : esc(m.from)) + ':</b> ' + esc(m.text) + '</p>').join('') || '<p class="muted">No messages yet.</p>';
  } catch (e) {
    /* Server locks DMs until the follow is mutual — show the locked note. */
    document.getElementById('threadBox').innerHTML = '<p class="locked-note">' + esc(e.message) + '</p>';
  }
}
function closeThread() { show('chatThread', false); show('inboxList', true); loadInbox(); }
async function sendDM() {
  const text = document.getElementById('dmText').value.trim();
  if (!text || !threadWith) return;
  document.getElementById('dmText').value = '';
  try { await api('/api/messages', { method: 'POST', headers: headers(true), body: JSON.stringify({ to: threadWith, text }) }); openThread(threadWith); }
  catch (e) { alert(e.message); openThread(threadWith); }
}
async function searchUsers() {
  const q = document.getElementById('userSearch').value.trim();
  if (!q) { document.getElementById('userList').innerHTML = ''; return; }
  try {
    const d = await api('/api/users?q=' + encodeURIComponent(q), { headers: headers() });
    const rows = await Promise.all(d.users.map(async u => {
      let f = null;
      try { f = await api('/api/users/' + u.id + '/follow-state', { headers: headers() }); } catch (e) {}
      return '<div class="user-row"><span><b class="vip-color-' + (u.vip || 0) + '">' + esc(displayName(u)) + '</b> • ID ' + u.id + (u.vip ? ' • '+ic("crown")+' VIP' + u.vip : '') + '</span><span>' + followBtnHtml(f, u.id) + ' <button class="btn" onclick="giftToUser(\'' + u.id + '\', \'' + esc(displayName(u)) + '\')">'+ic("gift")+' Gift</button> <button class="btn" onclick="openThread(\'' + u.id + '\');switchTab(\'messages\')">'+ic("chat")+' Chat</button></span></div>';
    }));
    document.getElementById('userList').innerHTML = rows.join('');
  } catch (e) {}
}
function followBtnHtml(f, userId) {
  if (!f) return '<button class="btn" onclick="followUser(\'' + userId + '\')">+ Follow</button>';
  if (f.state === 'friends') return '<button class="btn friends" onclick="followUser(\'' + userId + '\')">Friends</button>';
  if (f.state === 'following') return '<button class="btn following" onclick="followUser(\'' + userId + '\')">Following</button>';
  if (f.state === 'follow-back') return '<button class="btn follow-back" onclick="followUser(\'' + userId + '\')">Follow Back</button>';
  return '<button class="btn gold" onclick="followUser(\'' + userId + '\')">+ Follow</button>';
}
async function followUser(id) {
  try {
    const st = await api('/api/users/' + id + '/follow-state', { headers: headers() });
    const endpoint = (st.state === 'following' || st.state === 'friends') ? '/unfollow' : '/follow';
    await api('/api/users/' + id + endpoint, { method: 'POST', headers: headers() });
    if (honorsData && honorsData.user && honorsData.user.id === id) openProfile(id, profileFromMic);
    if (document.getElementById('userList').innerHTML) searchUsers();
    if (document.getElementById('friendsList')) loadFriends();
  } catch (e) { alert(e.message); }
}
async function loadFriends() {
  const el = document.getElementById('friendsList'); if (!el) return;
  try {
    const d = await api('/api/friends', { headers: headers() });
    el.innerHTML = '<h3>Friends (mutual follows)</h3>' + ((d.friends || []).map(f =>
      '<div class="user-row"><span><b class="vip-color-' + (f.vip || 0) + '">' + esc(displayName(f)) + '</b> • ID ' + f.id + '</span><button class="btn" onclick="openThread(\'' + f.id + '\');switchTab(\'messages\')">Message</button></div>'
    ).join('') || '<p class="muted">No friends yet — follow someone and get a follow-back.</p>');
  } catch (e) {}
}
function giftToUser(id, name) { giftTarget = { userId: id, name: displayName({ id, name }) }; showGiftPanel(); }
async function loadRankings(kind, btn) {
  if (btn) { document.querySelectorAll('#tab-friends .mini-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  try {
    const d = await api('/api/v2/rankings/' + kind, { headers: headers() });
    const list = d.ranking || [];
    document.getElementById('rankList').innerHTML = list.map((r, i) =>
      '<div class="rank-row"><span class="rank-num">' + (i + 1) + '</span><span><b>' + esc(displayName(r)) + '</b>' + (r.vip ? ' '+ic("crown")+' VIP' + r.vip : '') + ' — ' + fmt(r.wealth || r.charm || r.level || r.xp || 0) + '</span></div>'
    ).join('') || '<p class="muted">No ranking yet.</p>';
  } catch (e) {}
}
async function loadNotifications() {
  try {
    const d = await api('/api/notifications', { headers: headers() });
    const unread = d.notifications.filter(n => !n.read).length;
    document.getElementById('notifDot').classList.toggle('hidden', unread === 0);
    if (unread) window.SFX && SFX.notify();
    const maxId = (d.notifications || []).reduce((m, n) => Math.max(m, n.id || 0), 0);
    if (!notifInit) { notifInit = true; lastNotifId = maxId; return; }
    (d.notifications || []).forEach(n => {
      if (n.id > lastNotifId && n.kind === 'gift' && n.giftEventId && !shownGiftEventIds.has(n.giftEventId)) {
        shownGiftEventIds.add(n.giftEventId);
        if (n.fromId !== ME.id) showGiftBroadcast3D({ fromName: n.from, toName: n.to, gift: n.gift, qty: n.qty });
      }
    });
    lastNotifId = maxId;
  } catch (e) {}
}
async function showNotifications() {
  try {
    const d = await api('/api/notifications', { headers: headers() });
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("bell")+' Notifications</h3>' +
      (d.notifications.map(n => '<p>' + esc(n.text) + ' <span class="muted">' + new Date(n.at).toLocaleString() + '</span></p>').join('') || '<p class="muted">No notifications.</p>') + '</div>';
    switchTab('me');
    await api('/api/v2/notifications/read-all', { method: 'POST', headers: headers() });
    document.getElementById('notifDot').classList.add('hidden');
  } catch (e) { alert(e.message); }
}

/* ---------------- owner portal ---------------- */
async function ownerStats() {
  try {
    const d = await api('/api/owner/stats', { headers: headers() });
    document.getElementById('masterWallet').textContent = d.masterWallet;
    let vc = '';
    try {
      const v = await api('/api/owner/verification-codes', { headers: headers() });
      vc = '<h3>Pending Verification Codes</h3>' + ((v.pending || []).map(p => '<div class="user-row"><span><b>' + esc(displayName(p)) + '</b> • ID ' + p.id + ' • ' + esc(p.email) + (p.phone ? ' • ' + esc(p.phone) : '') + ' • Code: <b>' + esc(p.code || '—') + '</b>' + (p.expiresAt ? ' • expires ' + new Date(p.expiresAt).toLocaleTimeString() : '') + '</span></div>').join('') || '<p class="muted">No accounts waiting for verification.</p>');
    } catch (e) { vc = '<p class="muted">Verification codes unavailable.</p>'; }
    document.getElementById('ownerPanel').innerHTML = '<div class="card"><h3>'+ic("chart")+' Dashboard</h3><p>Users: <b>' + d.totalUsers + '</b> • Rooms: <b>' + d.totalRooms + '</b> • Pending recharges: <b>' + d.pendingRecharges + '</b></p>' +
      '<h3>Users</h3>' + d.users.slice(0, 20).map(u => '<div class="user-row"><span><b>' + esc(displayName(u)) + '</b> • ID ' + u.id + ' • ' + fmt(u.coins) + ' coins' + (u.vip ? ' • VIP' + u.vip : '') + '</span></div>').join('') + vc + '</div>';
  } catch (e) { alert(e.message); }
}
async function ownerRecharges() {
  try {
    const d = await api('/api/owner/recharges', { headers: headers() });
    document.getElementById('ownerPanel').innerHTML = '<div class="card"><h3>'+ic("card")+' Recharge Requests</h3>' +
      (d.recharges.map(r => '<div class="user-row"><span><b>' + esc(displayName(r)) + '</b> — $' + r.usd + ' = ' + fmt(r.coins) + ' coins • ' + r.method + ' • <b>' + r.status + '</b><br><a href="' + r.receipt + '" target="_blank">View receipt</a></span>' +
        (r.status === 'pending' ? '<span><button class="btn gold" onclick="decideRecharge(\'' + r.id + '\',\'approved\')">Approve</button> <button class="btn danger" onclick="decideRecharge(\'' + r.id + '\',\'rejected\')">Reject</button></span>' : '') + '</div>').join('') || '<p class="muted">No recharges.</p>') + '</div>';
  } catch (e) { alert(e.message); }
}
async function decideRecharge(id, status) {
  await api('/api/owner/recharges/' + id, { method: 'POST', headers: headers(true), body: JSON.stringify({ status }) });
  alert('Recharge ' + status); ownerRecharges();
}
/* -------- Owner VIP Admin Panel (VIP 1-12): assign/remove, expiry, rewards,
   prices, effect toggles, preview of every badge/crown/frame/entry -------- */
async function resolveUserId(input) {
  const q = (input || '').trim();
  if (!q) return null;
  try {
    const d = await api('/api/users?q=' + encodeURIComponent(q), { headers: headers() });
    return (d.users && d.users[0]) ? d.users[0].id : q;
  } catch (e) { return q; }
}
async function ownerVipPanel() {
  if (!ME || ME.role !== 'owner') { alert('Owner only.'); return; }
  switchTab('owner');
  const p = document.getElementById('ownerPanel');
  p.innerHTML = '<p class="muted">Loading VIP Admin Panel...</p>';
  try {
    const pv = await api('/api/owner/vip/preview', { headers: headers() });
    const lv = await api('/api/owner/vip/list', { headers: headers() });
    const c = await api('/api/controls', { headers: headers() }).catch(() => ({ controls: {} }));
    const ct = (c && c.controls) || {};
    p.innerHTML = '<div class="card"><h3>' + ic('crown') + ' VIP Admin Panel — VIP 1–12</h3><p><a class="btn gold" href="vip-preview.html">Open VIP 1–12 Visual Preview</a></p>' +
      '<h4>Assign / Remove VIP</h4><input id="vipAdminUser" placeholder="User ID or name"><select id="vipAdminLevel">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => '<option value="' + v + '">' + (v === 0 ? 'Remove VIP' : 'VIP' + v) + '</option>').join('') + '</select><input id="vipAdminDays" type="number" value="31" placeholder="Days"><button class="btn gold" onclick="ownerVipSet()">Assign</button>' +
      '<h4>Give VIP Rewards</h4><input id="vipRewardUser" placeholder="User ID or name"><input id="vipRewardCoins" type="number" placeholder="Coins"><input id="vipRewardDiamonds" type="number" placeholder="Diamonds"><input id="vipRewardBonus" type="number" placeholder="Bonus points"><button class="btn gold" onclick="ownerVipReward()">Give Rewards</button>' +
      '<h4>Set VIP Price (coins)</h4><select id="vipPriceLevel">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => '<option value="' + v + '">VIP' + v + '</option>').join('') + '</select><input id="vipPriceValue" type="number" placeholder="Price in coins"><button class="btn gold" onclick="ownerVipPrice()">Save Price</button>' +
      '<h4>VIP Effects</h4><p class="muted">Entry effects: <b>' + (ct.entryEffects !== false ? 'ON' : 'OFF') + '</b> <button class="btn" onclick="ownerVipSwitch(\'entryEffects\',' + (ct.entryEffects === false ? 'true' : 'false') + ')">Toggle</button> &nbsp; VIP frames: <b>' + (ct.vipFrames !== false ? 'ON' : 'OFF') + '</b> <button class="btn" onclick="ownerVipSwitch(\'vipFrames\',' + (ct.vipFrames === false ? 'true' : 'false') + ')">Toggle</button></p>' +
      '<h4>VIP Users (' + lv.vips.length + ')</h4>' + (lv.vips.map(v => '<div class="user-row"><span><b>' + esc(v.name) + '</b> • ID ' + v.id + ' • VIP' + v.vip + (v.vipUntil ? ' • until ' + new Date(v.vipUntil).toLocaleDateString() : '') + '</span><button class="btn" onclick="ownerVipSetId(\'' + v.id + '\',' + v.vip + ')">+31 days</button><button class="btn danger" onclick="ownerVipSetId(\'' + v.id + '\',0)">Remove</button></div>').join('') || '<p class="muted">No VIP users yet.</p>') +
      '<h4>Preview — badge, crown, frame & entry for every level</h4><div class="vip-preview-grid">' + pv.levels.map(l => '<div class="vip-preview-cell"><img src="' + l.svg + '" alt="VIP' + l.vip + ' emblem"><img src="' + l.frameSvg + '" class="vip-preview-frame" alt="VIP' + l.vip + ' frame"><b>VIP' + l.vip + '</b><br><span class="muted">' + esc(l.emblem) + '</span><br><span class="muted">' + l.totalBenefits + ' benefits • ' + fmt(l.price) + ' coins</span><br><button class="btn" onclick="previewEntry(' + l.vip + ')">Preview Entry</button></div>').join('') + '</div></div>';
  } catch (e) { p.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; }
}
async function ownerVipSet() {
  const id = await resolveUserId(document.getElementById('vipAdminUser').value);
  if (!id) { alert('Enter a user ID or name.'); return; }
  const vip = Number(document.getElementById('vipAdminLevel').value);
  const days = Number(document.getElementById('vipAdminDays').value) || 31;
  try { await api('/api/owner/vip/set', { method: 'POST', headers: headers(), body: JSON.stringify({ userId: id, vip, days }) }); alert('VIP updated.'); ownerVipPanel(); }
  catch (e) { alert(e.message); }
}
async function ownerVipSetId(id, vip) {
  try { await api('/api/owner/vip/set', { method: 'POST', headers: headers(), body: JSON.stringify({ userId: id, vip, days: 31 }) }); alert('VIP updated.'); ownerVipPanel(); }
  catch (e) { alert(e.message); }
}
async function ownerVipReward() {
  const id = await resolveUserId(document.getElementById('vipRewardUser').value);
  if (!id) { alert('Enter a user ID or name.'); return; }
  const coins = Number(document.getElementById('vipRewardCoins').value) || 0;
  const diamonds = Number(document.getElementById('vipRewardDiamonds').value) || 0;
  const bonusPoints = Number(document.getElementById('vipRewardBonus').value) || 0;
  try { await api('/api/owner/vip/reward', { method: 'POST', headers: headers(), body: JSON.stringify({ userId: id, coins, diamonds, bonusPoints }) }); alert('Rewards given.'); ownerVipPanel(); }
  catch (e) { alert(e.message); }
}
async function ownerVipPrice() {
  const vip = Number(document.getElementById('vipPriceLevel').value);
  const price = Number(document.getElementById('vipPriceValue').value);
  if (!price || price < 0) { alert('Enter a price.'); return; }
  try { await api('/api/owner/vip/price', { method: 'POST', headers: headers(), body: JSON.stringify({ vip, price }) }); alert('Price saved.'); ownerVipPanel(); }
  catch (e) { alert(e.message); }
}
async function ownerVipSwitch(key, value) {
  try { await api('/api/controls/owner/switch', { method: 'POST', headers: headers(true), body: JSON.stringify({ key, value }) }); await loadControls(); ownerVipPanel(); }
  catch (e) { alert(e.message); }
}
/* Preview an entry animation (2.5s, auto-close) from the Owner VIP Admin Panel. */
async function previewEntry(vip) {
  try {
    const pv = await api('/api/owner/vip/preview', { headers: headers() });
    const l = pv.levels.find(x => x.vip === vip);
    if (!l) return;
    showEntrance({ name: displayName(ME), vip: l.vip, banner: vipNameplateImg(l.vip), animal: l.emblem, entry: l.entry });
  } catch (e) { alert(e.message); }
}
async function ownerAudit() {
  try {
    const d = await api('/api/owner/stats', { headers: headers() });
    document.getElementById('ownerPanel').innerHTML = '<div class="card"><h3>'+ic("legal")+' Audit Log</h3>' +
      d.auditLog.map(a => '<p><span class="muted">' + new Date(a.at).toLocaleString() + '</span> <b>' + esc(a.action) + '</b> — ' + esc(a.detail || '') + '</p>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function ownerGiveCoins() {
  const userId = document.getElementById('ocUser').value.trim();
  const amount = Number(document.getElementById('ocAmount').value);
  if (!userId || !amount) return alert('Enter user ID and amount');
  try { const d = await api('/api/owner/coins', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId, amount }) }); alert(displayName(d.user) + ' now has ' + fmt(d.user.coins) + ' coins'); }
  catch (e) { alert(e.message); }
}
async function ownerSetVip() {
  const userId = document.getElementById('ovUser').value.trim();
  const vip = Number(document.getElementById('ovVip').value);
  const svip = document.getElementById('ovSvip').checked;
  if (!userId) return alert('Enter user ID');
  try { await api('/api/owner/vip', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId, vip, svip }) }); alert('VIP set!'); }
  catch (e) { alert(e.message); }
}
async function ownerSetUid() {
  const userId = document.getElementById('ouUser').value.trim();
  const newId = document.getElementById('ouNew').value.trim();
  if (!userId || !newId) return alert('Enter user ID and new ID');
  try { const d = await api('/api/owner/uid', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId, newId }) }); alert('New ID: ' + d.user.id); }
  catch (e) { alert(e.message); }
}
async function ownerBan(unban) {
  const userId = document.getElementById('obUser').value.trim();
  const deviceId = document.getElementById('obDevice').value.trim();
  if (!userId && !deviceId) return alert('Enter a user ID or device ID');
  try { await api('/api/owner/ban', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId: userId || undefined, deviceId: deviceId || undefined, unban }) }); alert(unban ? 'Unbanned' : 'Banned'); }
  catch (e) { alert(e.message); }
}
async function ownerSetWallet() {
  const value = document.getElementById('mwValue').value.trim();
  if (!value) return alert('Enter Unlimited or a number');
  await api('/api/owner/master-wallet', { method: 'POST', headers: headers(true), body: JSON.stringify({ value }) });
  document.getElementById('masterWallet').textContent = value;
  alert('Master wallet: ' + value);
}
async function ownerSetAnnouncement() {
  const announcement = document.getElementById('annText').value.trim();
  if (!announcement) return alert('Write an announcement');
  await api('/api/owner/settings', { method: 'POST', headers: headers(true), body: JSON.stringify({ announcement }) });
  alert(' Announcement published!');
}
async function ownerAddGift() {
  const name = document.getElementById('ngName').value.trim();
  const price = Number(document.getElementById('ngPrice').value);
  const icon = document.getElementById('ngIcon').value.trim() || 'assets/icons/gift.svg';
  if (!name || !price) return alert('Enter gift name and price');
  await api('/api/owner/gift', { method: 'POST', headers: headers(true), body: JSON.stringify({ name, price, icon, charm: price }) });
  alert('Gift added: ' + name);
}


/* ---------------- owner controls (read + apply) ---------------- */
async function loadControls() {
  try {
    const d = await api('/api/controls', { headers: headers() });
    APP_CONTROLS = d.controls;
    applyControls();
  } catch (e) { APP_CONTROLS = null; }
}
function applyControls() {
  if (!APP_CONTROLS) return;
  const hide = (fn, on) => { document.querySelectorAll('[onclick^="' + fn + '"]').forEach(b => { b.style.display = on ? '' : 'none'; }); };
  hide('openShop(', APP_CONTROLS.shop);
  hide('openVipClub(', APP_CONTROLS.vip);
  hide('doDaily(', APP_CONTROLS.daily);
  hide('openLucky(', APP_CONTROLS.luckyDraw);
  hide('openInvite(', APP_CONTROLS.invite);
}

/* ---------------- VIP extras: mic styles / waves / connection ---------------- */
async function openMicStyles() {
  try {
    const d = await api('/api/v2/vipx/mic-styles', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("mic")+' Room Mic Style</h3><p class="muted">Use an exclusive Mic Style to catch everyone\'s eye.</p>' +
      d.styles.map(s2 => '<div class="user-row"><span>' + iconImg(s2.icon) + ' <b>' + esc(s2.name) + '</b> — ' + esc(s2.desc) + '</span><button class="btn gold" onclick="setMicStyle(\'' + s2.id + '\')">' + (d.mine === s2.id ? 'Using' : (s2.locked ? ''+ic("lock")+' VIP' + s2.minVip : 'Decorate Now')) + '</button></div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function setMicStyle(id) { try { await api('/api/v2/vipx/mic-style', { method: 'POST', headers: headers(true), body: JSON.stringify({ style: id }) }); ME.micStyle = id; alert('Mic style set!'); openMicStyles(); } catch (e) { alert(e.message); } }
async function openMicWaves() {
  try {
    const d = await api('/api/v2/vipx/mic-waves', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("wave")+' Room Mic Wave</h3><p class="muted">Use an exclusive Mic Wave to make your voice shine.</p>' +
      d.waves.map(w => '<div class="user-row"><span>' + iconImg(w.icon) + ' <b>' + esc(w.name) + '</b> — ' + esc(w.desc) + '</span><button class="btn gold" onclick="setMicWave(\'' + w.id + '\')">' + (d.mine === w.id ? 'Using' : (w.locked ? ''+ic("lock")+' VIP' + w.minVip : 'Decorate Now')) + '</button></div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function setMicWave(id) { try { await api('/api/v2/vipx/mic-wave', { method: 'POST', headers: headers(true), body: JSON.stringify({ wave: id }) }); ME.micWave = id; alert('Mic wave set!'); openMicWaves(); } catch (e) { alert(e.message); } }
async function openMicConnections() {
  try {
    const d = await api('/api/v2/vipx/mic-connections', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("link")+' Mic Connection</h3><p class="muted">Use the Mic Connection to bring you closer — link two mic seats with an animated waveform line.</p>' +
      d.connections.map(c => '<div class="user-row"><span><b>' + esc(c.name) + '</b> — Seats ' + c.seats.join(' & ') + '</span><button class="btn gold" onclick="setMicConnection(\'' + c.id + '\')">' + (d.mine && d.mine.id === c.id ? 'Connected' : 'Decorate Now') + '</button></div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function setMicConnection(id) { try { const d = await api('/api/v2/vipx/mic-connection', { method: 'POST', headers: headers(true), body: JSON.stringify({ connectionId: id }) }); ME.micConnection = d.micConnection; alert('Mic seats connected: ' + d.micConnection.name); } catch (e) { alert(e.message); } }

/* ---------------- Send Items: Themes store ---------------- */
let pendingItem = null;
async function openThemesStore(tab) {
  try {
    const d = await api('/api/v2/vipx/themes-store?tab=' + (tab || 'new'), { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("theme")+' Send Items — Themes Store</h3><p class="muted">Choose the item you like from the store and send it to your friends to show your love.</p>' +
      '<div class="tabs-mini">' + d.tabs.map(t => '<button class="mini-tab' + (t.id === d.tab ? ' active' : '') + '" onclick="openThemesStore(\'' + t.id + '\')">' + t.name + '</button>').join('') + '</div>' +
      d.items.map(i => '<div class="user-row"><span>' + (i.asset ? '<img class="gift-svg-img" src="' + i.asset + '" alt="">' : iconImg(i.icon)) + ' <b>' + esc(i.name) + '</b> — ' + fmt(i.price) + ' golds<br><span class="muted">' + esc(i.desc) + '</span></span><button class="btn gold" onclick="askSendItem(\'' + i.id + '\')">Send</button></div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function askSendItem(itemId) {
  const friendId = await appPrompt('Send Item', 'Send to which friend? Enter their user ID:');
  if (!friendId) return;
  try {
    const d = await api('/api/v2/vipx/send-item', { method: 'POST', headers: headers(true), body: JSON.stringify({ itemId, toUserId: friendId }) });
    pendingItem = { itemId, toUserId: friendId };
    if (await appConfirm(d.confirmText + '?\n\nSend / Purchase')) {
      const r = await api('/api/v2/vipx/send-item', { method: 'POST', headers: headers(true), body: JSON.stringify({ itemId, toUserId: friendId, confirm: true }) });
      alert('Sent! ' + d.item.name + ' is now in your friend\'s backpack.');
      loadMe();
    }
  } catch (e) { alert(e.message); }
}

/* ---------------- Personal ID Coupon ---------------- */
async function openCoupons() {
  try {
    const d = await api('/api/v2/vipx/id-coupon', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("ticket")+' Personal ID Coupon</h3>' +
      '<p>Your VIP: <b>VIP' + d.vip + '</b></p><p>Coupon value: <b>' + fmt(d.coupon) + ' golds</b></p><p class="muted">' + esc(d.note) + '</p>' +
      (d.coupon ? '<input id="couponId" placeholder="New ID (2–8 digits)"><button class="btn gold" onclick="useCoupon()">Use Coupon — Customize ID</button>' : '<p class="muted">Reach VIP2 to get your first coupon.</p>') + '</div>';
  } catch (e) { alert(e.message); }
}
async function useCoupon() {
  const newId = document.getElementById('couponId').value.trim();
  if (!newId) return alert('Enter a new ID');
  try { const d = await api('/api/v2/vipx/id-coupon/use', { method: 'POST', headers: headers(true), body: JSON.stringify({ newId }) }); alert('New ID: ' + d.newId + ' — coupon saved you ' + fmt(d.saved) + ' golds, you paid ' + fmt(d.paid) + '.'); loadMe(); } catch (e) { alert(e.message); }
}

/* ---------------- GIF Profile Photo ---------------- */
async function openGifPhoto() {
  switchTab('me');
  document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("frame")+' GIF Profile Photo</h3><p class="muted">Stand out from the crowd with a GIF profile photo.</p>' +
    '<input id="gifUrl" placeholder="Paste a GIF image URL (ends with .gif)"><button class="btn gold" onclick="setGifPhoto()">Set GIF Photo</button></div>';
}
async function setGifPhoto() {
  const url = document.getElementById('gifUrl').value.trim();
  if (!url) return alert('Paste a GIF URL');
  try { const d = await api('/api/v2/vipx/gif-photo', { method: 'POST', headers: headers(true), body: JSON.stringify({ url }) }); ME.gifPhoto = url; alert('GIF profile photo set!'); loadMe(); } catch (e) { alert(e.message); }
}

/* ---------------- Bonus Points history ---------------- */
async function openBonusHistory() {
  try {
    const d = await api('/api/v2/vipx/bonus-history', { headers: headers() });
    switchTab('me');
    const row = h => '<div class="user-row"><span>' + esc(h.text) + ' <span class="muted">' + new Date(h.at).toLocaleDateString() + '</span></span><b>' + (h.amount > 0 ? '+' : '') + fmt(h.amount) + '</b></div>';
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("star")+' Bonus Points — ' + fmt(d.balance) + '</h3>' +
      '<p class="muted">' + esc(d.note) + '</p>' +
      '<div class="tabs-mini"><button class="mini-tab active" onclick="openBonusHistory()">Activity</button><button class="mini-tab" onclick="openBonusHistoryRedemptions()">Redemptions</button></div>' +
      '<h4>Activity</h4>' + (d.activity.map(row).join('') || '<p class="muted">No bonus points earned yet — earn VIP points and they come with bonus points.</p>') +
      '<div class="card"><p>Upgrade to VIP10: <b>150,000 Bonus Points</b> <button class="btn gold" onclick="upgradeVip10Points()">Upgrade VIP10</button></p>' +
      '<p>Renew VIP10: <b>50,000 Bonus Points</b> <button class="btn gold" onclick="renewVip10Points()">Renew VIP10</button></p></div></div>';
  } catch (e) { alert(e.message); }
}
async function openBonusHistoryRedemptions() {
  try {
    const d = await api('/api/v2/vipx/bonus-history', { headers: headers() });
    switchTab('me');
    const row = h => '<div class="user-row"><span>' + esc(h.text) + ' <span class="muted">' + new Date(h.at).toLocaleDateString() + '</span></span><b>' + fmt(h.amount) + '</b></div>';
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("star")+' Bonus Points — ' + fmt(d.balance) + '</h3>' +
      '<div class="tabs-mini"><button class="mini-tab" onclick="openBonusHistory()">Activity</button><button class="mini-tab active" onclick="openBonusHistoryRedemptions()">Redemptions</button></div>' +
      '<h4>Redemptions</h4>' + (d.redemptions.map(row).join('') || '<p class="muted">Nothing redeemed yet.</p>') + '</div>';
  } catch (e) { alert(e.message); }
}
async function upgradeVip10Points() { try { const d = await api('/api/v2/vipx/bonus-points/upgrade-vip10', { method: 'POST', headers: headers() }); alert(' You are now VIP10!'); loadMe(); openVipClub(); } catch (e) { alert(e.message); } }
async function renewVip10Points() { try { const d = await api('/api/v2/vipx/bonus-points/renew-vip10', { method: 'POST', headers: headers() }); alert(' VIP10 renewed for 31 more days!'); loadMe(); } catch (e) { alert(e.message); } }

/* ---------------- Room themes ---------------- */
async function openThemes() {
  try {
    const d = await api('/api/v2/vipx/themes', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+iconImg("assets/themes/party-lounge.svg")+' Room Themes</h3>' +
      d.themes.map(t => '<div class="user-row"><span>' + (t.asset ? '<img class="gift-svg-img" src="' + t.asset + '" alt="">' : iconImg(t.icon)) + ' <b>' + esc(t.name) + '</b><br><span class="muted">' + esc(t.desc) + '</span></span><button class="btn gold" onclick="applyTheme(\'' + t.id + '\')">' + (d.mine === t.id ? 'Using' : (t.locked ? ''+ic("lock")+' VIP' + t.minVip : 'Decorate Now')) + '</button></div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function applyTheme(id) { try { await api('/api/v2/vipx/themes/apply', { method: 'POST', headers: headers(true), body: JSON.stringify({ theme: id }) }); ME.roomTheme = id; alert('Room theme applied! Open a room to see it.'); } catch (e) { alert(e.message); } }

/* ---------------- Bonus Recharge Golds ---------------- */
async function openRechargeBonus() {
  try {
    const d = await api('/api/v2/vipx/recharge-bonus', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("coin")+' Bonus Recharge Golds</h3>' +
      '<p>Your VIP' + d.vip + ' bonus: <b>+' + d.bonusPct + '%</b> extra golds on every recharge.</p>' +
      d.table.map(t => '<div class="user-row"><span>VIP' + t.vip + '</span><b>+' + t.bonusPct + '%</b></div>').join('') +
      '<h4>Recharge packages</h4>' + d.goldPackages.map(p2 => '<div class="user-row"><span><b>' + fmt(p2.golds) + ' golds</b></span><b>$' + p2.usd + '</b></div>').join('') +
      '<h4>' + ic('gift') + ' First Recharge gifts</h4><p>' + d.firstRechargeGifts.map(g => iconImg(g.icon) + ' ' + g.name + ' x' + g.qty).join(' • ') + '</p>' +
      (d.firstRechargeDone ? '<p class="muted">You already claimed your First Recharge gifts.</p>' : '<p class="muted">Recharge for the first time to get these gifts!</p>') + '</div>';
  } catch (e) { alert(e.message); }
}

/* ---------------- Golds Items Discount ---------------- */
async function openDiscounts() {
  try {
    const d = await api('/api/v2/vipx/discounts', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("discount")+' Golds Items Discount</h3>' +
      '<p class="muted">' + esc(d.note) + '</p>' +
      '<p>VIP discount: <b>' + d.vipDiscountPct + '%</b> • Premium: <b>' + d.premiumDiscountPct + '%</b> • Best for you: <b>' + d.bestPct + '%</b></p>' +
      '<p>VIP golds items discount: <b>50% off</b></p>' +
      '<h4>Today\'s deals</h4>' + d.deals.map(x => '<div class="user-row"><span>' + iconImg(x.icon) + ' ' + esc(x.name) + '</span><span><s>' + x.was + '</s> → <b>' + x.now + ' golds</b></span></div>').join('') +
      '<button class="btn gold" onclick="openShop()">Go to Premium Shop</button></div>';
  } catch (e) { alert(e.message); }
}

/* ---------------- Customer Service Expert ---------------- */
async function openSupport() {
  try {
    const d = await api('/api/v2/vipx/support', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("support")+' Customer Service Expert</h3>' +
      '<p>' + esc(d.note) + '</p>' +
      '<textarea id="ticketText" placeholder="Write your question for the customer service expert..." rows="3"></textarea>' +
      '<button class="btn gold" onclick="sendTicket()">Send to Expert</button>' +
      '<h4>My tickets</h4>' + (d.tickets.map(t => '<p><b>' + esc(t.status) + '</b> — ' + esc(t.text) + ' <span class="muted">' + new Date(t.at).toLocaleDateString() + '</span></p>').join('') || '<p class="muted">No tickets yet.</p>') + '</div>';
  } catch (e) { alert(e.message); }
}
async function sendTicket() {
  const text = document.getElementById('ticketText').value.trim();
  if (!text) return alert('Write your question first');
  try { await api('/api/v2/vipx/support/ticket', { method: 'POST', headers: headers(true), body: JSON.stringify({ text }) }); alert('Your ticket was sent to the Customer Service Expert.'); openSupport(); } catch (e) { alert(e.message); }
}

/* ---------------- Protections ---------------- */
async function openProtections() {
  try {
    const d = await api('/api/v2/vipx/protections', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("shield")+' My Protections (VIP' + d.vip + ')</h3>' +
      '<p><b>' + (d.chatRestriction.protected ? '' : ''+ic("lock")+'') + ' Protection from Chat Restriction</b><br>' + esc(d.chatRestriction.text) + '<br><span class="muted">' + esc(d.chatRestriction.note) + '</span></p>' +
      '<p><b>' + (d.removal.protected ? '' : ''+ic("lock")+'') + ' Protection from Removal out of Room</b><br>' + esc(d.removal.text) + '<br><span class="muted">' + esc(d.removal.note) + '</span></p>' +
      (d.vip < 6 ? '<p class="muted">Reach VIP6 to unlock both protections.</p>' : '') + '</div>';
  } catch (e) { alert(e.message); }
}

/* ---------------- Custom items (90 days) ---------------- */
async function openCustomItems() {
  try {
    const d = await api('/api/v2/vipx/custom-items', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("theme")+' Custom Items</h3>' +
      '<p class="muted">' + esc(d.note) + '</p>' +
      (d.validUntil ? '<p>Your custom items are valid until: <b>' + new Date(d.validUntil).toLocaleDateString() + '</b></p>' : '<p class="muted">No custom items yet.</p>') +
      '<select id="ciKind"><option value="frame">Custom Profile Frame</option><option value="chatBox">Customize Exclusive Chat Box</option><option value="entrance">Customize the Exclusive Entrance Effect</option><option value="gift">Customize Exclusive Gifts</option><option value="cardSkin">Customize an Exclusive Profile Card Skin</option></select>' +
      '<input id="ciColor" placeholder="Color (e.g. gold, pink, #ff5a8a)"><input id="ciEffect" placeholder="Dynamic effect (e.g. fire, sparkle, hearts)"><input id="ciElements" placeholder="Elements (e.g. dragon, crown, stars)">' +
      '<button class="btn gold" onclick="saveCustomItem()">Save Custom Item (90 days)</button></div>';
  } catch (e) { alert(e.message); }
}
async function saveCustomItem() {
  const kind = document.getElementById('ciKind').value;
  const color = document.getElementById('ciColor').value.trim();
  const effect = document.getElementById('ciEffect').value.trim();
  const elements = document.getElementById('ciElements').value.trim();
  try { const d = await api('/api/v2/vipx/custom-items', { method: 'POST', headers: headers(true), body: JSON.stringify({ kind, color, effect, elements }) }); alert('Custom item saved — valid until ' + new Date(d.validUntil).toLocaleDateString() + ' (90 days). Renewing VIP extends it by 90 more days.'); } catch (e) { alert(e.message); }
}

/* ---------------- Get Golds ---------------- */
async function openGetGolds() {
  switchTab('me');
  document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("coin")+' Get Golds</h3>' +
    '<p>VIP 9: <b>500,000 golds</b> one time • VIP 10: <b>1,000,000 golds</b> for upgrading to VIP 10 • <b>200,000 golds</b> for renewing VIP 10.</p>' +
    '<button class="btn gold" onclick="claimGetGolds()">Claim My VIP Golds</button> <button class="btn" onclick="claimRenew10Golds()">Claim VIP10 Renewal Golds (200,000)</button></div>';
}
async function claimGetGolds() { try { const d = await api('/api/v2/vipx/get-golds', { method: 'POST', headers: headers() }); alert(' +' + fmt(d.golds) + ' golds!'); loadMe(); } catch (e) { alert(e.message); } }
async function claimRenew10Golds() { try { const d = await api('/api/v2/vipx/get-golds/renew10', { method: 'POST', headers: headers() }); alert(' +' + fmt(d.golds) + ' golds for renewing VIP10!'); loadMe(); } catch (e) { alert(e.message); } }

/* ---------------- Broadcasts feed ---------------- */
async function openBroadcasts() {
  try {
    const d = await api('/api/v2/vipx/broadcasts', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>'+ic("announce")+' Broadcasts</h3>' +
      (d.broadcasts.map(b => '<div class="broadcast-item">' + esc(b.text) + '<br><span class="muted">' + new Date(b.at).toLocaleString() + '</span></div>').join('') || '<p class="muted">No broadcasts yet — big gifts and VIP level-ups appear here for everyone.</p>') + '</div>';
  } catch (e) { alert(e.message); }
}

/* ---------------- achievements / badges / titles / wealth / events ---------------- */
async function openAchievements() {
  try {
    const d = await api('/api/v2/extras/achievements', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("trophy")+' Achievements</h3>' +
      d.achievements.map(a => '<div class="user-row"><span>' + iconImg(a.icon) + ' <b>' + esc(a.name) + '</b><br><span class="muted">' + esc(a.desc) + '</span></span><b>' + (a.unlocked ? 'Unlocked' : ''+ic("lock")+' Locked') + '</b></div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function openBadges() {
  try {
    const d = await api('/api/v2/extras/badges', { headers: headers() });
    switchTab('me');
    window._badges = d.badges;
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("medal")+' Badges — wear up to 3 at once</h3><p class="muted">Worn now: ' + (d.worn.join(', ') || 'none') + '</p>' +
      d.badges.map(b => '<div class="user-row"><span>' + iconImg(b.icon) + ' <b>' + esc(b.name) + '</b><br><span class="muted">' + esc(b.desc) + '</span></span>' +
        (b.unlocked ? '<label><input type="checkbox" class="badge-pick" value="' + b.id + '"' + (d.worn.includes(b.id) ? ' checked' : '') + '> Wear</label>' : '<span class="muted">'+ic("lock")+' Locked</span>') + '</div>').join('') +
      '<button class="btn gold" onclick="wearBadges()">Save Worn Badges</button></div>';
  } catch (e) { alert(e.message); }
}
async function wearBadges() {
  const ids = [...document.querySelectorAll('.badge-pick:checked')].map(x => x.value);
  try { await api('/api/v2/extras/badges/wear', { method: 'POST', headers: headers(true), body: JSON.stringify({ badges: ids }) }); alert('Badges saved!'); } catch (e) { alert(e.message); }
}
async function openHonorTitles() {
  try {
    const d = await api('/api/v2/extras/honor-titles', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("crown")+' Honor Titles</h3><p class="muted">' + esc(d.note) + '</p><p>Yours now: <b>' + esc(d.mine || 'none') + '</b></p>' +
      d.titles.map(t => '<span class="badge-chip" onclick="wearHonorTitle(\'' + esc(t) + '\')">' + esc(t) + '</span>').join('') +
      '<p><button class="btn ghost" onclick="wearHonorTitle(\'\')">Remove title</button></p></div>';
  } catch (e) { alert(e.message); }
}
async function wearHonorTitle(t) { try { await api('/api/v2/extras/honor-titles/wear', { method: 'POST', headers: headers(true), body: JSON.stringify({ title: t || null }) }); alert(t ? ' Honor title: ' + t : 'Title removed'); openHonorTitles(); } catch (e) { alert(e.message); } }
async function openWealthLevels() {
  try {
    const d = await api('/api/v2/extras/wealth-levels', { headers: headers() });
    switchTab('me');
    const w = d.myWealthLevel;
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("coin")+' Wealth Level — Lv.' + w.level + '</h3>' +
      '<p>Wealth: <b>' + fmt(w.current) + '</b>' + (w.next ? ' • ' + fmt(w.expToNext) + ' more to Lv.' + (w.level + 1) : ' • Max level!') + '</p>' +
      (w.next ? '<div class="progress-bar"><div style="width:' + Math.round((w.current / w.next) * 100) + '%"></div></div>' : '') +
      d.levels.map(l => '<div class="user-row"><span>Wealth Lv.' + l.level + '</span><span>' + fmt(l.expNeeded) + ' wealth</span></div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function openEvents() {
  try {
    const d = await api('/api/v2/extras/events', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("party")+' Activity</h3>' +
      (d.events.map(ev => '<div class="event-card-white"><span class="event-date-pill">' + esc(ev.date || 'Today') + '</span><div class="event-banner" style="background-image:url(assets/themes/party-lounge.svg)"></div><h4>' + esc(ev.name) + '</h4><p>' + esc(ev.desc || '') + '</p><p class="muted">' + (ev.members || []).length + ' joined • <a href="javascript:void(0)" onclick="joinEvent(' + ev.id + ')">View</a></p><button class="btn teal" onclick="joinEvent(' + ev.id + ')">Join</button></div>').join('') || '<p class="muted">No events right now.</p>') + '</div>';
  } catch (e) { alert(e.message); }
}
async function joinEvent(id) { try { await api('/api/v2/extras/events/' + id + '/join', { method: 'POST', headers: headers() }); alert(' You joined the event!'); openEvents(); } catch (e) { alert(e.message); } }

/* ---------------- legal / about / language / profile / block / report ---------------- */
async function openLegal(page) {
  try {
    const d = await api('/api/v2/extras/legal/' + page, { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card legal-body"><button class="btn ghost" onclick="openLegalMenu()">← Legal</button><h3>' + esc(d.title) + '</h3>' + d.body.map(p2 => '<p>' + esc(p2) + '</p>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
function openLegalMenu() {
  switchTab('me');
  document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("legal")+' Legal — AZLAN WORLD CHAT</h3>' +
    '<button class="btn" onclick="openLegal(\'privacy\')">Privacy Policy</button> ' +
    '<button class="btn" onclick="openLegal(\'terms\')">Terms of Service</button> ' +
    '<button class="btn" onclick="openLegal(\'childsafety\')">Child Safety Policy</button> ' +
    '<button class="btn" onclick="openAbout()">About</button></div>';
}
async function openAbout() {
  try {
    const d = await api('/api/v2/extras/about', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("info")+' About ' + esc(d.app) + '</h3><p>Version ' + esc(d.version) + ' • Owner: <b>' + esc(d.owner) + '</b></p><p>' + esc(d.desc) + '</p><p class="muted">Contact: ' + esc(d.contact) + '</p></div>';
  } catch (e) { alert(e.message); }
}
async function openLanguage() {
  try {
    const d = await api('/api/v2/extras/languages', { headers: headers() });
    switchTab('me');
    document.getElementById('mePanel').innerHTML = '<div class="card white-sheet"><div class="white-sheet-head"><h3>Change Language</h3><button class="btn teal" onclick="saveLanguage()">Save</button></div>' +
      d.languages.map(l => '<div class="lang-row' + (l === d.mine ? ' selected' : '') + '" onclick="pickLanguage(\'' + l + '\')"><span>' + l + '</span>' + (l === d.mine ? '<span class="lang-check">' + ic('check') + '</span>' : '') + '</div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
let pendingLang = null;
function pickLanguage(l) { pendingLang = l; document.querySelectorAll('.lang-row').forEach(r => { const name = r.querySelector('span').textContent; const on = name === l; r.classList.toggle('selected', on); const c = r.querySelector('.lang-check'); if (c) c.remove(); if (on) r.insertAdjacentHTML('beforeend', '<span class="lang-check">' + ic('check') + '</span>'); }); }
async function saveLanguage() { if (!pendingLang) { alert('Pick a language first.'); return; } await setLanguage(pendingLang); }
async function setLanguage(l) { try { await api('/api/v2/extras/language', { method: 'POST', headers: headers(true), body: JSON.stringify({ lang: l }) }); ME.language = l; alert('Language: ' + l); } catch (e) { alert(e.message); } }
/* ---------------- HONORS PROFILE (like Yalla Honors profiles) ---------------- */
async function openProfile(userId, fromMic) {
  profileFromMic = !!fromMic;
  const id = userId || ME.id;
  try {
    const d = await api('/api/v2/updates/honors/' + id, { headers: headers() });
    honorsData = d; honorsTab = 'honors';
    switchTab('me');
    renderHonorsProfile();
  } catch (e) { alert(e.message); }
}
function renderHonorsProfile() {
  const d = honorsData; if (!d) return;
  const u = d.user, s = d.stats;
  const lux = Math.min(5, Math.floor((u.level || 1) / 10) + (u.vip >= 5 ? 2 : 0)); /* luxury grows with level + VIP */
  const honor = u.honorTitle ? '<div class="honor-banner" style="background:' + u.honorTitle.bg + '">' + esc(u.honorTitle.title) + '</div>' : '';
  const rankBadge = u.rankBadge ? '<div class="rank-badge-wrap" style="--rb-size:' + u.rankBadge.size + 'px"><img class="rank-badge-img" src="' + u.rankBadge.svg + '" alt="rank badge"><span class="rank-badge-text">' + esc(u.rankBadge.name) + '</span></div>' : '';
  const cpBanner = d.cp ? '<div class="cp-banner">' + ic("heart") + ' ' + esc(d.cp.label) + ' — ' + d.cp.days + ' days <span class="cp-avatars">' + esc(displayName(u)) + ' ' + ic("heart") + ' ' + esc(displayName(d.cp.partnerName)) + '</span></div>' : '';
  let body = '';
  if (honorsTab === 'honors') {
    body = '<div class="gifts-received"><h3>' + ic("gift") + ' Gifts Received</h3><p class="gifts-total">' + fmt(d.giftsReceived.total) + ' gifts • ' + fmt(d.giftsReceived.coins) + ' coins</p>' +
      (d.giftsReceived.grid.length ? '<div class="gift-grid">' + d.giftsReceived.grid.map(g => '<div class="gift-item"><span class="g-icon">' + iconImg(g.svg) + '</span><span>' + esc(g.name) + ' x' + g.count + '</span><br><span class="g-price">' + fmt(g.price) + ' coins</span></div>').join('') + '</div>' : '<p class="muted">No gifts received yet.</p>') + '</div>';
  } else if (honorsTab === 'moments') {
    body = '<h3>Moments</h3>' + (d.moments.length ? d.moments.map(m => '<div class="card"><b>' + esc(displayName(m)) + '</b><p>' + esc(m.text || '') + '</p><p class="muted">' + fmt((m.likes || []).length) + ' likes</p></div>').join('') : '<p class="muted">No moments yet.</p>');
  } else if (honorsTab === 'about') {
    body = '<h3>About</h3><p>' + esc(u.bio || 'No bio yet.') + '</p><p class="muted">Country: ' + esc(u.country || '—') + (d.isMe && u.gender ? ' • Gender: ' + esc(u.gender) : '') + (u.tag ? ' • Tag: ' + esc(u.tag) : '') + '</p>' +
      (u.kit ? '<h3>VIP Kit — ' + esc(u.kit.emblem) + '</h3><p class="muted">Profile frame, chat bar, entry banner, name banner, profile cover and mic ring — all in ' + esc(u.kit.emblem) + ' style, 3D animated.</p>' : '');
  } else {
    body = '<h3>Rooms</h3>' + (d.rooms.length ? d.rooms.map(r => '<div class="user-row" onclick="joinRoom(\'' + r.id + '\')"><span><b>' + esc(r.name) + '</b> • ' + esc(r.topic || 'Chat') + ' • Lv.' + r.level + ' • ' + r.members + ' members</span></div>').join('') : '<p class="muted">No rooms yet.</p>');
  }
  document.getElementById('mePanel').innerHTML = '<div class="card honors-profile lux-' + lux + '" style="background:' + (u.kit ? u.kit.profileCover.themeBg : '') + '">' +
    '<button class="btn ghost close-x" onclick="switchTab(\'party\')" title="Close">✕ Close</button>' +
    (d.isMe ? '<button class="btn gold edit-profile-btn" onclick="openEditProfile()" title="Edit your profile">' + ic('edit') + ' Edit Profile</button>' : '') +
    '<div class="honors-frame"><div class="avatar honors-avatar' + (u.vip ? ' vip-frame' : '') + '">' + frameImgFor(u) + (u.vip && !(APP_CONTROLS && APP_CONTROLS.vipFrames === false) ? '<img class="frame-img vip-frame-img" src="' + ((u.kit && u.kit.profileFrame) ? u.kit.profileFrame.svg : vipFrameImg(u.vip)) + '" alt="VIP frame">' : '') + esc(displayName(u)[0].toUpperCase()) + '</div>' +
    (u.vip >= 5 ? '<span class="honors-frame-glow"></span>' : '') + '</div>' +
    '<h2 class="vip-color-' + (u.vip || 0) + '">' + esc(displayName(u)) + '</h2>' +
    (u.svip ? svipBadgeImg() : '') +
    honor +
    (u.vip ? vipBannerImg(u.vip) : '') +
    rankBadge +
    '<p class="muted">ID: ' + u.id + ' <button class="btn ghost" onclick="navigator.clipboard && navigator.clipboard.writeText(\'' + u.id + '\');alert(\'ID copied: ' + u.id + '\')">Copy</button>' + (u.country ? ' • ' + esc(u.country) : '') + ' • ' + levelPill(u.level) + ' ' + roleTag(u) + ' ' + vipTagHtml(u) + '</p>' +
    '<p class="muted">' + esc(u.bio || '') + '</p>' +
    cpBanner +
    '<div class="stats-row"><div><b>' + fmt(s.visitors) + '</b><span>Visitors</span></div><div><b>' + fmt(s.followers) + '</b><span>Followers</span></div><div><b>' + fmt(s.following) + '</b><span>Following</span></div></div>' +
    '<div class="action-row"><button class="btn" onclick="alert(\'Liked!\')">' + ic("heart") + ' Like</button>' +
    (d.isMe ? '' : followBtnHtml(d.follow, u.id) + ' <button class="btn gold" onclick="openThread(\'' + u.id + '\')">Message</button> <button class="btn" onclick="giftToUser(\'' + u.id + '\', \'' + esc(displayName(u)) + '\')">' + ic("gift") + ' Gift</button>') + '</div>' +
    (profileFromMic ? micProfileActionsHtml(d, u) : '') +
    (d.isMe ? (u.vip >= 10 ? '<div class="mic-profile-actions"><button class="btn" onclick="toggleAnonymous()">Anonymous Display (VIP10) — tap to toggle</button></div>' : '<p class="muted">' + ic("lock") + ' Anonymous Display is a VIP10 benefit.</p>') : '') +
    '<div class="tabs-mini">' + ['moments', 'honors', 'about', 'rooms'].map(t => '<button class="mini-tab' + (t === honorsTab ? ' active' : '') + '" onclick="honorsTab=\'' + t + '\';renderHonorsProfile()">' + t[0].toUpperCase() + t.slice(1) + '</button>').join('') + '</div>' +
    body +
    (d.isMe ? '' : '<div class="action-row"><button class="btn danger" onclick="blockUser(\'' + u.id + '\')">' + ic("ban") + ' Block</button> <button class="btn danger" onclick="reportUser(\'' + u.id + '\')">' + ic("report") + ' Report</button></div>') +
    '</div>';
}
function profileTab(t) { honorsTab = t; renderHonorsProfile(); }
/* ---------------- EDIT PROFILE (2026-11-22) ----------------
   Own profile only: the Edit button appears on YOUR profile (Me tab and
   the honors profile when isMe). Layout follows the reference: top bar
   with back arrow + "Edit" + Save, round photo with a camera badge, then
   UserName, Gender, Date of Birth, Country, Tag, Bio, Profile Frame,
   Profile Card Skin. Date of birth and gender are private — they are
   sent only to /api/me and never shown on anyone else's profile. */
async function openEditProfile() {
  switchTab('me');
  const p = document.getElementById('mePanel');
  p.innerHTML = '<div class="card"><p class="muted">Loading your profile…</p></div>';
  try {
    const d = await api('/api/me', { headers: headers() });
    const me = d.user;
    let shopItems = [];
    try { const s = await api('/api/shop', { headers: headers() }); shopItems = s.items || []; } catch (e) {}
    const inv = ME.inventory || [];
    const ownedFrames = shopItems.filter(i => inv.includes(i.id) && i.category === 'Frame');
    const ownedCards = shopItems.filter(i => inv.includes(i.id) && (i.category === 'Profile Card' || i.category === 'Chat Box'));
    const vipFrames = [];
    for (let v = 1; v <= (ME.vip || 0); v++) vipFrames.push({ id: 'vip-frame-' + v, name: 'VIP' + v + ' Frame — ' + (VIP_ANIMALS[v] || '') });
    const frameOpts = [{ id: '', name: 'No frame' }]
      .concat(ownedFrames.map(i => ({ id: i.id, name: i.name })))
      .concat(vipFrames)
      .concat(ME.role === 'owner' ? [{ id: 'owner-frame', name: 'Owner Frame' }] : []);
    if (me.frameId && !frameOpts.some(o => o.id === me.frameId)) frameOpts.push({ id: me.frameId, name: 'Current frame (' + me.frameId + ')' });
    const cardOpts = [{ id: '', name: 'No card skin' }]
      .concat(ownedCards.map(i => ({ id: i.id, name: i.name })));
    for (let v = 1; v <= (ME.vip || 0); v++) cardOpts.push({ id: 'vip-card-' + v, name: 'VIP' + v + ' Card Skin' });
    if (me.cardSkinId && !cardOpts.some(o => o.id === me.cardSkinId)) cardOpts.push({ id: me.cardSkinId, name: 'Current card (' + me.cardSkinId + ')' });
    const opt = (list, cur) => list.map(o => '<option value="' + esc(o.id) + '"' + (o.id === (cur || '') ? ' selected' : '') + '>' + esc(o.name) + '</option>').join('');
    const field = (label, inner, hint) => '<label class="edit-label">' + label + '</label>' + inner + (hint ? '<p class="edit-hint">' + hint + '</p>' : '');
    p.innerHTML = '<div class="card edit-profile">' +
      '<div class="edit-topbar"><button class="icon-btn" onclick="openProfile()" title="Back" aria-label="Back">' + ic('back') + '</button><h3>Edit</h3><button class="btn gold" onclick="saveEditProfile()">Save</button></div>' +
      '<div class="edit-avatar-wrap"><div class="avatar edit-avatar">' + esc(displayName(me)[0].toUpperCase()) + '</div>' +
      '<button class="edit-cam-badge" onclick="openGifPhoto()" title="Change profile photo (GIF photo)">' + ic('camera') + '</button></div>' +
      field('UserName', '<input id="epName" type="text" maxlength="30" value="' + esc(me.name || '') + '" placeholder="Your name">') +
      field('Gender', '<select id="epGender">' + [''].concat(PROFILE_GENDERS).map(g => '<option value="' + g + '"' + (me.gender === g ? ' selected' : '') + '>' + (g || 'Prefer not to say') + '</option>').join('') + '</select>', 'Only you can see this.') +
      field('Date of Birth', '<input id="epDob" type="date" value="' + esc(me.dob || '') + '">', 'Only you can see this. Format: year-month-day.') +
      field('Country', '<select id="epCountry"><option value="">— Pick your country —</option>' + PROFILE_COUNTRIES.map(c => '<option' + (me.country === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>') +
      field('Tag', '<input id="epTag" type="text" maxlength="20" value="' + esc(me.tag || '') + '" placeholder="A short tag, e.g. Steam">') +
      field('Bio', '<textarea id="epBio" maxlength="200" rows="2" placeholder="Write a short bio…">' + esc(me.bio || '') + '</textarea>') +
      field('Profile Frame', '<select id="epFrame">' + opt(frameOpts, me.frameId) + '</select>', 'Only frames you own are listed — buy more in the Premium Shop.') +
      field('Profile Card Skin', '<select id="epCard">' + opt(cardOpts, me.cardSkinId) + '</select>', 'Only card skins you own are listed.') +
      '<p id="epMsg" class="msg"></p>' +
      '<button class="btn gold edit-save-big" onclick="saveEditProfile()">Save Changes</button>' +
      '<button class="btn ghost" onclick="openProfile()">Cancel</button></div>';
  } catch (e) { p.innerHTML = '<div class="card"><p class="msg">' + esc(e.message) + '</p><button class="btn" onclick="openProfile()">Back to Profile</button></div>'; }
}
async function saveEditProfile() {
  const msg = document.getElementById('epMsg');
  const body = {
    displayName: document.getElementById('epName').value.trim(),
    gender: document.getElementById('epGender').value,
    dob: document.getElementById('epDob').value,
    country: document.getElementById('epCountry').value,
    tag: document.getElementById('epTag').value.trim(),
    bio: document.getElementById('epBio').value.trim(),
    frameId: document.getElementById('epFrame').value || null,
    cardSkinId: document.getElementById('epCard').value || null
  };
  try {
    const d = await api('/api/me', { method: 'PUT', headers: headers(true), body: JSON.stringify(body) });
    ME = d.user;
    if (msg) msg.textContent = '';
    alert('Profile saved!');
    loadMe();
    openProfile();
  } catch (e) { if (msg) msg.textContent = e.message; else alert(e.message); }
}
async function blockUser(id) { if (!(await appConfirm('Block this user? You will not see their messages or rooms.'))) return; try { await api('/api/v2/extras/users/' + id + '/block', { method: 'POST', headers: headers() }); alert('User blocked.'); } catch (e) { alert(e.message); } }
async function reportUser(id) { const reason = await appPrompt('Report User', 'Why are you reporting this user?'); if (!reason) return; try { await api('/api/v2/extras/users/' + id + '/report', { method: 'POST', headers: headers(true), body: JSON.stringify({ reason }) }); alert(' Report sent to the owner. Thank you for keeping AZLAN WORLD CHAT safe.'); } catch (e) { alert(e.message); } }

/* ---------------- 3D EMOJI ON MIC + ROOM THEMES STORE + ROOM ADMIN ---------------- */
/* 3D emoji panel — tap any emoji and it shows on YOUR mic seat.
   RULE: only ONE emoji shows on the mic at a time — a new pick replaces the old one. */
function backToRoomOrParty() { if (currentRoom) backToRoom(); else switchTab('party'); }
async function openEmojiPanel() {
  try {
    const d = await api('/api/v2/updates/emoji-panel', { headers: headers() });
    const p = document.getElementById('mePanel');
    p.innerHTML = '<div class="card"><button class="btn ghost" onclick="backToRoomOrParty()">← Back</button><h3>' + ic('sparkle') + ' 3D Emojis — put one on your mic</h3>' +
      '<p class="muted">' + esc(d.note) + '</p>' +
      '<div class="emoji-grid">' + d.emojis.map(e => '<div class="emoji-item' + (d.mine && d.mine.id === e.id ? ' selected' : '') + '" onclick="setMicEmoji(\'' + e.id + '\')"><img src="' + e.svg + '" alt="' + esc(e.name) + '"><span>' + esc(e.name) + '</span><br><span class="muted">' + esc(e.desc) + '</span></div>').join('') + '</div>' +
      '<button class="btn ghost" onclick="setMicEmoji(null)">Remove my mic emoji</button></div>';
    switchTab('me');
  } catch (e) { alert(e.message); }
}
async function setMicEmoji(id) {
  try {
    const d = await api('/api/v2/updates/mic-emoji', { method: 'POST', headers: headers(true), body: JSON.stringify({ emojiId: id }) });
    if (ME) ME.micEmoji = d.micEmoji;
    alert(d.micEmoji ? 'Mic emoji: ' + d.micEmoji.name + ' — it shows on your mic seat now!' : 'Mic emoji removed.');
    if (currentRoom) { const r = await api('/api/rooms/' + currentRoom.id + '/join', { method: 'POST', headers: headers() }); currentRoom = r.room; renderMicGrid(); }
    openEmojiPanel();
  } catch (e) { alert(e.message); }
}
/* Room background themes store — 1,000,000 coins, VIP 500,000, owner FREE */
let roomThemeTab = 'Themes';
async function openRoomThemes() {
  try {
    const d = await api('/api/v2/updates/room-themes', { headers: headers() });
    const p = document.getElementById('mePanel');
    const list = roomThemeTab === 'Themes' ? d.themes : d.themes.filter(t => t.tab === roomThemeTab.toLowerCase() || (roomThemeTab === 'Romance' && t.tab === 'romance') || (roomThemeTab === 'ModernLives' && t.tab === 'modern') || (roomThemeTab === 'Nature' && t.tab === 'nature') || (roomThemeTab === 'Scenery' && t.tab === 'scenery'));
    p.innerHTML = '<div class="card">' + (currentRoom ? '<button class="btn ghost" onclick="backToRoom()">← Back to Room</button>' : '') + '<button class="btn ghost" onclick="openVipClub()">← Back to VIP Club</button><h3>' + ic('theme') + ' Room Themes</h3>' +
      '<p class="muted">Buy a theme and apply it to your room. Every theme: <b>' + fmt(d.myPrice) + ' coins</b>' + (d.isVip ? ' (VIP discount — you pay 500,000)' : ' (VIP users pay only 500,000)') + (d.isOwner ? ' — FREE for the owner' : '') + '</p>' +
      '<div class="tabs-mini">' + d.tabs.map(t => '<button class="mini-tab' + (t === roomThemeTab ? ' active' : '') + '" onclick="roomThemeTab=\'' + t + '\';openRoomThemes()">' + t + '</button>').join('') + '</div>' +
      '<div class="theme-grid">' + (list.length ? list.map(t => '<div class="theme-card"><img class="theme-thumb" src="' + t.svg + '" alt="' + esc(t.name) + '"><b>' + esc(t.name) + '</b><br><span class="muted">' + esc(t.desc) + '</span><br><span class="g-price">' + fmt(t.price) + ' coins</span><br>' +
        (t.applied ? '<button class="btn" disabled>Using</button>' : t.owned ? '<button class="btn gold" onclick="applyRoomTheme(\'' + t.id + '\')">Apply</button>' : '<button class="btn gold" onclick="buyRoomTheme(\'' + t.id + '\')">Purchase</button>') + '</div>').join('') : '<p class="muted">No themes in this tab yet.</p>') + '</div>' +
      '<p class="muted">Balance: <b>' + fmt(d.myCoins) + ' coins</b> <button class="btn ghost" onclick="openWallet()">Recharge ›</button></p></div>';
    switchTab('me');
  } catch (e) { alert(e.message); }
}
async function buyRoomTheme(id) {
  try { const d = await api('/api/v2/updates/room-themes/buy', { method: 'POST', headers: headers(true), body: JSON.stringify({ themeId: id }) }); alert('Theme bought! Paid ' + fmt(d.paid || 0) + ' coins.'); openRoomThemes(); }
  catch (e) { alert(e.message); }
}
async function applyRoomTheme(id) {
  try { const d = await api('/api/v2/updates/room-themes/apply', { method: 'POST', headers: headers(true), body: JSON.stringify({ themeId: id }) }); if (ME) ME.roomTheme = id; alert(d.note); openRoomThemes(); }
  catch (e) { alert(e.message); }
}
/* Room admin — the host makes an admin; Admin tag shows on their ID */
async function makeRoomAdminPrompt() {
  if (!currentRoom) return;
  const userId = await appPrompt('Make Admin', 'User ID to make admin of this room:');
  if (!userId) return;
  try { const d = await api('/api/v2/updates/rooms/' + currentRoom.id + '/admin', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId }) }); alert('Admin set! The Admin tag now shows on their ID.'); }
  catch (e) { alert(e.message); }
}
/* OWNER frame in the Premium Shop — owner only, "OWNER" written on it */
async function equipOwnerFrame() {
  try { const d = await api('/api/v2/updates/owner-frame/equip', { method: 'POST', headers: headers() }); alert('Owner Frame equipped! It shows on your profile photo, on the mic, and to anyone who visits your profile.'); if (ME) ME.profileFrame = 'owner-frame'; }
  catch (e) { alert(e.message); }
}

/* ---------------- OWNER: Total Control panel ---------------- */
/* ---------------- CUSTOMIZATION STUDIO (Owner Portal, owner-only) ----------
   No-code editing of the whole app, from inside the app: Design (colours,
   fonts, backgrounds, app name), Content (VIP badges/frames/crowns/
   nameplates, gift photos/names/prices, shop items) and Settings. Every
   change applies LIVE immediately, no redeploy. Includes the AI search box
   (owner-only): type what you want, see designs, tap one to apply it.
   The AI search bar and the whole Studio exist ONLY for the owner — the
   Studio button renders only in the Owner Portal (owner login required),
   and every Studio API rejects non-owners server-side. */
let STUDIO = null, STUDIO_TAB = 'design', STUDIO_AI_SLOT = null;
async function openStudio() {
  if (!ME || ME.role !== 'owner') { alert('Owner only.'); return; }
  switchTab('owner');
  const p = document.getElementById('ownerPanel');
  p.innerHTML = '<div class="card"><h3>' + ic('edit') + ' Customization Studio — loading…</h3></div>';
  try {
    const d = await api('/api/owner/content', { headers: headers() });
    STUDIO = d; STUDIO_TAB = 'design';
    renderStudio();
  } catch (e) { p.innerHTML = '<div class="card"><p class="muted">' + esc(e.message) + '</p></div>'; }
}
function renderStudio() {
  const p = document.getElementById('ownerPanel'); if (!p || !STUDIO) return;
  const tabs = [['design', 'Design'], ['content', 'Content'], ['lists', 'Manage Lists'], ['settings', 'Settings']];
  let html = '<div class="card studio"><h3>' + ic('edit') + ' Customization Studio</h3>' +
    '<p class="muted">Change anything in the app yourself — no coding. Changes apply live, immediately, for everyone.</p>' +
    '<div class="tabs-mini">' + tabs.map(t => '<button class="mini-tab' + (STUDIO_TAB === t[0] ? ' active' : '') + '" onclick="STUDIO_TAB=\'' + t[0] + '\';renderStudio()">' + t[1] + '</button>').join('') + '</div>' +
    '<div id="studioBody"></div>' +
    '<div id="studioAiArea"></div>' +
    '<p class="muted" id="studioMsg"></p></div>';
  p.innerHTML = html;
  if (STUDIO_TAB === 'design') studioDesign();
  else if (STUDIO_TAB === 'content') studioContent();
  else if (STUDIO_TAB === 'lists') studioLists();
  else studioSettings();
}
function studioMsg(t) { const el = document.getElementById('studioMsg'); if (el) el.textContent = t || ''; }
function studioDesign() {
  const d = (STUDIO.customization && STUDIO.customization.design) || {};
  const col = (key, label) => '<label class="studio-row"><span>' + label + '</span><input type="color" id="studioDesign-' + key + '" value="' + esc(d[key] || '#a67c00') + '" oninput="studioPreviewDesign()"></label>';
  const el = document.getElementById('studioBody'); if (!el) return;
  el.innerHTML =
    col('gold', 'Main gold colour') + col('gold2', 'Accent gold') + col('text', 'Text colour') + col('muted', 'Muted text') +
    col('card', 'Card background') + col('border', 'Border colour') + col('bg1', 'App background top') + col('bg2', 'App background bottom') +
    '<label class="studio-row"><span>Font</span><select id="studioDesign-font" onchange="studioPreviewDesign()">' +
    ['system-ui', 'Segoe UI', 'Arial', 'Georgia', 'Verdana'].map(f => '<option' + (d.font === f ? ' selected' : '') + '>' + f + '</option>').join('') + '</select></label>' +
    '<label class="studio-row"><span>App name</span><input id="studioDesign-appName" type="text" value="' + esc(d.appName || 'AZLAN WORLD CHAT') + '"></label>' +
    '<div class="studio-preview" id="studioPreview"><div class="studio-preview-card"><b>Preview</b><p>This is how a card looks with your colours.</p><button class="btn gold">Gold button</button></div></div>' +
    '<button class="btn gold" onclick="studioSaveDesign()">Save Design — applies live</button> ' +
    '<button class="btn danger" onclick="studioReset()">Reset to Default</button>';
  studioPreviewDesign();
}
function studioPreviewDesign() {
  const pv = document.getElementById('studioPreview'); if (!pv) return;
  const get = k => (document.getElementById('studioDesign-' + k) || {}).value;
  const card = pv.querySelector('.studio-preview-card');
  if (card) {
    card.style.background = get('card') || '#fff'; card.style.borderColor = get('border') || '#e3d9b8';
    card.style.color = get('text') || '#1c1c1c';
    const btn = card.querySelector('.btn'); if (btn) btn.style.background = get('gold') || '#a67c00';
  }
  pv.style.background = 'linear-gradient(180deg,' + (get('bg1') || '#fff') + ',' + (get('bg2') || '#fdf9ec') + ')';
  pv.style.fontFamily = (document.getElementById('studioDesign-font') || {}).value || 'system-ui';
}
async function studioSaveDesign() {
  const design = {};
  ['gold', 'gold2', 'text', 'muted', 'card', 'border', 'bg1', 'bg2'].forEach(k => { const el = document.getElementById('studioDesign-' + k); if (el) design[k] = el.value; });
  design.font = (document.getElementById('studioDesign-font') || {}).value || 'system-ui';
  design.appName = (document.getElementById('studioDesign-appName') || {}).value || 'AZLAN WORLD CHAT';
  try {
    const d = await api('/api/owner/content', { method: 'POST', headers: headers(true), body: JSON.stringify({ design }) });
    CONTENT_OVERRIDES = d.customization; applyDesign(design);
    studioMsg('Design saved — live for everyone now.');
  } catch (e) { studioMsg(e.message); }
}
async function studioReset() {
  if (!(await appConfirm('Reset ALL design and content changes to defaults? (Added gifts/items stay.)'))) return;
  try {
    const d = await api('/api/owner/content/reset', { method: 'POST', headers: headers() });
    CONTENT_OVERRIDES = d.customization; applyDesign(CONTENT_OVERRIDES.design || {});
    openStudio(); studioMsg('Reset to defaults.');
  } catch (e) { studioMsg(e.message); }
}
function studioContent() {
  const el = document.getElementById('studioBody'); if (!el) return;
  let html = '<h3>VIP Badges &amp; Frames (1–12)</h3><p class="muted">Tap a VIP to edit it: change its photo, frame, crown or nameplate — upload your own photo, or use AI Search.</p>';
  (STUDIO.levels || []).forEach(l => {
    html += '<div class="studio-row"><img class="studio-thumb" src="' + esc(l.badge) + '" alt=""><span><b>VIP ' + l.vip + ' — ' + esc(l.name) + '</b><br><span class="muted">' + fmt(l.price) + ' coins</span></span>' +
      '<button class="btn" onclick="studioToggleVip(' + l.vip + ')">Edit</button></div>' +
      '<div id="vipEdit-' + l.vip + '" class="studio-vip-edit hidden"></div>';
  });
  html += '<h3>Gifts</h3><p class="muted">Change a gift photo, name or price — or add a new gift.</p>';
  (STUDIO.gifts || []).forEach(g => {
    html += '<div class="studio-row"><img class="studio-thumb" src="' + esc(g.svg || 'assets/icons/gift.svg') + '" alt=""><span><input id="studioGiftName-' + g.id + '" value="' + esc(g.name) + '" style="width:120px"> <input id="studioGiftPrice-' + g.id + '" type="number" value="' + g.price + '" style="width:90px"> coins</span>' +
      '<span><button class="btn" onclick="studioUploadBtn({kind:\'gift\',id:\'' + g.id + '\'})">Change photo</button> <button class="btn" onclick="studioAiOpen({kind:\'gift\',id:\'' + g.id + '\'})">AI Search</button> <button class="btn gold" onclick="studioSaveGift(\'' + g.id + '\')">Save</button></span></div>';
  });
  html += '<div class="card"><h3>Add a New Gift</h3><input id="studioNewGiftName" placeholder="Gift name"><input id="studioNewGiftPrice" type="number" placeholder="Price in coins"><input id="studioNewGiftSvg" placeholder="Photo URL (optional — or upload below)"><button class="btn" onclick="studioUploadBtn({kind:\'new-gift\'})">Upload photo</button> <button class="btn gold" onclick="studioAddGift()">Add Gift</button></div>';
  html += '<h3>Store Items</h3>';
  (STUDIO.shop || []).forEach(it => {
    html += '<div class="studio-row"><span><input id="studioShopName-' + it.id + '" value="' + esc(it.name) + '" style="width:150px"> <input id="studioShopPrice-' + it.id + '" type="number" value="' + it.price + '" style="width:90px"> coins</span>' +
      '<span><button class="btn" onclick="studioAiOpen({kind:\'shop\',id:\'' + it.id + '\'})">AI Search</button> <button class="btn gold" onclick="studioSaveShop(\'' + it.id + '\')">Save</button></span></div>';
  });
  html += '<div class="card"><h3>Add a New Store Item</h3><input id="studioNewShopName" placeholder="Item name"><input id="studioNewShopPrice" type="number" placeholder="Price in coins"><input id="studioNewShopCat" placeholder="Category (e.g. Theme)"><button class="btn gold" onclick="studioAddShop()">Add Item</button></div>';
  el.innerHTML = html;
}
function studioToggleVip(v) {
  const box = document.getElementById('vipEdit-' + v); if (!box) return;
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
  const l = (STUDIO.levels || []).find(x => x.vip === v); if (!l) return;
  const slotRow = (kind, label, url) =>
    '<div class="studio-row"><span>' + label + '</span><img class="studio-thumb" src="' + esc(url) + '" alt=""><span><input id="vipUrl-' + v + '-' + kind + '" value="' + esc(url) + '" style="width:180px"></span>' +
    '<span><button class="btn" onclick="studioUploadBtn({kind:\'vip-' + kind + '\',vip:' + v + '})">Upload photo</button> <button class="btn" onclick="studioAiOpen({kind:\'vip-' + kind + '\',vip:' + v + '})">AI Search</button></span></div>' +
    studioVipArtVariants(v, kind);
  box.innerHTML =
    '<label class="studio-row"><span>Badge name</span><input id="vipName-' + v + '" value="' + esc(l.name) + '"></label>' +
    slotRow('badge', 'Badge photo', l.badge) + slotRow('frame', 'Frame', l.frame) + slotRow('crown', 'Crown', l.crown) + slotRow('nameplate', 'Nameplate', l.nameplate) +
    '<button class="btn gold" onclick="studioSaveVip(' + v + ')">Save VIP ' + v + ' — applies live</button>';
  box.classList.remove('hidden');
}
async function studioSaveVip(v) {
  const ov = { name: (document.getElementById('vipName-' + v) || {}).value || '' };
  ['badge', 'frame', 'crown', 'nameplate'].forEach(k => { const el = document.getElementById('vipUrl-' + v + '-' + k); if (el && el.value) ov[k] = el.value; });
  try {
    const d = await api('/api/owner/content', { method: 'POST', headers: headers(true), body: JSON.stringify({ vip: { [String(v)]: ov } }) });
    CONTENT_OVERRIDES = d.customization;
    studioMsg('VIP ' + v + ' saved — live everywhere now.');
    const s = await api('/api/owner/content', { headers: headers() }); STUDIO = s; studioContent();
  } catch (e) { studioMsg(e.message); }
}
async function studioSaveGift(id) {
  const name = (document.getElementById('studioGiftName-' + id) || {}).value;
  const price = (document.getElementById('studioGiftPrice-' + id) || {}).value;
  try {
    await api('/api/owner/content', { method: 'POST', headers: headers(true), body: JSON.stringify({ gifts: { [id]: { name, price: Number(price) } } }) });
    studioMsg('Gift saved — live now.');
  } catch (e) { studioMsg(e.message); }
}
async function studioSaveShop(id) {
  const name = (document.getElementById('studioShopName-' + id) || {}).value;
  const price = (document.getElementById('studioShopPrice-' + id) || {}).value;
  try {
    await api('/api/owner/content', { method: 'POST', headers: headers(true), body: JSON.stringify({ shop: { [id]: { name, price: Number(price) } } }) });
    studioMsg('Store item saved — live now.');
  } catch (e) { studioMsg(e.message); }
}
async function studioAddGift() {
  const name = (document.getElementById('studioNewGiftName') || {}).value;
  const price = (document.getElementById('studioNewGiftPrice') || {}).value;
  const svg = (document.getElementById('studioNewGiftSvg') || {}).value;
  try {
    const d = await api('/api/owner/content/add-gift', { method: 'POST', headers: headers(true), body: JSON.stringify({ name, price: Number(price), svg }) });
    studioMsg('Gift added: ' + d.gift.name + ' — live in the gift panel now.');
    const s = await api('/api/owner/content', { headers: headers() }); STUDIO = s; studioContent();
  } catch (e) { studioMsg(e.message); }
}
async function studioAddShop() {
  const name = (document.getElementById('studioNewShopName') || {}).value;
  const price = (document.getElementById('studioNewShopPrice') || {}).value;
  const category = (document.getElementById('studioNewShopCat') || {}).value;
  try {
    const d = await api('/api/owner/content/add-shop', { method: 'POST', headers: headers(true), body: JSON.stringify({ name, price: Number(price), category }) });
    studioMsg('Store item added: ' + d.item.name + ' — live in the store now.');
    const s = await api('/api/owner/content', { headers: headers() }); STUDIO = s; studioContent();
  } catch (e) { studioMsg(e.message); }
}

/* ============ OWNER MANAGE LISTS — Add / Remove / Reorder (2026-11-22) ==
   Every list the owner manages gets Add, Remove (with a confirm step) and
   Move up / Move down. Changes apply live immediately and persist on the
   server; the order the owner sets is the order every user sees. VIP levels
   are fixed at 1–12 — they can be reordered or hidden, never added or
   deleted, and reordering never changes a level's price/points/benefits. */
async function studioListsApi(path, body) {
  return api('/api/owner/content' + path, { method: 'POST', headers: headers(true), body: JSON.stringify(body || {}) });
}
async function studioReload() {
  const d = await api('/api/owner/content', { headers: headers() });
  STUDIO = d;
  if (STUDIO_TAB === 'lists') studioLists();
  else if (STUDIO_TAB === 'content') studioContent();
}
function studioListsState() { return (STUDIO && STUDIO.lists) || { order: {}, hidden: {}, custom: {}, vipArt: {} }; }
function studioOrdered(items, order, idOf) {
  const byId = new Map(items.map(it => [String(idOf(it)), it]));
  const out = [];
  (order || []).forEach(id => { const it = byId.get(String(id)); if (it) { out.push(it); byId.delete(String(id)); } });
  items.forEach(it => { if (byId.has(String(idOf(it)))) out.push(it); });
  return out;
}
function studioIsHidden(kind, id) { const h = studioListsState().hidden[kind] || []; return h.map(String).includes(String(id)); }
function studioListItems(kind) {
  const st = studioListsState();
  if (kind === 'vip') return studioOrdered(STUDIO.levels || [], st.order.vip, l => l.vip).filter(l => !studioIsHidden('vip', l.vip));
  if (kind === 'gifts') return studioOrdered(STUDIO.gifts || [], st.order.gifts, g => g.id).filter(g => !studioIsHidden('gifts', g.id));
  if (kind === 'shop') return studioOrdered(STUDIO.shop || [], st.order.shop, i => i.id).filter(i => !studioIsHidden('shop', i.id));
  if (kind === 'ids') return studioListItems('shop').filter(i => i.category === 'Unique ID');
  if (kind === 'rooms') return studioOrdered(STUDIO.rooms || [], st.order.rooms, r => r.id);
  if (kind === 'announcements') return studioOrdered(STUDIO.announcements || [], st.order.announcements, b => b.id);
  return [];
}
function studioHiddenItems(kind) {
  if (kind === 'vip') return (STUDIO.levels || []).filter(l => studioIsHidden('vip', l.vip));
  if (kind === 'gifts') return (STUDIO.gifts || []).filter(g => studioIsHidden('gifts', g.id));
  if (kind === 'shop') return (STUDIO.shop || []).filter(i => studioIsHidden('shop', i.id));
  return [];
}
async function studioListMove(kind, id, dir) {
  if (kind === 'ids') {
    const ids = studioListItems('ids').map(i => String(i.id));
    const i = ids.indexOf(String(id)); const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const t = ids[i]; ids[i] = ids[j]; ids[j] = t;
    /* Merge back into the full shop order: non-ID items stay in place, the
       ID slots take the new ID order. */
    const full = studioListItems('shop').map(x => String(x.id));
    const idSet = new Set(ids); let k = 0;
    const merged = full.map(x => idSet.has(x) ? ids[k++] : x);
    try { const d = await studioListsApi('/lists/order', { kind: 'shop', order: merged }); STUDIO.lists = d.lists; studioLists(); studioMsg('Order saved — live for everyone now.'); } catch (e) { studioMsg(e.message); }
    return;
  }
  const items = studioListItems(kind);
  const ids = items.map(it => String(kind === 'vip' ? it.vip : it.id));
  const i = ids.indexOf(String(id));
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  const t = ids[i]; ids[i] = ids[j]; ids[j] = t;
  try { const d = await studioListsApi('/lists/order', { kind, order: ids }); STUDIO.lists = d.lists; studioLists(); studioMsg('Order saved — live for everyone now.'); } catch (e) { studioMsg(e.message); }
}
async function studioListRemove(kind, id, label) {
  const ok = await appConfirm('Remove ' + label + '? Built-in items are hidden and can be restored later; your own added items and rooms are deleted for good.');
  if (!ok) return;
  try {
    const d = await studioListsApi('/lists/remove', { kind: kind === 'ids' ? 'shop' : kind, id });
    if (d.lists) STUDIO.lists = d.lists;
    await studioReload();
    studioMsg('Removed (' + (d.removed || '') + ') — live now.');
  } catch (e) { studioMsg(e.message); }
}
async function studioListRestore(kind, id) {
  try { const d = await studioListsApi('/lists/restore', { kind: kind === 'ids' ? 'shop' : kind, id }); STUDIO.lists = d.lists; await studioReload(); studioMsg('Restored — live now.'); } catch (e) { studioMsg(e.message); }
}
function studioLists() {
  const el = document.getElementById('studioBody'); if (!el) return;
  const row = (kind, id, inner, label) =>
    '<div class="studio-row"><span>' + inner + '</span><span class="studio-list-btns">' +
    '<button class="btn" title="Move up" onclick="studioListMove(\'' + kind + '\',\'' + id + '\',-1)">↑</button>' +
    '<button class="btn" title="Move down" onclick="studioListMove(\'' + kind + '\',\'' + id + '\',1)">↓</button>' +
    '<button class="btn danger" title="Remove" onclick="studioListRemove(\'' + kind + '\',\'' + id + '\',\'' + esc(label).replace(/\'/g, '') + '\')">✕</button></span></div>';
  const hiddenRow = (kind, id, inner) =>
    '<div class="studio-row studio-hidden-row"><span>' + inner + '</span><button class="btn gold" onclick="studioListRestore(\'' + kind + '\',\'' + id + '\')">Restore</button></div>';
  let html = '<h3>Manage Lists — Add, Remove, Reorder</h3><p class="muted">Everything you change here applies live, immediately, for everyone — no coding, no redeploy. The order you set is the order users see. Built-in items you remove are hidden (restore them below); items you added yourself are deleted for good.</p>';
  html += '<h3>VIP Levels (1–12)</h3><p class="muted">Reorder or hide a level. VIP levels cannot be added or deleted, and moving one never changes its price, points or benefits.</p>';
  studioListItems('vip').forEach(l => {
    html += row('vip', l.vip, '<img class="studio-thumb" src="' + esc(l.badge) + '" alt=""> <b>VIP ' + l.vip + ' — ' + esc(l.name) + '</b> <span class="muted">' + fmt(l.price) + ' coins • ' + fmt(l.points) + ' pts</span>', 'VIP ' + l.vip);
  });
  studioHiddenItems('vip').forEach(l => { html += hiddenRow('vip', l.vip, '<b>VIP ' + l.vip + ' — ' + esc(l.name) + '</b> <span class="muted">(hidden)</span>'); });
  html += '<h3>Gifts</h3>';
  studioListItems('gifts').forEach(g => {
    html += row('gifts', g.id, '<img class="studio-thumb" src="' + esc(g.svg || 'assets/icons/gift.svg') + '" alt=""> <b>' + esc(g.name) + '</b> <span class="muted">' + fmt(g.price) + ' coins</span>', g.name);
  });
  studioHiddenItems('gifts').forEach(g => { html += hiddenRow('gifts', g.id, '<b>' + esc(g.name) + '</b> <span class="muted">(hidden)</span>'); });
  html += '<div class="card"><h3>Add a New Gift</h3><input id="studioListNewGiftName" placeholder="Gift name"><input id="studioListNewGiftPrice" type="number" placeholder="Price in coins"><button class="btn gold" onclick="studioListAddGift()">Add Gift</button></div>';
  html += '<h3>Store Items</h3>';
  studioListItems('shop').forEach(it => {
    html += row('shop', it.id, '<b>' + esc(it.name) + '</b> <span class="muted">' + fmt(it.price) + ' coins • ' + esc(it.category || '') + '</span>', it.name);
  });
  studioHiddenItems('shop').forEach(it => { html += hiddenRow('shop', it.id, '<b>' + esc(it.name) + '</b> <span class="muted">(hidden)</span>'); });
  html += '<div class="card"><h3>Add a New Store Item</h3><input id="studioListNewShopName" placeholder="Item name"><input id="studioListNewShopPrice" type="number" placeholder="Price in coins"><input id="studioListNewShopCat" placeholder="Category (e.g. Theme)"><button class="btn gold" onclick="studioListAddShop()">Add Item</button></div>';
  html += '<h3>Unique IDs</h3><p class="muted">Special ID numbers users can buy. Add one, reorder them, or remove one.</p>';
  studioListItems('ids').forEach(it => {
    html += row('ids', it.id, '<b>' + esc(it.name) + '</b> <span class="muted">' + fmt(it.price) + ' coins</span>', it.name);
  });
  html += '<div class="card"><h3>Add a New Unique ID</h3><input id="studioListNewIdName" placeholder="ID number (e.g. 10000007)"><input id="studioListNewIdPrice" type="number" placeholder="Price in coins"><button class="btn gold" onclick="studioListAddId()">Add Unique ID</button></div>';
  html += '<h3>Rooms</h3><p class="muted">Reorder rooms (the order users see in Party) or remove a room. Create rooms from the Party tab.</p>';
  studioListItems('rooms').forEach(r => {
    html += row('rooms', r.id, '<b>' + esc(r.name || 'Room') + '</b> <span class="muted">ID ' + r.id + ' • ' + (r.members || 0) + ' members</span>', 'room ' + (r.name || r.id));
  });
  html += '<button class="btn gold" onclick="createRoomPrompt()">+ Create a New Room</button>';
  html += '<h3>Announcements</h3><p class="muted">Messages shown to everyone on the platform (the broadcast feed).</p>';
  studioListItems('announcements').forEach(b => {
    html += row('announcements', b.id, '<span>' + esc(b.text || '') + '</span> <span class="muted">' + (b.at ? new Date(b.at).toLocaleDateString() : '') + '</span>', 'announcement');
  });
  html += '<div class="card"><h3>Add an Announcement</h3><input id="studioListNewAnnText" placeholder="Announcement text"><button class="btn gold" onclick="studioListAddAnn()">Add Announcement</button></div>';
  el.innerHTML = html;
}
async function studioListAddGift() {
  const name = (document.getElementById('studioListNewGiftName') || {}).value;
  const price = (document.getElementById('studioListNewGiftPrice') || {}).value;
  try { const d = await studioListsApi('/lists/add', { kind: 'gifts', item: { name, price: Number(price) } }); await studioReload(); studioMsg('Gift added: ' + d.gift.name + ' — live now.'); } catch (e) { studioMsg(e.message); }
}
async function studioListAddShop() {
  const name = (document.getElementById('studioListNewShopName') || {}).value;
  const price = (document.getElementById('studioListNewShopPrice') || {}).value;
  const category = (document.getElementById('studioListNewShopCat') || {}).value;
  try { const d = await studioListsApi('/lists/add', { kind: 'shop', item: { name, price: Number(price), category } }); await studioReload(); studioMsg('Store item added: ' + d.item.name + ' — live now.'); } catch (e) { studioMsg(e.message); }
}
async function studioListAddId() {
  const name = (document.getElementById('studioListNewIdName') || {}).value;
  const price = (document.getElementById('studioListNewIdPrice') || {}).value;
  try { const d = await studioListsApi('/lists/add', { kind: 'ids', item: { name, price: Number(price) } }); await studioReload(); studioMsg('Unique ID added: ' + d.item.name + ' — live now.'); } catch (e) { studioMsg(e.message); }
}
async function studioListAddAnn() {
  const text = (document.getElementById('studioListNewAnnText') || {}).value;
  try { await studioListsApi('/lists/add', { kind: 'announcements', item: { text } }); await studioReload(); studioMsg('Announcement added — live now.'); } catch (e) { studioMsg(e.message); }
}
/* VIP art variants: each VIP level's badge / frame / crown / nameplate can
   hold several art options; the FIRST is the active one everywhere. */
function studioVipArtVariants(v, kind) {
  const variants = (((STUDIO.lists || {}).vipArt || {})[String(v)] || {})[kind] || [];
  if (!variants.length) return '';
  return '<div class="studio-variants">' + variants.map((u, i) =>
    '<span class="studio-variant' + (i === 0 ? ' active' : '') + '"><img src="' + esc(u) + '" alt="">' +
    (i === 0 ? '<b>Active</b>' : '<button class="btn" title="Make active" onclick="studioVipArt(' + v + ',\'' + kind + '\',\'set-active\',' + i + ')">★</button>') +
    '<button class="btn" title="Move up" onclick="studioVipArt(' + v + ',\'' + kind + '\',\'move\',' + i + ',-1)">↑</button>' +
    '<button class="btn" title="Move down" onclick="studioVipArt(' + v + ',\'' + kind + '\',\'move\',' + i + ',1)">↓</button>' +
    '<button class="btn danger" title="Remove" onclick="studioVipArt(' + v + ',\'' + kind + '\',\'remove\',' + i + ')">✕</button></span>'
  ).join('') +
  '<span class="studio-variant-add"><input id="vipArtUrl-' + v + '-' + kind + '" placeholder="Image URL"><button class="btn" onclick="studioVipArtAdd(' + v + ',\'' + kind + '\')">Add</button> <button class="btn" onclick="studioUploadBtn({kind:\'vip-art\',vip:' + v + ',slot:\'' + kind + '\'})">Upload</button> <button class="btn" onclick="studioAiOpen({kind:\'vip-art\',vip:' + v + ',slot:\'' + kind + '\'})">AI Search</button></span></div>';
}
async function studioVipArt(v, slot, action, index, dir) {
  try {
    const d = await studioListsApi('/lists/vip-art', { vip: Number(v), slot, action, index, dir: dir === -1 ? 'up' : 'down' });
    STUDIO.lists = d.lists; await studioReload();
    if (STUDIO_TAB === 'content') { const box = document.getElementById('vipEdit-' + v); if (box) studioToggleVip(Number(v)); }
    studioMsg('VIP ' + v + ' ' + slot + ' updated — live now.');
  } catch (e) { studioMsg(e.message); }
}
async function studioVipArtAdd(v, slot) {
  const url = (document.getElementById('vipArtUrl-' + v + '-' + slot) || {}).value || '';
  if (!url) { studioMsg('Paste an image URL first, or use Upload / AI Search.'); return; }
  try {
    const d = await studioListsApi('/lists/vip-art', { vip: Number(v), slot, url, action: 'add' });
    STUDIO.lists = d.lists; await studioReload();
    if (STUDIO_TAB === 'content') { const box = document.getElementById('vipEdit-' + v); if (box) studioToggleVip(Number(v)); }
    studioMsg('Art option added — live now.');
  } catch (e) { studioMsg(e.message); }
}
function studioSettings() {
  const el = document.getElementById('studioBody'); if (!el) return;
  const c = STUDIO.customization || {};
  el.innerHTML =
    '<label class="studio-row"><span>App announcement</span><input id="studioAnnounce" value="' + esc('') + '" placeholder="Welcome message for everyone"></label>' +
    '<label class="studio-row"><span>App name</span><input id="studioAppName" value="' + esc((c.design && c.design.appName) || 'AZLAN WORLD CHAT') + '"></label>' +
    '<label class="studio-row"><span>Signup bonus (coins)</span><input id="studioBonus" type="number" value="1000000"></label>' +
    '<button class="btn gold" onclick="studioSaveSettings()">Save Settings</button>' +
    '<p class="muted">AI image generation: ' + (STUDIO.aiConfigured ? '<b>connected</b> — AI Search can generate brand-new designs.' : '<b>not connected</b> — AI Search shows designs from the app library (free). To enable AI generation, set IMAGE_GEN_API_URL + IMAGE_GEN_API_KEY on the server (ask your assistant).') + '</p>' +
    '<p class="muted">Live voice (Agora): ' + (window.AGORA && AGORA.joined ? '<b>LIVE now</b>' : 'voice-notes mode until AGORA_APP_ID + AGORA_APP_CERTIFICATE are set on the server.') + '</p>';
}
async function studioSaveSettings() {
  const body = { settings: {} };
  const an = (document.getElementById('studioAnnounce') || {}).value; if (an) body.settings.announcement = an;
  const ap = (document.getElementById('studioAppName') || {}).value; if (ap) body.settings.appName = ap;
  const bo = (document.getElementById('studioBonus') || {}).value; if (bo !== '' && bo !== undefined) body.settings.signupBonus = Number(bo);
  try {
    const d = await api('/api/owner/content', { method: 'POST', headers: headers(true), body: JSON.stringify(body) });
    CONTENT_OVERRIDES = d.customization; applyDesign(CONTENT_OVERRIDES.design || {});
    studioMsg('Settings saved — live now.');
  } catch (e) { studioMsg(e.message); }
}
/* Upload a photo from the owner's phone into a slot. */
function studioUploadBtn(slot) {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    studioMsg('Uploading photo…');
    try {
      const fd = new FormData(); fd.append('image', f);
      const res = await fetch(API + '/api/owner/content/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Upload failed');
      await studioApplySlot(slot, d.url);
      studioMsg('Photo saved — live now.');
    } catch (e) { studioMsg(e.message); }
  };
  input.click();
}
async function studioApplySlot(slot, url) {
  if (slot.kind === 'vip-art') {
    await studioListsApi('/lists/vip-art', { vip: slot.vip, slot: slot.slot, url, action: 'add' });
    await studioReload();
    if (STUDIO_TAB === 'content') { const box = document.getElementById('vipEdit-' + slot.vip); if (box) studioToggleVip(slot.vip); }
    return;
  }
  await api('/api/owner/content', { method: 'POST', headers: headers(true), body: JSON.stringify({ apply: { slot, url } }) });
  await loadCustomization();
  if (slot.kind === 'new-gift') { const el = document.getElementById('studioNewGiftSvg'); if (el) el.value = url; return; }
  const s = await api('/api/owner/content', { headers: headers() }); STUDIO = s;
  if (STUDIO_TAB === 'content') studioContent();
  if (slot.kind && slot.kind.indexOf('vip-') === 0 && slot.vip) studioToggleVip(slot.vip);
}
/* ---------------- AI SEARCH (owner-only) --------------------------------
   Type what you want ("golden dragon badge", "red fire frame") — the server
   searches the app's design library (free) and, if an image API is
   configured, also generates brand-new designs. Tap one to apply it to
   that exact slot, instantly. Only the owner ever sees this box. */
function studioAiOpen(slot) {
  STUDIO_AI_SLOT = slot;
  const area = document.getElementById('studioAiArea'); if (!area) return;
  const label = slot.kind === 'gift' ? 'gift ' + slot.id : slot.kind === 'shop' ? 'store item ' + slot.id : slot.kind === 'new-gift' ? 'new gift' : slot.kind === 'vip-art' ? 'VIP ' + slot.vip + ' ' + slot.slot + ' art option' : 'VIP ' + slot.vip + ' ' + slot.kind.replace('vip-', '');
  area.innerHTML = '<div class="card studio-ai"><h3>' + ic('ai') + ' AI Search — for: ' + esc(label) + '</h3>' +
    '<p class="muted">Type what you want (e.g. "golden dragon badge", "red fire frame", "luxury gift"). Tap a design to apply it to this slot instantly.</p>' +
    '<div class="studio-row"><input id="studioAiQ" placeholder="golden dragon badge…" onkeydown="if(event.key===\'Enter\')studioAiGo()"><button class="btn gold" onclick="studioAiGo()">Search</button></div>' +
    '<div id="studioAiResults" class="studio-ai-results"></div>' +
    '<p class="muted" id="studioAiNote"></p>' +
    '<button class="btn ghost" onclick="document.getElementById(\'studioAiArea\').innerHTML=\'\'">Close</button></div>';
  const q = document.getElementById('studioAiQ'); if (q) q.focus();
}
async function studioAiGo() {
  const q = (document.getElementById('studioAiQ') || {}).value || '';
  const box = document.getElementById('studioAiResults'); const note = document.getElementById('studioAiNote');
  if (!q.trim()) { if (note) note.textContent = 'Type what you want first.'; return; }
  if (box) box.innerHTML = '<p class="muted">Searching designs…</p>';
  try {
    const d = await api('/api/owner/content/ai-search', { method: 'POST', headers: headers(true), body: JSON.stringify({ q, slot: STUDIO_AI_SLOT }) });
    if (note) note.textContent = d.note || '';
    if (box) box.innerHTML = (d.options || []).map(o => '<button class="studio-ai-opt" onclick="studioAiApply(\'' + esc(o.url).replace(/'/g, '%27') + '\')"><img src="' + esc(o.url) + '" alt=""><span>' + esc(o.label) + '</span></button>').join('') || '<p class="muted">No designs found — try other words, or upload your own photo.</p>';
  } catch (e) { if (note) note.textContent = e.message; }
}
async function studioAiApply(url) {
  if (!STUDIO_AI_SLOT) return;
  try {
    await studioApplySlot(STUDIO_AI_SLOT, url);
    studioMsg('Applied — live now.');
    const area = document.getElementById('studioAiArea'); if (area) area.innerHTML = '';
  } catch (e) { studioMsg(e.message); }
}
async function openOwnerControls() {
  try {
    const d = await api('/api/controls/owner', { headers: headers() });
    switchTab('owner');
    const c = d.controls;
    const sw = (key, name, desc) => '<div class="switch-row"><span><span class="sw-name">' + name + '</span><br><span class="sw-desc">' + desc + '</span></span><button class="switch' + (c[key] ? ' on' : '') + '" onclick="toggleControl(\'' + key + '\', ' + (!c[key]) + ')">' + (c[key] ? 'ON' : 'OFF') + '</button></div>';
    document.getElementById('ownerPanel').innerHTML = '<div class="card"><h3>'+ic("control")+' Total Control — everything in the app</h3><p class="muted">Turn any feature on/off, edit prices, or remove items. Changes apply to all users immediately.</p>' +
      sw('animations', ''+ic("movie")+' 3D Animations', 'All gift + room + entrance animations') +
      sw('sounds', ''+ic("volume")+' Sounds', 'All sound effects and gift sounds') +
      sw('gifts', ''+ic("gift")+' Gifts', 'Sending gifts') +
      sw('vip', ''+ic("crown")+' VIP', 'VIP Club and VIP purchases') +
      sw('shop', ''+ic("shop")+' Shop', 'Premium Shop purchases') +
      sw('rooms', ''+ic("mic")+' Rooms', 'Creating voice rooms') +
      sw('payments', ''+ic("card")+' Payments', 'Recharge requests') +
      sw('chat', ''+ic("chat")+' Chat & Messages', 'Room chat and private messages') +
      sw('moments', ''+ic("sparkle")+' Moments', 'Discover moments') +
      sw('luckyDraw', ''+ic("lucky")+' Lucky Draw', 'Lucky Draw spins') +
      sw('daily', ''+ic("gift")+' Daily Rewards', 'Daily sign-in rewards') +
      sw('invite', ''+ic("invite")+' Invite & Earn', 'Invite rewards') +
      sw('ai', ''+ic("ai")+' AI Assistant', 'In-app AI assistant') +
      sw('events', ''+ic("party")+' Events', 'Events') +
      '<h3>'+ic("gift")+' Gifts — enable / price</h3>' + d.gifts.map(g => '<div class="switch-row"><span><span class="sw-name">' + esc(g.name) + '</span><br><span class="sw-desc">' + g.id + ' • ' + fmt(g.price) + ' coins</span></span><span><input class="ctl-price" type="number" value="' + g.price + '" onchange="setPriceControl(\'gift\', \'' + g.id + '\', this.value)"><button class="switch' + (g.enabled ? ' on' : '') + '" onclick="toggleGiftControl(\'' + g.id + '\', ' + (!g.enabled) + ')">' + (g.enabled ? 'ON' : 'OFF') + '</button></span></div>').join('') +
      '<h3>'+ic("crown")+' VIP Levels — enable / price</h3>' + d.vipLevels.map(l => '<div class="switch-row"><span><span class="sw-name">VIP' + l.vip + ' — ' + esc(l.emblem) + '</span><br><span class="sw-desc">' + l.totalBenefits + ' benefits</span></span><span><input class="ctl-price" type="number" value="' + l.price + '" onchange="setPriceControl(\'vip\', ' + l.vip + ', this.value)"><button class="switch' + (l.enabled ? ' on' : '') + '" onclick="toggleVipControl(' + l.vip + ', ' + (!l.enabled) + ')">' + (l.enabled ? 'ON' : 'OFF') + '</button></span></div>').join('') +
      '<h3>'+ic("sparkle")+' VIP Benefits — enable / disable</h3>' + d.benefits.map(b => '<div class="switch-row"><span><span class="sw-name">' + esc(b.name) + '</span></span><button class="switch' + (b.enabled ? ' on' : '') + '" onclick="toggleBenefitControl(\'' + esc(b.name).replace(/'/g, "\\'") + '\', ' + (!b.enabled) + ')">' + (b.enabled ? 'ON' : 'OFF') + '</button></div>').join('') +
      '<button class="btn danger" onclick="resetControls()">Reset all controls to defaults</button></div>';
  } catch (e) { alert(e.message); }
}
async function toggleControl(key, value) { try { await api('/api/controls/owner/switch', { method: 'POST', headers: headers(true), body: JSON.stringify({ key, value }) }); openOwnerControls(); } catch (e) { alert(e.message); } }
async function toggleGiftControl(id, enabled) { try { await api('/api/controls/owner/gift', { method: 'POST', headers: headers(true), body: JSON.stringify({ giftId: id, enabled }) }); openOwnerControls(); } catch (e) { alert(e.message); } }
async function toggleBenefitControl(name, enabled) { try { await api('/api/controls/owner/benefit', { method: 'POST', headers: headers(true), body: JSON.stringify({ benefit: name, enabled }) }); openOwnerControls(); } catch (e) { alert(e.message); } }
async function toggleVipControl(vip, enabled) { try { await api('/api/controls/owner/vip-level', { method: 'POST', headers: headers(true), body: JSON.stringify({ vip, enabled }) }); openOwnerControls(); } catch (e) { alert(e.message); } }
async function setPriceControl(kind, id, price) { try { await api('/api/controls/owner/price', { method: 'POST', headers: headers(true), body: JSON.stringify({ kind, id, price: Number(price) }) }); alert('Price updated: ' + fmt(Number(price))); } catch (e) { alert(e.message); } }
async function resetControls() { if (!(await appConfirm('Reset ALL owner controls to defaults?'))) return; try { await api('/api/controls/owner/reset', { method: 'POST', headers: headers() }); alert('Controls reset.'); openOwnerControls(); } catch (e) { alert(e.message); } }


/* Auto-login if a token is saved */
(async function init() {
  if (TOKEN) {
    try { const d = await api('/api/me', { headers: headers() }); enterApp({ token: TOKEN, user: d.user }); }
    catch (e) { TOKEN = ''; localStorage.removeItem('awc_token'); }
  }
})();
