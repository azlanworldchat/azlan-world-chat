/* PAYMENT / RECHARGE SERVER — coin packages, manual receipt recharge,
   diamond conversion. The owner approves every recharge; coins are NEVER
   credited from a screenshot alone. Mounted at /api/v2/payments. */
const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-AZLAN';

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'Login required' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'Bad session' }); }
}

module.exports = function (ctx) {
  const { db, save } = ctx;
  const router = express.Router();
  router.use(auth);

  // Payment methods the app accepts (manual flow)
  router.get('/methods', (req, res) => res.json({
    methods: [
      { id: 'easypaisa', name: 'Easypaisa', note: 'Send payment, upload the receipt screenshot.' },
      { id: 'jazzcash', name: 'JazzCash', note: 'Send payment, upload the receipt screenshot.' },
      { id: 'visa', name: 'Visa / Card', note: 'Pay by card, upload the receipt.' },
      { id: 'googleplay', name: 'Google Play Billing', note: 'In-app purchase — receipt is verified by the owner.' }
    ]
  }));
  // My recharge history
  router.get('/my-recharges', (req, res) => {
    res.json({ recharges: [...db.recharges].filter(r => r.userId === req.user.id).reverse() });
  });
  // Diamond conversion stages (owner-configurable in settings)
  router.get('/diamond-stages', (req, res) => res.json({ stages: db.settings.diamondStages }));
  // Convert diamonds back to coins is NOT allowed — diamonds are earned
  // value; this endpoint only reports the reference value.
  router.get('/diamond-value', (req, res) => {
    const u = db.users.find(x => x.id === req.user.id);
    res.json({ diamonds: u.diamonds, referenceValue: u.diamonds * 0.324 });
  });
  return router;
};
