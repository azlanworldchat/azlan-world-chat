/* AGORA — live voice server configuration (placeholders).
   True live multi-party voice needs the Agora SDK + a token server.
   HOW TO ENABLE REAL LIVE VOICE:
   1. Create a free account at https://www.agora.io and make a project.
   2. Copy your App ID and App Certificate.
   3. Set them in your environment (or a .env file):
        AGORA_APP_ID=your_app_id_here
        AGORA_APP_CERTIFICATE=your_app_certificate_here
   4. Install the token helper:  npm install agora-access-token
   5. Uncomment the token code in getToken() below.
   6. In the web app, join the Agora channel for the room (see
      public/app.js -> joinAgoraChannel()) with the token from
      GET /api/voice/token?channel=<roomId>&uid=<userId>.
   Until then, rooms use recorded voice messages (voice notes) which
   already work without Agora. */
const express = require('express');

const AGORA_APP_ID = process.env.AGORA_APP_ID || 'YOUR-AGORA-APP-ID-HERE';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'YOUR-AGORA-APP-CERTIFICATE-HERE';
const AGORA_CONFIGURED = !!(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE);

function getToken(channel, uid) {
  if (!AGORA_CONFIGURED) {
    return { configured: false, token: null, appId: AGORA_APP_ID,
      note: 'Agora is not configured yet. Add AGORA_APP_ID and AGORA_APP_CERTIFICATE to enable true live voice. Rooms currently use voice notes.' };
  }
  // --- Uncomment after: npm install agora-access-token ---
  // const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
  // const token = RtcTokenBuilder.buildTokenWithUid(
  //   AGORA_APP_ID, AGORA_APP_CERTIFICATE, channel, uid,
  //   RtcRole.PUBLISHER, Math.floor(Date.now() / 1000) + 3600);
  // return { configured: true, token, appId: AGORA_APP_ID };
  return { configured: false, token: null, appId: AGORA_APP_ID,
    note: 'Agora keys are set but the token builder is not installed. Run: npm install agora-access-token and uncomment getToken() in server/agora.js' };
}

module.exports = function (ctx) {
  const router = express.Router();
  router.get('/status', (req, res) => res.json({
    configured: AGORA_CONFIGURED, appId: AGORA_CONFIGURED ? AGORA_APP_ID : 'NOT-SET',
    note: AGORA_CONFIGURED
      ? 'Agora configured. Token endpoint is live.'
      : 'Agora NOT configured. Voice notes work; live voice needs an Agora App ID + Certificate (see server/agora.js).'
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
