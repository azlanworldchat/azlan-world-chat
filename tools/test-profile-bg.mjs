/* Profile-edit + background-leave tests (2026-11-22).
   Run against a fresh local server copy on port 3461:
     cp -r <src> /tmp/awc-profile-test && rm /tmp/awc-profile-test/data/db.json
     cd /tmp/awc-profile-test && PORT=3461 node server.js &
     node /tmp/awc-profile-test/tools/test-profile-bg.mjs
   (The script is also run by the builder from a test copy; it never touches
   the live database.) */
const B = 'http://localhost:3461';
const KEY = process.env.OWNER_KEY || 'CHANGE-THIS-OWNER-SECRET';
let pass = 0, fail = 0;
function ok(c, label) { if (c) { pass++; console.log('PASS:', label); } else { fail++; console.log('FAIL:', label); } }
async function req(path, opts = {}, token) {
  const h = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(B + path, { ...opts, headers: h });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, json: j };
}
const owner = await req('/api/owner/enter', { method: 'POST', body: JSON.stringify({ secret: KEY }) });
const OT = owner.json && owner.json.token;
ok(owner.status === 200 && OT, 'owner enter (default placeholder key)');
const a = await req('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'prof-a@guest.azlanworld.chat', password: 'testpass1', name: 'Profile A' }) });
const AT = a.json && a.json.token; const AID = a.json && a.json.user && a.json.user.id;
ok(a.status === 200 && AT, 'user A registers');
const b = await req('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'prof-b@guest.azlanworld.chat', password: 'testpass1', name: 'Profile B' }) });
const BT = b.json && b.json.token; const BID = b.json && b.json.user && b.json.user.id;
ok(b.status === 200 && BT, 'user B registers');

// 1. Own edit succeeds, all fields stored
const edit = await req('/api/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Azlan Test', gender: 'Male', dob: '2004-05-01', country: 'USA', tag: 'Steam', bio: 'Hello world bio' }) }, AT);
ok(edit.status === 200 && edit.json.user.name === 'Azlan Test' && edit.json.user.displayName === 'Azlan Test', 'own edit succeeds, name/displayName updated');
ok(edit.json.user.gender === 'Male' && edit.json.user.dob === '2004-05-01' && edit.json.user.country === 'USA' && edit.json.user.tag === 'Steam' && edit.json.user.bio === 'Hello world bio', 'own edit stores gender/dob/country/tag/bio (own view)');
// 2. Own view shows private fields; another user's public view never leaks them
const meA = await req('/api/me', {}, AT);
ok(meA.json.user.dob === '2004-05-01' && meA.json.user.gender === 'Male', 'GET /api/me (own) shows dob + gender');
const pubA = await req('/api/users/' + AID, {}, BT);
ok(pubA.status === 200 && pubA.json.user.displayName === 'Azlan Test' && pubA.json.user.country === 'USA' && pubA.json.user.tag === 'Steam' && pubA.json.user.bio === 'Hello world bio', 'public profile shows displayName/country/tag/bio');
ok(!('dob' in pubA.json.user) && !('gender' in pubA.json.user) && !('phone' in pubA.json.user) && !('email' in pubA.json.user), 'public profile NEVER leaks dob/gender/phone/email (keys: ' + Object.keys(pubA.json.user).join(',') + ')');
const honorsB = await req('/api/v2/updates/honors/' + AID, {}, BT);
ok(honorsB.json.user && !honorsB.json.user.gender && !('dob' in honorsB.json.user), 'honors profile for another user hides gender/dob');
// 3. Frame ownership: unowned rejected, owned accepted
const badFrame = await req('/api/me', { method: 'PUT', body: JSON.stringify({ frameId: 's2' }) }, AT);
ok(badFrame.status === 400, 'unowned frame s2 rejected (got ' + badFrame.status + ')');
const buy = await req('/api/shop/buy', { method: 'POST', body: JSON.stringify({ itemId: 's1' }) }, AT);
ok(buy.status === 200, 'A buys shop frame s1 (Golden Profile Frame)');
const goodFrame = await req('/api/me', { method: 'PUT', body: JSON.stringify({ frameId: 's1', cardSkinId: null }) }, AT);
ok(goodFrame.status === 200 && goodFrame.json.user.frameId === 's1', 'owned frame s1 accepted and stored');
const badCard = await req('/api/me', { method: 'PUT', body: JSON.stringify({ cardSkinId: 's16' }) }, AT);
ok(badCard.status === 400, 'unowned card skin s16 rejected');
// 4. Invalid values rejected
for (const [label, body] of [
  ['empty displayName', { displayName: '' }],
  ['displayName "null"', { displayName: 'null' }],
  ['displayName 31 chars', { displayName: 'x'.repeat(31) }],
  ['bad gender', { gender: 'Alien' }],
  ['future dob', { dob: '2030-01-01' }],
  ['impossible dob', { dob: '2026-02-30' }],
  ['bad dob format', { dob: '01-05-2004' }],
  ['unknown country', { country: 'Atlantis' }],
  ['tag 21 chars', { tag: 'x'.repeat(21) }],
  ['bio 201 chars', { bio: 'x'.repeat(201) }],
]) {
  const r = await req('/api/me', { method: 'PUT', body: JSON.stringify(body) }, AT);
  ok(r.status === 400, 'invalid rejected: ' + label + ' (got ' + r.status + ')');
}
// 5. Non-owner edit attempts -> 403
const cross1 = await req('/api/users/' + AID, { method: 'PUT', body: JSON.stringify({ displayName: 'Hacked' }) }, BT);
ok(cross1.status === 403, 'B editing A via PUT /api/users/:id -> 403 (got ' + cross1.status + ')');
const cross2 = await req('/api/me', { method: 'PUT', body: JSON.stringify({ userId: BID, displayName: 'Hacked' }) }, AT);
ok(cross2.status === 403, 'A editing B via body userId -> 403 (got ' + cross2.status + ')');
const stillB = await req('/api/users/' + BID, {}, AT);
ok(stillB.json.user.name === 'Profile B', 'B name unchanged after blocked attempts');
// 6. Legacy null-name fix still holds
const nullPut = await req('/api/me', { method: 'PUT', body: JSON.stringify({ name: 'null' }) }, AT);
ok(nullPut.status === 200 && nullPut.json.user.name === 'Azlan Test', 'legacy PUT name "null" ignored, name stays "Azlan Test"');
// 7. New name shows immediately in room members + chat
const cr = await req('/api/rooms', { method: 'POST', body: JSON.stringify({ name: 'Profile Test Room', topic: 'Chat' }) }, OT);
const rid = cr.json.room.id;
await req('/api/rooms/' + rid + '/join', { method: 'POST' }, AT);
await req('/api/rooms/' + rid + '/join', { method: 'POST' }, BT);
const ch = await req('/api/rooms/' + rid + '/chat', { method: 'POST', body: JSON.stringify({ text: 'hi from renamed user' }) }, AT);
ok(ch.json.room.chat.some(m => m.name === 'Azlan Test' && m.text === 'hi from renamed user'), 'room chat shows the new name immediately');
const poll = await req('/api/rooms/' + rid + '/poll', {}, AT);
const memberA = (poll.json.room.members || []).find(m => m.id === AID);
ok(memberA && memberA.displayName === 'Azlan Test' && memberA.country === 'USA' && memberA.tag === 'Steam' && memberA.frameId === 's1', 'room poll members show new displayName/country/tag/frameId');
// 8. Background leave: full leave removes the member; kick (block) removes them too
const leave = await req('/api/rooms/' + rid + '/leave', { method: 'POST' }, BT);
ok(leave.status === 200, 'POST /api/rooms/:id/leave succeeds');
const poll2 = await req('/api/rooms/' + rid + '/poll', {}, AT);
ok(!(poll2.json.room.members || []).some(m => m.id === BID), 'after full leave, B is no longer a room member');
await req('/api/rooms/' + rid + '/join', { method: 'POST' }, BT);
const block = await req('/api/rooms/' + rid + '/block', { method: 'POST', body: JSON.stringify({ userId: BID }) }, OT);
ok(block.status === 200, 'owner blocks/kicks B from the room');
const poll3 = await req('/api/rooms/' + rid + '/poll', {}, AT);
ok(!(poll3.json.room.members || []).some(m => m.id === BID), 'after kick, B is no longer a room member (client mini-player shows "removed")');
// 9. No native prompt()/confirm() anywhere in the client
console.log('NOTE: prompt()/confirm() check is done by grep in the build step.');
console.log(`\nPROFILE+BG TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
