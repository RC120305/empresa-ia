// Teste local do webhook: node teste.js
// Um "Supabase falso" local registra as chamadas, para testar a gravação sem tocar no banco real.
const http = require('http');
const crypto = require('crypto');
const assert = require('assert');

const chamadas = [];
let bancoQuebrado = false;
let janelaAberta = true;
let ultimoPedidoIA = null;
const FAKE = {
  '/auth/v1/user': req => req.headers.authorization === 'Bearer token-equipe' ? { email: 'equipe@teste.com' }
    : req.headers.authorization === 'Bearer token-estranho' ? { email: 'estranho@teste.com' } : null,
};
const guardados = new Map(); // "Storage" falso: caminho -> {dados, mime}
const MSG_MIDIA = '33333333-3333-3333-3333-333333333333';
const falso = http.createServer((req, res) => {
  const pedacos = [];
  req.on('data', p => pedacos.push(p));
  req.on('end', () => {
    const bruto = Buffer.concat(pedacos);
    const corpo = bruto.toString();
    let json = null;
    try { json = corpo ? JSON.parse(corpo) : null; } catch { json = { bruto: corpo, tipo: req.headers['content-type'] }; }
    chamadas.push({ url: req.url, metodo: req.method, apikey: req.headers.apikey, corpo: json });
    if (bancoQuebrado) { res.writeHead(503); return res.end(); }
    if (req.url.startsWith('/rest/v1/rpc/registrar_status')) { res.writeHead(204); return res.end(); }
    const responder = (cod, obj) => { res.writeHead(cod, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.url === '/graph/midia9') return responder(200, { url: process.env.SUPABASE_URL + 'cdn/midia9', mime_type: 'image/jpeg' });
    if (req.url === '/cdn/midia9') { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end('FOTO-JPEG'); }
    if (req.url.startsWith('/storage/v1/object/midias/') && req.method === 'POST') {
      guardados.set(req.url.slice('/storage/v1/object/midias/'.length), { dados: bruto, mime: req.headers['content-type'] });
      return responder(200, { Key: 'ok' });
    }
    if (req.url.startsWith('/storage/v1/object/authenticated/midias/')) {
      const g = guardados.get(req.url.slice('/storage/v1/object/authenticated/midias/'.length));
      if (!g) return responder(404, { error: 'not_found' });
      res.writeHead(200, { 'Content-Type': g.mime }); return res.end(g.dados);
    }
    if (req.url.startsWith('/rest/v1/mensagens?id=eq.')) {
      if (req.method === 'PATCH') { res.writeHead(204); return res.end(); }
      const patch = chamadas.findLast(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/mensagens?id=eq.' + MSG_MIDIA));
      return responder(200, req.url.includes(MSG_MIDIA) ? [{ id: MSG_MIDIA, conversa_id: '11111111-1111-1111-1111-111111111111', tipo: 'image', midia_id: 'midia9',
        midia_caminho: patch ? patch.corpo.midia_caminho : null, midia_mime: patch ? patch.corpo.midia_mime : null, midia_nome: null }] : []);
    }
    if (req.url === '/rest/v1/rpc/registrar_entrada_whatsapp') return responder(200, { nova: true, mensagem_id: MSG_MIDIA, conversa_id: '11111111-1111-1111-1111-111111111111' });
    if (req.url === '/graph/111/media') return responder(200, { id: 'midia-subida' });
    if (req.url === '/rest/v1/rpc/registrar_saida_midia') return responder(200, '44444444-4444-4444-4444-444444444444');
    if (req.url.startsWith('/silbeck/v1/Liberar?')) return req.url.includes('client_secret=sec-ok') ? responder(200, { access_token: 'tok-silbeck', token_type: 'Bearer', expires_in: 30 }) : responder(400, { erro: 'invalido' });
    if (req.url === '/silbeck/v1/TipoApartamento') return req.headers.authorization === 'Bearer tok-silbeck' ? responder(200, { listaTipoApartamento: [{ id: 1 }, { id: 2 }, { id: 3 }] }) : responder(401, {});
    if (req.url === '/auth/v1/user') { const u = FAKE['/auth/v1/user'](req); return u ? responder(200, u) : responder(401, { msg: 'invalid' }); }
    if (req.url === '/rest/v1/rpc/equipe_por_email') { const b = JSON.parse(corpo); return responder(200, b.p_email === 'equipe@teste.com' ? [{ id: 'u-1', nome: 'Equipe', papel: 'atendente' }] : []); }
    if (req.url.startsWith('/rest/v1/conversas?')) return responder(200, [{ id: '11111111-1111-1111-1111-111111111111', canal: 'wa', numero_id: '111',
      ultima_msg_cliente_em: new Date(Date.now() - (janelaAberta ? 3600e3 : 30 * 3600e3)).toISOString(),
      contato: { contato_identificadores: [{ tipo: 'whatsapp', valor: '+5567999990000' }] } }]);
    if (req.url.startsWith('/rest/v1/mensagens?')) return responder(200, [
      { direcao: 'entrada', tipo: 'text', corpo: 'Tem vaga de 14 a 16/11 para 2 adultos?', enviada_em: '2026-10-02T10:01:00Z', id_externo: 'wamid.CLIENTE' },
      { direcao: 'saida', tipo: 'text', corpo: 'Oi! Vou ver para você.', enviada_em: '2026-10-02T10:00:30Z' },
      { direcao: 'entrada', tipo: 'text', corpo: 'Oi', enviada_em: '2026-10-02T10:00:00Z' }]);
    if (req.url.split('?')[0] === '/v1/messages') {
      const b = JSON.parse(corpo);
      ultimoPedidoIA = { corpo: b, beta: req.headers['anthropic-beta'] || '' };
      return responder(200, { id: 'msg_1', type: 'message', role: 'assistant', model: b.model, stop_reason: 'end_turn', stop_sequence: null,
        content: [{ type: 'text', text: JSON.stringify({ mensagem: 'Oi! Tenho sim [[valor do Silbeck]]', notas_internas: 'Consultar Silbeck', precisa_equipe: false }) }],
        usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } });
    }
    if (req.url === '/graph/111/messages') return responder(200, { messages: [{ id: 'wamid.SAIDA' }] });
    if (req.url === '/rest/v1/rpc/registrar_saida_whatsapp') return responder(200, '22222222-2222-2222-2222-222222222222');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(req.url.startsWith('/rest/v1/rpc/') ? '{"nova":true}' : '[]');
  });
});

falso.listen(0, () => {
  process.env.META_VERIFY_TOKEN = 'teste-verify';
  process.env.META_APP_SECRET = 'segredo-de-teste';
  process.env.SUPABASE_URL = 'http://127.0.0.1:' + falso.address().port + '/';
  process.env.SUPABASE_SECRET_KEY = 'chave-de-teste';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_teste';
  process.env.META_WHATSAPP_TOKEN = 'token-meta-teste';
  process.env.FATOR_DIGITACAO = '0';
  process.env.ANTHROPIC_API_KEY = 'chave-ia-teste';
  process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:' + falso.address().port;
  process.env.META_GRAPH_URL = 'http://127.0.0.1:' + falso.address().port + '/graph';
  const { servidor } = require('./server');

  servidor.listen(0, async () => {
    const base = 'http://127.0.0.1:' + servidor.address().port;
    const assinar = c => 'sha256=' + crypto.createHmac('sha256', 'segredo-de-teste').update(c).digest('hex');
    const postar = c => fetch(base + '/webhook/meta', { method: 'POST', body: c, headers: { 'x-hub-signature-256': assinar(c) } });

    // Verificação da Meta
    let r = await fetch(base + '/webhook/meta?hub.mode=subscribe&hub.verify_token=teste-verify&hub.challenge=123');
    assert.equal(r.status, 200); assert.equal(await r.text(), '123');
    r = await fetch(base + '/webhook/meta?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123');
    assert.equal(r.status, 403);

    // Mensagem recebida: grava contato + conversa + mensagem
    const msg = JSON.stringify({ entry: [{ changes: [{ value: {
      metadata: { phone_number_id: '111' },
      contacts: [{ wa_id: '5567999990000', profile: { name: 'Cliente Teste' } }],
      messages: [{ from: '5567999990000', id: 'wamid.A', timestamp: '1700000000', type: 'text', text: { body: 'oi' } }],
    } }] }] });
    r = await postar(msg);
    assert.equal(r.status, 200);
    const c1 = chamadas.at(-1);
    assert.equal(c1.url, '/rest/v1/rpc/registrar_entrada_whatsapp');
    assert.equal(c1.apikey, 'chave-de-teste');
    assert.deepEqual(c1.corpo, { p_numero_id: '111', p_de: '5567999990000', p_nome: 'Cliente Teste', p_wamid: 'wamid.A',
      p_tipo: 'text', p_corpo: 'oi', p_midia_id: null, p_quando: '2023-11-14T22:13:20.000Z' });

    // Assinatura inválida: recusa e não grava nada
    const antes = chamadas.length;
    r = await fetch(base + '/webhook/meta', { method: 'POST', body: msg, headers: { 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) } });
    assert.equal(r.status, 401); assert.equal(chamadas.length, antes);

    // Status de entrega e mídia com legenda
    r = await postar(JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: '111' },
      statuses: [{ id: 'wamid.B', status: 'read', recipient_id: '5567999990000' }],
      messages: [{ from: '5567999990000', id: 'wamid.C', type: 'image', image: { id: 'midia9', caption: 'olha a foto' } }] } }] }] }));
    assert.equal(r.status, 200);
    const img = chamadas.find(c => c.corpo && c.corpo.p_wamid === 'wamid.C');
    assert.equal(img.corpo.p_corpo, 'olha a foto'); assert.equal(img.corpo.p_midia_id, 'midia9');
    // A foto é baixada da Meta, guardada no Storage e anotada na mensagem
    const caminhoFoto = '11111111-1111-1111-1111-111111111111/' + MSG_MIDIA + '.jpg';
    assert.equal(String(guardados.get(caminhoFoto) && guardados.get(caminhoFoto).dados), 'FOTO-JPEG');
    const anot = chamadas.find(c => c.metodo === 'PATCH' && c.url === '/rest/v1/mensagens?id=eq.' + MSG_MIDIA);
    assert.deepEqual(anot.corpo, { midia_caminho: caminhoFoto, midia_mime: 'image/jpeg' });
    const st = chamadas.find(c => c.url === '/rest/v1/rpc/registrar_status_whatsapp');
    assert.deepEqual(st.corpo, { p_wamid: 'wamid.B', p_status: 'read', p_erro: null });

    // Banco fora do ar: responde 500 para a Meta reenviar depois
    bancoQuebrado = true;
    r = await postar(msg);
    assert.equal(r.status, 500);
    bancoQuebrado = false;

    // Saúde mostra os segredos e o banco
    const saude = await (await fetch(base + '/saude')).json();
    assert.deepEqual(saude.segredos, { verify: true, appSecret: true, supabase: true, supabasePublica: true, whatsappToken: true, anthropic: true });
    assert.equal(saude.gilberto.instrucoes, true);
    assert.equal(saude.banco, 'ok');

    // Página de status: número mascarado, sem conteúdo
    const pag = await (await fetch(base + '/webhook/status')).json();
    assert.equal(pag.ultimos.at(-1).de, '5567•••••000');
    assert.ok(!JSON.stringify(pag).includes('oi'));

    // Caixa de entrada: página, cabeçalhos de segurança e configuração só com a chave pública
    r = await fetch(base + '/caixa');
    assert.equal(r.status, 200);
    assert.ok((await r.text()).includes('Caixa de Entrada'));
    const csp = r.headers.get('content-security-policy');
    assert.ok(csp.includes("script-src 'self'") && csp.includes("frame-ancestors 'none'"));
    assert.equal(r.headers.get('cache-control'), 'no-store');
    for (const f of ['/caixa.js', '/caixa.css', '/vendor/supabase-2.117.2.js']) assert.equal((await fetch(base + f)).status, 200, f);
    const cfgTxt = await (await fetch(base + '/config.js')).text();
    assert.ok(cfgTxt.includes('sb_publishable_teste'));
    assert.ok(!cfgTxt.includes('chave-de-teste'), 'a chave secreta nunca vai para o navegador');
    assert.equal((await fetch(base + '/../server.js')).status, 404);
    assert.equal((await fetch(base + '/', { redirect: 'manual' })).headers.get('location'), '/caixa');

    // Responder pelo CRM
    const enviar = (tok, corpo) => fetch(base + '/api/enviar', { method: 'POST', headers: tok ? { Authorization: 'Bearer ' + tok } : {}, body: JSON.stringify(corpo) });
    const conv = '11111111-1111-1111-1111-111111111111';
    r = await enviar('token-equipe', { conversa_id: conv, texto: 'Oi! Aqui é o Ricardo.' });
    assert.equal(r.status, 200);
    const env = await r.json();
    assert.equal(env.wamid, 'wamid.SAIDA');
    const g = chamadas.find(c => c.url === '/graph/111/messages' && c.corpo.type === 'text');
    const dig = chamadas.find(c => c.url === '/graph/111/messages' && c.corpo.typing_indicator);
    assert.deepEqual(dig.corpo, { messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.CLIENTE', typing_indicator: { type: 'text' } });
    assert.equal(g.corpo.to, '5567999990000'); assert.equal(g.corpo.text.body, 'Oi! Aqui é o Ricardo.');
    const sai = chamadas.find(c => c.url === '/rest/v1/rpc/registrar_saida_whatsapp');
    assert.deepEqual(sai.corpo, { p_conversa: conv, p_wamid: 'wamid.SAIDA', p_corpo: 'Oi! Aqui é o Ricardo.', p_autor: 'u-1' });
    // Vários balões: um por vez, com "digitando…" antes de cada um
    const antesB = chamadas.length;
    r = await enviar('token-equipe', { conversa_id: conv, baloes: ['Oi, Ana!', 'Tenho sim 🌿', '  '] });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).enviadas.length, 2);
    const seq = chamadas.slice(antesB).filter(c => c.url === '/graph/111/messages').map(c => c.corpo.type === 'text' ? c.corpo.text.body : 'digitando');
    assert.deepEqual(seq, ['digitando', 'Oi, Ana!', 'digitando', 'Tenho sim 🌿']);
    assert.equal((await enviar('token-equipe', { conversa_id: conv, baloes: Array(7).fill('x') })).status, 400);
    assert.equal((await enviar(null, { conversa_id: conv, texto: 'x' })).status, 401);
    assert.equal((await enviar('token-invalido', { conversa_id: conv, texto: 'x' })).status, 401);
    assert.equal((await enviar('token-estranho', { conversa_id: conv, texto: 'x' })).status, 403);
    assert.equal((await enviar('token-equipe', { conversa_id: conv, texto: '   ' })).status, 400);
    assert.equal((await enviar('token-equipe', { conversa_id: 'x; drop', texto: 'oi' })).status, 400);
    janelaAberta = false;
    r = await enviar('token-equipe', { conversa_id: conv, texto: 'oi' });
    assert.equal(r.status, 409); assert.ok((await r.json()).erro.includes('24 h'));
    janelaAberta = true;

    // Mídias na caixa: abrir só com login da equipe; tipos perigosos viram download
    const midia = (tok, id) => fetch(base + '/api/midia/' + id, { headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
    r = await midia('token-equipe', MSG_MIDIA);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/jpeg');
    assert.ok(r.headers.get('content-disposition').startsWith('inline'));
    assert.equal(await r.text(), 'FOTO-JPEG');
    assert.equal((await midia(null, MSG_MIDIA)).status, 401);
    assert.equal((await midia('token-estranho', MSG_MIDIA)).status, 403);
    assert.equal((await midia('token-equipe', '55555555-5555-5555-5555-555555555555')).status, 404);
    assert.equal((await midia('token-equipe', '..%2F..%2Fsegredo')).status, 400);
    guardados.set('11111111-1111-1111-1111-111111111111/' + MSG_MIDIA + '.jpg', { dados: Buffer.from('<script>'), mime: 'text/html' });
    chamadas.push({ url: '/rest/v1/mensagens?id=eq.' + MSG_MIDIA, metodo: 'PATCH', corpo: { midia_caminho: caminhoFoto, midia_mime: 'text/html' } });
    r = await midia('token-equipe', MSG_MIDIA);
    assert.equal(r.headers.get('content-type'), 'application/octet-stream');
    assert.ok(r.headers.get('content-disposition').startsWith('attachment'));

    // Enviar arquivo pelo 📎: sobe na Meta, manda, guarda no Storage e registra
    const enviarArq = (tok, q, corpo, tipo) => fetch(base + '/api/enviar-midia?' + new URLSearchParams(q),
      { method: 'POST', headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': tipo }, body: corpo });
    r = await enviarArq('token-equipe', { conversa_id: conv, nome: 'chale.jpg', legenda: 'Nosso chalé 🌿' }, 'BYTES-FOTO', 'image/jpeg');
    const ea = await r.json();
    assert.equal(r.status, 200, JSON.stringify(ea));
    assert.equal(ea.id, '44444444-4444-4444-4444-444444444444'); assert.equal(ea.tipo, 'image');
    const up = chamadas.findLast(c => c.url === '/graph/111/media');
    assert.ok(up.corpo.bruto.includes('BYTES-FOTO') && up.corpo.tipo.startsWith('multipart/form-data'));
    const envImg = chamadas.findLast(c => c.url === '/graph/111/messages' && c.corpo.type === 'image');
    assert.deepEqual(envImg.corpo, { messaging_product: 'whatsapp', recipient_type: 'individual', to: '5567999990000', type: 'image', image: { id: 'midia-subida', caption: 'Nosso chalé 🌿' } });
    const regM = chamadas.findLast(c => c.url === '/rest/v1/rpc/registrar_saida_midia').corpo;
    assert.ok(regM.p_caminho.startsWith(conv + '/saida-') && regM.p_caminho.endsWith('.jpg'));
    assert.equal(String(guardados.get(regM.p_caminho).dados), 'BYTES-FOTO');
    assert.equal(regM.p_autor, 'u-1'); assert.equal(regM.p_nome, null);
    // PDF vai como documento com nome
    r = await enviarArq('token-equipe', { conversa_id: conv, nome: 'tarifario.pdf' }, '%PDF-1.4', 'application/pdf');
    assert.equal(r.status, 200);
    assert.deepEqual(chamadas.findLast(c => c.url === '/graph/111/messages').corpo.document, { id: 'midia-subida', filename: 'tarifario.pdf' });
    assert.equal((await enviarArq(null, { conversa_id: conv }, 'x', 'image/jpeg')).status, 401);
    assert.equal((await enviarArq('token-estranho', { conversa_id: conv }, 'x', 'image/jpeg')).status, 403);
    assert.equal((await enviarArq('token-equipe', { conversa_id: conv }, '', 'image/jpeg')).status, 400);
    assert.equal((await enviarArq('token-equipe', { conversa_id: conv }, Buffer.alloc(6 * 1024 * 1024), 'image/jpeg')).status, 413);
    assert.equal((await enviarArq('token-equipe', { conversa_id: conv }, Buffer.alloc(17 * 1024 * 1024), 'video/mp4')).status, 413);
    janelaAberta = false;
    assert.equal((await enviarArq('token-equipe', { conversa_id: conv }, 'x', 'image/jpeg')).status, 409);
    janelaAberta = true;

    // Silbeck: diagnóstico da ponte (porta, login, leitura), sem devolver token nem segredo
    process.env.SILBECK_URL = process.env.SUPABASE_URL + 'silbeck';
    process.env.SILBECK_CLIENT_ID = 'cliente';
    process.env.SILBECK_CLIENT_SECRET = 'sec-ok';
    const { diagnostico } = require('./silbeck');
    let dg = await diagnostico();
    assert.equal(dg.etapa, 'tudo certo', JSON.stringify(dg));
    assert.equal(dg.porta, 'aberta'); assert.equal(dg.login.expires_in, 30); assert.equal(dg.leitura.tiposDeApartamento, 3);
    assert.ok(!JSON.stringify(dg).includes('tok-silbeck') && !JSON.stringify(dg).includes('sec-ok') && !JSON.stringify(dg).includes('127.0.0.1'));
    process.env.SILBECK_CLIENT_SECRET = 'errado';
    dg = await diagnostico();
    assert.equal(dg.etapa, 'login'); assert.equal(dg.login.http, 400);
    process.env.SILBECK_URL = 'http://127.0.0.1:1/datasnap/rest';
    dg = await diagnostico();
    assert.equal(dg.etapa, 'porta'); assert.ok(dg.porta.startsWith('recusada'));
    process.env.SILBECK_URL = '';
    dg = await diagnostico();
    assert.equal(dg.etapa, 'segredos'); assert.equal(dg.configurado.endereco, false);
    r = await fetch(base + '/saude/silbeck');
    assert.equal(r.status, 200); assert.equal((await r.json()).etapa, 'segredos');

    const { numeroParaEnvio } = require('./server');
    assert.equal(numeroParaEnvio('+556798070981'), '5567998070981');
    assert.equal(numeroParaEnvio('5567998070981'), '5567998070981');
    assert.equal(numeroParaEnvio('556733334444'), '556733334444'); // fixo não ganha 9
    assert.equal(numeroParaEnvio('595981299369'), '595981299369'); // Paraguai fica igual

    // Sugestão do Gilberto
    r = await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-equipe' }, body: JSON.stringify({ conversa_id: conv }) });
    const sug = await r.json();
    assert.equal(r.status, 200, JSON.stringify(sug));
    assert.ok(sug.mensagem.includes('[[valor do Silbeck]]'));
    const pi = ultimoPedidoIA.corpo;
    assert.equal(pi.model, 'claude-sonnet-5-5');
    assert.deepEqual(pi.system[0].cache_control, { type: 'ephemeral' });
    assert.ok(pi.system[0].text.includes('<base_conhecimento>') && !pi.system[0].text.includes('{{base_conhecimento}}'));
    assert.deepEqual(pi.messages.map(m => m.role), ['user', 'assistant', 'user', 'system']);
    assert.ok(pi.messages[3].content.includes('Modo: sugestao'));
    assert.equal(pi.output_config.format.type, 'json_schema');
    assert.equal(pi.fallbacks, 'default'); assert.ok(ultimoPedidoIA.beta.includes('server-side-fallback-2026-07-01'));
    assert.equal((await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-estranho' }, body: JSON.stringify({ conversa_id: conv }) })).status, 403);
    const { montarMensagens } = require('./gilberto');
    assert.deepEqual(montarMensagens([{ direcao: 'saida', tipo: 'text', corpo: 'oi' }, { direcao: 'entrada', tipo: 'image', corpo: 'essa?' }, { direcao: 'entrada', tipo: 'text', corpo: 'tem vaga?' }]),
      [{ role: 'user', content: '[enviou uma foto: essa?]\ntem vaga?' }]);

    console.log('TODOS OS TESTES PASSARAM');
    servidor.close(); falso.close();
  });
});
