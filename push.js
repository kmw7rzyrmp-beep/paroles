// Notifications sur le téléphone / l'ordinateur, même quand le site est fermé (« Web Push »).
// Sans aucune librairie : chiffrement du message (RFC 8291, aes128gcm) + signature VAPID (RFC 8292).
import { createECDH, createPrivateKey, createPublicKey, generateKeyPairSync, hkdfSync, randomBytes, createCipheriv, sign } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const fromB64u = (s) => Buffer.from(String(s || ''), 'base64url');

// Les services de notification des navigateurs : on n'envoie jamais ailleurs
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /^updates\.push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/];
export function validSubscription(sub) {
  try {
    const u = new URL(sub.endpoint);
    if (u.protocol !== 'https:' || !PUSH_HOSTS.some((r) => r.test(u.hostname))) return false;
    return fromB64u(sub.keys?.p256dh).length === 65 && fromB64u(sub.keys?.auth).length === 16;
  } catch { return false; }
}

// Clés VAPID : créées une seule fois, puis gardées (dans Supabase avec le reste)
export function newVapidKeys() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  return { jwk, publicKey: b64u(Buffer.concat([Buffer.from([4]), fromB64u(jwk.x), fromB64u(jwk.y)])) };
}

function vapidHeader(endpoint, vapid, subject) {
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }));
  const key = createPrivateKey({ key: vapid.jwk, format: 'jwk' });
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${vapid.publicKey}`;
}

// Chiffre le message pour un abonnement (seul ce navigateur peut le lire)
export function encrypt(sub, payload) {
  const uaPublic = fromB64u(sub.keys.p256dh);
  const authSecret = fromB64u(sub.keys.auth);
  const ecdh = createECDH('prime256v1');
  const asPublic = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const text = Buffer.concat([Buffer.from(payload), Buffer.from([2])]); // 2 = dernier morceau
  const enc = Buffer.concat([cipher.update(text), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, enc]);
}

// Envoie une notification. Renvoie 'gone' si l'abonnement n'existe plus (à supprimer).
export async function sendPush(sub, data, vapid, subject = 'mailto:contact@star-song.app') {
  const body = encrypt(sub, JSON.stringify(data));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidHeader(sub.endpoint, vapid, subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404 || res.status === 410) return 'gone';
  if (!res.ok) throw new Error(`service de notification : ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`);
  return 'ok';
}

// (pour les tests) vérifier une signature VAPID
export const _test = { createPublicKey, vapidHeader };
