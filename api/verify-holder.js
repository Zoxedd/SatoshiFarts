// pages/api/verify-holder.js

const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const nacl                                 = require('tweetnacl');
const bs58                                 = require('bs58');
const { nonces }                           = require('./nonce');

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);
const TOKEN_MINT = 'FyWVxZidhhoWPTNjPLr1K5KeU7APFZdKutxP87Enpump';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    const { publicKey, signature, nonce } = req.body;
    console.log('📥 Payload:', { publicKey, signature: signature?.slice(0,8)+'…', nonce });

    // Basic sanity
    if (!publicKey || !signature || !nonce) {
      console.warn('Missing fields');
      return res.status(400).json({ error: 'Missing fields' });
    }

    // 1) nonce check
    if (!nonces.has(nonce)) {
      console.warn('Bad nonce:', nonce);
      return res.status(401).json({ error: 'Bad nonce' });
    }
    nonces.delete(nonce);

    // 2) verify signature
    const pk       = new PublicKey(publicKey);
    const msgBytes = Buffer.from(nonce, 'utf8');
    const sigBytes = Buffer.from(signature, 'base64');
    const ok       = nacl.sign.detached.verify(
      msgBytes,
      sigBytes,
      pk.toBuffer()
    );
    console.log('Signature valid?', ok);
    if (!ok) {
      console.warn('Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3) fetch token accounts (filter by program, then check mint)
    const conn = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const resp = await conn.getParsedTokenAccountsByOwner(
      pk,
      { programId: TOKEN_PROGRAM_ID }
    );
    console.log('Token accounts fetched:', resp.value.length);

    const hasToken = resp.value.some(({ account: { data: { parsed: { info } } } }) => {
      return (
        info.mint === TOKEN_MINT &&
        BigInt(info.tokenAmount.amount) > 0n
      );
    });
    console.log('Holder has token?', hasToken);

    if (!hasToken) {
      console.warn('No tokens held for mint', TOKEN_MINT);
      return res.status(403).json({ error: 'No tokens held' });
    }

    // 4) success
    return res.status(200).json({
      inviteLink: 'https://t.me/+OK3C9ZPdY3RiYjcx'
    });

  } catch (err) {
    console.error('🔥 verify-holder error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
