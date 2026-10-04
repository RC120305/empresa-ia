// Notificações no celular (Web Push, padrão dos navegadores: RFC 8291 + VAPID RFC 8292), sem biblioteca externa.
// A chave VAPID fica no cofre do Google (segredo "vapid-chave", criado pelo roteiro crm/infra/ligar-avisos-celular.txt);
// fora do Cloud Run (testes), vem da variável VAPID_CHAVE. O conteúdo vai cifrado: só o aparelho inscrito lê.
'use strict';
const crypto = require('crypto');

const b64u = b => Buffer.from(b).toString('base64url');
const deB64u = s => Buffer.from(String(s || ''), 'base64url');

// Chave privada (JWK P-256 em JSON) → objetos de chave e a chave pública "crua" (65 bytes) que o navegador usa
function lerChave(json) {
  let jwk;
  try { jwk = typeof json === 'string' ? JSON.parse(json) : json; } catch { return null; }
  if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d || !jwk.x || !jwk.y) return null;
  const privada = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
  const publica = Buffer.concat([Buffer.from([4]), deB64u(jwk.x), deB64u(jwk.y)]);
  return { privada, publica, publicaB64: b64u(publica) };
}

function jwtVapid(endpoint, chave, contato, agora = Date.now()) {
  const aud = new URL(endpoint).origin;
  const cab = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const dados = b64u(JSON.stringify({ aud, exp: Math.floor(agora / 1000) + 12 * 3600, sub: contato }));
  const ass = crypto.sign('sha256', Buffer.from(cab + '.' + dados), { key: chave.privada, dsaEncoding: 'ieee-p1363' });
  return cab + '.' + dados + '.' + b64u(ass);
}

const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
// Cifra a mensagem para um aparelho (aes128gcm, um registro só)
function cifrar(texto, p256dh, auth, { sal = crypto.randomBytes(16), ecdh = crypto.createECDH('prime256v1') } = {}) {
  const uaPub = deB64u(p256dh), segredoAuth = deB64u(auth);
  if (uaPub.length !== 65 || segredoAuth.length < 16) throw new Error('inscrição inválida');
  let asPub;
  try { asPub = ecdh.getPublicKey(); } catch { asPub = ecdh.generateKeys(); }
  const comum = ecdh.computeSecret(uaPub);
  const prkChave = hmac(segredoAuth, comum);
  const ikm = hmac(prkChave, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub, Buffer.from([1])]));
  const prk = hmac(sal, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const cifrado = Buffer.concat([c.update(Buffer.concat([Buffer.from(texto, 'utf8'), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([sal, rs, Buffer.from([asPub.length]), asPub, cifrado]);
}

// Envia uma notificação. Devolve { ok, status, expirada } (expirada = o aparelho cancelou: apagar a inscrição).
async function enviar(inscricao, mensagem, chave, contato, buscar = fetch) {
  const corpo = cifrar(JSON.stringify(mensagem), inscricao.p256dh, inscricao.auth);
  const r = await buscar(inscricao.endpoint, {
    method: 'POST', body: corpo, signal: AbortSignal.timeout(8000),
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'aes128gcm', TTL: '3600', Urgency: 'high',
      Authorization: `vapid t=${jwtVapid(inscricao.endpoint, chave, contato)}, k=${chave.publicaB64}` },
  });
  return { ok: r.ok, status: r.status, expirada: r.status === 404 || r.status === 410 };
}

// Só aceita endereços dos serviços de push conhecidos (nada de o CRM postar para qualquer servidor)
const SERVICOS = /^https:\/\/([\w.-]+\.)?(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)\//;
const endpointOk = e => typeof e === 'string' && e.length < 1000 && SERVICOS.test(e);

module.exports = { lerChave, jwtVapid, cifrar, enviar, endpointOk };
