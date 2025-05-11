// api/verify-holder.js
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const nacl    = require('tweetnacl');
const bs58    = require('bs58');
const { nonces } = require('./nonce.js');

// Change this to your actual SPL token mint
const TOKEN_MINT = 'FyWVxZidhhoWPTNjPLr1K5KeU7APFZdKutxP87Enpump';
// Your private Telegram invite
const INVITE_LINK = 'https://t.me/+OK3C9ZPdY3RiYjcx';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { publicKey, signature, nonce } = req.body || {};
  if (!publicKey || !signature || !nonce) {
    return res.status(400).json({ error: 'Missing publicKey, signature or nonce' });
  }

  // 1️⃣ Verify the signature of the nonce
  let validSig = false;
  try {
    const pkBytes  = bs58.decode(publicKey);
    const sigBytes = bs58.decode(signature);
    const msgBytes = new TextEncoder().encode(nonce);
    validSig = nacl.sign.detached.verify(msgBytes, sigBytes, pkBytes);
  } catch (e) {
    console.error('Signature verify error', e);
    validSig = false;
  }
  if (!validSig) {
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  // 2️⃣ Check on-chain SPL token balance
  try {
    const conn    = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const ownerPk = new PublicKey(publicKey);
    const mintPk  = new PublicKey(TOKEN_MINT);
    const resp    = await conn.getParsedTokenAccountsByOwner(ownerPk, { mint: mintPk });
    const accounts = resp.value;
    if (!accounts.length || Number(accounts[0].account.data.parsed.info.tokenAmount.uiAmount) <= 0) {
      return res.status(403).json({ error: 'Required token not held' });
    }
  } catch (e) {
    console.error('RPC error', e);
    return res.status(500).json({ error: 'Failed to fetch token holdings' });
  }

  // 3️⃣ All good!
  return res.status(200).json({ invite: INVITE_LINK });
};
