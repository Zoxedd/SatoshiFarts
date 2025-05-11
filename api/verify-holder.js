import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import nacl from 'tweetnacl';
import { nonces } from './nonce.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { publicKey: pk, signature: sigB64, nonce } = req.body;
    if (!pk || !sigB64 || !nonce) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // 1️⃣ Validate nonce
    if (!nonces.has(nonce)) {
      return res.status(401).json({ error: 'Bad nonce' });
    }
    nonces.delete(nonce);

    // 2️⃣ Verify signature using tweetnacl
    const key = new PublicKey(pk);
    const msg = Buffer.from(nonce, 'utf8');
    const sig = Buffer.from(sigB64, 'base64');
    const isValid = nacl.sign.detached.verify(
      msg,
      sig,
      key.toBytes()
    );
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3️⃣ Check token balance
    const conn = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const resp = await conn.getParsedTokenAccountsByOwner(key, {
      programId: TOKEN_PROGRAM_ID,
    });
    const hasToken = resp.value.some(({ account }) => {
      const info = account.data.parsed.info;
      return (
        info.mint === 'FyWVxZidhhoWPTNjPLr1K5KeU7APFZdKutxP87Enpump' &&
        BigInt(info.tokenAmount.amount) > 0n
      );
    });
    if (!hasToken) {
      return res.status(403).json({ error: 'No tokens held' });
    }

    // 4️⃣ Success!
    return res.status(200).json({
      inviteLink: 'https://t.me/+OK3C9ZPdY3RiYjcx',
    });
  } catch (e) {
    console.error('❌ verify-holder error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
