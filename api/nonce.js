// pages/api/nonce.js
const crypto = require('crypto');
const LRU    = require('quick-lru');

// 5-minute LRU cache
const nonces = new LRU({ maxAge: 1000 * 60 * 5 });

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const nonce = crypto.randomBytes(16).toString('hex');
  nonces.set(nonce, true);
  res.status(200).json({ nonce });
};

// expose the same cache for verify-holder
module.exports.nonces = nonces;
