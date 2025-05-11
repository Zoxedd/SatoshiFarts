// api/nonce.js
import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const nonce = crypto.randomBytes(16).toString('hex');
    return res.status(200).json({ nonce });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Make the cache accessible to the other function
export { nonces };
