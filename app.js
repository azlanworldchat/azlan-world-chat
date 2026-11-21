/* AZLAN WORLD CHAT — front-end app.
   Original work. Talks to the Node backend in server.js.
   Owner (Azlan) enters directly with NO login (Owner Portal button).
   Everyone else must register / log in. */
const API = '';
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
const VIP_ANIMALS = { 1: 'Bronze Medal', 2: 'Silver Medal', 3: 'Star Medal', 4: 'Crown Medal', 5: 'Purple Medal', 6: 'Red-Gold Crown', 7: 'Wolf', 8: 'Eagle', 9: 'Lion', 10: 'Flaming Dragon', 11: 'Thunder Dragon' };
/* Custom-drawn icons (original SVG art, no emoji anywhere in the app) */
function ic(name) { return '<img class="ic" src="assets/icons/' + name + '.svg" alt="">'; }
function iconImg(v) { if (!v) return ic('gift'); if (typeof v === 'string' && v.indexOf('.svg') !== -1) return '<img class="ic" src="' + v + '" alt="">'; return ic('gift'); }
function vipEmblemImg(v) { return '<img class="vip-emblem-img" src="assets/vip/vip' + (v || 1) + '.svg" alt="VIP' + (v || 1) + '">'; }
function vipEmblemMini(v) { return '<img class="vip-emblem-mini" src="assets/vip/vip' + (v || 1) + '.svg" alt="">'; }

