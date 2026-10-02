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
// "Drive" falso (banco de imagens) e a tabela fotos_biblioteca falsa
const fotosBib = [];
// Produtos, ofertas e vendas falsos (Etapa C2)
const PRODS = [
  { codigo: 'COMBO', nome: 'Combo boia cross + arvorismo', descricao: 'Duas aventuras', preco: 'R$ 170 por pessoa', preco_valor: 170, unidade: 'pessoa', perfis: ['Casal', 'Família com filhos'], idade_minima: 5, altura_minima_cm: 115, variacoes: [], adicionais: [], grupo_fotos: 'BOIA', vitrine: 'aventuras', tipo_reserva: 'ativ', regras: '5 anos ou mais', quando_oferecer: 'Na cotação', antecedencia_dias: 0, prioridade: 1, ativo: true },
  { codigo: 'PIQ', nome: 'Piquenique no rio', descricao: null, preco: 'R$ 90 por pessoa', regras: null, quando_oferecer: null, antecedencia_dias: 1, prioridade: 6, ativo: true },
  { codigo: 'DECO', nome: 'Decoração especial', descricao: 'Preparada no quarto', preco: 'Simples R$ 350 ou Completa R$ 600', preco_valor: null, unidade: 'unidade', perfis: ['Casal'], variacoes: [{ nome: 'Simples', preco: 350 }, { nome: 'Completa', preco: 600, descricao: 'Com pétalas e espumante' }], adicionais: [], vitrine: 'momentos', tipo_reserva: 'simples', antecedencia_dias: 3, prioridade: 4, ativo: true },
  { codigo: 'MASS', nome: 'Massagem', preco: 'R$ 220 por pessoa', unidade: 'pessoa', variacoes: [{ nome: 'Massagem360', preco: 220 }], adicionais: [{ nome: 'Pedras quentes', preco: 50 }, { nome: 'Cone hindu', preco: 80 }], vitrine: 'momentos', grupo_fotos: 'BGE,BOIA', tipo_reserva: 'terc', antecedencia_dias: 0, prioridade: 5, ativo: true },
];
const ofertasF = [], vendasF = [], alertasF = [], vitrinesF = [];
let iaVitrines = null;
let iaOferta = '';
const RAIZ_DRIVE = '1j2JGPBtyArVGkrOpj-ZdwmJ5w0qHlsO5';
const JPG_DRIVE = require('child_process').execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=1600x900', '-frames:v', '1', '-f', 'mjpeg', '-']);
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
    if (req.url.startsWith('/drive/') || req.url.startsWith('/thumb/')) {
      if (req.headers.authorization !== 'Bearer tok-drive') return responder(401, {});
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/drive/v3/files/' + RAIZ_DRIVE) return responder(200, { id: RAIZ_DRIVE, name: 'Imagens do hotel cabanas', mimeType: 'application/vnd.google-apps.folder', parents: ['pai'] });
      if (u.pathname === '/drive/v3/files/PASTA-BANGALO-1') return responder(200, { id: 'PASTA-BANGALO-1', name: 'Bangalô', mimeType: 'application/vnd.google-apps.folder', parents: [RAIZ_DRIVE] });
      if (u.pathname === '/drive/v3/files') return responder(200, u.searchParams.get('q').includes(RAIZ_DRIVE)
        ? { files: [{ id: 'PASTA-BANGALO-1', name: 'Bangalô', mimeType: 'application/vnd.google-apps.folder' }, { id: 'FOTO-DRIVE-01', name: 'IMG_1.jpg', mimeType: 'image/jpeg' }] } : { files: [] });
      if (u.pathname === '/drive/v3/files/FOTO-DRIVE-01') return responder(200, { id: 'FOTO-DRIVE-01', name: 'IMG_1.jpg', mimeType: 'image/jpeg', size: '900000', thumbnailLink: process.env.DRIVE_URL + '/thumb/FOTO-DRIVE-01=s220' });
      if (u.pathname.startsWith('/thumb/FOTO-DRIVE-01=s')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(JPG_DRIVE); }
      return responder(404, { error: { message: 'File not found' } });
    }
    if (req.url.startsWith('/rest/v1/produtos?codigo=eq.')) return responder(200, PRODS.filter(p => p.codigo === req.url.split('codigo=eq.')[1].split('&')[0]));
    if (req.url.startsWith('/rest/v1/negocios?conversa_id=eq.')) return responder(200, [{ id: 'aaaaaaaa-0000-0000-0000-000000000001', data_entrada: '2026-11-20', etapa: 'atend' }]);
    if (req.url.startsWith('/rest/v1/ofertas')) {
      if (req.method === 'POST') { const o = { id: crypto.randomUUID(), situacao: 'oferecido', criado_em: new Date().toISOString(), ...json }; ofertasF.unshift(o); return responder(201, [o]); }
      const id = (req.url.match(/id=eq\.([0-9a-f-]+)/) || [])[1];
      if (req.method === 'PATCH') { Object.assign(ofertasF.find(o => o.id === id), json); res.writeHead(204); return res.end(); }
      if (req.url.includes('conversa_id=eq.')) return responder(200, ofertasF.filter(o => o.conversa_id === req.url.split('conversa_id=eq.')[1].split('&')[0]));
      return responder(200, ofertasF.filter(o => o.id === id));
    }
    if (req.url.startsWith('/rest/v1/vitrines')) {
      if (req.method === 'POST') { const v = { id: crypto.randomUUID(), aberturas: 0, pedido: null, pedido_em: null, criado_em: new Date().toISOString(), ...json }; vitrinesF.unshift(v); return responder(201, [v]); }
      if (req.method === 'PATCH') {
        const ids = req.url.includes('id=in.(') ? req.url.split('id=in.(')[1].split(')')[0].split(',') : [req.url.split('id=eq.')[1]];
        vitrinesF.filter(v => ids.includes(v.id)).forEach(v => Object.assign(v, json)); res.writeHead(204); return res.end();
      }
      if (req.url.includes('token=eq.')) return responder(200, vitrinesF.filter(v => v.token === req.url.split('token=eq.')[1].split('&')[0]));
      return responder(200, vitrinesF.filter(v => v.conversa_id === req.url.split('conversa_id=eq.')[1].split('&')[0] && (!req.url.includes('enviada=eq.true') || v.enviada)));
    }
    if (req.url.startsWith('/rest/v1/alertas')) {
      if (req.method === 'POST') { alertasF.push({ id: crypto.randomUUID(), situacao: 'aberto', ...json }); res.writeHead(201); return res.end(); }
      const id = (req.url.match(/[?&]id=eq\.([0-9a-f-]+)/) || [])[1], venda = (req.url.match(/venda_id=eq\.([0-9a-f-]+)/) || [])[1];
      if (req.method === 'PATCH') { Object.assign(alertasF.find(a => a.id === id), json); res.writeHead(204); return res.end(); }
      return responder(200, alertasF.filter(a => (id && a.id === id) || (venda && a.venda_id === venda && a.situacao === 'aberto')));
    }
    if (req.url.startsWith('/rest/v1/tarefas?id=eq.') && req.method === 'PATCH' && json && json.feita === true && !json.tipo) { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/vendas')) {
      if (req.method === 'POST') { const v = { id: crypto.randomUUID(), situacao: 'vendido', ...json }; vendasF.push(v); return responder(201, [v]); }
      const id = (req.url.match(/id=eq\.([0-9a-f-]+)/) || [])[1];
      if (req.method === 'PATCH') { Object.assign(vendasF.find(v => v.id === id), json); res.writeHead(204); return res.end(); }
      return responder(200, vendasF.filter(v => v.id === id));
    }
    if (req.url.startsWith('/rest/v1/sugestoes?id=eq.') && req.method === 'GET') return responder(200, [{ conversa_id: '11111111-1111-1111-1111-111111111111', ferramentas: { produto_oferecido: iaOferta || null, vitrines: iaVitrines || [] } }]);
    if (req.url.startsWith('/rest/v1/fotos_biblioteca')) {
      if (req.method === 'GET') return responder(200, fotosBib);
      if (req.method === 'POST') { const i = fotosBib.findIndex(f => f.arquivo === json.arquivo); if (i >= 0) Object.assign(fotosBib[i], json); else fotosBib.push({ ordem: 100, criado_em: new Date().toISOString(), ...json }); res.writeHead(201); return res.end(); }
      if (req.method === 'PATCH') { const a = decodeURIComponent(req.url.split('arquivo=eq.')[1]); Object.assign(fotosBib.find(f => f.arquivo === a), json); res.writeHead(204); return res.end(); }
    }
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
    if (req.url.startsWith('/rest/v1/orcamentos?conversa_id=eq.')) return responder(200, orcs.filter(o => o.conversa_id === req.url.split('conversa_id=eq.')[1].split('&')[0]).slice(-1));
    if (req.url.startsWith('/rest/v1/orcamentos?token=eq.')) return responder(200, orcs.filter(o => o.token === req.url.split('token=eq.')[1].split('&')[0]));
    if (req.url.startsWith('/rest/v1/orcamentos?id=eq.') || req.url === '/rest/v1/orcamento_eventos') { res.writeHead(204); return res.end(); }
    if (req.url === '/graph/111/media') return responder(200, { id: 'midia-subida' });
    if (req.url === '/rest/v1/rpc/registrar_saida_midia') return responder(200, '44444444-4444-4444-4444-444444444444');
    if (req.url.startsWith('/silbeck/v1/Liberar?')) return req.url.includes('client_secret=sec-ok') ? responder(200, { access_token: 'tok-silbeck', token_type: 'Bearer', expires_in: 30 }) : responder(400, { erro: 'invalido' });
    if (req.url === '/silbeck/v1/TipoApartamento') return req.headers.authorization === 'Bearer tok-silbeck' ? responder(200, { listaTipoApartamento: [{ id: 1 }, { id: 2 }, { id: 3 }] }) : responder(401, {});
    if (req.url === '/auth/v1/user') { const u = FAKE['/auth/v1/user'](req); return u ? responder(200, u) : responder(401, { msg: 'invalid' }); }
    if (req.url === '/rest/v1/rpc/equipe_por_email') { const b = JSON.parse(corpo); return responder(200, b.p_email === 'equipe@teste.com' ? [{ id: 'u-1', nome: 'Equipe', papel: 'atendente' }] : []); }
    if (req.method === 'PATCH' && (req.url.startsWith('/rest/v1/conversas?') || req.url.startsWith('/rest/v1/contatos?'))) { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/negocios?id=eq.') && req.method === 'GET') return responder(200, req.url.includes('NEG-NAO') ? [] : [{ id: req.url.split('id=eq.')[1].split('&')[0], etapa: 'novo', responsavel_id: null, contato_id: 'k-2' }]);
    if (req.url.startsWith('/rest/v1/negocios?id=eq.') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url === '/rest/v1/negocios' && req.method === 'POST') return responder(201, [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ...json }]);
    if (req.url === '/rest/v1/contatos' && req.method === 'POST') return responder(201, [{ id: 'k-novo', ...json }]);
    if (req.url.startsWith('/rest/v1/contato_identificadores?tipo=eq.whatsapp&valor=in.')) return responder(200, decodeURIComponent(req.url).includes('+5567999990000') ? [{ contato_id: 'k-1', contato: { nome: 'Cliente Teste' } }] : []);
    if (req.url.startsWith('/rest/v1/contato_identificadores?contato_id=eq.')) return responder(200, req.url.includes('k-sem') ? [] : [{ id: 'i-1', valor: '+5567988887777' }]);
    if (req.url.startsWith('/rest/v1/contato_identificadores?id=eq.') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url === '/rest/v1/contato_identificadores' || req.url === '/rest/v1/negocio_eventos' || (req.url === '/rest/v1/tarefas' && req.method === 'POST')) { res.writeHead(201); return res.end(); }
    if (req.url.startsWith('/rest/v1/tarefas?id=eq.') && req.method === 'GET') return responder(200, [{ negocio_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', tipo: 'Ligar' }]);
    if (req.url.startsWith('/rest/v1/tarefas?id=eq.') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/produtos?ativo=eq.true')) return responder(200, PRODS);
    if (req.url.startsWith('/rest/v1/respostas?ativo=eq.true')) return responder(200, [{ id: 'r-1', pergunta: 'Aceita pet?', resposta: 'Não aceitamos pets, {nome}.', fixa: true }, { id: 'r-2', pergunta: 'Fica longe do centro?', resposta: 'São 6 km de asfalto.', fixa: false }, { id: 'r-3', pergunta: 'Qual o horário do café?', resposta: 'O café é das 7h às 10h.', fixa: false, origem: 'correcao' }]);
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
        content: [{ type: 'text', text: JSON.stringify({ mensagem: 'Oi! Tenho sim [[valor do Silbeck]]', notas_internas: 'Consultar Silbeck', precisa_equipe: false, produto_oferecido: iaOferta }) }],
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
  process.env.DRIVE_URL = 'http://127.0.0.1:' + falso.address().port;
  process.env.DRIVE_TOKEN = 'tok-drive';
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
    assert.match(oj.resumo, /^\d+ (de \w+ )?a \d+ de [a-zç]+.* \(2 noites\), 2 adultos$/);
    // Sem limite de 3 opções: todas as que têm vaga entram
    r = await api('/api/cotar', { data_entrada: emDias(30), data_saida: emDias(32), adultos: 1, idades_criancas: [7] });
    const todas = (await r.json()).opcoes.map(o => o.codigo);
    r = await api('/api/orcamento', { conversa_id: conv, data_entrada: emDias(30), data_saida: emDias(32), adultos: 1, idades_criancas: [7], opcoes: todas.map(k => ({ acomodacoes: [k] })) });
    const oj2 = await r.json();
    assert.equal(r.status, 200, JSON.stringify(oj2)); assert.ok(todas.length > 3, 'simulador tem mais de 3 com vaga'); assert.equal(orcs.at(-1).opcoes.length, todas.length);
    assert.ok(oj2.resumo.endsWith('1 adulto e 1 criança (7 anos)'), oj2.resumo);
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
    r = await api('/api/negocio', { nome: 'Lead do balcão', telefone: '(67) 99999-1111', email: 'lead@exemplo.com', etapa: 'novo' });
    const nl = await r.json();
    assert.equal(r.status, 200, JSON.stringify(nl));
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/contato_identificadores').corpo.valor, '+5567999991111', 'WhatsApp no formato do banco');
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/contatos' && c.metodo === 'POST').corpo.email, 'lead@exemplo.com');
    assert.equal((await api('/api/negocio', { nome: 'Repetido', telefone: '67 9999-0000' })).status, 409, 'WhatsApp de outro cliente (sem o 9)');
    assert.equal((await api('/api/negocio', { nome: 'X', telefone: '123' })).status, 400);
    assert.equal((await api('/api/negocio', { nome: 'X', email: 'semarroba' })).status, 400);
    // Completar o contato de um lead que chegou sem WhatsApp/e-mail (Instagram, Facebook, balcão)
    r = await api('/api/contato', { negocio_id: 'eeeeeeee-0000-0000-0000-000000000001', telefone: '+55 (67) 98888-7777', email: 'cli@exemplo.com', nome: 'Ana Souza' });
    assert.equal(r.status, 200, await r.clone().text());
    assert.deepEqual([chamadas.findLast(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/contatos?')).corpo], [{ nome: 'Ana Souza', email: 'cli@exemplo.com' }]);
    assert.ok(!chamadas.slice(-6).some(c => c.url.startsWith('/rest/v1/contato_identificadores?id=eq.')), 'mesmo número: não regrava');
    r = await api('/api/contato', { negocio_id: 'eeeeeeee-0000-0000-0000-000000000002', telefone: '67 98888-0000' });
    assert.equal(r.status, 200); assert.equal(chamadas.findLast(c => c.url.startsWith('/rest/v1/contato_identificadores?id=eq.i-1')).corpo.valor, '+5567988880000');
    assert.equal((await api('/api/contato', { negocio_id: 'eeeeeeee-0000-0000-0000-000000000002', telefone: '67 99999-0000' })).status, 409);
    assert.equal((await api('/api/contato', { negocio_id: 'eeeeeeee-0000-0000-0000-000000000002', nome: '' })).status, 400);
    assert.equal((await api('/api/contato', {})).status, 404);
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
    // Correção da equipe ao questionário: bloco próprio, que vale no lugar da base
    const iCorr = sis.indexOf('Correções da equipe ao questionário'), iRef = sis.indexOf('Respostas de referência');
    assert.ok(iCorr > 0 && sis.indexOf('O café é das 7h às 10h.') > iCorr && (iRef < 0 || sis.indexOf('O café é das 7h às 10h.') < iRef), 'correção no bloco certo');
    r = await api('/api/resposta', { pergunta: 'Qual o horário do café?', resposta: 'Das 7h às 10h.', origem: 'correcao' });
    assert.equal(r.status, 200); assert.equal(chamadas.findLast(c => c.url === '/rest/v1/respostas' && c.metodo === 'POST').corpo.origem, 'correcao');
    assert.equal((await api('/api/resposta', { pergunta: 'x', resposta: 'y', origem: 'hacker' })).status, 400);
    // Questionário: o que o Gilberto sabe, e a importação para a biblioteca (sem repetir o que já existe)
    r = await api('/api/conhecimento', null, 'token-equipe', 'GET');
    const qj = await r.json();
    assert.equal(r.status, 200); assert.ok(qj.secoes.length >= 10 && qj.secoes.some(x => x.itens.some(i => /check-in/i.test(i.p))));
    assert.ok(!JSON.stringify(qj).includes('**') && !/\(P6\d/.test(JSON.stringify(qj)), 'sem marcação nem notas internas');
    r = await api('/api/importar-questionario', {});
    const ij = await r.json();
    assert.equal(r.status, 200, JSON.stringify(ij)); assert.ok(ij.importadas > 40);

    // Etapa C2: produtos completos, oferta (1 por conversa), resposta, venda com tarefas e oferta do Gilberto
    const P = require('./produtos');
    assert.equal(P.precoTexto({ unidade: 'unidade', variacoes: [{ nome: 'Simples', preco: 350 }, { nome: 'Completa', preco: 600 }] }), 'Simples R$ 350 ou Completa R$ 600');
    assert.equal(P.precoTexto({ unidade: 'pessoa', preco_valor: 170, variacoes: [] }), 'R$ 170 por pessoa');
    assert.deepEqual(P.calcularVenda(PRODS[3], { variacao: 'Massagem360', adicionais: ['Pedras quentes', 'Cone hindu'], quantidade: 2 }), { variacao: 'Massagem360', adicionais: [{ nome: 'Pedras quentes', preco: 50 }, { nome: 'Cone hindu', preco: 80 }], quantidade: 2, valor_unitario: 350, valor_total: 700 });
    assert.throws(() => P.calcularVenda(PRODS[2], { quantidade: 1 }), /Escolha a opção/);
    assert.throws(() => P.calcularVenda(PRODS[3], { variacao: 'Massagem360', adicionais: ['Brinde'] }), /Adicional inválido/);
    const tDeco = P.tarefasDaVenda(PRODS[2], { variacao: 'Completa', quantidade: 1, adicionais: [], valor_total: 600, data_uso: '2026-11-20' }, {}, new Date('2026-10-02T12:00:00Z'));
    assert.deepEqual(tDeco.map(t => [t.tipo, t.quando]), [['Preparar Decoração especial', '2026-11-17T13:00:00.000Z'], ['Lançar na conta do hóspede', '2026-11-20T13:00:00.000Z']]);
    assert.ok(tDeco[1].descricao.includes('R$ 600') && tDeco[1].descricao.includes('check-out'));
    assert.equal(P.tarefasDaVenda(PRODS[0], { quantidade: 2, adicionais: [], valor_total: 340 }, {}, new Date('2026-10-02T12:00:00Z'))[0].tipo, 'Agendar Combo boia cross + arvorismo');
    r = await api('/api/produto', { codigo: 'DECO2', nome: 'Decoração', preco: '', variacoes: [{ nome: 'Simples', preco: '350' }, { nome: 'Completa', preco: 600, descricao: 'Com pétalas' }], perfis: ['Casal'], grupo_fotos: 'BOIA', idade_minima: '', unidade: 'unidade' });
    assert.equal(r.status, 200, await r.clone().text());
    const pd = chamadas.findLast(c => c.url === '/rest/v1/produtos' && c.metodo === 'POST').corpo;
    assert.deepEqual([pd.preco, pd.variacoes[1].descricao, pd.perfis, pd.idade_minima, pd.grupo_fotos], ['Simples R$ 350 ou Completa R$ 600', 'Com pétalas', ['Casal'], null, 'BOIA']);
    assert.equal((await api('/api/produto', { codigo: 'X', nome: 'x', preco: 'y', perfis: ['Marciano'] })).status, 400);
    assert.equal((await api('/api/produto', { codigo: 'X', nome: 'x', preco: 'y', variacoes: [{ nome: 'A' }] })).status, 400);
    assert.equal((await api('/api/produto', { codigo: 'X', nome: 'x', preco: 'y', grupo_fotos: '../x' })).status, 400);
    r = await api('/api/oferta', { conversa_id: conv, produto_codigo: 'COMBO' });
    const of1 = await r.json();
    assert.equal(r.status, 200, JSON.stringify(of1));
    assert.deepEqual([of1.oferta.por, of1.oferta.autor_id, of1.oferta.negocio_id], ['equipe', 'u-1', 'aaaaaaaa-0000-0000-0000-000000000001']);
    assert.equal((await api('/api/oferta', { conversa_id: conv, produto_codigo: 'DECO' })).status, 409, '1 oferta por conversa');
    assert.equal((await api('/api/oferta', { conversa_id: conv, produto_codigo: 'NADA', forcar: true })).status, 404);
    // O Gilberto vê a oferta já feita
    pedidosIA.length = 0;
    await (await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-equipe' }, body: JSON.stringify({ conversa_id: conv }) })).json();
    const ctxIA = JSON.stringify(pedidosIA[0].messages.at(-1));
    assert.ok(ctxIA.includes('Ofertas de produtos nesta conversa: Combo boia cross + arvorismo (oferecido, sem resposta, por a equipe)'), ctxIA.slice(0, 300));
    assert.ok(pedidosIA[0].system[0].text.includes('opções: Simples R$ 350; Completa R$ 600 (Com pétalas e espumante)'), 'variações no catálogo do Gilberto');
    assert.ok(pedidosIA[0].system[0].text.includes('fotos: enviar_fotos com codigo_acomodacao "BOIA"'));
    r = await api('/api/oferta-resposta', { id: of1.oferta.id, situacao: 'aceito' });
    assert.equal(r.status, 200);
    r = await api('/api/venda', { conversa_id: conv, oferta_id: of1.oferta.id, produto_codigo: 'DECO', variacao: 'Completa', quantidade: 1, data_uso: '2026-11-20', horario: '', observacoes: 'Bodas' });
    const vj1 = await r.json();
    assert.equal(r.status, 200, JSON.stringify(vj1));
    assert.deepEqual([vj1.venda.valor_total, vj1.venda.variacao, vj1.venda.pagamento, vj1.venda.criado_por], [600, 'Completa', undefined, 'u-1']);
    assert.deepEqual(vj1.tarefas, ['Preparar Decoração especial', 'Lançar na conta do hóspede']);
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo.tipo, 'Lançar na conta do hóspede');
    assert.ok(chamadas.findLast(c => c.url === '/rest/v1/negocio_eventos').corpo.texto.startsWith('Venda: Decoração especial (Completa) · R$ 600'));
    assert.equal(ofertasF.find(o => o.id === of1.oferta.id).situacao, 'aceito');
    assert.equal((await api('/api/venda', { conversa_id: conv, produto_codigo: 'DECO', variacao: 'Luxo' })).status, 400);
    assert.equal((await api('/api/venda', { conversa_id: conv, produto_codigo: 'DECO', variacao: 'Simples', data_uso: 'amanhã' })).status, 400);
    assert.equal((await api('/api/venda', { conversa_id: conv, produto_codigo: 'PIQ', quantidade: 1 })).status, 400, 'sem preço em número');
    assert.deepEqual(alertasF.filter(a => a.venda_id === vj1.venda.id).map(a => a.tipo), ['lancar_conta'], 'venda da equipe: só o alerta de lançar');
    r = await api('/api/venda-situacao', { id: vj1.venda.id, situacao: 'lancado' });
    assert.equal(r.status, 200); assert.equal(vendasF[0].situacao, 'lancado'); assert.equal(vendasF[0].lancado_por, 'u-1');
    assert.equal(alertasF.find(a => a.venda_id === vj1.venda.id).situacao, 'resolvido', 'lançar pelo painel fecha o alerta');
    // Oferta pelo WhatsApp: foto do produto, texto, rodapé e botões; o toque do cliente marca a resposta
    ofertasF.length = 0; PRODS[2].foto = 'BOIA-1.jpg';
    r = await api('/api/oferta-enviar', { conversa_id: conv, produto_codigo: 'DECO', texto: '*Decoração especial*\nPreparada no quarto.' });
    const oe = await r.json();
    assert.equal(r.status, 200, JSON.stringify(oe));
    const im = chamadas.findLast(c => c.url === '/graph/111/messages' && c.corpo.type === 'interactive').corpo.interactive;
    assert.ok(im.header.image.link.endsWith('/fotos/BOIA-1.jpg'));
    assert.equal(im.body.text, '*Decoração especial*\nPreparada no quarto.'); assert.equal(im.footer.text, 'Vai na conta da hospedagem, acertada no check-out');
    assert.deepEqual(im.action.buttons.map(b => b.reply.title), ['Quero a Simples', 'Quero a Completa', 'Não, obrigado']);
    assert.ok(im.action.buttons.every(b => b.reply.id.startsWith('of:' + oe.oferta.id + ':') && b.reply.title.length <= 20));
    assert.ok(oe.mensagem.corpo.endsWith('[ Quero a Simples ] [ Quero a Completa ] [ Não, obrigado ]') && oe.mensagem.arquivo === 'BOIA-1.jpg');
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/rpc/registrar_saida_midia').corpo.p_caminho, 'biblioteca/BOIA-1.jpg');
    assert.equal((await api('/api/oferta-enviar', { conversa_id: conv, produto_codigo: 'COMBO', texto: 'Combo das aventuras' })).status, 409, '1 oferta por conversa');
    r = await api('/api/oferta-enviar', { conversa_id: conv, produto_codigo: 'COMBO', texto: 'Combo das aventuras', forcar: true });
    assert.deepEqual(chamadas.findLast(c => c.url === '/graph/111/messages' && c.corpo.type === 'interactive').corpo.interactive.action.buttons.map(b => b.reply.title), ['Eu aceito', 'Não, obrigado']);
    assert.equal((await api('/api/oferta-enviar', { conversa_id: conv, produto_codigo: 'COMBO', texto: 'curto', forcar: true })).status, 400);
    // O cliente toca em "Quero a Completa"
    r = await postar(JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: '111' }, contacts: [{ wa_id: '5567999990000', profile: { name: 'Cliente Teste' } }],
      messages: [{ from: '5567999990000', id: 'wamid.BOT', timestamp: '1700000100', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'of:' + oe.oferta.id + ':v1', title: 'Quero a Completa' } } }] } }] }] }));
    assert.equal(r.status, 200);
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/rpc/registrar_entrada_whatsapp').corpo.p_corpo, 'Quero a Completa');
    assert.equal(ofertasF.find(o => o.id === oe.oferta.id).situacao, 'aceito');
    // Aceite → venda registrada sozinha (opção do botão, valor, conta do hóspede) e tarefas para a equipe reservar
    const vb = vendasF.at(-1);
    assert.deepEqual([vb.produto_codigo, vb.variacao, vb.valor_total, vb.oferta_id, vb.data_uso, vb.criado_por], ['DECO', 'Completa', 600, oe.oferta.id, '2026-11-20', null]);
    const tbs = chamadas.filter(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').slice(-2).map(c => c.corpo);
    assert.deepEqual(tbs.map(t => t.tipo), ['Preparar Decoração especial', 'Lançar na conta do hóspede']);
    assert.ok(chamadas.findLast(c => c.url === '/rest/v1/negocio_eventos').corpo.texto.startsWith('Cliente aceitou no WhatsApp: Decoração especial (Completa) · venda registrada R$ 600'));
    // Sino: "Cliente pediu produto" na hora e "Lançar na conta" às 8h do check-in (20/11)
    const alB = alertasF.filter(a => a.venda_id === vb.id);
    assert.deepEqual(alB.map(a => a.tipo), ['produto_pedido', 'lancar_conta']);
    assert.ok(alB[0].info.startsWith('Decoração especial (Completa) · R$ 600 · aceitou no WhatsApp. Preparar'));
    assert.equal(alB[1].quando, '2026-11-20T12:00:00.000Z');
    assert.equal((await api('/api/alerta', { id: alB[0].id })).status, 200);
    assert.equal(alB[0].situacao, 'resolvido'); assert.equal(alB[0].resolvido_por, 'u-1');
    assert.equal((await api('/api/alerta', { id: alB[1].id })).status, 200, '✓ Lançado na conta');
    assert.deepEqual([alB[1].situacao, vendasF.find(v => v.id === vb.id).situacao], ['resolvido', 'lancado']);
    assert.equal((await api('/api/alerta', { id: 'nao' })).status, 400);
    // "Eu aceito" sem dado suficiente (massagem com várias opções): tarefa de confirmar
    PRODS[3].variacoes = [{ nome: 'Massagem360', preco: 220 }, { nome: 'Relaxante', preco: 220 }, { nome: 'Linfática', preco: 220 }];
    r = await api('/api/oferta-enviar', { conversa_id: conv, produto_codigo: 'MASS', texto: 'Massagem com a Natália', forcar: true });
    const om = (await r.json()).oferta;
    const nVendas = vendasF.length;
    await postar(JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: '111' }, messages: [{ from: '5567999990000', id: 'wamid.BOT2', timestamp: '1700000200', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'of:' + om.id + ':s', title: 'Eu aceito' } } }] } }] }] }));
    assert.equal(vendasF.length, nVendas, 'sem venda: falta a opção');
    const tc = chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo;
    assert.equal(tc.tipo, 'Confirmar e registrar venda'); assert.ok(tc.descricao.includes('Massagem360, Relaxante, Linfática'));
    assert.ok(alertasF.at(-1).tipo === 'produto_pedido' && alertasF.at(-1).info.includes('Falta confirmar a opção'));
    PRODS[3].variacoes = [{ nome: 'Massagem360', preco: 220 }];
    const P2 = require('./produtos');
    assert.deepEqual(P2.lerBotao('of:' + oe.oferta.id + ':n'), { oferta: oe.oferta.id, aceito: false, opcao: null });
    assert.equal(P2.lerBotao('of:' + oe.oferta.id + ':v1').opcao, 1);
    assert.equal(P2.lerBotao('of:x:s'), null);
    delete PRODS[2].foto;
    // Sugestão do Gilberto com oferta, enviada pela equipe: vira oferta "pelo Gilberto" (se a conversa ainda não teve)
    ofertasF.length = 0; iaOferta = 'COMBO';
    const sgo = await (await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-equipe' }, body: JSON.stringify({ conversa_id: conv }) })).json();
    assert.equal(sgo.produto_oferecido, 'COMBO');
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/sugestoes' && c.metodo === 'POST').corpo.ferramentas.produto_oferecido, 'COMBO');
    r = await api('/api/sugestao', { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', situacao: 'usada', motivo: 'Enviada sem mudanças' });
    assert.equal((await r.json()).oferta, 'Combo boia cross + arvorismo');
    assert.deepEqual([ofertasF.length, ofertasF[0].por], [1, 'gilberto']);
    await api('/api/sugestao', { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', situacao: 'usada' });
    assert.equal(ofertasF.length, 1, 'não duplica');
    iaOferta = ''; ofertasF.length = 0;

    // Oferta por link (páginas de extras): aventuras e momentos
    r = await api('/api/vitrine', { conversa_id: conv, tema: 'aventuras', enviar: true });
    const vt = await r.json();
    assert.equal(r.status, 200, JSON.stringify(vt));
    const cta = chamadas.findLast(c => c.url === '/graph/111/messages' && c.corpo.type === 'interactive').corpo.interactive;
    assert.deepEqual([cta.type, cta.action.name, cta.action.parameters.display_text, cta.action.parameters.url], ['cta_url', 'cta_url', 'Ver as aventuras', vt.link]);
    assert.ok(cta.header.image.link.endsWith('/fotos/BOIA-1.jpg') && cta.footer.text === 'Vai na conta da hospedagem, acertada no check-out');
    assert.ok(vt.mensagem.corpo.includes(vt.link));
    assert.equal((await api('/api/vitrine', { conversa_id: conv, tema: 'momentos' })).status, 409, 'o link conta como oferta');
    assert.equal((await api('/api/vitrine', { conversa_id: conv, tema: 'praia', forcar: true })).status, 400);
    const vtok = vt.link.split('/e/')[1];
    r = await fetch(base + '/e/' + vtok);
    const vh = await r.text();
    assert.equal(r.status, 200);
    assert.ok(vh.includes('Aventuras no <em>Rio Formoso</em>') && vh.includes('data-codigo="COMBO"') && !vh.includes('data-codigo="DECO"') && vh.includes('src="/fotos/BOIA-1.jpg"') && vh.includes('noindex'));
    assert.equal((await fetch(base + '/e/' + 'y'.repeat(22))).status, 404);
    const pedir = (itens, t = vtok) => fetch(base + '/e/' + t + '/pedido', { method: 'POST', body: JSON.stringify({ itens }) });
    const nV = vendasF.length;
    r = await pedir([{ codigo: 'COMBO', quantidade: 2, data: emDias(41), adicionais: [] }]);
    const pj = await r.json();
    assert.equal(r.status, 200, JSON.stringify(pj));
    assert.ok(decodeURIComponent(pj.whatsapp).includes('Escolhi na página de extras: Combo boia cross + arvorismo · 2 pessoas · ' + emDias(41).slice(8, 10) + '/'));
    assert.deepEqual(vendasF.slice(nV).map(v => [v.produto_codigo, v.quantidade, v.valor_total, v.data_uso]), [['COMBO', 2, 340, emDias(41)]]);
    assert.ok(alertasF.findLast(a => a.tipo === 'produto_pedido').info.includes('escolheu na página de extras'));
    assert.ok(vitrinesF[0].pedido_em && vitrinesF[0].pedido[0].codigo === 'COMBO');
    await pedir([{ codigo: 'COMBO', quantidade: 2, data: emDias(41) }]);
    assert.equal(vendasF.length, nV + 1, 'mesmo item de novo não duplica');
    assert.equal((await pedir([{ codigo: 'DECO', variacao: 'Completa', quantidade: 1 }])).status, 400, 'decoração não está no link de aventuras');
    assert.equal((await pedir([{ codigo: 'COMBO', quantidade: 99 }])).status, 400);
    assert.equal((await pedir([{ codigo: 'COMBO', quantidade: 1, data: '2020-01-01' }])).status, 400);
    // Momentos: opção obrigatória, adicionais da massagem somam
    r = await api('/api/vitrine', { conversa_id: conv, tema: 'momentos', forcar: true });
    const vt2 = (await r.json()).link.split('/e/')[1];
    const vh2 = await (await fetch(base + '/e/' + vt2)).text();
    assert.ok(vh2.includes('value="Completa"') && vh2.includes('class="vt-ad" value="Pedras quentes"'));
    assert.equal((await pedir([{ codigo: 'DECO', quantidade: 1 }], vt2)).status, 400);
    r = await pedir([{ codigo: 'MASS', variacao: 'Massagem360', adicionais: ['Pedras quentes'], quantidade: 2, data: emDias(41) }, { codigo: 'DECO', variacao: 'Simples', quantidade: 1, data: emDias(40) }], vt2);
    assert.equal(r.status, 200);
    assert.deepEqual(vendasF.slice(-2).map(v => [v.produto_codigo, v.variacao, v.valor_total]), [['MASS', 'Massagem360', 540], ['DECO', 'Simples', 350]]);
    // O Gilberto vê o link enviado como oferta; o link criado pela sugestão só conta quando a equipe envia
    pedidosIA.length = 0;
    await (await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-equipe' }, body: JSON.stringify({ conversa_id: conv }) })).json();
    assert.ok(JSON.stringify(pedidosIA[0].messages.at(-1)).includes('Link de extras \\"Aventuras no Rio Formoso\\"'));
    assert.ok(pedidosIA[0].tools.some(t => t.name === 'enviar_link_extras'));
    vitrinesF.unshift({ id: 'eeeeeeee-0000-0000-0000-000000000009', token: 'z'.repeat(22), tema: 'momentos', conversa_id: conv, por: 'gilberto', enviada: false, criado_em: new Date().toISOString() });
    iaVitrines = ['eeeeeeee-0000-0000-0000-000000000009'];
    r = await api('/api/sugestao', { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', situacao: 'usada' });
    assert.equal((await r.json()).oferta, 'link de extras'); assert.equal(vitrinesF[0].enviada, true);
    iaVitrines = null; vitrinesF.length = 0; ofertasF.length = 0;
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
    assert.deepEqual(pi.tools.map(t => t.name), ['consultar_disponibilidade', 'gerar_orcamento', 'enviar_fotos', 'enviar_link_extras']);
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
    // Extras na página: o cliente marca, vai na mensagem e vira oferta aceita para a equipe
    assert.ok(html.includes('data-codigo="DECO"') && html.includes('value="Completa"') && html.includes('class="ex-sel"') && html.includes('class="ex-foto" src="/fotos/BOIA-1.jpg"'), 'extras selecionáveis com foto');
    ofertasF.length = 0;
    r = await fetch(base + '/o/' + tok + '/quero', { method: 'POST', body: JSON.stringify({ codigo: 'BGE', extras: [{ codigo: 'DECO', variacao: 'Completa' }, { codigo: 'COMBO' }, { codigo: 'FALSO' }, { codigo: 'DECO', variacao: 'Simples' }] }) });
    const qx = decodeURIComponent((await r.json()).whatsapp);
    assert.ok(qx.includes('Também quero incluir: Decoração especial (Completa), Combo boia cross + arvorismo.'), qx);
    assert.deepEqual(ofertasF.map(o => [o.produto_nome, o.por, o.situacao]).reverse(), [['Decoração especial (Completa)', 'pagina', 'aceito'], ['Combo boia cross + arvorismo', 'pagina', 'aceito']]);
    // Os extras marcados viram vendas (pessoas do orçamento) com as tarefas da equipe
    const vp = vendasF.slice(-2).map(v => [v.produto_codigo, v.variacao, v.quantidade, v.valor_total]);
    assert.deepEqual(vp, [['DECO', 'Completa', 1, 600], ['COMBO', null, salvo.adultos + salvo.criancas_idades.filter(i => i >= 5).length, 170 * (salvo.adultos + salvo.criancas_idades.filter(i => i >= 5).length)]]);
    assert.ok(chamadas.some(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST' && c.corpo.tipo === 'Agendar Combo boia cross + arvorismo'));
    const n2 = vendasF.length;
    await fetch(base + '/o/' + tok + '/quero', { method: 'POST', body: JSON.stringify({ codigo: 'BGE', extras: [{ codigo: 'DECO', variacao: 'Completa' }] }) });
    assert.equal(vendasF.length, n2, 'clicar de novo não duplica a venda');
    ofertasF.length = 0;
    assert.equal((await fetch(base + '/o/' + 'x'.repeat(22))).status, 404);
    assert.equal((await fetch(base + '/o/curto')).status, 404);
    for (const f of ['/o/orcamento.css', '/o/orcamento.js', '/o/logo-branco.png']) assert.equal((await fetch(base + f)).status, 200, f);
    assert.ok(html.includes('src="/fotos/BGE-1.jpg"') && html.includes('src="/fotos/BGE-2.jpg"'), 'fotos reais na página');
    // Biblioteca de fotos: lista para a equipe, envio pela Meta por link público, e a foto aparece na caixa
    r = await fetch(base + '/api/fotos', { headers: { Authorization: 'Bearer token-equipe' } });
    const bib = await r.json();
    assert.deepEqual(bib.grupos.filter(g => g.fotos.length).map(g => [g.grupo, g.nome, g.fotos.length]), [['BGE', 'Bangalô Especial', 2], ['BOIA', 'Boia cross', 1]]);
    assert.ok(bib.grupos.some(g => g.grupo === 'CBM' && !g.fotos.length), 'categorias vazias aparecem para receber fotos');
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
    // Gerenciar o Banco de fotos: navegar no Drive, trazer foto, tirar e devolver
    const eq = { Authorization: 'Bearer token-equipe' };
    r = await fetch(base + '/api/drive', { headers: eq });
    const dv = await r.json();
    assert.equal(r.status, 200, JSON.stringify(dv));
    assert.deepEqual([dv.pasta.raiz, dv.pastas.map(p => p.nome), dv.fotos.map(f => [f.id, f.na_biblioteca.length])], [true, ['Bangalô'], [['FOTO-DRIVE-01', 0]]]);
    r = await fetch(base + '/api/drive?pasta=PASTA-BANGALO-1', { headers: eq });
    assert.deepEqual((await r.json()).pasta, { id: 'PASTA-BANGALO-1', nome: 'Bangalô', raiz: false, pai: RAIZ_DRIVE });
    r = await fetch(base + '/api/drive?pasta=PASTA-SEM-ACESSO', { headers: eq });
    assert.equal(r.status, 403); assert.ok((await r.json()).erro.includes('crm-runtime@'));
    assert.equal((await fetch(base + '/api/drive?pasta=../x', { headers: eq })).status, 400);
    assert.equal((await fetch(base + '/api/drive', { headers: { Authorization: 'Bearer token-estranho' } })).status, 403);
    r = await fetch(base + '/api/drive/miniatura/FOTO-DRIVE-01', { headers: eq });
    assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/jpeg');
    assert.equal((await fetch(base + '/api/drive/miniatura/FOTO-DRIVE-01')).status, 401);
    const trazer = c => fetch(base + '/api/foto', { method: 'POST', headers: eq, body: JSON.stringify(c) });
    assert.equal((await trazer({ drive_id: 'FOTO-DRIVE-01', grupo: 'XYZ', descricao: 'Varanda do Bangalô Especial' })).status, 400);
    assert.equal((await trazer({ drive_id: 'FOTO-DRIVE-01', grupo: 'BGE', descricao: 'curta' })).status, 400);
    r = await trazer({ drive_id: 'FOTO-DRIVE-01', grupo: 'BGE', descricao: 'Varanda do Bangalô Especial com rede', etiquetas: ['varanda', ' Rede ', ''] });
    const tz = await r.json();
    assert.equal(r.status, 200, JSON.stringify(tz));
    assert.match(tz.foto.arquivo, /^BGE-d[0-9a-f]{8}\.jpg$/);
    assert.deepEqual(tz.foto.etiquetas, ['bangalô especial', 'varanda', 'rede']);
    const salva = guardados.get('biblioteca/' + tz.foto.arquivo);
    assert.ok(salva && salva.mime === 'image/jpeg' && salva.dados[0] === 0xff && salva.dados[1] === 0xd8, 'foto recortada guardada no Storage');
    assert.deepEqual([fotosBib[0].origem, fotosBib[0].drive_id, fotosBib[0].criado_por, fotosBib[0].ativo], ['drive', 'FOTO-DRIVE-01', 'u-1', true]);
    assert.equal((await trazer({ drive_id: 'FOTO-DRIVE-01', grupo: 'BGE', descricao: 'Varanda do Bangalô Especial com rede' })).status, 409);
    r = await fetch(base + '/fotos/' + tz.foto.arquivo);
    assert.equal(r.status, 200); assert.equal(Buffer.from(await r.arrayBuffer()).length, salva.dados.length);
    assert.equal((await fetch(base + '/fotos/BGE-d00000000.jpg')).status, 404);
    r = await fetch(base + '/api/fotos', { headers: eq });
    assert.deepEqual((await r.json()).grupos.find(g => g.grupo === 'BGE').fotos.map(f => f.arquivo), ['BGE-1.jpg', 'BGE-2.jpg', tz.foto.arquivo]);
    assert.ok(require('./orcamento').escolherFotos({ codigo_acomodacao: '', etiquetas: ['varanda'], quantidade: 1 })[0].arquivo === tz.foto.arquivo, 'o Gilberto acha a foto nova');
    r = await fetch(base + '/api/drive', { headers: eq });
    assert.deepEqual((await r.json()).fotos[0].na_biblioteca, ['Bangalô Especial']);
    assert.equal((await envF({ conversa_id: conv, fotos: [tz.foto.arquivo] })).status, 200);
    // Tirar uma foto da curadoria: some do envio e da lista; devolver traz de volta
    const statusF = c => fetch(base + '/api/foto-status', { method: 'POST', headers: eq, body: JSON.stringify(c) });
    assert.equal((await statusF({ arquivo: 'BGE-1.jpg', ativo: false })).status, 200);
    assert.deepEqual(fotosBib.find(f => f.arquivo === 'BGE-1.jpg'), { ...fotosBib.find(f => f.arquivo === 'BGE-1.jpg'), grupo: 'BGE', origem: 'base', ativo: false });
    r = await fetch(base + '/api/fotos', { headers: eq });
    const bge = (await r.json()).grupos.find(g => g.grupo === 'BGE');
    assert.deepEqual([bge.fotos.map(f => f.arquivo), bge.removidas.map(f => f.arquivo)], [['BGE-2.jpg', tz.foto.arquivo], ['BGE-1.jpg']]);
    assert.equal((await envF({ conversa_id: conv, fotos: ['BGE-1.jpg'] })).status, 400);
    assert.equal((await statusF({ arquivo: tz.foto.arquivo, ativo: false })).status, 200);
    assert.equal(fotosBib.find(f => f.arquivo === tz.foto.arquivo).ativo, false);
    assert.equal((await statusF({ arquivo: 'naoexiste.jpg', ativo: false })).status, 404);
    assert.equal((await statusF({ arquivo: 'BGE-1.jpg', ativo: true })).status, 200);
    assert.equal((await statusF({ arquivo: tz.foto.arquivo, ativo: true })).status, 200);
    r = await fetch(base + '/api/fotos', { headers: eq });
    assert.equal((await r.json()).grupos.find(g => g.grupo === 'BGE').fotos.length, 3);
    // volta ao estado inicial para os testes seguintes
    await statusF({ arquivo: tz.foto.arquivo, ativo: false });
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

    // Todo módulo local usado pelo servidor precisa estar no Dockerfile (senão o Cloud Run não sobe)
    const fsD = require('fs'), docker = fsD.readFileSync(require('path').join(__dirname, 'Dockerfile'), 'utf8');
    const locais = new Set(fsD.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'teste.js').flatMap(f => [...fsD.readFileSync(require('path').join(__dirname, f), 'utf8').matchAll(/require\('\.\/([\w-]+)'\)/g)].map(m => m[1] + '.js')));
    for (const f of [...locais, 'server.js']) assert.ok(new RegExp('^COPY .*\\b' + f.replace('.', '\\.') + '\\b', 'm').test(docker), 'falta no Dockerfile: ' + f);
    console.log('TODOS OS TESTES PASSARAM');
    servidor.close(); falso.close();
  });
});
