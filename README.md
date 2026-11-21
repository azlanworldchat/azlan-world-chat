# AZLAN WORLD CHAT — Source Code Package

A complete, standalone voice-chat app (PWA web app + Node.js backend).
**Original work** — written from scratch. No Yalla / Saaky code or assets.

Owner: **Azlan**. Everyone else registers / logs in. The owner enters
**directly with no login** through the Owner Portal button.

---

## What is inside

```
azlan-world-chat-source/
├── server.js                 Main backend (Express) — all main API routes
├── package.json              Dependencies (express, jsonwebtoken, bcryptjs, multer, cors)
├── data/db.json              Database (JSON file, created on first run)
├── uploads/                  Uploaded voice notes, receipts, room music
├── public/
│   ├── index.html            The whole app (Party, Discover, Messages, Friends, Me, Owner Portal)
│   ├── app.js                All front-end logic
│   ├── styles.css            Dark navy + gold theme, 3D animations
│   ├── sounds.js             Sound effects + voice effects (normal / deep / robot / echo)
│   ├── manifest.json         PWA manifest (installable, standalone)
│   └── icons/                icon.svg, icon-192.png, icon-512.png (golden microphone)
└── server/
    ├── agora.js              Agora live-voice config + token endpoint (placeholders)
    ├── auth.js               Auth service
    ├── chat.js               Chat service
    ├── rooms.js              Room + voice service
    ├── payments.js           Payment / recharge service
    ├── gifts.js              Gift service
    ├── rankings.js           Ranking service
    ├── notifications.js      Notification service
    └── vip.js                VIP Club — VIP1–VIP11, animals, 58/65 benefits
```

### Features

- **Auth:** register/login (JWT), permanent UID, profiles, follow, 1,000,000 welcome coins
- **Voice rooms:** create/join, 8 mic seats, mic on/off, room chat, voice notes
  (record + play with effects), room music upload/playback, host can block members
- **Gifts:** full catalogue (Hot / Activity / Privilege / CP), gift animations,
  charm + wealth rise, **100,000+ coin gifts trigger a global broadcast**
- **Wallet:** 8 packages — $1=1M, $5=5M, $10=10M, $20=20M, $30=30M, $50=50M,
  $75=75M, $100=100M coins. **First $1 recharge: 1M bought + 1M bonus.**
  Manual recharge (Easypaisa / JazzCash / Visa / Google Play): receipt upload,
  **owner approves → coins credited, never from the screenshot alone.**
- **Diamonds:** 5 conversion stages (1M coins → 500,000 diamonds, up to 60M coins)
- **VIP Club — VIP1 to VIP11**, each with its own fierce animal mascot and
  3D animated emblem:
  VIP1 Cat 🐱, VIP2 Falcon 🦅, VIP3 Wolf 🐺, VIP4 Cobra 🐍, VIP5 Tiger 🐯,
  VIP6 Panther 🐆, VIP7 Lion 🦁, VIP8 Bear 🐻, VIP9 Phoenix 🐦‍🔥,
  VIP10 Flaming Dragon 🐉, VIP11 Thunder Dragon 🐲.
  Benefits scale with level across 5 tabs — Status / Decorations / Functions /
  Rewards / Discounts. **VIP10 has all 58 benefits, VIP11 has 65.**
  Working benefits include: VIP discounts on gifts/shop, double daily rewards,
  protections (chat restriction / removal from room / removal from mic),
  custom frames / entrance / mic animation / chat box / profile card,
  custom ID (VIP4+), Lucky Bags (VIP only), Bonus Points + Bonus Points Store,
  VIP Points progress bar with Earn button, VIP Offers, daily claims
  (gift code, crystals, golds, birthday gift), and VIP8+ room removal.
- **Premium shop, Families, CP** (Basic 100,000 / Premium 500,000 / Luxury 5,000,000),
  **Rankings** (wealth / charm / level / rooms / CP / families),
  **Discover moments** (posts, likes, comments), **messaging**,
  **daily sign-in, Lucky Draw** (spin animation), **Invite & Earn**
  (100,000 coins per friend + 5% of their recharges), **AI assistant stub**,
  feedback, notifications with preferences, settings
