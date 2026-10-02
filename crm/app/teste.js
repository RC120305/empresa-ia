// Teste local do webhook: node teste.js
// Um "Supabase falso" local registra as chamadas, para testar a gravação sem tocar no banco real.
const http = require('http');
const crypto = require('crypto');
const assert = require('assert');

const chamadas = [];
let bancoQuebrado = false;
let janelaAberta = true;
let ultimoPedidoIA = null;
const pedidosIA = [];
const emDias = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
let iaCota = false, iaOrcamento = false;
const orcs = [];
const FAKE = {
  '/auth/v1/user': req => req.headers.authorization === 'Bearer token-equipe' ? { email: 'equipe@teste.com' }
    : req.headers.authorization === 'Bearer token-estranho' ? { email: 'estranho@teste.com' } : null,
};
const guardados = new Map(); // "Storage" falso: caminho -> {dados, mime}
const MSG_MIDIA = '33333333-3333-3333-3333-333333333333';
const MSG_AUDIO = '66666666-6666-6666-6666-666666666666';
const MSG_BIB = '88888888-8888-8888-8888-888888888888';
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
    if (req.url.startsWith('/v2/projects/cabanas-crm/locations/global/recognizers/_:recognize')) {
      if (req.headers.authorization !== 'Bearer tok-google') return responder(401, { error: { message: 'sem token' } });
      const audio = Buffer.from(json.content, 'base64').toString();
      if (audio === 'AUDIO-LONGO' || json.content.length > 1500000) return responder(400, { error: { message: 'Audio can be of a maximum of 60 seconds duration.' } });
      if (audio.startsWith('OggS')) return responder(200, { results: [{ alternatives: [{ transcript: 'pedaço' }] }] }); // pedaço cortado pelo ffmpeg
      return responder(200, { results: [{ alternatives: [{ transcript: 'oi tudo bem' }] }, { alternatives: [{ transcript: 'tem vaga pro feriado?' }] }] });
    }
    if (req.url.startsWith('/rest/v1/mensagens?id=eq.' + MSG_BIB)) return responder(200, [{ id: MSG_BIB, conversa_id: 'c', tipo: 'image', midia_id: null, midia_caminho: 'biblioteca/BGE-1.jpg', midia_mime: 'image/jpeg', midia_nome: null }]);
    if (req.url.startsWith('/rest/v1/mensagens?id=eq.' + MSG_AUDIO)) {
      if (req.method === 'PATCH') { res.writeHead(204); return res.end(); }
      return responder(200, [{ id: MSG_AUDIO, tipo: 'audio', midia_id: null, midia_caminho: 'conv/audio.ogg', transcricao: null, transcricao_status: null }]);
    }
    if (req.url.startsWith('/rest/v1/mensagens?id=eq.')) {
      if (req.method === 'PATCH') { res.writeHead(204); return res.end(); }
      const patch = chamadas.findLast(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/mensagens?id=eq.' + MSG_MIDIA));
      return responder(200, req.url.includes(MSG_MIDIA) ? [{ id: MSG_MIDIA, conversa_id: '11111111-1111-1111-1111-111111111111', tipo: 'image', midia_id: 'midia9',
        midia_caminho: patch ? patch.corpo.midia_caminho : null, midia_mime: patch ? patch.corpo.midia_mime : null, midia_nome: null }] : []);
    }
    if (req.url === '/rest/v1/rpc/registrar_entrada_whatsapp') return responder(200, { nova: true, mensagem_id: MSG_MIDIA, conversa_id: '11111111-1111-1111-1111-111111111111' });
    if (req.url === '/graph/111?fields=display_phone_number') return responder(200, { display_phone_number: '+1 555-182-9766', id: '111' });
    if (req.url === '/rest/v1/orcamentos' && req.method === 'POST') { const o = { id: '77777777-7777-7777-7777-777777777777', aberturas: 0, ...json }; orcs.push(o); return responder(201, [o]); }
    if (req.url.startsWith('/rest/v1/orcamentos?token=eq.')) return responder(200, orcs.filter(o => o.token === req.url.split('token=eq.')[1].split('&')[0]));
    if (req.url.startsWith('/rest/v1/orcamentos?id=eq.') || req.url === '/rest/v1/orcamento_eventos') { res.writeHead(204); return res.end(); }
    if (req.url === '/graph/111/media') return responder(200, { id: 'midia-subida' });
    if (req.url === '/rest/v1/rpc/registrar_saida_midia') return responder(200, '44444444-4444-4444-4444-444444444444');
    if (req.url.startsWith('/silbeck/v1/Liberar?')) return req.url.includes('client_secret=sec-ok') ? responder(200, { access_token: 'tok-silbeck', token_type: 'Bearer', expires_in: 30 }) : responder(400, { erro: 'invalido' });
    if (req.url === '/silbeck/v1/TipoApartamento') return req.headers.authorization === 'Bearer tok-silbeck' ? responder(200, { listaTipoApartamento: [{ id: 1 }, { id: 2 }, { id: 3 }] }) : responder(401, {});
    if (req.url === '/auth/v1/user') { const u = FAKE['/auth/v1/user'](req); return u ? responder(200, u) : responder(401, { msg: 'invalid' }); }
    if (req.url === '/rest/v1/rpc/equipe_por_email') { const b = JSON.parse(corpo); return responder(200, b.p_email === 'equipe@teste.com' ? [{ id: 'u-1', nome: 'Equipe', papel: 'atendente' }] : []); }
    if (req.method === 'PATCH' && (req.url.startsWith('/rest/v1/conversas?') || req.url.startsWith('/rest/v1/contatos?'))) { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/negocios?id=eq.') && req.method === 'GET') return responder(200, req.url.includes('NEG-NAO') ? [] : [{ id: req.url.split('id=eq.')[1].split('&')[0], etapa: 'novo', responsavel_id: null }]);
    if (req.url.startsWith('/rest/v1/negocios?id=eq.') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url === '/rest/v1/negocios' && req.method === 'POST') return responder(201, [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ...json }]);
    if (req.url === '/rest/v1/contatos' && req.method === 'POST') return responder(201, [{ id: 'k-novo', ...json }]);
    if (req.url === '/rest/v1/contato_identificadores' || req.url === '/rest/v1/negocio_eventos' || (req.url === '/rest/v1/tarefas' && req.method === 'POST')) { res.writeHead(201); return res.end(); }
    if (req.url.startsWith('/rest/v1/tarefas?id=eq.') && req.method === 'GET') return responder(200, [{ negocio_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', tipo: 'Ligar' }]);
    if (req.url.startsWith('/rest/v1/tarefas?id=eq.') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/produtos?ativo=eq.true')) return responder(200, [{ codigo: 'COMBO', nome: 'Combo boia cross + arvorismo', descricao: 'Duas aventuras', preco: 'R$ 170 por pessoa', regras: '5 anos ou mais', quando_oferecer: 'Na cotação', antecedencia_dias: 0, prioridade: 1 }, { codigo: 'PIQ', nome: 'Piquenique no rio', descricao: null, preco: 'R$ 90 por pessoa', regras: null, quando_oferecer: null, antecedencia_dias: 1, prioridade: 6 }]);
    if (req.url.startsWith('/rest/v1/respostas?ativo=eq.true')) return responder(200, [{ id: 'r-1', pergunta: 'Aceita pet?', resposta: 'Não aceitamos pets, {nome}.', fixa: true }, { id: 'r-2', pergunta: 'Fica longe do centro?', resposta: 'São 6 km de asfalto.', fixa: false }]);
    if ((req.url === '/rest/v1/produtos' || req.url === '/rest/v1/agencias' || req.url === '/rest/v1/respostas') && req.method === 'POST') { if (json && json.codigo === 'DUP') return responder(409, {}); res.writeHead(201); return res.end(); }
    if (/^\/rest\/v1\/(produtos|agencias|respostas|sugestoes)\?id=eq\./.test(req.url) && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/respostas?id=eq.') && req.method === 'GET') return responder(200, [{ usos: 4 }]);
    if (req.url === '/rest/v1/sugestoes' && req.method === 'POST') return responder(201, [{ id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' }]);
    if (req.url.startsWith('/rest/v1/usuarios?')) return responder(200, [{ id: 'u-1', nome: 'Equipe', papel: 'atendente' }]);
    if (req.url.startsWith('/rest/v1/conversas?') && req.url.includes('select=contato_id')) return responder(200, [{ contato_id: 'k-1' }]);
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
      pedidosIA.push(b);
      const jaConsultou = b.messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'tool_result'));
      if (iaOrcamento && !jaConsultou) return responder(200, { id: 'msg_o', type: 'message', role: 'assistant', model: b.model, stop_reason: 'tool_use', stop_sequence: null,
        content: [{ type: 'tool_use', id: 'toolu_o', name: 'gerar_orcamento', input: { data_entrada: emDias(40), data_saida: emDias(42), adultos: 2, idades_criancas: [3], opcoes: [{ acomodacoes: ['BGE'] }, { acomodacoes: ['STD'] }], persona: 'familia', pessoas_aptas_combo: 2, frase_de_abertura: 'Ana, separei as opções para a família curtir os rios' } }],
        usage: { input_tokens: 10, output_tokens: 20 } });
      if (iaCota && !jaConsultou) return responder(200, { id: 'msg_0', type: 'message', role: 'assistant', model: b.model, stop_reason: 'tool_use', stop_sequence: null,
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'consultar_disponibilidade', input: { data_entrada: emDias(40), data_saida: emDias(42), adultos: 2, idades_criancas: [3], finalidade: 'cotacao' } }],
        usage: { input_tokens: 10, output_tokens: 20 } });
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
  process.env.SILBECK_MODO = 'simulador';
  // Biblioteca de fotos de teste (a real fica em public/fotos)
  const os = require('os'), fsT = require('fs'), pathT = require('path');
  const dirFotos = fsT.mkdtempSync(pathT.join(os.tmpdir(), 'fotos-'));
  fsT.writeFileSync(pathT.join(dirFotos, 'BGE-1.jpg'), 'JPG-BGE-1'); fsT.writeFileSync(pathT.join(dirFotos, 'BGE-2.jpg'), 'JPG-BGE-2'); fsT.writeFileSync(pathT.join(dirFotos, 'BOIA-1.jpg'), 'JPG-BOIA-1');
  fsT.writeFileSync(pathT.join(dirFotos, 'fotos.json'), JSON.stringify({ BGE: ['BGE-1.jpg', 'BGE-2.jpg'], BOIA: ['BOIA-1.jpg'] }));
  fsT.writeFileSync(pathT.join(dirFotos, 'descricoes.json'), JSON.stringify({ 'BGE-1.jpg': { descricao: 'Quarto com duas camas king', etiquetas: ['quarto', 'cama'] }, 'BOIA-1.jpg': { descricao: 'Boia cross no Rio Formoso', etiquetas: ['boia cross', 'rio formoso'] } }));
  process.env.FOTOS_DIR = dirFotos;
  process.env.GOOGLE_TOKEN = 'tok-google';
  process.env.TRANSCRICAO_URL = 'http://127.0.0.1:' + falso.address().port;
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
    assert.ok((await r.text()).includes('CRM Cabanas'));
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

    // Transcrição de áudio: lê do Storage, manda ao Speech-to-Text e grava o texto na mensagem
    guardados.set('conv/audio.ogg', { dados: Buffer.from('AUDIO-CURTO'), mime: 'audio/ogg' });
    const transcrever = (tok, id) => fetch(base + '/api/transcrever', { method: 'POST', headers: tok ? { Authorization: 'Bearer ' + tok } : {}, body: JSON.stringify({ mensagem_id: id }) });
    r = await transcrever('token-equipe', MSG_AUDIO);
    let tj = await r.json();
    assert.equal(r.status, 200, JSON.stringify(tj));
    assert.deepEqual([tj.status, tj.texto], ['ok', 'oi tudo bem tem vaga pro feriado?']);
    const patchT = chamadas.findLast(c => c.metodo === 'PATCH' && c.url === '/rest/v1/mensagens?id=eq.' + MSG_AUDIO);
    assert.deepEqual(patchT.corpo, { transcricao: 'oi tudo bem tem vaga pro feriado?', transcricao_status: 'ok' });
    guardados.set('conv/audio.ogg', { dados: Buffer.from('AUDIO-LONGO'), mime: 'audio/ogg' });
    tj = await (await transcrever('token-equipe', MSG_AUDIO)).json();
    assert.equal(tj.status, 'longo');
    if (require('child_process').spawnSync('ffmpeg', ['-version']).status === 0) { // áudio de 2 min: cortado em 3 pedaços de 50 s
      const wav = require('path').join(require('os').tmpdir(), 'longo.wav');
      require('child_process').spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=120', '-ac', '1', '-ar', '16000', wav]);
      guardados.set('conv/audio.ogg', { dados: require('fs').readFileSync(wav), mime: 'audio/wav' });
      tj = await (await transcrever('token-equipe', MSG_AUDIO)).json();
      assert.deepEqual([tj.status, tj.texto], ['ok', 'pedaço pedaço pedaço']);
    } else console.log('(ffmpeg ausente: teste do áudio longo pulado)');
    assert.equal((await transcrever(null, MSG_AUDIO)).status, 401);
    assert.equal((await transcrever('token-estranho', MSG_AUDIO)).status, 403);
    assert.equal((await transcrever('token-equipe', MSG_MIDIA)).status, 404); // é foto, não áudio
    assert.equal((await transcrever('token-equipe', 'x')).status, 400);

    // APIs da equipe: lista da equipe, ficha/status/responsável, cotação, orçamento pela equipe e vagas
    const api = (rota, corpo, tok = 'token-equipe', metodo = 'POST') => fetch(base + rota, { method: metodo, headers: { Authorization: 'Bearer ' + tok }, body: metodo === 'GET' ? undefined : JSON.stringify(corpo || {}) });
    r = await api('/api/equipe', null, 'token-equipe', 'GET');
    assert.equal(r.status, 200); assert.ok(Array.isArray((await r.json()).equipe));
    assert.equal((await api('/api/equipe', null, 'token-estranho', 'GET')).status, 403);
    r = await api('/api/conversa', { conversa_id: conv, status: 'resolvida', atribuida_a: '99999999-9999-9999-9999-999999999999' });
    assert.equal(r.status, 200, await r.clone().text());
    const pc = chamadas.findLast(c => c.metodo === 'PATCH' && c.url === '/rest/v1/conversas?id=eq.' + conv);
    assert.equal(pc.corpo.status, 'resolvida'); assert.equal(pc.corpo.atribuida_a, '99999999-9999-9999-9999-999999999999');
    assert.equal((await api('/api/conversa', { conversa_id: conv, status: 'apagada' })).status, 400);
    assert.equal((await api('/api/conversa', { conversa_id: conv, email: 'sem-arroba' })).status, 400);
    r = await api('/api/conversa', { conversa_id: conv, nome: ' Ana Souza ', email: 'ana@exemplo.com', observacoes: 'Lua de mel' });
    assert.equal(r.status, 200, await r.clone().text());
    const pf = chamadas.findLast(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/contatos?id=eq.'));
    assert.deepEqual([pf.corpo.nome, pf.corpo.email, pf.corpo.observacoes], ['Ana Souza', 'ana@exemplo.com', 'Lua de mel']);
    r = await api('/api/cotar', { data_entrada: emDias(30), data_saida: emDias(32), adultos: 2, idades_criancas: [] });
    const cj = await r.json();
    assert.equal(r.status, 200); assert.ok(cj.opcoes.length > 0);
    assert.equal((await api('/api/cotar', { data_entrada: '2020-01-01', data_saida: '2020-01-02', adultos: 2, idades_criancas: [] })).status, 400);
    r = await api('/api/orcamento', { conversa_id: conv, data_entrada: emDias(30), data_saida: emDias(32), adultos: 2, idades_criancas: [], opcoes: [{ acomodacoes: [cj.opcoes[0].codigo] }] });
    const oj = await r.json();
    assert.equal(r.status, 200, JSON.stringify(oj)); assert.ok(oj.link.includes('/o/'));
    assert.equal(orcs.at(-1).criado_por, 'u-1');
    r = await api('/api/vagas?inicio=' + emDias(10) + '&dias=14', null, 'token-equipe', 'GET');
    const vj = await r.json();
    assert.equal(r.status, 200); assert.equal(vj.dias.length, 14); assert.ok(vj.tipos.some(t => t.codigo === 'CBM' && t.vagas.every(v => Number.isInteger(v))));
    assert.equal((await api('/api/vagas?inicio=ontem', null, 'token-equipe', 'GET')).status, 400);

    // Funil: mover de etapa, perdido exige motivo, novo lead; tarefas: criar e concluir (com histórico)
    const NEG = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    r = await api('/api/negocio', { id: NEG, etapa: 'orc', valor_previsto: '1500.50', perfil: 'Casal', data_entrada: '2026-11-20' });
    assert.equal(r.status, 200, await r.clone().text());
    const pn = chamadas.findLast(c => c.metodo === 'PATCH' && c.url === '/rest/v1/negocios?id=eq.' + NEG);
    assert.equal(pn.corpo.etapa, 'orc'); assert.equal(pn.corpo.valor_previsto, 1500.5); assert.equal(pn.corpo.fechado_em, null);
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/negocio_eventos').corpo[0].texto, 'Movido para Orçamento enviado');
    assert.equal((await api('/api/negocio', { id: NEG, etapa: 'perd' })).status, 400, 'perdido sem motivo');
    r = await api('/api/negocio', { id: NEG, etapa: 'perd', motivo_perda: 'Preço' });
    assert.equal(r.status, 200);
    assert.ok(chamadas.findLast(c => c.metodo === 'PATCH' && c.url === '/rest/v1/negocios?id=eq.' + NEG).corpo.fechado_em);
    assert.equal((await api('/api/negocio', { id: NEG, etapa: 'voando' })).status, 400);
    assert.equal((await api('/api/negocio', { id: NEG, data_entrada: '20/11' })).status, 400);
    r = await api('/api/negocio', { nome: 'Lead do balcão', telefone: '(67) 99999-1111', etapa: 'novo' });
    const nl = await r.json();
    assert.equal(r.status, 200, JSON.stringify(nl));
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/contato_identificadores').corpo.valor, '67999991111');
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/negocios' && c.metodo === 'POST').corpo.origem, 'ativo');
    assert.equal((await api('/api/negocio', { nome: '' })).status, 400);
    assert.equal((await api('/api/negocio', { id: NEG, etapa: 'res' }, 'token-estranho')).status, 403);
    r = await api('/api/tarefa', { negocio_id: NEG, tipo: 'Ligar', descricao: 'confirmar datas', quando: '2026-11-01T13:00:00Z' });
    assert.equal(r.status, 200, await r.clone().text());
    const tt = chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo;
    assert.deepEqual([tt.tipo, tt.responsavel_id, tt.quando], ['Ligar', 'u-1', '2026-11-01T13:00:00.000Z']);
    assert.equal((await api('/api/tarefa', { negocio_id: NEG, tipo: 'Ligar', quando: 'amanhã' })).status, 400);
    r = await api('/api/tarefa', { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', feita: true });
    assert.equal(r.status, 200);
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/negocio_eventos').corpo.texto, 'Concluída: Ligar');

    // Etapa C: produtos, agências, biblioteca, revisão e teste do agente
    r = await api('/api/produto', { codigo: 'piq-1', nome: 'Piquenique', preco: 'R$ 90 por pessoa', tipo_reserva: 'simples', prioridade: '6' });
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/produtos' && c.metodo === 'POST').corpo.codigo, 'PIQ1');
    assert.equal((await api('/api/produto', { codigo: 'DUP', nome: 'x', preco: 'R$ 1' })).status, 409);
    assert.equal((await api('/api/produto', { nome: 'Sem preço', codigo: 'X' })).status, 400);
    assert.equal((await api('/api/produto', { codigo: 'X', nome: 'x', preco: 'y', tipo_reserva: 'voo' })).status, 400);
    r = await api('/api/produto', { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', ativo: false });
    assert.equal(r.status, 200);
    r = await api('/api/agencia', { nome: 'Bonito Trips', cnpj: '00.000.000/0001-00', comissao: '12.5', email: 'reservas@bonitotrips.com' });
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/agencias').corpo.comissao, 12.5);
    assert.equal((await api('/api/agencia', { nome: 'X', comissao: 150 })).status, 400);
    assert.equal((await api('/api/agencia', { nome: '' })).status, 400);
    r = await api('/api/resposta', { pergunta: 'Aceita pet?', resposta: 'Não aceitamos pets.', atalho: '/Pet!', fixa: true });
    assert.equal(r.status, 200, await r.clone().text());
    const rr = chamadas.findLast(c => c.url === '/rest/v1/respostas' && c.metodo === 'POST').corpo;
    assert.deepEqual([rr.atalho, rr.fixa, rr.criado_por], ['pet', true, 'u-1']);
    assert.equal((await api('/api/resposta', { pergunta: '', resposta: 'x' })).status, 400);
    r = await api('/api/resposta-uso', { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' });
    assert.equal(r.status, 200);
    assert.equal(chamadas.findLast(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/respostas?id=eq.')).corpo.usos, 5);
    r = await api('/api/sugestao', { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', situacao: 'descartada', motivo: 'Tom' });
    assert.equal(r.status, 200);
    assert.equal((await api('/api/sugestao', { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', situacao: 'sumiu' })).status, 400);
    // A sugestão fica registrada e o Gilberto recebe os produtos e as respostas do banco
    pedidosIA.length = 0;
    r = await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-equipe' }, body: JSON.stringify({ conversa_id: conv }) });
    const sug4 = await r.json();
    assert.equal(r.status, 200, JSON.stringify(sug4));
    assert.equal(sug4.sugestao_id, 'dddddddd-dddd-dddd-dddd-dddddddddddd');
    const regS = chamadas.findLast(c => c.url === '/rest/v1/sugestoes' && c.metodo === 'POST').corpo;
    assert.equal(regS.pergunta, 'Tem vaga de 14 a 16/11 para 2 adultos?'); assert.equal(regS.pedida_por, 'u-1');
    const sis = pedidosIA[0].system[0].text;
    assert.ok(sis.includes('Piquenique no rio') && sis.includes('R$ 90 por pessoa') && !sis.includes('{{produtos_ativos}}'), 'produtos do banco no Gilberto');
    assert.ok(sis.includes('texto exato: Não aceitamos pets, {nome}.') && sis.includes('São 6 km de asfalto.'), 'respostas fixas e de referência');
    // Questionário: o que o Gilberto sabe, e a importação para a biblioteca (sem repetir o que já existe)
    r = await api('/api/conhecimento', null, 'token-equipe', 'GET');
    const qj = await r.json();
    assert.equal(r.status, 200); assert.ok(qj.secoes.length >= 10 && qj.secoes.some(x => x.itens.some(i => /check-in/i.test(i.p))));
    assert.ok(!JSON.stringify(qj).includes('**') && !/\(P6\d/.test(JSON.stringify(qj)), 'sem marcação nem notas internas');
    r = await api('/api/importar-questionario', {});
    const ij = await r.json();
    assert.equal(r.status, 200, JSON.stringify(ij)); assert.ok(ij.importadas > 40);
    const imp = chamadas.findLast(c => c.url === '/rest/v1/respostas' && c.metodo === 'POST').corpo;
    assert.ok(Array.isArray(imp) && imp.every(x => x.origem === 'questionario') && !imp.some(x => x.pergunta === 'Aceita pet?'));
    // Testar o agente: sem conversa nem gravação
    r = await api('/api/testar', { mensagens: [{ de: 'cliente', texto: 'Oi, tem vaga?' }] });
    const tj2 = await r.json();
    assert.equal(r.status, 200, JSON.stringify(tj2)); assert.ok(tj2.mensagem);
    assert.equal(pedidosIA.at(-1).messages[0].content, 'Oi, tem vaga?');
    assert.equal((await api('/api/testar', { mensagens: [] })).status, 400);

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
    assert.deepEqual(pi.tools.map(t => t.name), ['consultar_disponibilidade', 'gerar_orcamento', 'enviar_fotos']);
    assert.ok(pi.messages[3].content.includes('SIMULADOR'));
    // Cotação: o Gilberto pede, o CRM consulta o simulador do Silbeck e devolve o resultado na 2ª rodada
    iaCota = true; pedidosIA.length = 0;
    r = await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-equipe' }, body: JSON.stringify({ conversa_id: conv }) });
    const sug2 = await r.json();
    assert.equal(r.status, 200, JSON.stringify(sug2));
    assert.equal(pedidosIA.length, 2);
    const ultimo = pedidosIA[1].messages;
    assert.equal(ultimo.at(-2).role, 'assistant'); assert.equal(ultimo.at(-2).content[0].type, 'tool_use');
    const resCot = JSON.parse(ultimo.at(-1).content[0].content);
    assert.equal(resCot.ok, true, JSON.stringify(resCot)); assert.equal(resCot.fonte, 'simulador');
    assert.ok(resCot.opcoes.length > 0 && resCot.opcoes.every(o => o.valor_total > 0));
    assert.ok(resCot.nao_comportam_o_grupo.includes('Cabana Casal'), 'criança de 3 anos não vai para a Cabana Casal');
    assert.equal(sug2.simulador, true); assert.equal(sug2.cotacoes.length, 1);
    iaCota = false;
    // Orçamento: o Gilberto cria a página; o link é público, a página abre e o "Quero reservar" leva ao WhatsApp
    iaOrcamento = true; pedidosIA.length = 0;
    r = await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-equipe' }, body: JSON.stringify({ conversa_id: conv }) });
    const sug3 = await r.json();
    iaOrcamento = false;
    assert.equal(r.status, 200, JSON.stringify(sug3));
    const resOrc = JSON.parse(pedidosIA[1].messages.at(-1).content[0].content);
    assert.equal(resOrc.ok, true, JSON.stringify(resOrc));
    assert.deepEqual(resOrc.opcoes.map(o => o.codigo), ['BGE', 'STD']);
    assert.ok(/\/o\/[A-Za-z0-9_-]{22}$/.test(resOrc.link));
    assert.equal(sug3.orcamentos.length, 1); assert.equal(sug3.simulador, true);
    const salvo = orcs.at(-1);
    assert.equal(salvo.primeiro_nome, null); assert.equal(salvo.numero_whatsapp, '15551829766'); assert.equal(salvo.fonte, 'simulador');
    const tok = resOrc.link.split('/o/')[1];
    r = await fetch(base + '/o/' + tok);
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.ok(html.includes('Bangalô Especial') && html.includes('Apartamento Standard') && html.includes('valores fictícios'));
    assert.ok(html.includes('Ana, separei as opções para a família curtir os rios.') && html.includes('noindex'));
    assert.ok(chamadas.some(c => c.url === '/rest/v1/rpc/registrar_abertura_orcamento' && c.corpo.p_token === tok));
    const antesPrevia = chamadas.filter(c => c.url === '/rest/v1/rpc/registrar_abertura_orcamento').length;
    await (await fetch(base + '/o/' + tok + '?previa=1')).text();
    assert.equal(chamadas.filter(c => c.url === '/rest/v1/rpc/registrar_abertura_orcamento').length, antesPrevia, 'prévia da equipe não conta');
    r = await fetch(base + '/o/' + tok + '/quero', { method: 'POST', body: JSON.stringify({ codigo: 'BGE' }) });
    const q = await r.json();
    assert.ok(q.whatsapp.startsWith('https://wa.me/15551829766?text=') && decodeURIComponent(q.whatsapp).includes('o Bangalô Especial'));
    assert.equal((await fetch(base + '/o/' + tok + '/quero', { method: 'POST', body: JSON.stringify({ codigo: 'CBM' }) })).status, 404);
    assert.equal((await fetch(base + '/o/' + 'x'.repeat(22))).status, 404);
    assert.equal((await fetch(base + '/o/curto')).status, 404);
    for (const f of ['/o/orcamento.css', '/o/orcamento.js', '/o/logo-branco.png']) assert.equal((await fetch(base + f)).status, 200, f);
    assert.ok(html.includes('src="/fotos/BGE-1.jpg"') && html.includes('src="/fotos/BGE-2.jpg"'), 'fotos reais na página');
    // Biblioteca de fotos: lista para a equipe, envio pela Meta por link público, e a foto aparece na caixa
    r = await fetch(base + '/api/fotos', { headers: { Authorization: 'Bearer token-equipe' } });
    const bib = await r.json();
    assert.deepEqual(bib.grupos.map(g => [g.grupo, g.nome, g.fotos.length]), [['BGE', 'Bangalô Especial', 2], ['BOIA', 'Boia cross', 1]]);
    assert.equal((await fetch(base + '/api/fotos', { headers: { Authorization: 'Bearer token-estranho' } })).status, 403);
    assert.equal((await fetch(base + '/fotos/BGE-1.jpg')).status, 200);
    assert.equal((await fetch(base + '/fotos/fotos.json')).status, 404);
    const envF = (corpo, tok = 'token-equipe') => fetch(base + '/api/enviar-fotos', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: JSON.stringify(corpo) });
    r = await envF({ conversa_id: conv, fotos: ['BGE-1.jpg', 'BOIA-1.jpg'], legenda: 'Olha o Bangalô Especial 🌿' });
    const ef = await r.json();
    assert.equal(r.status, 200, JSON.stringify(ef)); assert.equal(ef.enviadas.length, 2);
    const imgs = chamadas.filter(c => c.url === '/graph/111/messages' && c.corpo.type === 'image' && c.corpo.image.link).slice(-2);
    assert.ok(imgs[0].corpo.image.link.endsWith('/fotos/BGE-1.jpg') && imgs[0].corpo.image.caption === 'Olha o Bangalô Especial 🌿' && !imgs[1].corpo.image.caption);
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/rpc/registrar_saida_midia').corpo.p_caminho, 'biblioteca/BOIA-1.jpg');
    assert.equal((await envF({ conversa_id: conv, fotos: ['../server.js'] })).status, 400);
    assert.equal((await envF({ conversa_id: conv, fotos: ['naoexiste.jpg'] })).status, 400);
    assert.equal((await envF({ conversa_id: conv, fotos: Array(6).fill('BGE-1.jpg').map((f, i) => i + f) })).status, 400);
    assert.equal((await envF({ conversa_id: conv, fotos: ['BGE-1.jpg'] }, 'token-estranho')).status, 403);
    r = await fetch(base + '/api/midia/' + MSG_BIB, { headers: { Authorization: 'Bearer token-equipe' } });
    assert.equal(r.status, 200); assert.equal(await r.text(), 'JPG-BGE-1');
    const { escolherFotos } = require('./orcamento');
    assert.deepEqual(escolherFotos({ codigo_acomodacao: 'BGE', etiquetas: [], quantidade: 5 }).map(f => f.arquivo), ['BGE-1.jpg', 'BGE-2.jpg']);
    assert.deepEqual(escolherFotos({ codigo_acomodacao: '', etiquetas: ['boia cross'], quantidade: 2 }).map(f => f.arquivo), ['BOIA-1.jpg']);
    assert.deepEqual(escolherFotos({ codigo_acomodacao: 'CBM', etiquetas: [], quantidade: 2 }), []);
    const { pagina } = require('./orcamento');
    assert.ok(!pagina({ ...salvo, primeiro_nome: '<script>' }).includes('<script>alert') && pagina({ ...salvo, frase_de_abertura: '<b>x</b>' }).includes('&lt;b&gt;'));
    const { cotar } = require('./silbeck');
    assert.equal((await cotar({ data_entrada: '2020-01-01', data_saida: '2020-01-03', adultos: 2, idades_criancas: [] })).ok, false);
    assert.equal((await cotar({ data_entrada: '2026-12-10', data_saida: '2026-12-09', adultos: 2, idades_criancas: [] })).ok, false);
    if (emDias(0) < '2026-12-29') { // o simulador traz o Réveillon 2026 com as Cabanas Casal esgotadas
      const reveillon = await cotar({ data_entrada: '2026-12-29', data_saida: '2027-01-02', adultos: 2, idades_criancas: [] });
      assert.ok(reveillon.esgotados_no_periodo.includes('Cabana Casal') && !reveillon.opcoes.some(o => o.codigo === 'CBD'));
    }
    assert.equal((await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-estranho' }, body: JSON.stringify({ conversa_id: conv }) })).status, 403);
    const { montarMensagens } = require('./gilberto');
    assert.deepEqual(montarMensagens([{ direcao: 'entrada', tipo: 'audio', transcricao: 'quero 2 noites', transcricao_status: 'ok' }]),
      [{ role: 'user', content: '[áudio do cliente, transcrição automática: "quero 2 noites"]' }]);
    assert.deepEqual(montarMensagens([{ direcao: 'saida', tipo: 'text', corpo: 'oi' }, { direcao: 'entrada', tipo: 'image', corpo: 'essa?' }, { direcao: 'entrada', tipo: 'text', corpo: 'tem vaga?' }]),
      [{ role: 'user', content: '[enviou uma foto: essa?]\ntem vaga?' }]);

    console.log('TODOS OS TESTES PASSARAM');
    servidor.close(); falso.close();
  });
});
