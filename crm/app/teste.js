// Teste local do webhook: node teste.js
process.env.META_VERIFY_TOKEN = 'teste-verify';
process.env.META_APP_SECRET = 'segredo-de-teste';
const crypto = require('crypto');
const assert = require('assert');
const { servidor } = require('./server');
servidor.listen(0, async () => {
  const base = 'http://127.0.0.1:' + servidor.address().port;
  let r = await fetch(base + '/webhook/meta?hub.mode=subscribe&hub.verify_token=teste-verify&hub.challenge=123');
  assert.equal(r.status, 200); assert.equal(await r.text(), '123');
  r = await fetch(base + '/webhook/meta?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123');
  assert.equal(r.status, 403);
  const corpo = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: '5567999990000', type: 'text', text: { body: 'oi' } }] } }] }] });
  const sig = 'sha256=' + crypto.createHmac('sha256', 'segredo-de-teste').update(corpo).digest('hex');
  r = await fetch(base + '/webhook/meta', { method: 'POST', body: corpo, headers: { 'x-hub-signature-256': sig } });
  assert.equal(r.status, 200);
  r = await fetch(base + '/webhook/meta', { method: 'POST', body: corpo, headers: { 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) } });
  assert.equal(r.status, 401);
  const st = await (await fetch(base + '/webhook/status')).json();
  assert.equal(st.recebidos, 1); assert.equal(st.ultimos[0].de, '5567•••••000');
  console.log('TODOS OS TESTES PASSARAM');
  servidor.close();
});
