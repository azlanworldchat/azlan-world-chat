/* AGORA — live two-way voice for rooms, worldwide.
   HOW LIVE VOICE WORKS: when a user joins a room, the app asks this server
   for a token (GET /api/voice/token?channel=<roomId>&uid=<userId>), then the
   app joins the Agora channel with that token. Agora's global network
   carries the voice: anyone anywhere (Pakistan or any other country) who
   downloads the app and joins a room can talk and be heard by everyone in
   the room, and hear everyone else — two-way, real-time, audio only.
   NO VIDEO is ever created: the app only publishes an audio (microphone)
   track, never a camera/video track.
   HOW TO ENABLE IT (no code change needed — only credentials):
   1. Create a FREE account at https://www.agora.io (free tier includes
      10,000 voice minutes per month) and create a project.
   2. Copy your App ID and App Certificate from the Agora Console.
   3. On Render: Dashboard -> azlan-world-chat -> Environment -> add:
        AGORA_APP_ID=your_app_id_here
        AGORA_APP_CERTIFICATE=your_app_certificate_here
      then redeploy (or restart) the service.
   4. Live voice works immediately. Until then, rooms use recorded voice
      messages (voice notes), which already work without Agora.
   Full step-by-step guide: AZLAN-WORLD-CHAT-AGORA-SETUP.md */
const express = require('express');

const AGORA_APP_ID = process.env.AGORA_APP_ID || 'YOUR-AGORA-APP-ID-HERE';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'YOUR-AGORA-APP-CERTIFICATE-HERE';
/* "Configured" means live voice can actually work: the keys are set AND
   the token builder package is installed. The old deployed server reported
   configured:true while its token endpoint could not mint anything — the
   app would show READY and then fail on join. Never claim configured
   unless a token can really be minted. */
let TOKEN_BUILDER_OK = false;
try { require.resolve('agora-token'); TOKEN_BUILDER_OK = true; }
catch (e) { try { require.resolve('agora-access-token'); TOKEN_BUILDER_OK = true; } catch (e2) { TOKEN_BUILDER_OK = false; } }
const AGORA_KEYS_SET = !!(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE);
const AGORA_CONFIGURED = AGORA_KEYS_SET && TOKEN_BUILDER_OK;
/* Tokens are minted for 24 hours. The app renews the token before it
   expires (Agora 'token-privilege-will-expire'), so a long room session
   never drops. */
const TOKEN_TTL_SECONDS = 24 * 3600;

function getToken(channel, uid) {
  if (!AGORA_CONFIGURED) {
    if (AGORA_KEYS_SET && !TOKEN_BUILDER_OK) {
      return { configured: false, token: null, appId: AGORA_APP_ID,
        note: 'Agora keys are set but the token builder is not installed. Run: npm install agora-token and redeploy.' };
    }
    return { configured: false, token: null, appId: AGORA_APP_ID,
      note: 'Agora is not configured yet. Add AGORA_APP_ID and AGORA_APP_CERTIFICATE to enable true live voice. Rooms currently use voice notes.' };
  }
  /* AccessToken2 (v007) is Agora's current token format. If the
     'agora-token' package is missing (older install), fall back to the
     legacy v006 builder from 'agora-access-token' — both are accepted
     by the Agora service, but v007 is preferred. */
  let token = '';
  try {
    const { RtcTokenBuilder, RtcRole } = require('agora-token');
    token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID, AGORA_APP_CERTIFICATE, channel, uid,
      RtcRole.PUBLISHER, TOKEN_TTL_SECONDS, TOKEN_TTL_SECONDS);
  } catch (e) { token = ''; }
  if (!token) {
    const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
    token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID, AGORA_APP_CERTIFICATE, channel, uid,
      RtcRole.PUBLISHER, Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS);
  }
  if (!token) throw new Error('Agora token could not be built — check AGORA_APP_ID / AGORA_APP_CERTIFICATE (must be 32 hex characters each).');
  return { configured: true, token, appId: AGORA_APP_ID, ttlSeconds: TOKEN_TTL_SECONDS };
}

module.exports = function (ctx) {
  const router = express.Router();
  router.get('/status', (req, res) => res.json({
    configured: AGORA_CONFIGURED, appId: AGORA_KEYS_SET ? AGORA_APP_ID : 'NOT-SET',
    note: AGORA_CONFIGURED
      ? 'Agora configured. Live two-way voice is on — anyone in a room can talk and hear everyone, worldwide.'
      : (AGORA_KEYS_SET
        ? 'Agora keys are set but the token builder is not installed — live voice cannot start yet. Rooms use voice notes.'
        : 'Agora NOT configured. Voice notes work; live voice needs an Agora App ID + Certificate (see server/agora.js).')
  }));
  router.get('/token', (req, res) => {
    const { channel, uid } = req.query;
    if (!channel) return res.status(400).json({ error: 'channel is required' });
    res.json(getToken(channel, Number(uid) || 0));
  });
  return router;
};
module.exports.AGORA_APP_ID = AGORA_APP_ID;
module.exports.AGORA_CONFIGURED = AGORA_CONFIGURED;
module.exports.getToken = getToken;