function headers(json) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (TOKEN) h['Authorization'] = 'Bearer ' + TOKEN;
  return h;
}
async function api(path, opts) {
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Request failed: ' + res.status));
  return data;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
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
  } catch (err) { document.getElementById('authMsg').textContent = err.message; window.SFX && SFX.error(); }
}
async function doRegister(e) {
  e.preventDefault();
  try {
    const d = await api('/api/auth/register', { method: 'POST', headers: headers(true), body: JSON.stringify({ name: document.getElementById('regName').value, email: document.getElementById('regEmail').value, password: document.getElementById('regPass').value, inviteCode: document.getElementById('regInvite').value || undefined }) });
    enterApp(d);
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
async function ownerEnter() {
  const secret = prompt('Owner key (OWNER_SECRET from the server — change the default before publishing):');
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
  if (isOwner || ME.role === 'owner') openOwner();
}
function logout() { TOKEN = ''; ME = null; localStorage.removeItem('awc_token'); location.reload(); }
async function loadMe() {
  try {
    const d = await api('/api/me', { headers: headers() });
    ME = d.user;
    document.getElementById('myName').textContent = ME.name;
    document.getElementById('myName').className = 'vip-username vip-color-' + (ME.vip || 0);
    document.getElementById('myUid').textContent = 'ID: ' + ME.id + '  •  Level ' + (ME.level || 1);
    document.getElementById('myBio').textContent = ME.bio || '';
    const av = document.getElementById('myAvatar');
    av.className = 'avatar' + (ME.vip ? ' vip-frame' : '') + (ME.gifPhoto ? ' gif-photo' : '');
    if (ME.gifPhoto) av.innerHTML = '<img src="' + esc(ME.gifPhoto) + '" alt="profile">';
    else av.textContent = (ME.name || 'A')[0].toUpperCase();
    document.getElementById('statCoins').textContent = fmt(ME.coins);
    document.getElementById('statDiamonds').textContent = fmt(ME.diamonds);
    document.getElementById('statCharm').textContent = fmt(ME.charm);
    document.getElementById('statWealth').textContent = fmt(ME.wealth);
    renderVipBadge();
  } catch (e) { /* session expired */ }
}
function renderVipBadge() {
  const el = document.getElementById('myVipBadge');
  if (ME.vip) {
    el.innerHTML = ic('crown') + ' VIP' + ME.vip + ' • ' + (VIP_ANIMALS[ME.vip] || '') + vipEmblemMini(ME.vip) + (ME.svip ? ' • SVIP' : '');
  } else el.textContent = 'No VIP yet — open VIP Club';
}
async function loadAnnouncement() {
  try {
    const d = await api('/api/v2/notifications/announcement', { headers: headers() });
    const el = document.getElementById('announce');
    if (d.announcement) { el.innerHTML = ic('announce') + ' ' + esc(d.announcement); show('announce', true); }
  } catch (e) {}
}

/* ---------------- entrance effect ---------------- */
function showEntrance(user) {
  const fx = document.getElementById('entranceFx');
  if (user.vip) {
    fx.innerHTML = '<div class="entrance-dragon">' + vipEmblemImg(user.vip) + '</div><div class="entrance-banner">' + ic('crown') + ' ' + esc(user.name) + ' entered — VIP' + user.vip + ' • ' + (VIP_ANIMALS[user.vip] || '') + '</div>';
  } else {
    fx.innerHTML = '<div class="entrance-text">"+ic("sparkle")+" ' + esc(user.name) + ' entered "+ic("sparkle")+"<br><span style="font-size:18px">Welcome to AZLAN WORLD CHAT</span></div>';
  }
  fx.classList.remove('hidden'); fx.classList.remove('play'); void fx.offsetWidth; fx.classList.add('play');
  setTimeout(() => fx.classList.add('hidden'), 2500);
  window.SFX && SFX.join();
}

/* ---------------- tabs ---------------- */
function switchTab(tab) {
  ['party', 'discover', 'messages', 'friends', 'me', 'owner'].forEach(t => show('tab-' + t, t === tab));
  show('roomView', false);
  document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'party') loadRooms();
  if (tab === 'discover') loadMoments();
  if (tab === 'messages') loadInbox();
  if (tab === 'friends') loadRankings('wealth');
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
    if (el && d.banner) el.innerHTML = '<div class="honor-banner">"+ic("trophy")+" ' + esc(d.banner) + '<br><span class="muted">Your personal information can be displayed on the banner by official in the Room-Recommend page.</span></div>';
  } catch (e) {}
}
function renderRooms(rooms) {
  const el = document.getElementById('roomList');
  if (!rooms.length) { el.innerHTML = '<p class="muted">No rooms yet — create the first one!</p>'; return; }
  el.innerHTML = rooms.map(r =>
    '<div class="room-card" onclick="joinRoom(\'' + r.id + '\')"><h3>' + esc(r.name) + '</h3>' +
    '<p>'+ic("mic")+' ' + (r.topic || 'Chat') + ' • '+ic("users")+' ' + (r.members || []).length + ' members • Lv.' + (r.level || 1) + ' • ID ' + r.id + '</p></div>'
  ).join('');
}
async function searchRooms() {
  const q = document.getElementById('roomSearch').value.trim();
  if (!q) return loadRooms();
  try { const d = await api('/api/v2/rooms/search?q=' + encodeURIComponent(q), { headers: headers() }); renderRooms(d.rooms); } catch (e) {}
}
async function createRoomPrompt() {
  const name = prompt('Room name:');
  if (!name) return;
  const topic = prompt('Topic (e.g. Music, Chat, Games):', 'Chat') || 'Chat';
  try {
    const d = await api('/api/rooms', { method: 'POST', headers: headers(true), body: JSON.stringify({ name, topic }) });
    joinRoom(d.room.id);
  } catch (e) { alert(e.message); }
}
async function joinRoom(id) {
  try {
    const d = await api('/api/rooms/' + id + '/join', { method: 'POST', headers: headers() });
    currentRoom = d.room;
    show('tab-party', false); show('roomView', true);
    document.getElementById('roomName').textContent = currentRoom.name;
    document.getElementById('roomMeta').textContent = 'ID ' + currentRoom.id + ' • Lv.' + (currentRoom.level || 1) + ' • ' + (currentRoom.topic || '');
    const stage = document.querySelector('.room-stage');
    if (stage) stage.className = 'room-stage' + (ME.roomTheme && ME.roomTheme !== 'default' ? ' theme-' + ME.roomTheme : '');
    renderMicGrid(); renderRoomChat(); renderVoiceNotes(); renderOnlineUsers();
    if (d.entrance) showEntrance({ name: d.entrance.name, vip: d.entrance.vip });
    window.SFX && SFX.join();
    joinAgoraChannel(currentRoom.id);
  } catch (e) { alert(e.message); }
}
function leaveRoom() { currentRoom = null; show('roomView', false); show('tab-party', true); loadRooms(); }
function renderMicGrid() {
  const grid = document.getElementById('micGrid');
  let html = '';
  for (let s = 0; s < 8; s++) {
    const seat = (currentRoom.seats || []).find(x => x.seat === s);
    if (seat) {
      const u = seat.user || {};
      const name = u.name || ('User ' + seat.userId);
      const vip = u.vip || 0;
      const ring = MIC_RING_COLORS[vip] || '';
      const styleCls = u.micStyle && u.micStyle !== 'default' ? ' style-' + u.micStyle : '';
      const waveCls = u.micWave && u.micWave !== 'default' ? ' wave-' + u.micWave : '';
      const sticker = u.micSticker ? '<span class="seat-sticker">' + iconImg(u.micSticker.icon) + '</span>' : '';
      const ringStyle = ring ? ' style="border-color:' + ring + ';box-shadow:0 0 16px ' + ring + '"' : '';
      html += '<div class="mic-seat taken vip' + vip + styleCls + waveCls + (seat.micOn ? ' speaking' : '') + '"' + ringStyle + ' onclick="takeSeat(' + s + ')">' + sticker + '<span class="seat-avatar">'+ic("mic")+'</span><span class="seat-name">' + esc(name) + '</span><span>' + (seat.micOn ? ''+ic("volume")+'' : ''+ic("mic-off")+'') + (vip ? ' '+ic("crown")+'VIP' + vip : '') + '</span></div>';
    } else {
      html += '<div class="mic-seat" onclick="takeSeat(' + s + ')"><span class="seat-avatar">'+ic("plus")+'</span><span>Seat ' + (s + 1) + '</span></div>';
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
    '<span class="online-user' + (m.vip ? ' vip-first' : '') + '"><span class="ou-avatar">' + esc((m.name || 'U')[0].toUpperCase()) + '</span><span class="' + (m.vip ? 'vip-color-' + m.vip : '') + '">' + esc(m.name || 'User') + '</span>' + (m.vip ? '<span>'+ic("crown")+'VIP' + m.vip + '</span>' : '') + (m.micSticker ? '<span class="ou-sticker">' + iconImg(m.micSticker.icon) + '</span>' : '') + '</span>'
  ).join('');
}
async function takeSeat(s) {
  try {
    const d = await api('/api/rooms/' + currentRoom.id + '/seat', { method: 'POST', headers: headers(true), body: JSON.stringify({ seat: s, micOn }) });
    currentRoom = d.room; renderMicGrid();
  } catch (e) { alert(e.message); }
}
async function toggleMic() {
  micOn = !micOn;
  document.getElementById('micBtn').innerHTML = micOn ? ''+ic("mic")+' Mic: ON' : ''+ic("mic-off")+' Mic: OFF';
  window.SFX && (micOn ? SFX.micOn() : SFX.micOff());
  if (!currentRoom) return;
  try {
    const d = await api('/api/v2/rooms/' + currentRoom.id + '/mic', { method: 'POST', headers: headers(true), body: JSON.stringify({ micOn }) });
    currentRoom.seats = currentRoom.seats || [];
  } catch (e) {}
  renderMicGrid();
}
function renderRoomChat() {
  const box = document.getElementById('roomChat');
  box.innerHTML = (currentRoom.chat || []).slice(-30).map(m =>
    '<p class="chat-msg' + (m.chatBox === 'dragon-flame' ? ' vip-bubble' : '') + '"><b class="chat-name vip-color-' + (m.vip || 0) + '">' + esc(m.name) + (m.vip ? ' '+ic("crown")+'VIP' + m.vip : '') + ':</b> ' + esc(m.text) + '</p>'
  ).join('') || '<p class="muted">No messages yet — say hello!</p>';
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
    '<div class="voice-note"><span>'+ic("mic")+' ' + esc(n.name) + ' (' + (n.effect || 'normal') + ')</span>' +
    '<button class="btn" onclick="playVoiceNote(\'' + n.url + '\', \'' + (n.effect || 'normal') + '\')">'+ic("play")+' Play</button></div>'
  ).join('');
}
function playVoiceNote(url, effect) { window.playVoiceWithEffect ? playVoiceWithEffect(url, effect) : new Audio(url).play(); }
function startVoiceNote() {
  if (!currentRoom) return;
  const effect = document.getElementById('voiceEffect').value;
  alert('Recording 5 seconds — speak now! Effect: ' + effect);
  const rec = window.recordVoiceNote(async (blob) => {
    const fd = new FormData();
    fd.append('audio', blob, 'voice.webm');
    fd.append('effect', effect);
    const res = await fetch('/api/v2/rooms/' + currentRoom.id + '/voice-note', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: fd });
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
  const res = await fetch('/api/rooms/' + currentRoom.id + '/music', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: fd });
  const d = await res.json();
  if (res.ok) { alert(' Room music set!'); const a = new Audio(d.room.music.url); a.play(); }
  else alert(d.error || 'Upload failed');
}
/* Agora live voice: gets a token from the server; the real SDK join happens
   once AGORA_APP_ID is configured (see server/agora.js). */