- **Owner Portal (Azlan, direct entry, no login):** Unlimited master wallet
  (set a number later), give/take coins, set VIP/SVIP/unique ID, ban users
  and devices, approve/reject recharges, add/remove gifts, shop items, rooms,
  announcements, settings, audit log

---

## Run locally

```bash
cd azlan-world-chat-source
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

**Change these before publishing** (in `server.js` or environment variables):

| Setting | Default | Where |
|---|---|---|
| `OWNER_SECRET` | `CHANGE-THIS-OWNER-SECRET` | Owner Portal direct-entry key |
| `JWT_SECRET` | `CHANGE-THIS-JWT-SECRET-AZLAN` | Login session signing |
| Owner password | `AzlanOwner#1` | `owner@azlanworld.chat` — change after first login! |

Example: `JWT_SECRET=mysecret OWNER_SECRET=myownerkey PORT=3000 npm start`

---

## Host on a server

1. Copy this folder to your server (VPS, Render, Railway, Heroku, etc.).
2. Install Node.js 18+ on the server.
3. Run `npm install` then `npm start` (or use PM2: `pm2 start server.js`).
4. Point your domain to the server port (use Nginx/Caddy as a reverse proxy
   with HTTPS — microphones and PWA install need HTTPS).
5. Set the secrets above as environment variables on the server.
6. Data is stored in `data/db.json` — back it up. For big traffic, replace
   the JSON store with SQLite/PostgreSQL (the code is grouped so this is easy).

---

## Generate an Android APK

### Option A — Capacitor (recommended, real APK)

```bash
cd azlan-world-chat-source
npm install
npx cap init "AZLAN WORLD CHAT" com.azlan.worldchat
npx cap add android
npx cap sync
npx cap open android        # opens Android Studio
```

In Android Studio: **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
The APK is built from this exact code. You need Android Studio + Java JDK.

### Option B — PWABuilder (no Android Studio)

1. Host the app on a server with HTTPS (see above).
2. Go to https://www.pwabuilder.com, enter your site URL.
3. Download the generated Android package (TWA) and upload it to Play Store.

---

## What still needs real services

- **True live multi-party voice calls** need **Agora**:
  1. Free account at https://www.agora.io → create a project.
  2. Set `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` in the environment.
  3. Run `npm install agora-access-token` and uncomment the token code in
     `server/agora.js`. The endpoint `GET /api/voice/token` then issues tokens,
     and the app joins the Agora channel for the room.
  Until then, rooms use **recorded voice messages**, which already work.
- **Google Play Store publishing** needs a **Google Play Developer account
  ($25, one-time)** and the APK/AAB from Option A above.

---

## اردو — سادہ ہدایات

**اپنے کمپیوٹر پر چلانا:**
1. Node.js انسٹال کریں (https://nodejs.org)
2. اس فولڈر میں ٹرمینل کھولیں: `npm install` پھر `npm start`
3. براؤزر میں کھولیں: http://localhost:3000

**اونر (آپ) کیسے اندر جائیں گے:**
لاگ ان اسکرین پر **"Owner Portal — Enter Directly"** بٹن ہے — آپ بغیر لاگ ان کے
سیدھا اندر جائیں گے۔ باقی سب لوگوں کو پہلے رجسٹر / لاگ ان کرنا ہوگا۔
پہلے `server.js` میں `OWNER_SECRET` اور اونر کا پاس ورڈ بدل لیں!

**سرور پر لگانا:**
فولڈر سرور پر کاپی کریں، `npm install` اور `npm start` چلائیں، ڈومین لگائیں۔
آواز اور انسٹال کے لیے **HTTPS** ضروری ہے۔

**APK بنانا:**
`npx cap init` → `npx cap add android` → `npx cap sync` → Android Studio میں
کھول کر **Build APK** کریں۔ یا PWABuilder.com سے بنائیں۔

**Play Store پر ڈالنا:**
Google Play Developer اکاؤنٹ چاہیے — **$25 ایک بار**۔

**اصل لائیو وائس:**
دو فونوں کے درمیان اصلی لائیو آواز کے لیے **Agora** چاہیے (مفت اکاؤنٹ،
App ID اور Certificate `server/agora.js` میں ڈالیں)۔ اس کے بغیر روم میں
ریکارڈ شدہ وائس میسج چلتے ہیں — وہ پہلے سے کام کرتے ہیں۔
