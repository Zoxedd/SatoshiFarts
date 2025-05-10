import LRU from 'quick-lru';
import { randomBytes } from 'crypto';

// In-memory store for 5 minutes
const nonces = new LRU({ maxAge: 1000 * 60 * 5 });

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const nonce = randomBytes(16).toString('hex');
  nonces.set(nonce, true);
  return res.status(200).json({ nonce });
}

// Make the cache accessible to the other function
export { nonces };