async function joinAgoraChannel(roomId) {
  try {
    const d = await api('/api/voice/status', { headers: headers() });
    if (!d.configured) { console.log('Agora not configured — voice notes mode. ' + d.note); return; }
    const t = await api('/api/voice/token?channel=' + roomId + '&uid=' + (ME.id.replace(/\D/g, '') || 1), { headers: headers() });
    console.log('Agora token ready for channel', roomId, t);
    // With the Agora Web SDK loaded, call: client.join(t.appId, roomId, t.token, uid)
  } catch (e) { console.log('Agora unavailable:', e.message); }
}

/* ---------------- gifts ---------------- */
function showGiftPanel() {
  if (!currentRoom && !giftTarget) { alert('Join a room first, or pick a user to gift.'); return; }
  document.getElementById('giftPanel').classList.remove('hidden');
  document.getElementById('giftTarget').textContent = giftTarget ? giftTarget.name : ('room ' + (currentRoom ? currentRoom.name : ''));
  loadGiftCatalog();
}
function closeGiftPanel() { document.getElementById('giftPanel').classList.add('hidden'); }
function setQty(n) { giftQty = n; document.getElementById('qtyLabel').textContent = 'x' + n; }
function giftIconHtml(g) {
  if (g.svg) return '<img class="gift-svg-img" src="' + g.svg + '" alt="' + esc(g.name) + '" onerror="this.outerHTML=\'<span class=&quot;g-icon&quot;>' + iconImg(g.icon) + '</span>\'">';
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
    const d = await api('/api/v2/gifts/send', { method: 'POST', headers: headers(true), body: JSON.stringify({ giftId, toUserId, qty: giftQty }) });
    closeGiftPanel();
    playGift3D(d.gift || { id: giftId, name: '', anim: d.animation === 'huge' ? 'spin3d' : 'bloom', sound: d.animation === 'huge' ? 'fanfare' : 'gift', icon: ''+ic("gift")+'' });
    if (d.broadcast) showBroadcast('A gift of 100,000+ coins was just sent!');
    loadMe();
  } catch (e) { alert(e.message); }
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
  setTimeout(() => { fx.classList.add('hidden'); fx.classList.remove('play'); }, 3000);
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
  const method = prompt('Payment method: Easypaisa, JazzCash, Visa or Google Play?', 'Easypaisa');
  if (!method) return;
  alert('After paying, you must upload the receipt. The owner approves it — coins are never credited from the screenshot alone.');
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const fd = new FormData();
    fd.append('packageId', pkgId); fd.append('method', method); fd.append('receipt', input.files[0]);
    const res = await fetch('/api/wallet/recharge', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: fd });
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
const VIP_EMBLEMS = { 1: 'Bronze Winged Medal', 2: 'Silver-Blue Winged Medal', 3: 'Blue-Gold Star Medal', 4: 'Gold-Red Crown Medal', 5: 'Purple Winged Medal', 6: 'Red-Gold Crown Medal', 7: 'Wolf Head', 8: 'Eagle Head', 9: 'Lion Head', 10: 'Flaming Dragon Head', 11: 'Thunder Dragon' };
const MIC_RING_COLORS = { 1: '#cd7f32', 2: '#2fb8a6', 3: '#9fc3e8', 4: '#d4af37', 5: '#8b7bff', 6: '#ff5a2a', 7: '#7fd4ff', 8: '#2fd6c3', 9: '#ffd24a', 10: '#ff5a00', 11: '#ffe600' };
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
  p.innerHTML =
    '<div class="card"><h3>'+ic("crown")+' VIP Club — ' + (d.myVip ? 'You are VIP' + d.myVip + ' (' + (myLevel ? myLevel.emblem : '') + ')' : 'You have no VIP yet') + '</h3>' +
    '<p>VIP Points: <b>' + fmt(d.myPoints) + '</b> • Bonus Points: <b>' + fmt(d.myBonusPoints) + '</b></p>' +
    (d.nextLevel ? '<p>Next: VIP' + d.nextLevel.vip + ' (' + d.nextLevel.emblem + ') — need <b>' + fmt(d.pointsToNext) + '</b> more points</p>' +
      '<div style="background:rgba(255,255,255,.12);border-radius:10px;height:14px;overflow:hidden"><div style="width:' + Math.min(100, Math.round((d.myPoints / d.nextLevel.points) * 100)) + '%;height:100%;background:linear-gradient(90deg,#f5c542,#ffd700)"></div></div>' : '<p>'+ic("trophy")+' You are VIP11 — the highest level!</p>') +
    '<button class="btn gold" onclick="earnVipPoints()">'+ic("star")+' Earn Points</button> ' +
    '<button class="btn" onclick="openBonusStore()">'+ic("gift")+' Bonus Points Store</button>' +
    '<p class="muted">'+ic("gift")+' Offer: ' + esc(d.offers.nextLevel) + '<br>'+ic("invite")+' ' + esc(d.offers.crossLevel) + '</p></div>' +
    '<div class="tabs-mini">' + d.levels.map(l =>
      '<button class="mini-tab' + (l.vip === vipSelected ? ' active' : '') + '" onclick="selectVip(' + l.vip + ')" style="' + (l.vip === vipSelected ? 'border-color:' + l.color : '') + '">' + vipEmblemMini(l.vip) + ' VIP' + l.vip + '</button>'
    ).join('') + '</div>' +
    '<div class="vip-level vip' + sel.vip + '" style="background:' + sel.themeBg + ';border-color:' + sel.color + '">' +
      '<div style="text-align:center"><div class="vip-badge-big" style="animation:dragonGlow 2s infinite">' + vipEmblemImg(sel.vip) + '</div>' +
      '<h3 class="vip-level-title" style="color:' + sel.color + '">VIP' + sel.vip + (nextVip ? ' <span class="vip-next-dim">VIP' + nextVip.vip + '</span>' : '') + '</h3>' +
      '<p class="vip-emblem-name">' + esc(sel.emblem) + '</p>' +
      '<div class="vip-progress-line"><div class="vip-progress-dot" style="left:' + vipPct + '%;background:' + sel.color + '"></div></div>' +
      '<p>' + ic("lock") + ' ' + fmt(pointsNeeded) + ' more VIP points needed for this level</p>' +
      (sel.vip === 1 ? '<button class="btn ghost" onclick="alert(\'Upgrade Guide: earn VIP points by recharging ($1 = 10 VIP points), daily sign-in and tasks. VIP1 needs 2,400 points and lasts 31 days.\')">Upgrade Guide ›</button>' : '') +
      '<div class="vip-points-card">' +
      '<div class="vip-points-row"><span class="vip-points-avatar">' + esc((ME && ME.name ? ME.name : 'U')[0].toUpperCase()) + '</span><span>VIP Points: <b>' + fmt(d.myPoints) + '</b></span><button class="btn earn-pill" style="background:' + sel.color + '" onclick="earnVipPoints()">Earn</button></div>' +
      '<div class="vip-progress-bar"><div style="width:' + vipPct + '%;background:' + sel.color + '"></div></div>' +
      '<p class="vip-points-sub">V1 2,400 &nbsp;•&nbsp; 31 days</p>' +
      '<p class="vip-points-split"><span><b>' + fmt(d.myBonusPoints) + '</b><br>Bonus Points</span><span><b>0</b><br>VIP Offer</span></p>' +
      '</div>' +
      '<p class="vip-price">' + fmt(sel.price) + ' coins • 31 days • ' + sel.totalBenefits + ' benefits • ' + sel.discountPct + '% discount</p>' +
      '<p class="muted">Effect: ' + esc(sel.effect) + ' • Username: ' + esc(sel.usernameStyle) + ' • Mic ring: ' + esc(sel.micRing.name) + '</p>' +
      (d.myVip === sel.vip ? '<p>'+ic("check")+' Your current level</p>' : '<button class="btn gold" onclick="buyVip(' + sel.vip + ')">Buy VIP' + sel.vip + '</button>') +
      '</div></div>' +
    '<div class="card vip-benefits-card"><div class="vip-sec-head"><h3>' + sel.totalBenefits + ' Benefits</h3><button class="link-btn" onclick="vipTab(\'Status\')">All ›</button></div>' +
      '<div class="benefit-row">' +
      featured.map(b => '<div class="benefit-cell" onclick="openBenefitDetail(\'' + esc(b).replace(/'/g, "\\'") + '\')"><span class="benefit-ico">' + benefitIcon(b) + '</span><span>' + esc(b) + '</span></div>').join('') +
      (moreCount > 0 ? '<div class="benefit-cell" onclick="vipTab(\'Status\')"><span class="benefit-ico">•••</span><span>' + moreCount + ' More Benefits</span></div>' : '') +
      '</div><p class="muted">' + esc(d.usernameNote || '') + '</p></div>' +
    '<div class="card vip-benefits-card"><div class="vip-sec-head"><h3>Bonus Points Store</h3><button class="link-btn" onclick="openBonusStore()">View More ›</button></div>' +
      '<div class="benefit-row">' +
      '<div class="benefit-cell" onclick="openBonusStore()"><span class="benefit-ico">' + ic('lock') + '</span><span>Room Lock</span></div>' +
      '<div class="benefit-cell" onclick="openBonusStore()"><span class="benefit-ico">' + ic('ticket') + '</span><span>ID Coupon</span></div>' +
      '<div class="benefit-cell" onclick="openBonusStore()"><span class="benefit-ico">' + ic('frame') + '</span><span>Golden Frame</span></div>' +
      '<div class="benefit-cell" onclick="openBonusStore()"><span class="benefit-ico">' + ic('coin') + '</span><span>1,000,000 Coins</span></div>' +
      '</div></div>' +
    '<div class="tabs-mini">' + ['Status', 'Decorations', 'Functions', 'Rewards', 'Discounts'].map(t =>
      '<button class="mini-tab' + (t === vipBenefitTab ? ' active' : '') + '" onclick="vipTab(\'' + t + '\')">' + t + ' (' + sel.benefits[t].length + ')</button>'
    ).join('') + '</div>' +
    '<div class="card"><h3>' + vipBenefitTab + ' benefits — VIP' + sel.vip + '</h3>' +
    (benefits.length ? '<ul>' + benefits.map(b => '<li><a href="javascript:void(0)" onclick="openBenefitDetail(\'' + esc(b).replace(/'/g, "\\'") + '\')">'+ic("check")+' ' + esc(b) + '</a></li>').join('') + '</ul>' : '<p class="muted">No benefits in this tab at this level yet — upgrade for more!</p>') +
    '<p class="muted">VIP' + sel.vip + ' has ' + sel.totalBenefits + ' benefits in total.' + (sel.vip === 10 ? ' VIP10 has all 58 benefits! '+ic("party")+'' : sel.vip === 11 ? ' VIP11 has 65 benefits — the most! '+iconImg("assets/vip/vip11.svg")+'' : '') + '</p></div>' +
    '<div class="card"><h3>'+ic("gift")+' Exclusive VIP Gifts</h3><p class="muted">Privilege gifts — V5 white beast 5,999 • V4 blue dragon 4,999 • V3 palace 3,999 • V2 car 2,999 • V1 flowers 799</p><button class="btn gold" onclick="openVipGiftShop()">Open VIP Gift Shop</button></div>' +
    '<div class="card"><h3>'+ic("gift")+' Daily VIP Claims</h3>' +
    '<button class="btn" onclick="vipClaim(\'gift-code\')">Gift Code (+100,000 coins)</button> ' +
    '<button class="btn" onclick="vipClaim(\'crystals\')">Crystals (+5,000)</button> ' +
    '<button class="btn" onclick="vipClaim(\'golds\')">Golds (+500,000 coins)</button> ' +
    '<button class="btn" onclick="vipClaim(\'birthday\')">'+iconImg("assets/gifts/cake.svg")+' Birthday Gift</button></div>' +
    '<div class="card"><h3>'+ic("lucky")+' Lucky Bags (VIP only)</h3>' +
    '<input id="lbGold" type="number" placeholder="Gold 20–500" value="100"><input id="lbCount" type="number" placeholder="Recipients 5–30" value="10">' +
    '<button class="btn gold" onclick="sendLuckyBag()">Send Lucky Bag</button></div>' +
    '<div class="card"><h3>'+ic("anonymous")+' Anonymous Display</h3><p class="muted">When ON, you appear as "Anonymous" in Visitors lists and Top Gifters rankings, and no honor post is sent for you.</p>' +
    '<button class="btn" onclick="toggleAnonymous()">' + (d.myAnonymous ? ''+ic("eye")+' Anonymous: ON — tap to turn OFF' : ''+ic("anonymous")+' Anonymous: OFF — tap to turn ON') + '</button></div>' +
    '<div class="card"><h3>'+ic("mic")+' Exclusive Mic Animation</h3><p class="muted">Your ring: <b>' + (d.myVip ? (d.levels[d.myVip - 1].micRing.name + ' (' + d.levels[d.myVip - 1].micRing.color + ')') : 'no VIP yet') + '</b></p>' +
    '<button class="btn gold" onclick="useMicAnimation()">Use it Now</button> ' +
    '<span id="stickerRow">' + (d.micStickers || []).map(s => '<button class="btn" onclick="pickSticker(\'' + s.id + '\')">' + iconImg(s.icon) + ' ' + esc(s.name) + '</button>').join('') + '</span></div>' +
    '<div class="card"><h3>'+ic("theme")+' Customize My VIP Look</h3>' +
    '<input id="vcFrame" placeholder="Profile frame (e.g. Dragon Frame)"><input id="vcEntrance" placeholder="Entrance effect (e.g. Dragon fire)"><input id="vcTitle" placeholder="Honor title (e.g. Thunder King)">' +
    '<button class="btn gold" onclick="customizeVip()">Save My VIP Style</button></div>' +
    '<div class="card"><h3>'+ic("sparkle")+' VIP Extras</h3><div class="grid-btns">' +
    '<button class="btn" onclick="openMicStyles()">'+ic("mic")+' Mic Style</button>' +
    '<button class="btn" onclick="openMicWaves()">'+ic("wave")+' Mic Wave</button>' +
    '<button class="btn" onclick="openMicConnections()">'+ic("link")+' Mic Connection</button>' +
    '<button class="btn" onclick="openThemesStore()">'+ic("theme")+' Send Items — Themes Store</button>' +
    '<button class="btn" onclick="openThemes()">'+iconImg("assets/themes/party-lounge.svg")+' Room Themes</button>' +
    '<button class="btn" onclick="openCoupons()">'+ic("ticket")+' Personal ID Coupon</button>' +
    '<button class="btn" onclick="openGifPhoto()">'+ic("frame")+' GIF Profile Photo</button>' +
    '<button class="btn" onclick="openBonusHistory()">'+ic("star")+' Bonus Points History</button>' +
    '<button class="btn" onclick="openRechargeBonus()">'+ic("coin")+' Bonus Recharge Golds</button>' +
    '<button class="btn" onclick="openDiscounts()">'+ic("discount")+' Golds Items Discount</button>' +
    '<button class="btn" onclick="openSupport()">'+ic("support")+' Customer Service Expert</button>' +
    '<button class="btn" onclick="openProtections()">'+ic("shield")+' My Protections</button>' +
    '<button class="btn" onclick="openCustomItems()">'+ic("theme")+' Custom Items (90 days)</button>' +
    '<button class="btn" onclick="openGetGolds()">'+ic("coin")+' Get Golds (VIP9/10)</button>' +
    '<button class="btn" onclick="openBroadcasts()">'+ic("announce")+' Broadcasts</button>' +
    '</div></div>';
}
async function openBenefitDetail(name) {
  try {
    const d = await api('/api/v2/vip/benefit/' + encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')), { headers: headers() });
    const p = document.getElementById('mePanel');
    p.innerHTML = '<div class="card"><button class="btn ghost" onclick="renderVipClub()">← Back to VIP Club</button>' +
      '<h3>'+ic("sparkle")+' ' + esc(d.title) + '</h3><p>' + esc(d.desc) + '</p>' +
      (d.note ? '<p class="muted">' + esc(d.note) + '</p>' : '') +
      (name === 'Exclusive Mic Animation' ? '<button class="btn gold" onclick="useMicAnimation()">Use it Now</button>' : '') +
      (name === 'Exclusive Gifts' ? '<button class="btn gold" onclick="openVipGiftShop()">Open VIP Gift Shop</button>' : '') +
      (name === 'Anonymous Display' ? '<button class="btn gold" onclick="toggleAnonymous()">Toggle Anonymous Display</button>' : '') +
      '</div>';
  } catch (e) {
    // No detail page for this benefit yet — show the name only
    document.getElementById('mePanel').innerHTML = '<div class="card"><button class="btn ghost" onclick="renderVipClub()">← Back to VIP Club</button><h3>'+ic("sparkle")+' ' + esc(name) + '</h3><p class="muted">A VIP' + vipSelected + ' benefit. Upgrade your VIP level to unlock more!</p></div>';
  }
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
    playGift3D(d.gift || { id: giftId, name: '', anim: 'spin3d', sound: 'fanfare', icon: ''+ic("gift")+'' });
    if (d.broadcast) showBroadcast('A VIP gift of 100,000+ coins was just sent!');
    alert('VIP gift sent to ' + d.recipients + ' user(s)!');
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
async function openShop() {
  const p = document.getElementById('mePanel');
  try {
    const d = await api('/api/shop', { headers: headers() });
    const disc = ME.vip ? ' (your VIP' + ME.vip + ' discount applies!)' : '';
    p.innerHTML = '<div class="card"><h3>'+ic("shop")+' Premium Shop' + disc + '</h3>' +
      d.items.map(i => '<div class="user-row"><span>' + iconImg(i.icon || 'assets/icons/shop.svg') + ' <b>' + esc(i.name) + '</b> — ' + i.category + ' — <b>' + fmt(i.price) + ' coins</b></span><button class="btn gold" onclick="buyShop(\'' + i.id + '\')">Buy</button></div>').join('') + '</div>';
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
  const q = prompt('Ask the AI assistant (rooms, coins, VIP, gifts...):');
  if (!q) return;
  try {
    const d = await api('/api/ai', { method: 'POST', headers: headers(true), body: JSON.stringify({ text: q }) });
    document.getElementById('mePanel').innerHTML = '<div class="card"><h3>'+ic("ai")+' AI Assistant</h3><p><b>You:</b> ' + esc(q) + '</p><p><b>AI:</b> ' + esc(d.reply) + '</p></div>';
  } catch (e) { alert(e.message); }
}
async function openFeedback() {
  const text = prompt('Your feedback for the owner:');
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
  const oldP = prompt('Old password:'); const newP = prompt('New password (6+ characters):');
  if (!oldP || !newP) return;
  try { await api('/api/v2/auth/change-password', { method: 'POST', headers: headers(true), body: JSON.stringify({ oldPassword: oldP, newPassword: newP }) }); alert('Password changed!'); }
  catch (e) { alert(e.message); }
}
async function openNotifPrefs() {
  try {
    const d = await api('/api/v2/notifications/prefs', { headers: headers() });
    const prefs = d.prefs;
    const key = prompt('Which notification to toggle? (friendRequests / messages / micInvites / gifts / mentions)\nCurrent: ' + JSON.stringify(prefs));
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
      '<div class="moment"><b>' + esc(m.name) + '</b> <span class="muted">' + new Date(m.at).toLocaleString() + '</span><p>' + esc(m.text) + '</p>' +
      (m.image ? '<img src="' + m.image + '" alt="moment photo">' : '') +
      '<div class="m-actions"><button onclick="likeMoment(' + m.id + ')">'+ic("heart")+' ' + m.likes.length + '</button><button onclick="commentMoment(' + m.id + ')">'+ic("chat")+' ' + m.comments.length + '</button></div>' +
      m.comments.map(c => '<p class="muted"><b>' + esc(c.name) + ':</b> ' + esc(c.text) + '</p>').join('') + '</div>'
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
  const text = prompt('Your comment:');
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
  } catch (e) {}
}
function closeThread() { show('chatThread', false); show('inboxList', true); loadInbox(); }
async function sendDM() {
  const text = document.getElementById('dmText').value.trim();
  if (!text || !threadWith) return;
  document.getElementById('dmText').value = '';
  await api('/api/messages', { method: 'POST', headers: headers(true), body: JSON.stringify({ to: threadWith, text }) });
  openThread(threadWith);
}
async function searchUsers() {
  const q = document.getElementById('userSearch').value.trim();
  if (!q) { document.getElementById('userList').innerHTML = ''; return; }
  try {
    const d = await api('/api/users?q=' + encodeURIComponent(q), { headers: headers() });
    document.getElementById('userList').innerHTML = d.users.map(u =>
      '<div class="user-row"><span><b class="vip-color-' + (u.vip || 0) + '">' + esc(u.name) + '</b> • ID ' + u.id + (u.vip ? ' • '+ic("crown")+' VIP' + u.vip : '') + '</span><span><button class="btn" onclick="followUser(\'' + u.id + '\')">Follow</button> <button class="btn" onclick="giftToUser(\'' + u.id + '\', \'' + esc(u.name) + '\')">'+ic("gift")+' Gift</button> <button class="btn" onclick="openThread(\'' + u.id + '\');switchTab(\'messages\')">'+ic("chat")+' Chat</button></span></div>'
    ).join('');
  } catch (e) {}
}
async function followUser(id) { await api('/api/users/' + id + '/follow', { method: 'POST', headers: headers() }); alert('Following!'); }
function giftToUser(id, name) { giftTarget = { userId: id, name }; showGiftPanel(); }
async function loadRankings(kind, btn) {
  if (btn) { document.querySelectorAll('#tab-friends .mini-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  try {
    const d = await api('/api/v2/rankings/' + kind, { headers: headers() });
    const list = d.ranking || [];
    document.getElementById('rankList').innerHTML = list.map((r, i) =>
      '<div class="rank-row"><span class="rank-num">' + (i + 1) + '</span><span><b>' + esc(r.name || r.id) + '</b>' + (r.vip ? ' '+ic("crown")+' VIP' + r.vip : '') + ' — ' + fmt(r.wealth || r.charm || r.level || r.xp || 0) + '</span></div>'
    ).join('') || '<p class="muted">No ranking yet.</p>';
  } catch (e) {}
}
async function loadNotifications() {
  try {
    const d = await api('/api/notifications', { headers: headers() });
    const unread = d.notifications.filter(n => !n.read).length;
    document.getElementById('notifDot').classList.toggle('hidden', unread === 0);
    if (unread) window.SFX && SFX.notify();
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
    document.getElementById('ownerPanel').innerHTML = '<div class="card"><h3>'+ic("chart")+' Dashboard</h3><p>Users: <b>' + d.totalUsers + '</b> • Rooms: <b>' + d.totalRooms + '</b> • Pending recharges: <b>' + d.pendingRecharges + '</b></p>' +
      '<h3>Users</h3>' + d.users.slice(0, 20).map(u => '<div class="user-row"><span><b>' + esc(u.name) + '</b> • ID ' + u.id + ' • ' + fmt(u.coins) + ' coins' + (u.vip ? ' • VIP' + u.vip : '') + '</span></div>').join('') + '</div>';
  } catch (e) { alert(e.message); }
}
async function ownerRecharges() {
  try {
    const d = await api('/api/owner/recharges', { headers: headers() });
    document.getElementById('ownerPanel').innerHTML = '<div class="card"><h3>'+ic("card")+' Recharge Requests</h3>' +
      (d.recharges.map(r => '<div class="user-row"><span><b>' + esc(r.name) + '</b> — $' + r.usd + ' = ' + fmt(r.coins) + ' coins • ' + r.method + ' • <b>' + r.status + '</b><br><a href="' + r.receipt + '" target="_blank">View receipt</a></span>' +
        (r.status === 'pending' ? '<span><button class="btn gold" onclick="decideRecharge(\'' + r.id + '\',\'approved\')">Approve</button> <button class="btn danger" onclick="decideRecharge(\'' + r.id + '\',\'rejected\')">Reject</button></span>' : '') + '</div>').join('') || '<p class="muted">No recharges.</p>') + '</div>';
  } catch (e) { alert(e.message); }
}
async function decideRecharge(id, status) {
  await api('/api/owner/recharges/' + id, { method: 'POST', headers: headers(true), body: JSON.stringify({ status }) });
  alert('Recharge ' + status); ownerRecharges();
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
  try { const d = await api('/api/owner/coins', { method: 'POST', headers: headers(true), body: JSON.stringify({ userId, amount }) }); alert('' + d.user.name + ' now has ' + fmt(d.user.coins) + ' coins'); }
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
  const friendId = prompt('Send to which friend? Enter their user ID:');
  if (!friendId) return;
  try {
    const d = await api('/api/v2/vipx/send-item', { method: 'POST', headers: headers(true), body: JSON.stringify({ itemId, toUserId: friendId }) });
    pendingItem = { itemId, toUserId: friendId };
    if (confirm(d.confirmText + '?\n\nSend / Purchase')) {
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
async function openProfile(userId) {
  const id = userId || ME.id;
  try {
    const d = await api('/api/v2/extras/profile/' + id, { headers: headers() });
    switchTab('me');
    const u = d.user;
    document.getElementById('mePanel').innerHTML = '<div class="card"><div class="profile-card">' +
      '<div class="avatar' + (u.vip ? ' vip-frame' : '') + '">' + esc((u.name || 'A')[0].toUpperCase()) + '</div>' +
      '<h2 class="vip-color-' + (u.vip || 0) + '">' + esc(u.name) + '</h2><p class="muted">ID: ' + u.id + (u.vip ? ' • '+ic("crown")+' VIP' + u.vip + ' • ' + (VIP_ANIMALS[u.vip] || '') : '') + (u.honorTitle ? ' • '+ic("crown")+' ' + esc(u.honorTitle) : '') + '</p>' +
      '<p class="muted">' + esc(u.bio || '') + '</p>' +
      '<p>'+ic("coin")+' Wealth Lv.' + d.wealthLevel.level + ' • '+ic("star")+' Level ' + (u.level || 1) + '</p>' +
      '<p>' + (d.badges.map(b => '<span class="badge-chip">' + iconImg(b.icon) + ' ' + esc(b.name) + '</span>').join('') || '<span class="muted">No badges worn</span>') + '</p>' +
      '<div class="stats-row"><div><b>' + fmt(d.stats.coins) + '</b><span>Coins</span></div><div><b>' + fmt(d.stats.charm) + '</b><span>Charm</span></div><div><b>' + fmt(d.stats.wealth) + '</b><span>Wealth</span></div></div></div>' +
      '<h3>'+ic("users")+' Followers (' + d.followers.length + ')</h3>' + (d.followers.map(f => '<div class="user-row"><span>' + esc(f.name) + (f.vip ? ' '+ic("crown")+'VIP' + f.vip : '') + '</span></div>').join('') || '<p class="muted">No followers yet.</p>') +
      '<h3>'+ic("heart")+' Following (' + d.following.length + ')</h3>' + (d.following.map(f => '<div class="user-row"><span>' + esc(f.name) + (f.vip ? ' '+ic("crown")+'VIP' + f.vip : '') + '</span></div>').join('') || '<p class="muted">Not following anyone yet.</p>') +
      (id !== ME.id ? '<button class="btn" onclick="followUser(\'' + id + '\')">Follow</button> <button class="btn" onclick="giftToUser(\'' + id + '\', \'' + esc(u.name) + '\')">'+ic("gift")+' Gift</button> <button class="btn danger" onclick="blockUser(\'' + id + '\')">'+ic("ban")+' Block</button> <button class="btn danger" onclick="reportUser(\'' + id + '\')">'+ic("report")+' Report</button>' : '') + '</div>';
  } catch (e) { alert(e.message); }
}
async function blockUser(id) { if (!confirm('Block this user? You will not see their messages or rooms.')) return; try { await api('/api/v2/extras/users/' + id + '/block', { method: 'POST', headers: headers() }); alert('User blocked.'); } catch (e) { alert(e.message); } }
async function reportUser(id) { const reason = prompt('Why are you reporting this user?'); if (!reason) return; try { await api('/api/v2/extras/users/' + id + '/report', { method: 'POST', headers: headers(true), body: JSON.stringify({ reason }) }); alert(' Report sent to the owner. Thank you for keeping AZLAN WORLD CHAT safe.'); } catch (e) { alert(e.message); } }

/* ---------------- OWNER: Total Control panel ---------------- */
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
      sw('moments', ''+ic("camera")+' Moments', 'Discover moments') +
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
async function resetControls() { if (!confirm('Reset ALL owner controls to defaults?')) return; try { await api('/api/controls/owner/reset', { method: 'POST', headers: headers() }); alert('Controls reset.'); openOwnerControls(); } catch (e) { alert(e.message); } }


/* Auto-login if a token is saved */
(async function init() {
  if (TOKEN) {
    try { const d = await api('/api/me', { headers: headers() }); enterApp({ token: TOKEN, user: d.user }); }
    catch (e) { TOKEN = ''; localStorage.removeItem('awc_token'); }
  }
})();
