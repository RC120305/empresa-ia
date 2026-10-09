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
let iaCota = false, iaOrcamento = false, iaPix = false, iaAuto = null, autoUltimaId = null, autoPausado = false;
const orcs = [];
const FAKE = {
  '/auth/v1/user': req => req.headers.authorization === 'Bearer token-equipe' ? { email: 'equipe@teste.com' }
    : req.headers.authorization === 'Bearer token-estranho' ? { email: 'estranho@teste.com' }
    : req.headers.authorization === 'Bearer token-dono' ? { email: 'dono@teste.com' } : null,
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
const cobrancasF = [], reservasF = [], aptosF = [];
let tarefaGetF = null;
const docsF = [];
const VIDEO_GRANDE = (() => { // vídeo de 4 s com imagem pesada (~2 MB), para testar a redução
  const f = require('path').join(require('os').tmpdir(), 'teste-video-grande.mp4');
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=4', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-b:v', '5M', '-c:a', 'aac', '-shortest', f]);
  return require('fs').readFileSync(f);
})();
const MP4_DRIVE = Buffer.concat([Buffer.from('\x00\x00\x00\x18ftypmp42'), Buffer.alloc(3000, 7)]);
let bbPago = false;
const configF = {}, pedidosParceiroF = [];
const pushF = [], pushRecebidos = []; // inscrições de avisos no celular e o que o "serviço de push" recebeu
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
      if (u.pathname === '/drive/v3/files/VIDEO-DRIVE-01') return u.searchParams.get('alt') === 'media' ? (res.writeHead(200, { 'Content-Type': 'video/mp4' }), res.end(MP4_DRIVE)) : responder(200, { id: 'VIDEO-DRIVE-01', name: 'institucional.mp4', mimeType: 'video/mp4', size: String(MP4_DRIVE.length) });
      if (u.pathname === '/drive/v3/files/VIDEO-GRANDE') return responder(200, { id: 'VIDEO-GRANDE', name: 'bruto.mp4', mimeType: 'video/mp4', size: String(400 * 1048576) });
      if (u.pathname === '/drive/v3/files/VIDEO-REDUZIR') return u.searchParams.get('alt') === 'media' ? (res.writeHead(200, { 'Content-Type': 'video/mp4' }), res.end(VIDEO_GRANDE)) : responder(200, { id: 'VIDEO-REDUZIR', name: 'master.mp4', mimeType: 'video/mp4', size: String(VIDEO_GRANDE.length) });
      if (u.pathname === '/drive/v3/files/PDF-DRIVE') return responder(200, { id: 'PDF-DRIVE', name: 'x.pdf', mimeType: 'application/pdf', size: '1000' });
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
    // Banco do Brasil falso (API Pix v2)
    if (req.url === '/bb/oauth' && req.method === 'POST') return req.headers.authorization === 'Basic ' + Buffer.from('bb-id:bb-sec').toString('base64') && corpo.includes('grant_type=client_credentials') ? responder(200, { access_token: 'tok-bb', expires_in: 600 }) : responder(401, {});
    if (req.url.startsWith('/bb/pix/cob/')) {
      if (req.headers.authorization !== 'Bearer tok-bb' || !req.url.includes('gw-dev-app-key=bb-key')) return responder(401, {});
      const tx = req.url.split('/bb/pix/cob/')[1].split('?')[0];
      if (req.method === 'PUT') return responder(201, { txid: tx, status: 'ATIVA', pixCopiaECola: '00020126BB' + tx, valor: json.valor, chave: json.chave, calendario: json.calendario });
      if (req.method === 'PATCH') return responder(200, { txid: tx, status: json.status });
      return responder(200, bbPago ? { txid: tx, status: 'CONCLUIDA', pix: [{ endToEndId: 'E123', valor: '500.00', horario: '2026-10-02T20:00:00Z', pagador: { nome: 'ANA SOUZA' } }] } : { txid: tx, status: 'ATIVA' });
    }
    if (req.url.startsWith('/rest/v1/gilberto_documentos')) {
      const u = new URL(req.url, 'http://x'), q = k => (u.searchParams.get(k) || '').replace(/^eq\./, '');
      if (req.method === 'POST') { const d = { id: crypto.randomUUID(), criado_em: new Date().toISOString(), ...json }; docsF.push(d); return responder(201, [d]); }
      if (req.method === 'PATCH') { Object.assign(docsF.find(d => d.id === q('id')), json); res.writeHead(204); return res.end(); }
      if (req.method === 'DELETE') { docsF.splice(docsF.findIndex(d => d.id === q('id')), 1); res.writeHead(204); return res.end(); }
      return responder(200, docsF.filter(d => (!q('id') || d.id === q('id')) && (!q('situacao') || d.situacao === q('situacao'))));
    }
    if (req.url.startsWith('/rest/v1/reservas')) {
      const u = new URL(req.url, 'http://x'), q = k => (u.searchParams.get(k) || '').replace(/^eq\./, '');
      if (req.method === 'POST') { const r = { id: crypto.randomUUID(), situacao: 'nao_confirmada', ...json }; reservasF.push(r); return responder(201, [r]); }
      if (req.method === 'PATCH') { Object.assign(reservasF.find(r => r.id === q('id')), json); res.writeHead(204); return res.end(); }
      return responder(200, reservasF.filter(r => (!q('id') || r.id === q('id')) && (!q('conversa_id') || r.conversa_id === q('conversa_id')) && (!q('situacao') || r.situacao === q('situacao'))
        && (!q('codigo') || r.codigo === q('codigo')) && (!q('data_entrada') || r.data_entrada === q('data_entrada'))));
    }
    if (req.url.startsWith('/rest/v1/cobrancas')) {
      if (req.method === 'POST') { const c = { id: crypto.randomUUID(), situacao: 'ativa', ...json }; cobrancasF.push(c); return responder(201, [c]); }
      const id = (req.url.match(/id=eq\.([0-9a-f-]+)/) || [])[1];
      if (req.method === 'PATCH') { Object.assign(cobrancasF.find(c => c.id === id), json); res.writeHead(204); return res.end(); }
      if (req.url.includes('situacao=eq.ativa')) return responder(200, cobrancasF.filter(c => c.situacao === 'ativa'));
      if (req.url.includes('negocio_id=eq.')) { const ng = req.url.split('negocio_id=eq.')[1].split('&')[0]; return responder(200, cobrancasF.filter(c => c.negocio_id === ng && c.situacao === 'paga' && c.reserva_id).reverse()); }
      return responder(200, cobrancasF.filter(c => c.id === id));
    }
    if (req.url.startsWith('/rest/v1/pedidos_parceiro')) {
      if (req.method === 'POST') { const x = { id: crypto.randomUUID(), situacao: 'aguardando_parceiro', opcoes: [], criado_em: new Date().toISOString(), ...json }; pedidosParceiroF.push(x); return responder(201, [x]); }
      const u = new URL(req.url, 'http://x');
      let l = pedidosParceiroF.slice();
      for (const k of ['id', 'token_parceiro', 'token_cliente']) if (u.searchParams.get(k)) l = l.filter(x => x[k] === u.searchParams.get(k).replace(/^eq\./, ''));
      const sit = u.searchParams.get('situacao');
      if (sit) { const vs = sit.startsWith('in.') ? sit.slice(4, -1).split(',') : [sit.replace(/^eq\./, '')]; l = l.filter(x => vs.includes(x.situacao)); }
      if (u.searchParams.get('enviado_em') === 'not.is.null') l = l.filter(x => x.enviado_em);
      if (req.method === 'PATCH') { l.forEach(x => Object.assign(x, json)); res.writeHead(204); return res.end(); }
      return responder(200, l);
    }
    if (req.url.startsWith('/rest/v1/config')) {
      if (req.method === 'POST') { configF[json.chave] = json.valor; res.writeHead(201); return res.end(); }
      const ch = (req.url.match(/chave=eq\.([\w-]+)/) || [])[1] || 'plantao';
      return responder(200, configF[ch] ? [{ valor: configF[ch] }] : []);
    }
    if (req.url.startsWith('/rest/v1/vitrines')) {
      if (req.method === 'POST') { const v = { id: crypto.randomUUID(), aberturas: 0, pedido: null, pedido_em: null, criado_em: new Date().toISOString(), ...json }; vitrinesF.unshift(v); return responder(201, [v]); }
      if (req.method === 'PATCH') {
        const ids = req.url.includes('id=in.(') ? req.url.split('id=in.(')[1].split(')')[0].split(',') : [req.url.split('id=eq.')[1]];
        vitrinesF.filter(v => ids.includes(v.id)).forEach(v => Object.assign(v, json)); res.writeHead(204); return res.end();
      }
      if (req.url.includes('token=eq.')) return responder(200, vitrinesF.filter(v => v.token === req.url.split('token=eq.')[1].split('&')[0]));
      if (/[?&]id=eq\./.test(req.url)) return responder(200, vitrinesF.filter(v => v.id === req.url.split('id=eq.')[1].split('&')[0]));
      return responder(200, vitrinesF.filter(v => v.conversa_id === req.url.split('conversa_id=eq.')[1].split('&')[0] && (!req.url.includes('enviada=eq.true') || v.enviada)));
    }
    if (req.url.startsWith('/rest/v1/alertas')) {
      if (req.method === 'POST') { alertasF.push({ id: crypto.randomUUID(), situacao: 'aberto', ...json }); res.writeHead(201); return res.end(); }
      const id = (req.url.match(/[?&]id=eq\.([0-9a-f-]+)/) || [])[1], venda = (req.url.match(/venda_id=eq\.([0-9a-f-]+)/) || [])[1];
      if (req.method === 'PATCH') {
        const a = alertasF.find(x => x.id === id);
        if (req.url.includes('notificado_em=is.null') && a.notificado_em) return responder(200, []);
        Object.assign(a, json);
        if ((req.headers.prefer || '').includes('return=representation')) return responder(200, [a]);
        res.writeHead(204); return res.end();
      }
      const u = new URL(req.url, 'http://x'), q = k => (u.searchParams.get(k) || '').replace(/^eq\./, '');
      if (u.searchParams.get('notificado_em') === 'is.null') {
        const [ate, desde] = u.searchParams.getAll('quando').map(x => x.replace(/^(lte|gte)\./, ''));
        return responder(200, alertasF.filter(a => a.situacao === 'aberto' && !a.notificado_em && (a.quando || '') <= ate && (a.quando || '') >= desde));
      }
      if (u.searchParams.get('conversa_id')) return responder(200, alertasF.filter(a => a.conversa_id === q('conversa_id') && a.tipo === q('tipo') && a.situacao === 'aberto'));
      if (u.searchParams.get('escalado_em') === 'is.null') return responder(200, alertasF.filter(a => a.situacao === 'aberto' && !a.assumido_por && !a.escalado_em && u.searchParams.get('tipo').includes(a.tipo) && (a.criado_em || '') < u.searchParams.get('criado_em').replace(/^lt\./, '')));
      return responder(200, alertasF.filter(a => (id && a.id === id) || (venda && a.venda_id === venda && a.situacao === 'aberto')));
    }
    if (req.url.startsWith('/rest/v1/push_inscricoes')) {
      const u = new URL(req.url, 'http://x');
      if (req.method === 'POST') { const i = pushF.findIndex(x => x.endpoint === json.endpoint); if (i >= 0) Object.assign(pushF[i], json); else pushF.push({ id: crypto.randomUUID(), ...json }); res.writeHead(201); return res.end(); }
      if (req.method === 'DELETE') {
        const id = (u.searchParams.get('id') || '').replace(/^eq\./, ''), ep = (u.searchParams.get('endpoint') || '').replace(/^eq\./, '');
        for (let i = pushF.length - 1; i >= 0; i--) if ((id && pushF[i].id === id) || (ep && pushF[i].endpoint === ep)) pushF.splice(i, 1);
        res.writeHead(204); return res.end();
      }
      if (req.method === 'PATCH') { res.writeHead(204); return res.end(); }
      const ids = (u.searchParams.get('usuario_id') || '').replace(/^in\.\(|\)$/g, '').split(',');
      return responder(200, pushF.filter(x => ids.includes(x.usuario_id)));
    }
    if (req.url.startsWith('/push/')) { pushRecebidos.push({ url: req.url, headers: req.headers, corpo: bruto }); res.writeHead(req.url.includes('expirada') ? 410 : 201); return res.end(); }
    if (req.url.startsWith('/rest/v1/tarefas?id=eq.') && req.method === 'PATCH' && json && json.feita === true && !json.tipo) { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/vendas')) {
      if (req.method === 'POST') { const v = { id: crypto.randomUUID(), situacao: 'vendido', ...json }; vendasF.push(v); return responder(201, [v]); }
      const id = (req.url.match(/id=eq\.([0-9a-f-]+)/) || [])[1];
      if (req.method === 'PATCH') { Object.assign(vendasF.find(v => v.id === id), json); res.writeHead(204); return res.end(); }
      return responder(200, vendasF.filter(v => v.id === id));
    }
    if (req.url.startsWith('/rest/v1/sugestoes?id=eq.') && req.method === 'GET') return responder(200, [{ conversa_id: '11111111-1111-1111-1111-111111111111', ferramentas: { produto_oferecido: iaOferta || null, vitrines: iaVitrines || [] } }]);
    if (req.url.startsWith('/rest/v1/apartamentos')) {
      if (req.method === 'PATCH') { const n = Number(req.url.split('numero=eq.')[1]); Object.assign(aptosF.find(x => x.numero === n), json); res.writeHead(204); return res.end(); }
      return responder(200, aptosF);
    }
    if (req.url.startsWith('/rest/v1/fotos_biblioteca')) {
      if (req.method === 'GET') return responder(200, fotosBib);
      // mesma regra do banco (migrações 011 e 024): só .jpg e .mp4
      if (req.method === 'POST' && !/^[A-Za-z0-9_.-]+\.(jpg|mp4)$/.test(json.arquivo || '')) return responder(400, { code: '23514', message: 'new row for relation "fotos_biblioteca" violates check constraint "fotos_biblioteca_arquivo_check"' });
      if (req.method === 'POST') { const i = fotosBib.findIndex(f => f.arquivo === json.arquivo); if (i >= 0) Object.assign(fotosBib[i], json); else fotosBib.push({ ordem: 100, criado_em: new Date().toISOString(), ...json }); res.writeHead(201); return res.end(); }
      if (req.method === 'PATCH') { const a = decodeURIComponent(req.url.split('arquivo=eq.')[1]); Object.assign(fotosBib.find(f => f.arquivo === a), json); res.writeHead(204); return res.end(); }
    }
    if (req.url.startsWith('/graph/531727826009907/owned_whatsapp_business_accounts')) return responder(200, { data: [{ id: 'WABA1', phone_numbers: { data: [{ id: '111' }] } }] });
    if (req.url.startsWith('/graph/WABA1/message_templates') && req.method === 'GET') return responder(200, { data: [
      { name: 'retorno_de_contato', language: 'pt_BR', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'Olá, {{1}}! Aqui é a equipe do Hotel Cabanas. Podemos seguir?' }, { type: 'FOOTER', text: 'Hotel Cabanas' }] },
      { name: 'extra_confirmado', language: 'pt_BR', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'Olá, {{1}}! ✅ Seu pedido no Hotel Cabanas está reservado: {{2}}, {{3}}. O valor vai na conta da hospedagem, acertado no check-out. Qualquer dúvida, é só responder esta mensagem.' }] },
      { name: 'massagem_aviso', language: 'pt_BR', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'Olá, {{1}}! Atualização do pedido de massagem do Hotel Cabanas: {{2}}. Obrigado!' }] },
      { name: 'promo', language: 'pt_BR', status: 'PENDING', category: 'MARKETING', components: [{ type: 'BODY', text: 'Promoção' }] },
      { name: 'com_foto', language: 'pt_BR', status: 'APPROVED', category: 'MARKETING', components: [{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'Veja' }] }] });
    if (req.url === '/graph/WABA1/message_templates' && req.method === 'POST') return json.name === 'ruim' ? responder(400, { error: { message: 'Invalid', error_user_msg: 'Nome em uso' } }) : responder(200, { id: 't1', status: 'PENDING', category: json.category });
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
    if (req.url === '/rest/v1/rpc/equipe_por_email') { const b = JSON.parse(corpo); return responder(200, b.p_email === 'equipe@teste.com' ? [{ id: 'u-1', nome: 'Equipe', papel: 'atendente' }] : b.p_email === 'dono@teste.com' ? [{ id: 'u-dono', nome: 'Ricardo', papel: 'dono' }] : []); }
    if (req.method === 'PATCH' && (req.url.startsWith('/rest/v1/conversas?') || req.url.startsWith('/rest/v1/contatos?'))) { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/negocios?id=eq.') && req.method === 'GET') return responder(200, req.url.includes('NEG-NAO') ? [] : [{ id: req.url.split('id=eq.')[1].split('&')[0], etapa: 'novo', responsavel_id: null, contato_id: 'k-2' }]);
    if (req.url.startsWith('/rest/v1/negocios?id=eq.') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url === '/rest/v1/negocios' && req.method === 'POST') return responder(201, [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ...json }]);
    if (req.url === '/rest/v1/contatos' && req.method === 'POST') return responder(201, [{ id: 'k-novo', ...json }]);
    if (req.url.startsWith('/rest/v1/contato_identificadores?tipo=eq.whatsapp&valor=in.')) return responder(200, decodeURIComponent(req.url).includes('+5567999990000') ? [{ contato_id: 'k-1', contato: { nome: 'Cliente Teste' } }] : []);
    if (req.url.startsWith('/rest/v1/contato_identificadores?contato_id=eq.')) return responder(200, req.url.includes('k-sem') ? [] : [{ id: 'i-1', valor: '+5567988887777' }]);
    if (req.url.startsWith('/rest/v1/contato_identificadores?id=eq.') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url === '/rest/v1/contato_identificadores' || req.url === '/rest/v1/negocio_eventos' || (req.url === '/rest/v1/tarefas' && req.method === 'POST')) { res.writeHead(201); return res.end(); }
    if (req.url.startsWith('/rest/v1/tarefas?id=eq.') && req.method === 'GET') return responder(200, [tarefaGetF || { negocio_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', tipo: 'Ligar' }]);
    if (req.url.startsWith('/rest/v1/tarefas?id=eq.') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/produtos?ativo=eq.true')) return responder(200, PRODS);
    if (req.url.startsWith('/rest/v1/respostas?ativo=eq.true')) return responder(200, [{ id: 'r-1', pergunta: 'Aceita pet?', resposta: 'Não aceitamos pets, {nome}.', fixa: true }, { id: 'r-2', pergunta: 'Fica longe do centro?', resposta: 'São 6 km de asfalto.', fixa: false }, { id: 'r-3', pergunta: 'Qual o horário do café?', resposta: 'O café é das 7h às 10h.', fixa: false, origem: 'correcao' }]);
    if ((req.url === '/rest/v1/produtos' || req.url === '/rest/v1/agencias' || req.url === '/rest/v1/respostas') && req.method === 'POST') { if (json && json.codigo === 'DUP') return responder(409, {}); res.writeHead(201); return res.end(); }
    if (/^\/rest\/v1\/(produtos|agencias|respostas|sugestoes)\?id=eq\./.test(req.url) && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/rest/v1/respostas?id=eq.') && req.method === 'GET') return responder(200, [{ usos: 4 }]);
    if (req.url === '/rest/v1/sugestoes' && req.method === 'POST') return responder(201, [{ id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' }]);
    if (req.url.startsWith('/rest/v1/usuarios?ativo=eq.true&select=email')) return responder(200, [{ email: 'Nova@Hotel.com' }, { email: 'convidado@hotel.com' }]);
    if (req.url === '/auth/v1/admin/users' && req.method === 'POST') return json.email === 'convidado@hotel.com' ? responder(422, { msg: 'already registered' }) : responder(200, { id: 'au-novo', email: json.email });
    if (req.url === '/auth/v1/admin/generate_link' && req.method === 'POST') return responder(200, { id: 'au-1', email: json.email, hashed_token: 'hash-' + json.email, verification_type: 'magiclink' });
    if (req.url.startsWith('/auth/v1/admin/users?')) return responder(200, { users: [{ id: 'au-1', email: 'convidado@hotel.com', email_confirmed_at: null }] });
    if (req.url === '/auth/v1/admin/users/au-1' && req.method === 'PUT') return responder(200, { id: 'au-1' });
    if (req.url.startsWith('/rest/v1/usuarios?')) return responder(200, [{ id: 'u-1', nome: 'Equipe', papel: 'atendente' }]);
    if (req.url.startsWith('/rest/v1/conversas?') && req.url.includes('select=contato_id')) return responder(200, [{ contato_id: 'k-1' }]);
    if (req.url.startsWith('/rest/v1/conversas?')) return responder(200, [{ id: '11111111-1111-1111-1111-111111111111', canal: 'wa', numero_id: '111', status: 'aberta', gilberto_pausado: autoPausado,
      ultima_msg_cliente_em: new Date(Date.now() - (janelaAberta ? 3600e3 : 30 * 3600e3)).toISOString(),
      contato: { contato_identificadores: [{ tipo: 'whatsapp', valor: '+5567999990000' }] } }]);
    if (req.url.startsWith('/rest/v1/mensagens?') && req.url.includes('direcao=eq.entrada&select=id&order=')) return responder(200, autoUltimaId ? [{ id: autoUltimaId }] : []);
    if (req.url.startsWith('/rest/v1/mensagens?') && req.url.includes('autor=eq.gilberto')) return responder(200, []);
    if (req.url.startsWith('/rest/v1/mensagens?')) return responder(200, [
      { direcao: 'entrada', tipo: 'text', corpo: 'Tem vaga de 14 a 16/11 para 2 adultos?', enviada_em: '2026-10-02T10:01:00Z', id_externo: 'wamid.CLIENTE' },
      { direcao: 'saida', tipo: 'text', corpo: 'Oi! Vou ver para você.', enviada_em: '2026-10-02T10:00:30Z' },
      { direcao: 'entrada', tipo: 'text', corpo: 'Oi', enviada_em: '2026-10-02T10:00:00Z' }]);
    if (req.url.split('?')[0] === '/v1/messages') {
      const b = JSON.parse(corpo);
      ultimoPedidoIA = { corpo: b, beta: req.headers['anthropic-beta'] || '' };
      pedidosIA.push(b);
      if (b.stream && JSON.stringify(b.system || '').includes('<base_do_hotel>')) { // preparação de documento (streaming)
        const txt = JSON.stringify({ titulo: 'Gruta do Lago Azul', resumo: 'Regras de visita da gruta.', conteudo: '- A visita é contemplativa.\n\n- **P:** Pode nadar?\n  **R:** Não, só contemplar.', conflitos: ['O documento diz check-in às 14h; a base diz 15h.'], alertas: [] });
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        const ev = (t, d) => res.write(`event: ${t}\ndata: ${JSON.stringify({ type: t, ...d })}\n\n`);
        ev('message_start', { message: { id: 'msg_d', type: 'message', role: 'assistant', model: b.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } });
        ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
        ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: txt } });
        ev('content_block_stop', { index: 0 });
        ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 20 } });
        ev('message_stop', {});
        return res.end();
      }
      const jaConsultou = b.messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'tool_result'));
      if (iaOrcamento && !jaConsultou) return responder(200, { id: 'msg_o', type: 'message', role: 'assistant', model: b.model, stop_reason: 'tool_use', stop_sequence: null,
        content: [{ type: 'tool_use', id: 'toolu_o', name: 'gerar_orcamento', input: { data_entrada: emDias(400), data_saida: emDias(402), adultos: 2, idades_criancas: [3], opcoes: [{ acomodacoes: ['BGE'] }, { acomodacoes: ['STD'] }], persona: 'familia', pessoas_aptas_combo: 2, frase_de_abertura: 'Ana, separei as opções para a família curtir os rios', sugerida: 'BGE' } }],
        usage: { input_tokens: 10, output_tokens: 20 } });
      if (iaAuto === 'extras') return responder(200, jaConsultou
        ? { id: 'msg_xf', type: 'message', role: 'assistant', model: b.model, stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20 },
            content: [{ type: 'text', text: JSON.stringify({ mensagem: 'Para deixar a estadia ainda melhor, separei os momentos especiais: ' + (JSON.parse(b.messages.at(-1).content[0].content).link || (process.env.URL_PUBLICA || 'https://crm-377803250649.southamerica-east1.run.app').replace(/\/$/, '') + '/e/' + 'k'.repeat(22)), notas_internas: '', precisa_equipe: false, produto_oferecido: 'MASS' }) }] }
        : { id: 'msg_x', type: 'message', role: 'assistant', model: b.model, stop_reason: 'tool_use', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20 },
            content: [{ type: 'tool_use', id: 'toolu_x1', name: 'enviar_link_extras', input: { tema: 'momentos' } }] });
      if (iaAuto === 'reclamacao') return responder(200, jaConsultou
        ? { id: 'msg_rf', type: 'message', role: 'assistant', model: b.model, stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20 },
            content: [{ type: 'text', text: JSON.stringify({ mensagem: 'Sinto muito pelo transtorno, Ana. Já passei para o responsável, que vai entrar em contato com você. Posso te ajudar com mais alguma coisa enquanto isso?', notas_internas: 'Reclamação do ar-condicionado.', precisa_equipe: true, produto_oferecido: '' }) }] }
        : { id: 'msg_r', type: 'message', role: 'assistant', model: b.model, stop_reason: 'tool_use', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20 },
            content: [{ type: 'tool_use', id: 'toolu_r1', name: 'abrir_alerta', input: { motivo: 'reclamacao', prioridade: 1, resumo: 'Ar-condicionado da cabana não funciona.' } }] });
      if (iaAuto === 'erro') return responder(400, { type: 'error', error: { type: 'invalid_request_error', message: 'falha de teste' } });
      if (iaAuto === 'laco' && !(b.tool_choice && b.tool_choice.type === 'none')) return responder(200, { id: 'msg_l', type: 'message', role: 'assistant', model: b.model, stop_reason: 'tool_use', stop_sequence: null,
        content: [{ type: 'tool_use', id: 'toolu_l' + b.messages.length, name: 'consultar_disponibilidade', input: { data_entrada: emDias(40), data_saida: emDias(43), adultos: 2, idades_criancas: [] } }], usage: { input_tokens: 10, output_tokens: 20 } });
      if (iaAuto === 'laco' || iaAuto === 'marcador') return responder(200, { id: 'msg_m', type: 'message', role: 'assistant', model: b.model, stop_reason: 'end_turn', stop_sequence: null,
        content: [{ type: 'text', text: JSON.stringify({ mensagem: iaAuto === 'laco' ? 'Separei as opções para novembro! A **Cabana Casal** sai por *R$ 2.111,40*. Qual semana fica melhor?' : 'Segue o orçamento: [[ORCAMENTO_COMBINADO]]', notas_internas: 'Combinação de duas cabanas.', precisa_equipe: false, produto_oferecido: '' }) }],
        usage: { input_tokens: 10, output_tokens: 20 } });
      if (iaAuto && !jaConsultou) return responder(200, { id: 'msg_a', type: 'message', role: 'assistant', model: b.model, stop_reason: 'tool_use', stop_sequence: null,
        content: iaAuto === 'pix' ? [{ type: 'tool_use', id: 'toolu_a1', name: 'criar_reserva', input: { opcao_codigo: 'STD', aceite_cliente_literal: 'tem vaga de 14 a 16/11', titular_nome_completo: 'Ana Souza Lima', email: 'ana@exemplo.com', acompanhantes: [] } },
          { type: 'tool_use', id: 'toolu_a2', name: 'gerar_cobranca', input: { forma: 'pix', percentual: 50 } }]
          : [{ type: 'tool_use', id: 'toolu_a3', name: 'gerar_cobranca', input: { forma: 'pix', percentual: 50 } }],
        usage: { input_tokens: 10, output_tokens: 20 } });
      if (iaAuto) return responder(200, { id: 'msg_af', type: 'message', role: 'assistant', model: b.model, stop_reason: 'end_turn', stop_sequence: null,
        content: [{ type: 'text', text: JSON.stringify({ mensagem: iaAuto === 'pix' ? 'Reserva garantida, Ana! 🌿\n---\n[[PIX]]' : 'Antes de te mandar o Pix, preciso confirmar a reserva. Qual o nome completo do titular?', notas_internas: '', precisa_equipe: false, produto_oferecido: '' }) }],
        usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } });
      if (iaPix && !jaConsultou) return responder(200, { id: 'msg_p', type: 'message', role: 'assistant', model: b.model, stop_reason: 'tool_use', stop_sequence: null,
        content: [{ type: 'tool_use', id: 'toolu_p0', name: 'criar_reserva', input: { opcao_codigo: 'BGE', aceite_cliente_literal: 'pode reservar o bangalô', titular_nome_completo: 'Ana Souza Lima', email: 'ana@exemplo.com', acompanhantes: [] } },
          { type: 'tool_use', id: 'toolu_p1', name: 'criar_reserva', input: { opcao_codigo: 'BGE', aceite_cliente_literal: 'tem vaga de 14 a 16/11', titular_nome_completo: 'Ana Souza Lima', email: 'ana@exemplo.com', acompanhantes: ['Theo Lima'] } },
          { type: 'tool_use', id: 'toolu_p2', name: 'gerar_cobranca', input: { forma: 'pix', percentual: 50 } },
          { type: 'tool_use', id: 'toolu_p3', name: 'abrir_alerta', input: { motivo: 'reserva_urgente', prioridade: 3, resumo: 'Ana aceitou o Bangalô Especial e vai pagar o sinal no Pix.' } }],
        usage: { input_tokens: 10, output_tokens: 20 } });
      if (iaPix) return responder(200, { id: 'msg_pf', type: 'message', role: 'assistant', model: b.model, stop_reason: 'end_turn', stop_sequence: null,
        content: [{ type: 'text', text: JSON.stringify({ mensagem: 'Perfeito, Ana! Vou deixar tudo pronto 🌿\n---\n[[PIX]]', notas_internas: 'Criar a reserva no Silbeck.', precisa_equipe: true, produto_oferecido: '' }) }],
        usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } });
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
  process.env.VIDEO_LIMITE = String(1024 * 1024); process.env.VIDEO_MIN_KBPS = '100'; // nos testes, o "limite do WhatsApp" é 1 MB
  process.env.PIX_INTERVALO_MS = '0';
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
    const c1 = chamadas.findLast(c => c.url === '/rest/v1/rpc/registrar_entrada_whatsapp');
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
    // CRM instalável no celular: service worker, manifesto e ícones
    for (const f of ['/o/icone-192.png', '/o/icone-512.png', '/o/icone-maskable-512.png', '/o/icone-180.png', '/o/icone-aviso.png']) assert.equal((await fetch(base + f)).status, 200, f);
    const sw = await fetch(base + '/sw.js');
    assert.equal(sw.headers.get('cache-control'), 'no-cache'); assert.ok((await sw.text()).includes("addEventListener('push'"));
    const mf = await fetch(base + '/manifest.webmanifest');
    assert.equal(mf.headers.get('content-type'), 'application/manifest+json');
    const man = await mf.json(); assert.equal(man.start_url, '/caixa'); assert.equal(man.display, 'standalone');
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
    // Link do CRM alterado pelo corretor ("east1" → "education"): não sai para o cliente
    r = await enviar('token-equipe', { conversa_id: conv, baloes: ['Seu orçamento:', 'https://crm-377803250649.southamerica-education.run.app/o/abc'] });
    assert.equal(r.status, 400); assert.ok((await r.json()).erro.includes('southamerica-education.run.app'));
    assert.equal((await enviar('token-equipe', { conversa_id: conv, texto: 'Veja: https://crm-377803250649.southamerica-east1.run.app/o/abc' })).status, 200, 'link certo passa');
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
    r = await api('/api/vagas?inicio=' + emDias(1) + '&dias=60', null, 'token-equipe', 'GET');
    const vm = await r.json();
    assert.equal(r.status, 200); assert.equal(vm.dias.length, 60, 'mapa da aba Vagas: 60 noites numa consulta'); assert.ok(vm.tipos.every(t => t.vagas.length === 60 && Number(t.total) > 0));

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
    // Nova conversa pelo WhatsApp com modelo aprovado (contato novo ou fora da janela)
    r = await api('/api/modelos?numero_id=111', null, 'token-equipe', 'GET');
    const mj = await r.json();
    assert.equal(r.status, 200, JSON.stringify(mj));
    assert.deepEqual(mj.modelos.map(m => [m.nome, m.status, m.variaveis, m.suportado]), [['retorno_de_contato', 'APPROVED', 1, true], ['extra_confirmado', 'APPROVED', 3, true], ['massagem_aviso', 'APPROVED', 2, true], ['promo', 'PENDING', 0, true], ['com_foto', 'APPROVED', 0, false]]);
    r = await api('/api/iniciar-conversa', { telefone: '(67) 98123-4567', nome: 'Paula Lima', numero_id: '111', modelo: 'retorno_de_contato', idioma: 'pt_BR', variaveis: ['Paula'] });
    const ic = await r.json();
    assert.equal(r.status, 200, JSON.stringify(ic));
    const tpl = chamadas.findLast(c => c.url === '/graph/111/messages' && c.corpo.type === 'template').corpo;
    assert.deepEqual([tpl.to, tpl.template.name, tpl.template.language.code, tpl.template.components[0].parameters[0].text], ['5567981234567', 'retorno_de_contato', 'pt_BR', 'Paula']);
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/contato_identificadores' && c.metodo === 'POST').corpo.valor, '+5567981234567');
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/rpc/registrar_saida_whatsapp').corpo.p_corpo, 'Olá, Paula! Aqui é a equipe do Hotel Cabanas. Podemos seguir?\n\nHotel Cabanas');
    assert.equal((await api('/api/iniciar-conversa', { telefone: '67 98123-4567', numero_id: '111', modelo: 'promo', variaveis: [] })).status, 400, 'modelo em análise');
    assert.equal((await api('/api/iniciar-conversa', { telefone: '67 98123-4567', numero_id: '111', modelo: 'com_foto', variaveis: [] })).status, 400, 'modelo com imagem');
    assert.equal((await api('/api/iniciar-conversa', { telefone: '67 98123-4567', numero_id: '111', modelo: 'retorno_de_contato', variaveis: [''] })).status, 400, 'variável vazia');
    assert.equal((await api('/api/iniciar-conversa', { telefone: '123', numero_id: '111', modelo: 'retorno_de_contato', variaveis: ['A'] })).status, 400);
    r = await api('/api/iniciar-conversa', { conversa_id: conv, modelo: 'retorno_de_contato', variaveis: ['Cliente'] });
    assert.equal(r.status, 200, 'fora da janela, na conversa que já existe');
    r = await api('/api/modelo', { numero_id: '111', nome: 'Aviso de Chegada!', categoria: 'UTILITY', texto: 'Olá, {{1}}! Seu check-in é amanhã a partir das 15h.' });
    assert.equal(r.status, 200);
    const nm = chamadas.findLast(c => c.url === '/graph/WABA1/message_templates' && c.metodo === 'POST').corpo;
    assert.deepEqual([nm.name, nm.language, nm.components[0].example.body_text[0][0]], ['aviso_de_chegada', 'pt_BR', 'Ana']);
    assert.equal((await api('/api/modelo', { numero_id: '111', nome: 'x', categoria: 'UTILITY', texto: 'Olá {{2}} tudo bem com você?' })).status, 400, 'variáveis fora de ordem');
    assert.equal((await api('/api/modelo', { numero_id: '111', nome: 'ruim', categoria: 'UTILITY', texto: 'Texto qualquer de teste' })).status, 400);
    r = await api('/api/numeros', null, 'token-equipe', 'GET');
    assert.deepEqual((await r.json()).numeros, [{ id: '111', numero: '15551829766' }]);
    // Alertas de atendimento: pede pessoa / reclamação / cancelamento / alteração → para quem está de plantão
    r = await api('/api/plantao', { usuario_id: 'u-1' });
    assert.equal(r.status, 400, 'id inválido');
    r = await api('/api/plantao', { usuario_id: 'aaaaaaaa-1111-1111-1111-111111111111' });
    assert.equal(r.status, 200); assert.deepEqual(configF.plantao, { usuario_id: 'aaaaaaaa-1111-1111-1111-111111111111' });
    const msgCliente = (id, body) => JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: '111' }, contacts: [{ wa_id: '5567999990000', profile: { name: 'Cliente Teste' } }], messages: [{ from: '5567999990000', id, timestamp: '1700000300', type: 'text', text: { body } }] } }] }] });
    alertasF.length = 0;
    await postar(msgCliente('wamid.H1', 'Quero falar com uma pessoa, por favor'));
    assert.deepEqual(alertasF.map(a => [a.tipo, a.titulo, a.para_id]), [['atendimento_humano', 'Pede atendimento humano', 'aaaaaaaa-1111-1111-1111-111111111111']]);
    await postar(msgCliente('wamid.H2', 'alguém aí? quero falar com um atendente'));
    assert.equal(alertasF.length, 1, 'não repete enquanto o alerta está aberto');
    await postar(msgCliente('wamid.H3', 'Qual a política de cancelamento?'));
    assert.equal(alertasF.length, 1, 'pergunta sobre a regra não é pedido');
    await postar(msgCliente('wamid.H4', 'Preciso cancelar minha reserva'));
    assert.equal(alertasF.at(-1).tipo, 'cancelamento'); assert.ok(alertasF.at(-1).info.includes('Preciso cancelar'));
    // Escalonamento: sem dono em 10 min → toda a equipe
    alertasF[0].criado_em = new Date(Date.now() - 11 * 60e3).toISOString(); alertasF[1].criado_em = new Date().toISOString();
    r = await fetch(base + '/cron/pix', { method: 'POST' });
    assert.equal((await r.json()).escalados, 1); assert.ok(alertasF[0].escalado_em && !alertasF[1].escalado_em);
    // Assumir: fica com quem assumiu e a conversa passa para essa pessoa
    r = await api('/api/alerta', { id: alertasF[1].id, acao: 'assumir' });
    assert.equal(r.status, 200); assert.equal(alertasF[1].assumido_por, 'u-1'); assert.equal(alertasF[1].situacao, 'aberto');
    assert.ok(chamadas.some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/conversas?id=eq.') && c.corpo.atribuida_a === 'u-1'));
    r = await api('/api/alerta', { id: alertasF[1].id });
    assert.equal(alertasF[1].situacao, 'resolvido');
    // Gilberto passa para a equipe (precisa_equipe na sugestão)
    alertasF.length = 0;
    const { detectarPedido } = require('./pedidos');
    assert.equal(detectarPedido('O quarto estava péssimo'), 'reclamacao'); assert.equal(detectarPedido('dá para remarcar?'), 'alteracao'); assert.equal(detectarPedido('tem vaga?'), null);
    // Avisos no celular (Web Push): chave, inscrição, teste, aviso de alerta (plantão x todos), sem repetir, aparelho que saiu
    {
      const fetchReal = globalThis.fetch;
      const ecdhAp = crypto.createECDH('prime256v1'); ecdhAp.generateKeys(); const authAp = crypto.randomBytes(16);
      const hm = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
      const decifrar = b => { // como o navegador faz (RFC 8291)
        const sal = b.subarray(0, 16), n = b[20], asPub = b.subarray(21, 21 + n), ct = b.subarray(21 + n);
        const prk = hm(sal, hm(hm(authAp, ecdhAp.computeSecret(asPub)), Buffer.concat([Buffer.from('WebPush: info\0'), ecdhAp.getPublicKey(), asPub, Buffer.from([1])])));
        const d = crypto.createDecipheriv('aes-128-gcm', hm(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16), hm(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12));
        d.setAuthTag(ct.subarray(-16)); const t = Buffer.concat([d.update(ct.subarray(0, -16)), d.final()]);
        assert.equal(t.at(-1), 2); return JSON.parse(t.subarray(0, -1).toString('utf8'));
      };
      assert.equal((await (await api('/api/push-chave', null, 'token-equipe', 'GET')).json()).chave, null, 'sem chave no cofre: avisos desligados');
      assert.equal((await api('/api/push-teste', {})).status, 503);
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
      process.env.VAPID_CHAVE = JSON.stringify(privateKey.export({ format: 'jwk' }));
      const chavePub = (await (await api('/api/push-chave', null, 'token-equipe', 'GET')).json()).chave;
      assert.equal(Buffer.from(chavePub, 'base64url').length, 65);
      assert.equal((await api('/api/push-inscrever', { endpoint: 'https://servidor-qualquer.com/x', p256dh: 'AAAA', auth: 'BBBB' })).status, 400, 'só serviços de push conhecidos');
      r = await api('/api/push-inscrever', { endpoint: 'https://fcm.googleapis.com/fcm/send/aparelho1', p256dh: ecdhAp.getPublicKey().toString('base64url'), auth: authAp.toString('base64url'), aparelho: 'Android · Chrome' });
      assert.equal(r.status, 200); assert.deepEqual(pushF.map(x => [x.usuario_id, x.aparelho]), [['u-1', 'Android · Chrome']]);
      globalThis.fetch = (u, o) => String(u).startsWith('https://fcm.googleapis.com/') ? fetchReal(process.env.SUPABASE_URL + 'push/' + String(u).split('/').pop(), o) : fetchReal(u, o);
      try {
        assert.equal((await (await api('/api/push-teste', {})).json()).enviados, 1);
        const env = pushRecebidos.at(-1);
        assert.equal(env.headers['content-encoding'], 'aes128gcm'); assert.equal(env.headers.ttl, '3600');
        const [, jwt, k] = env.headers.authorization.match(/^vapid t=([\w-]+\.[\w-]+\.[\w-]+), k=([\w-]+)$/);
        assert.equal(k, chavePub);
        const [h, d, sig] = jwt.split('.');
        assert.ok(crypto.verify('sha256', Buffer.from(h + '.' + d), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')), 'assinatura VAPID válida');
        assert.equal(JSON.parse(Buffer.from(d, 'base64url')).aud, 'https://fcm.googleapis.com');
        assert.equal(decifrar(env.corpo).corpo, 'Teste: os avisos estão chegando neste aparelho ✓');
        // Alertas: atendimento vai para o plantão (outra pessoa: este aparelho não recebe); produto pedido vai para todos;
        // o agendado (8h do check-in) espera a hora; o antigo não é avisado; nada se repete
        alertasF.length = 0;
        const agora = Date.now(), mk = (tipo, quando, extra) => ({ id: crypto.randomUUID(), tipo, titulo: tipo === 'reclamacao' ? 'Reclamação' : 'Cliente pediu produto', info: 'Combo · R$ 340,00', conversa_id: conv, situacao: 'aberto', quando: new Date(quando).toISOString(), ...extra });
        alertasF.push(mk('reclamacao', agora - 1000, { para_id: 'outra-pessoa' }), mk('produto_pedido', agora - 2000), mk('lancar_conta', agora + 3600e3), mk('produto_pedido', agora - 3 * 3600e3));
        const antes = pushRecebidos.length;
        const { notificarAlertas } = require('./server');
        assert.equal(await notificarAlertas(), 1);
        assert.equal(pushRecebidos.length, antes + 1);
        const m = decifrar(pushRecebidos.at(-1).corpo);
        assert.ok(m.titulo.startsWith('Cliente pediu produto')); assert.equal(m.url, '/caixa#c=' + conv); assert.equal(m.tag, alertasF[1].id);
        assert.ok(alertasF[0].notificado_em && alertasF[1].notificado_em && !alertasF[2].notificado_em && !alertasF[3].notificado_em);
        assert.equal(await notificarAlertas(), 0, 'não avisa duas vezes');
        // Escalonamento avisa todos (inclusive quem não estava de plantão)
        alertasF[0].criado_em = new Date(agora - 11 * 60e3).toISOString();
        r = await fetch(base + '/cron/pix', { method: 'POST' });
        assert.equal((await r.json()).escalados, 1);
        assert.ok(decifrar(pushRecebidos.at(-1).corpo).titulo.startsWith('Ninguém assumiu: Reclamação'));
        // Aparelho que cancelou (410): a inscrição é apagada
        pushF.push({ id: crypto.randomUUID(), usuario_id: 'u-1', endpoint: 'https://fcm.googleapis.com/fcm/send/expirada', p256dh: ecdhAp.getPublicKey().toString('base64url'), auth: authAp.toString('base64url') });
        assert.equal((await (await api('/api/push-teste', {})).json()).enviados, 1);
        assert.deepEqual(pushF.map(x => x.endpoint), ['https://fcm.googleapis.com/fcm/send/aparelho1']);
        await api('/api/push-cancelar', { endpoint: 'https://fcm.googleapis.com/fcm/send/aparelho1' });
        assert.equal(pushF.length, 0);
      } finally { globalThis.fetch = fetchReal; delete process.env.VAPID_CHAVE; alertasF.length = 0; }
    }
    // Cobrança por Pix (E1): simulador
    r = await api('/api/cobranca', { conversa_id: conv, tipo: 'sinal', valor: '1254,60', descricao: 'Sinal do Bangalô' });
    const cj1 = await r.json();
    assert.equal(r.status, 200, JSON.stringify(cj1));
    assert.ok(/^CAB[A-Za-z0-9]{26}$/.test(cj1.cobranca.txid) && cj1.cobranca.copia_e_cola.includes('SIMULADOR') && cj1.cobranca.valor === 1254.6 && cj1.cobranca.fonte === 'simulador');
    assert.ok(chamadas.some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/negocios?id=eq.') && c.corpo.etapa === 'pag'), 'card em Aguardando pagamento');
    assert.equal((await api('/api/cobranca', { conversa_id: conv, valor: '0' })).status, 400);
    r = await fetch(base + '/cron/pix', { method: 'POST' });
    assert.deepEqual(await r.json(), { ok: true, verificadas: 1, pagas: 0, vencidas: 0, escalados: 0, avisos: 0, retomar: { criadas: 0, fechadas: 0 }, retomadas: 0, resumo: 0, massagem: { avisos: 0, expirados: 0 } });
    r = await api('/api/cobranca-acao', { id: cobrancasF[0].id, acao: 'simular_pagamento' });
    assert.equal((await r.json()).pagas, 1);
    assert.deepEqual([cobrancasF[0].situacao, cobrancasF[0].valor_pago, cobrancasF[0].pagador], ['paga', 1254.6, 'Cliente de teste']);
    assert.ok(chamadas.some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/negocios?id=eq.') && c.corpo.etapa === 'res'), 'card em Reservado');
    assert.equal(alertasF.at(-1).tipo, 'pagamento_recebido'); assert.ok(alertasF.at(-1).info.includes('R$ 1.254,60'));
    assert.equal(chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo.tipo, 'Confirmar a reserva');
    // Etapa 1 do Silbeck real (dono, 07/10/2026): com o Pix do BB em teste, nada de Pix fictício nem pagamento simulado
    {
      const { travaReservas } = require('./server'), antes = process.env.SILBECK_MODO;
      assert.equal(travaReservas(), false, 'no simulador, tudo liberado');
      process.env.SILBECK_MODO = 'real';
      try {
        assert.equal(travaReservas(), true, 'Silbeck real + Pix em teste: reservas e Pix automáticos travados');
        const nC = cobrancasF.length;
        r = await api('/api/cobranca', { conversa_id: conv, tipo: 'sinal', valor: '100' });
        assert.equal(r.status, 409); assert.ok((await r.json()).erro.includes('Pix do BB ainda está em modo de teste'));
        assert.equal(cobrancasF.length, nC, 'nenhum Pix fictício');
        assert.equal((await api('/api/cobranca-acao', { id: cobrancasF[0].id, acao: 'simular_pagamento' })).status, 409, 'nada de pagamento simulado no Silbeck real');
        r = await api('/api/fechar-reserva', { conversa_id: conv, forma: 'pix', opcao_codigo: 'STD' });
        assert.equal(r.status, 409, 'Pix recusado antes de criar a reserva');
        const G = require('./gilberto');
        assert.ok(G._contextoTurno({ modo: 'automatico', reservasPelaEquipe: true }).includes('RESERVA E PAGAMENTO NESTA FASE'));
      } finally { if (antes === undefined) delete process.env.SILBECK_MODO; else process.env.SILBECK_MODO = antes; }
    }
    // Prazo: 48 h; 2 h com check-in em até 3 dias; nunca depois das 15h do check-in
    const { prazoCobranca } = require('./server');
    const ag = new Date('2026-10-02T12:00:00Z');
    assert.equal(prazoCobranca('2026-11-20', ag).toISOString(), '2026-10-04T12:00:00.000Z');
    assert.equal(prazoCobranca('2026-10-03', ag).toISOString(), '2026-10-02T14:00:00.000Z');
    assert.equal(prazoCobranca('2026-10-02', new Date('2026-10-02T18:30:00Z')).toISOString(), '2026-10-02T19:00:00.000Z');
    // Vencida
    r = await api('/api/cobranca', { conversa_id: conv, tipo: 'total', valor: 300 });
    const cv = cobrancasF.at(-1); cv.expira_em = new Date(Date.now() - 60000).toISOString();
    r = await fetch(base + '/cron/pix', { method: 'POST' });
    assert.equal((await r.json()).vencidas, 1); assert.equal(cv.situacao, 'expirada'); assert.equal(alertasF.at(-1).tipo, 'cobranca_vencida');
    // Banco do Brasil real (contra o BB falso): OAuth, cobrança com chave e valor, consulta e baixa
    Object.assign(process.env, { BB_MODO: 'real', BB_CLIENT_ID: 'bb-id', BB_CLIENT_SECRET: 'bb-sec', BB_APP_KEY: 'bb-key', BB_CHAVE_PIX: '12345678000199', BB_AMBIENTE: 'producao', BB_API_URL: process.env.SUPABASE_URL.replace(/\/$/, '') + '/bb/pix', BB_OAUTH_URL: process.env.SUPABASE_URL.replace(/\/$/, '') + '/bb/oauth' });
    r = await api('/api/cobranca', { conversa_id: conv, tipo: 'sinal', valor: 500 });
    const cr = await r.json();
    assert.equal(r.status, 200, JSON.stringify(cr));
    const put = chamadas.findLast(c => c.url.startsWith('/bb/pix/cob/') && c.metodo === 'PUT').corpo;
    assert.deepEqual([put.valor.original, put.chave, put.calendario.expiracao > 7000], ['500.00', '12345678000199', true]);
    assert.equal(cr.cobranca.copia_e_cola, '00020126BB' + cr.cobranca.txid); assert.equal(cr.cobranca.fonte, 'bb');
    assert.equal((await api('/api/cobranca-acao', { id: cobrancasF.at(-1).id, acao: 'simular_pagamento' })).status, 400, 'simular só no simulador');
    bbPago = true;
    r = await fetch(base + '/cron/pix', { method: 'POST' });
    assert.equal((await r.json()).pagas, 1);
    assert.deepEqual([cobrancasF.at(-1).situacao, cobrancasF.at(-1).e2e_id, cobrancasF.at(-1).pagador, cobrancasF.at(-1).valor_pago], ['paga', 'E123', 'ANA SOUZA', 500]);
    process.env.BB_MODO = 'simulador';
    // Entrada da equipe: o CRM cria/confirma o login de quem está liberado em "usuarios" (e só dessa pessoa)
    const prep = email => fetch(base + '/entrar/preparar', { method: 'POST', body: JSON.stringify({ email }) });
    r = await prep('nova@hotel.com');
    assert.equal(r.status, 200);
    const adm = chamadas.findLast(c => c.url === '/auth/v1/admin/users' && c.metodo === 'POST');
    assert.deepEqual(adm.corpo, { email: 'nova@hotel.com', email_confirm: true });
    const nAdm = chamadas.filter(c => c.url.startsWith('/auth/v1/admin')).length;
    r = await prep('estranho@hotel.com');
    assert.deepEqual([r.status, await r.json()], [200, { ok: true }], 'mesma resposta para quem não é da equipe');
    assert.equal(chamadas.filter(c => c.url.startsWith('/auth/v1/admin')).length, nAdm, 'não cria login para quem não está liberado');
    await prep('convidado@hotel.com');
    assert.deepEqual(chamadas.findLast(c => c.url === '/auth/v1/admin/users/au-1').corpo, { email_confirm: true }, 'convite pendente: confirma');
    // Conectar outro aparelho (iPhone com o CRM instalado): código de 6 dígitos, 5 min, uso único, sem e-mail
    {
      const entrarAp = codigo => fetch(base + '/entrar/aparelho', { method: 'POST', body: JSON.stringify({ codigo }) });
      assert.equal((await entrarAp('123')).status, 400);
      const cj = await (await api('/api/conectar-aparelho', {})).json();
      assert.ok(/^\d{6}$/.test(cj.codigo) && new Date(cj.expira) > new Date());
      const errado = String((Number(cj.codigo) + 1) % 1e6).padStart(6, '0');
      assert.equal((await entrarAp(errado)).status, 400);
      r = await entrarAp(cj.codigo);
      assert.deepEqual(await r.json(), { ok: true, token_hash: 'hash-equipe@teste.com' }, 'entra como quem gerou o código');
      assert.deepEqual(chamadas.findLast(c => c.url === '/auth/v1/admin/generate_link').corpo, { type: 'magiclink', email: 'equipe@teste.com' });
      assert.equal((await entrarAp(cj.codigo)).status, 400, 'uso único');
      const c2 = (await (await api('/api/conectar-aparelho', {})).json()).codigo, c3 = (await (await api('/api/conectar-aparelho', {})).json()).codigo;
      if (c2 !== c3) assert.equal((await entrarAp(c2)).status, 400, 'código novo cancela o anterior');
      for (let i = 0; i < 10; i++) await entrarAp(String((Number(c3) + 1 + i) % 1e6).padStart(6, '0'));
      assert.equal((await entrarAp(c3)).status, 400, 'muitas tentativas erradas derrubam os códigos');
      assert.equal((await fetch(base + '/api/conectar-aparelho', { method: 'POST', body: '{}' })).status, 401, 'só quem está logado gera código');
    }
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
    // Fotos escolhidas para o produto (do Drive ou do Banco de fotos): ordem, capa e só fotos do Banco
    r = await api('/api/produto', { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', fotos: ['BOIA-1.jpg', 'BGE-2.jpg', 'BOIA-1.jpg'] });
    assert.equal(r.status, 200, await r.clone().text());
    const pfo = chamadas.findLast(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/produtos?id=eq.')).corpo;
    assert.deepEqual([pfo.fotos, pfo.foto], [['BOIA-1.jpg', 'BGE-2.jpg'], 'BOIA-1.jpg']);
    assert.equal((await api('/api/produto', { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', fotos: ['naoexiste.jpg'] })).status, 400);
    assert.equal((await api('/api/produto', { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', fotos: ['../x'] })).status, 400);
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
    const { fotosDoProduto } = require('./server');
    assert.deepEqual(fotosDoProduto({ fotos: ['BGE-2.jpg', 'sumiu.jpg'], foto: 'BOIA-1.jpg', grupo_fotos: 'BOIA' }), ['BGE-2.jpg'], 'fotos escolhidas valem (só as que estão no Banco)');
    assert.deepEqual(fotosDoProduto({ fotos: [], foto: 'BOIA-1.jpg', grupo_fotos: 'BGE' }), ['BOIA-1.jpg', 'BGE-1.jpg', 'BGE-2.jpg']);
    assert.ok(vh.includes('Aventuras no <em>Rio Formoso</em>') && vh.includes('data-codigo="COMBO"') && !vh.includes('data-codigo="DECO"') && vh.includes('src="/fotos/BOIA-1.jpg"') && vh.includes('noindex'));
    assert.equal((await fetch(base + '/e/' + 'y'.repeat(22))).status, 404);
    const pedir = (itens, t = vtok) => fetch(base + '/e/' + t + '/pedido', { method: 'POST', body: JSON.stringify({ itens }) });
    const nV = vendasF.length;
    r = await pedir([{ codigo: 'COMBO', quantidade: 2, data: emDias(41), adicionais: [] }]);
    const pj = await r.json();
    assert.equal(r.status, 200, JSON.stringify(pj));
    assert.equal(pj.avisado, true); assert.ok(!pj.whatsapp || !pj.whatsapp.includes('?text='), 'cliente já avisado: sem mensagem pronta');
    assert.deepEqual(vendasF.slice(nV).map(v => [v.produto_codigo, v.quantidade, v.valor_total, v.data_uso]), [['COMBO', 2, 340, emDias(41)]]);
    assert.ok(alertasF.findLast(a => a.tipo === 'produto_pedido').info.includes('escolheu na página de extras'));
    assert.ok(vitrinesF[0].pedido_em && vitrinesF[0].pedido[0].codigo === 'COMBO');
    // o cliente recebe na hora a confirmação de que o pedido chegou (dono, 06/10/2026)
    const ack = chamadas.findLast(c => c.url === '/graph/111/messages' && c.corpo.type === 'text').corpo.text.body;
    assert.ok(ack.startsWith('Recebi seu pedido') && ack.includes('• Combo boia cross + arvorismo · 2 pessoas · R$ 340') && ack.includes('reservar o horário'), ack);
    // a equipe marca ✓ Reservado com dia e horário: o cliente recebe a confirmação no WhatsApp
    {
      const al = alertasF.findLast(a => a.tipo === 'produto_pedido' && a.situacao === 'aberto');
      const vd = vendasF.find(v => v.id === al.venda_id);
      const nEnv = chamadas.length;
      r = await api('/api/alerta', { id: al.id, acao: 'reservado', data_uso: emDias(41), horario: '9h' });
      const rj = await r.json();
      assert.equal(r.status, 200, JSON.stringify(rj)); assert.equal(rj.avisado, true, JSON.stringify(rj));
      assert.equal(al.situacao, 'resolvido'); assert.equal(vd.horario, '9h');
      const conf = chamadas.slice(nEnv).findLast(c => c.url === '/graph/111/messages' && c.corpo.type === 'text').corpo.text.body;
      assert.ok(conf.includes('Seu pedido está reservado') && conf.includes('📅 Dia ' + emDias(41).slice(8, 10) + '/' + emDias(41).slice(5, 7) + ' às 9h'), conf);
      assert.equal((await api('/api/alerta', { id: al.id, acao: 'reservado' })).status, 200, 'já resolvido: não manda de novo');
      assert.equal(chamadas.slice(nEnv).filter(c => c.url === '/graph/111/messages').length, 1);
      // janela de 24 h fechada: a confirmação vai pelo modelo aprovado "extra_confirmado"
      al.situacao = 'aberto'; janelaAberta = false;
      r = await api('/api/alerta', { id: al.id, acao: 'reservado', horario: '14h' });
      const rm = await r.json(); janelaAberta = true;
      assert.equal(rm.avisado, true, JSON.stringify(rm));
      const tpl = chamadas.findLast(c => c.url === '/graph/111/messages').corpo;
      assert.equal(tpl.type, 'template'); assert.equal(tpl.template.name, 'extra_confirmado');
      assert.deepEqual(tpl.template.components[0].parameters.map(x => x.text).slice(1), ['Combo boia cross + arvorismo para 2 pessoas', 'dia ' + emDias(41).slice(8, 10) + '/' + emDias(41).slice(5, 7) + ' às 14h']);
    }
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
    assert.ok(vh2.includes('class="vt-hora"') && vh2.includes('À beira do rio'), 'massagem: horário e local');
    assert.equal((await pedir([{ codigo: 'MASS', variacao: 'Massagem360', quantidade: 1, data: emDias(41) }], vt2)).status, 400, 'massagem sem horário');
    configF.parceira_massagem = { nome: 'Natália', whatsapp: '+5567992286365' };
    const nMs = chamadas.length;
    r = await pedir([{ codigo: 'MASS', variacao: 'Massagem360', adicionais: ['Pedras quentes'], quantidade: 2, data: emDias(41), horario: '09:00', local: 'À beira do rio' }, { codigo: 'DECO', variacao: 'Simples', quantidade: 1, data: emDias(40) }], vt2);
    assert.equal(r.status, 200, await r.clone().text());
    assert.deepEqual(vendasF.slice(-2).map(v => [v.produto_codigo, v.variacao, v.valor_total, v.horario]), [['MASS', 'Massagem360', 540, '09:00'], ['DECO', 'Simples', 350, null]]);
    // Massagem: o pedido vai direto para a Natália com [Confirmo] [Não posso]
    {
      const aguardar = async (cond, ms = 8000) => { const fim = Date.now() + ms; while (!cond() && Date.now() < fim) await new Promise(ok => setTimeout(ok, 50)); return cond(); };
      const pdm = pedidosParceiroF.at(-1);
      assert.deepEqual([pdm.situacao, pdm.horario, pdm.local, !!pdm.enviado_em, !!pdm.expira_em], ['aguardando_parceiro', '09:00', 'À beira do rio', true, true]);
      const envs = chamadas.slice(nMs).filter(c => c.url === '/graph/111/messages').map(c => c.corpo);
      const pedidoNat = envs.find(c => c.type === 'interactive' && c.interactive.type === 'cta_url');
      assert.ok(pedidoNat && pedidoNat.interactive.body.text.includes('Massagem360 · 2 pessoas') && pedidoNat.interactive.action.parameters.url.endsWith('/p/' + pdm.token_parceiro), JSON.stringify(envs));
      const ackM = envs.find(c => c.type === 'text' && c.text.body.startsWith('Recebi seu pedido')).text.body;
      assert.ok(ackM.includes('Já pedi a confirmação do horário à massoterapeuta') && ackM.includes('às 9h'), ackM);
      assert.ok(!alertasF.some(a => a.venda_id === vendasF.at(-2).id && a.tipo === 'produto_pedido'), 'massagem automática: sem alerta de pedir à mão');
      pedidosParceiroF.push({ id: crypto.randomUUID(), situacao: 'confirmado', data: emDias(41), horario: '10:00', opcoes: [] });
      assert.ok((await (await fetch(base + '/e/' + vt2)).text()).includes('&quot;10:00&quot;'), 'horários tomados vão para a página');
      assert.equal((await pedir([{ codigo: 'MASS', variacao: 'Massagem360', quantidade: 1, data: emDias(41), horario: '10:00', local: 'No quarto' }], vt2)).status, 409, 'horário já tomado');
      pedidosParceiroF.pop();
      // A conta (WABA) de cada número é aprendida dos avisos da Meta
      await postar(JSON.stringify({ entry: [{ id: '999000111', changes: [{ value: { metadata: { phone_number_id: '222' }, statuses: [] } }] }] }));
      assert.equal((configF.wabas || {})['222'], '999000111');
      // Mensagem da Natália nunca vai para o Gilberto
      const nNat = chamadas.length;
      await postar(JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: '111' }, contacts: [{ wa_id: '556792286365', profile: { name: 'Natália' } }], messages: [{ from: '556792286365', id: 'wamid.NAT1', timestamp: '1700000400', type: 'text', text: { body: 'Oi, vi o pedido!' } }] } }] }] }));
      await new Promise(ok => setTimeout(ok, 300));
      assert.ok(!chamadas.slice(nNat).some(c => c.url.split('?')[0] === '/v1/messages'), 'o Gilberto não responde à parceira');
      // Página da Natália: indica 2 horários; o hóspede recebe o link para escolher
      const pg = await (await fetch(base + '/p/' + pdm.token_parceiro)).text();
      assert.ok(pg.includes('Pedido de <em>massagem</em>') && pg.includes('ms-op'), pg.slice(pg.indexOf('<main>'), pg.indexOf('<main>') + 900));
      const nOp = chamadas.length;
      r = await fetch(base + '/p/' + pdm.token_parceiro, { method: 'POST', body: JSON.stringify({ acao: 'opcoes', opcoes: [{ data: emDias(41), horario: '15:00' }, { data: emDias(41), horario: '16:00' }] }) });
      assert.equal(r.status, 200, await r.clone().text());
      assert.equal(pdm.situacao, 'opcoes_enviadas'); assert.equal(pdm.opcoes.length, 2);
      const ctaCli = chamadas.slice(nOp).find(c => c.url === '/graph/111/messages' && c.corpo.type === 'interactive').corpo.interactive;
      assert.ok(ctaCli.action.parameters.url.endsWith('/mc/' + pdm.token_cliente));
      // O hóspede escolhe as 16h: confirmado para ele, para a equipe e para a Natália
      assert.ok((await (await fetch(base + '/mc/' + pdm.token_cliente)).text()).includes('Quero este horário'));
      const nEs = chamadas.length; alertasF.length = 0;
      r = await fetch(base + '/mc/' + pdm.token_cliente, { method: 'POST', body: JSON.stringify({ acao: 'escolher', opcao: 1 }) });
      assert.equal(r.status, 200, await r.clone().text());
      assert.deepEqual([pdm.situacao, pdm.horario], ['confirmado', '16:00']); assert.equal(vendasF.at(-2).horario, '16:00');
      const txs = chamadas.slice(nEs).filter(c => c.url === '/graph/111/messages' && c.corpo.type === 'text').map(c => c.corpo.text.body);
      assert.ok(txs.some(t => t.includes('Seu pedido está reservado') && t.includes('às 16h')), JSON.stringify(txs));
      assert.ok(txs.some(t => t.startsWith('O hóspede escolheu')), 'a Natália fica sabendo');
      assert.ok(alertasF.some(a => a.tipo === 'parceiro_confirmou'));
      assert.equal((await fetch(base + '/mc/' + pdm.token_cliente, { method: 'POST', body: JSON.stringify({ acao: 'escolher', opcao: 0 }) })).status, 409);
      // Janela da Natália fechada: o aviso vai sozinho pelo modelo massagem_aviso (sem tarefa para a equipe)
      pdm.situacao = 'opcoes_enviadas'; janelaAberta = false; alertasF.length = 0;
      const nJf = chamadas.length;
      r = await fetch(base + '/mc/' + pdm.token_cliente, { method: 'POST', body: JSON.stringify({ acao: 'escolher', opcao: 0 }) });
      janelaAberta = true;
      assert.equal(r.status, 200);
      const tpls = chamadas.slice(nJf).filter(c => c.url === '/graph/111/messages' && c.corpo.type === 'template').map(c => c.corpo.template);
      const av = tpls.find(t => t.name === 'massagem_aviso');
      assert.ok(av && av.components[0].parameters[1].text.startsWith('o hóspede escolheu') && !av.components[0].parameters[1].text.includes('Obrigado'), JSON.stringify(tpls));
      assert.ok(!alertasF.some(a => a.titulo === 'Avise a massoterapeuta'), 'nada fica para a equipe');
      // 3 h sem resposta: aviso à equipe; 24 h: expira sem mandar nada para a Natália
      pedidosParceiroF.push({ id: crypto.randomUUID(), situacao: 'aguardando_parceiro', servico: 'Massagem360', data: emDias(42), horario: '10:00', opcoes: [], adicionais: [], conversa_id: conv, token_parceiro: 'q'.repeat(22), enviado_em: new Date(Date.now() - 4 * 3600e3).toISOString(), expira_em: new Date(Date.now() + 20 * 3600e3).toISOString() },
        { id: crypto.randomUUID(), situacao: 'aguardando_parceiro', servico: 'Massagem360', data: emDias(43), horario: '10:00', opcoes: [], adicionais: [], conversa_id: conv, token_parceiro: 'w'.repeat(22), enviado_em: new Date(Date.now() - 25 * 3600e3).toISOString(), expira_em: new Date(Date.now() - 3600e3).toISOString() });
      alertasF.length = 0; const nCr = chamadas.length;
      await fetch(base + '/cron/pix', { method: 'POST' });
      assert.deepEqual(alertasF.filter(a => a.tipo === 'parceiro_sem_resposta').map(a => a.titulo).sort(), ['Massagem: pedido expirou (24 h)', 'Massagem: sem resposta há 3 h']);
      assert.equal(pedidosParceiroF.at(-1).situacao, 'expirado');
      assert.ok(!chamadas.slice(nCr).some(c => c.url === '/graph/111/messages'), 'nada vai para a Natália');
      pedidosParceiroF.length = 0; delete configF.parceira_massagem; alertasF.length = 0;
    }
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

    // Rota de carro até o hotel no Google Maps
    {
      const g2 = require('./gilberto');
      const rt = g2.rotaAteHotel('Campo Grande, MS');
      assert.ok(rt.ok && rt.link.startsWith('https://www.google.com/maps/dir/?api=1&origin=Campo%20Grande%2C%20MS&destination=Hotel%20Cabanas') && rt.link.endsWith('&travelmode=driving'), rt.link);
      assert.equal(g2.rotaAteHotel(' ').ok, false);
    }
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
    assert.deepEqual(pi.tools.map(t => t.name), ['consultar_disponibilidade', 'gerar_orcamento', 'criar_reserva', 'gerar_cobranca', 'enviar_fotos', 'enviar_video', 'abrir_alerta', 'enviar_link_extras', 'consultar_documentos', 'rota_ate_o_hotel']);
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
    assert.deepEqual(resOrc.opcoes.map(o => o.codigo), ['STD', 'BGE'], 'da mais em conta para a maior, mesmo pedindo a mais cara primeiro');
    assert.ok(resOrc.opcoes[0].valor_total <= resOrc.opcoes[1].valor_total);
    assert.deepEqual(resOrc.opcoes.map(o => !!o.sugerida), [false, true], 'a sugestão segue a opção marcada, não a posição');
    assert.ok(/\/o\/[A-Za-z0-9_-]{22}$/.test(resOrc.link));
    assert.equal(sug3.orcamentos.length, 1); assert.equal(sug3.simulador, true);
    assert.ok(JSON.stringify(pedidosIA[0].messages).includes('Reserva: ainda não paga'), 'o Gilberto sabe que ainda não é hora dos extras');
    // Aceite: o Gilberto confere vaga e preço e prepara a reserva + o Pix (nada é criado antes de a equipe aprovar)
    // e passa o caso para a equipe; depois a equipe aprova: reserva NÃO CONFIRMADA no Silbeck + Pix; o Pix cai: o CRM
    // lança o pagamento no Silbeck e a reserva confirma sozinha
    {
      iaPix = true; pedidosIA.length = 0; alertasF.length = 0;
      const nCob = cobrancasF.length, nRes = reservasF.length;
      r = await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-equipe' }, body: JSON.stringify({ conversa_id: conv }) });
      const sp = await r.json(); iaPix = false;
      assert.equal(r.status, 200, JSON.stringify(sp));
      const res = pedidosIA[1].messages.at(-1).content.map(c => JSON.parse(c.content));
      assert.equal(res[0].ok, false, 'aceite que o cliente não escreveu: recusa'); assert.ok(res[0].erro.includes('aceite'));
      assert.equal(res[1].ok, true, JSON.stringify(res[1])); assert.equal(res[1].pendente_aprovacao, true);
      assert.equal(res[2].marcador, '[[PIX]]'); assert.equal(res[3].ok, true);
      const bge = orcs.at(-1).opcoes.find(o => o.codigo === 'BGE');
      assert.deepEqual([sp.reserva.opcao_codigo, sp.reserva.titular, sp.reserva.valor_total], ['BGE', 'Ana Souza Lima', bge.valor_total]);
      assert.deepEqual([sp.pagamento.forma, sp.pagamento.percentual, sp.pagamento.valor], ['pix', 50, Math.round(bge.valor_total * 50) / 100]);
      assert.ok(sp.mensagem.includes('[[PIX]]'));
      assert.equal(cobrancasF.length, nCob, 'nenhum Pix antes de a equipe aprovar'); assert.equal(reservasF.length, nRes, 'nenhuma reserva antes de a equipe aprovar');
      assert.deepEqual(alertasF.map(a => [a.tipo, a.titulo]), [['gilberto_passou', 'Gilberto: Reserva urgente (check-in em até 3 dias)']], 'um alerta só, com o motivo (sem duplicar pelo precisa_equipe)');
      alertasF.length = 0;
      // A equipe aprova: reserva no Silbeck (simulador) + Pix ligado à reserva
      r = await api('/api/fechar-reserva', { conversa_id: conv, ...sp.reserva, forma: 'pix', percentual: 50, origem: 'gilberto' });
      const fr = await r.json();
      assert.equal(r.status, 200, JSON.stringify(fr));
      const rv = reservasF.at(-1);
      assert.ok(/^\d+$/.test(rv.silbeck_id) && /^\d+$/.test(rv.silbeck_item_id), 'número e item da reserva do Silbeck');
      assert.deepEqual([rv.codigo, rv.titular, rv.situacao, rv.fonte, rv.forma_pagamento, rv.valor_total], ['BGE', 'Ana Souza Lima', 'nao_confirmada', 'simulador', 'pix', bge.valor_total]);
      assert.equal(fr.cobranca.reserva_id, rv.id); assert.equal(fr.cobranca.valor, Math.round(bge.valor_total * 50) / 100);
      assert.ok(chamadas.some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/negocios?id=eq.') && c.corpo.etapa === 'pag' && c.corpo.valor_previsto === bge.valor_total), 'card em Aguardando pagamento');
      assert.equal((await api('/api/fechar-reserva', { conversa_id: conv, ...sp.reserva, forma: 'pix', percentual: 50 })).status, 409, 'não duplica a reserva');
      assert.equal((await api('/api/fechar-reserva', { conversa_id: conv, ...sp.reserva, opcao_codigo: 'STD', titular: 'Ana', forma: 'pix', percentual: 50 })).status, 400, 'titular sem sobrenome');
      // O Pix cai: o CRM lança o adiantamento no Silbeck e a reserva confirma
      r = await api('/api/cobranca-acao', { id: fr.cobranca.id, acao: 'simular_pagamento' });
      assert.equal((await r.json()).pagas, 1);
      assert.equal(rv.situacao, 'confirmada', 'reserva confirmada no Silbeck pelo pagamento');
      assert.ok(chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo.descricao.includes('confirmada automaticamente'));
      // Cartão: reserva criada e tarefa do link da Cielo
      reservasF.length = 0;
      r = await api('/api/fechar-reserva', { conversa_id: conv, ...sp.reserva, opcao_codigo: 'STD', forma: 'cartao', percentual: 100 });
      const fc = await r.json();
      assert.equal(r.status, 200, JSON.stringify(fc)); assert.equal(fc.cobranca, null);
      assert.equal(chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo.tipo, 'Enviar link do cartão');
      reservasF.length = 0; alertasF.length = 0;
    }
    // Gilberto automático: responde sozinho à mensagem do cliente; reserva no Silbeck e só então manda o Pix
    {
      process.env.URL_INTERNA = base; process.env.GILBERTO_ESPERA_MS = '0';
      const aguardar = async (cond, ms = 8000) => { const fim = Date.now() + ms; while (!cond() && Date.now() < fim) await new Promise(ok => setTimeout(ok, 50)); return cond(); };
      const enviosMeta = () => chamadas.filter(c => c.url === '/graph/111/messages' && c.corpo && c.corpo.type === 'text');
      assert.equal((await api('/api/gilberto-auto', { ligado: true })).status, 200);
      assert.deepEqual(configF.gilberto_auto, { ligado: true });
      assert.equal((await api('/api/promocao', { ligada: true, percentual: 95 })).status, 400, 'desconto inválido');
      assert.equal((await api('/api/promocao', { ligada: false, percentual: 41, minimo_diarias: 2 })).status, 200);
      assert.deepEqual(configF.promocao_site, { ligada: false, percentual: 41, minimo_diarias: 2 });
      // 1) aceite + Pix: reserva criada pelo Gilberto e Pix ligado a ela, tudo enviado sem ninguém aprovar
      iaAuto = 'pix'; autoUltimaId = MSG_MIDIA; autoPausado = false;
      const nEnv = enviosMeta().length, nIA = pedidosIA.length;
      await postar(msgCliente('wamid.AUTO1', 'Pode reservar! Vou pagar no Pix'));
      assert.ok(await aguardar(() => enviosMeta().length >= nEnv + 3), 'o Gilberto respondeu sozinho (3 balões: texto, Pix e copia e cola)');
      const txt = enviosMeta().slice(nEnv).map(c => c.corpo.text.body);
      assert.equal(txt[0], 'Reserva garantida, Ana! 🌿'); assert.ok(txt[1].startsWith('Segue o Pix do sinal (50%)') && txt[1].includes('Agência 1031-6')); assert.ok(txt[2].includes('SIMULADOR'));
      assert.ok(/de \*R\$ [\d.,]+\*, válido até \*\d{2}\/\d{2} às \d{2}:\d{2}\*\./.test(txt[1]), 'valor e prazo do Pix em negrito');
      const rv = reservasF.at(-1);
      assert.deepEqual([rv.criado_por, rv.situacao, rv.codigo], ['gilberto', 'nao_confirmada', 'STD']);
      assert.equal(cobrancasF.at(-1).reserva_id, rv.id, 'o Pix é da reserva criada antes');
      assert.ok(chamadas.some(c => c.url === '/rest/v1/rpc/registrar_saida_whatsapp' && c.corpo.p_autor === 'gilberto'));
      assert.ok(JSON.stringify(pedidosIA.at(-1).messages).includes('MODO AUTOMÁTICO'));
      // 1b) o Pix cai: card em Reserva concluída e o Gilberto confirma ao cliente no WhatsApp, sem ninguém da equipe
      {
        process.env.GILBERTO_ESPERA_EXTRAS_MS = '0';
        const nConf = enviosMeta().length;
        const rp = await api('/api/cobranca-acao', { id: cobrancasF.at(-1).id, acao: 'simular_pagamento' });
        assert.equal((await rp.json()).pagas, 1);
        assert.equal(rv.situacao, 'confirmada');
        const todos = chamadas.filter(c => c.url === '/graph/111/messages' && !c.corpo.typing_indicator).slice(-10).map(c => c.corpo);
        assert.ok(chamadas.filter(c => c.url === '/graph/111/messages').slice(-12).filter(c => c.corpo.typing_indicator).length >= 4, '"digitando…" antes de cada mensagem');
        // Depois do pagamento: o aviso em texto e os dois links de extras (aventuras e momentos especiais)
        assert.ok(todos.at(-1).type === 'text' && todos.at(-1).text.body.startsWith('Muito obrigado por escolher o Cabanas, Ana!') && todos.at(-1).text.body.includes('de carro ou de avião'), JSON.stringify(todos.at(-1)));
        const fim = todos.slice(-4, -1);
        assert.ok(fim[0].type === 'text' && fim[0].text.body.startsWith('E para deixar a sua estadia ainda melhor'), JSON.stringify(fim[0]));
        assert.deepEqual(fim.slice(1).map(c => c.interactive.action.parameters.display_text).sort(), ['Ver as aventuras', 'Ver as opções']);
        const conf = enviosMeta().slice(nConf).map(c => c.corpo.text.body);
        // Voucher em PDF logo depois da confirmação (com foto da acomodação)
        const docs = chamadas.filter(c => c.url === '/graph/111/messages' && c.corpo && c.corpo.type === 'document').slice(-1);
        assert.ok(docs.length && /^Voucher-Hotel-Cabanas-Reserva-.+\.pdf$/.test(docs[0].corpo.document.filename), JSON.stringify(docs));
        const ordem = chamadas.filter(c => c.url === '/graph/111/messages' && c.corpo && !c.corpo.typing_indicator).slice(-6).map(c => c.corpo.type);
        assert.equal(ordem[0] + ',' + ordem[1], 'text,document', 'o voucher vem logo abaixo da confirmação: ' + ordem);
        const V = require('./voucher');
        assert.equal(V.fotoDaAcomodacao('QST'), V.fotoDaAcomodacao('STD'), 'quádruplo usa a foto do standard');
        const pdfCombo = await V.gerarVoucher({ silbeck_id: 7, codigo: 'XYZ+CBM', acomodacao: 'Cabana Master + Standard', itens: [{ nome: 'Cabana Master' }, { nome: 'Apartamento Standard' }], data_entrada: '2026-11-10', data_saida: '2026-11-12', adultos: 4, criancas_idades: [6], valor_total: 3000, fonte: 'simulador' }, { pago: 3000 });
        assert.equal(pdfCombo.subarray(0, 5).toString(), '%PDF-', 'voucher de combinação, pago 100%');
        assert.ok(conf[0] && conf[0].startsWith('Pagamento recebido, Ana! ✅ Sua reserva no Hotel Cabanas está confirmada') && conf[0].includes('Reserva nº ' + rv.silbeck_id) && conf[0].includes('é pago no check-out'), JSON.stringify(conf));
        const tf = chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo.descricao;
        assert.ok(tf.includes('O Gilberto já mandou a confirmação ao cliente no WhatsApp') && !tf.includes('mandar a confirmação'), tf);
        assert.ok(chamadas.some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/negocios?id=eq.') && c.corpo.etapa === 'res'), 'card em Reserva concluída');
      }
      // 1c) plano B: o CRM não consegue lançar no Silbeck → o Gilberto só avisa que a equipe está finalizando (não confirma);
      // a equipe lança no Silbeck e clica em "Já lancei no Silbeck": aí o Gilberto confirma e agradece
      {
        const cob0 = cobrancasF.at(-1);
        rv.situacao = 'nao_confirmada'; const itemAntes = rv.silbeck_item_id; rv.silbeck_item_id = null; delete rv.itens;
        cobrancasF.push({ ...cob0, id: crypto.randomUUID(), txid: 'CAB' + 'P'.repeat(26), situacao: 'ativa', valor_pago: null, pago_em: null });
        const nB = enviosMeta().length;
        assert.equal((await (await api('/api/cobranca-acao', { id: cobrancasF.at(-1).id, acao: 'simular_pagamento' })).json()).pagas, 1);
        assert.equal(rv.situacao, 'nao_confirmada', 'sem lançar no Silbeck, a reserva não é confirmada');
        const avB = enviosMeta().slice(nB).map(c => c.corpo.text.body);
        assert.ok(avB.length === 1 && avB[0].includes('A equipe está finalizando'), JSON.stringify(avB));
        const tB = chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo;
        assert.ok(tB.descricao.includes('Já lancei no Silbeck') && !tB.descricao.includes('já mandou a confirmação'), tB.descricao);
        tarefaGetF = { negocio_id: cob0.negocio_id, tipo: 'Ligar', feita: false };
        assert.equal((await api('/api/reserva-lancada', { tarefa_id: crypto.randomUUID() })).status, 404, 'só na tarefa de confirmar a reserva');
        tarefaGetF = { negocio_id: cob0.negocio_id, tipo: 'Confirmar a reserva', feita: false };
        const nL = enviosMeta().length;
        const rl = await api('/api/reserva-lancada', { tarefa_id: crypto.randomUUID() });
        assert.equal(rl.status, 200, await rl.clone().text());
        assert.equal(rv.situacao, 'confirmada');
        const cL = enviosMeta().slice(nL).map(c => c.corpo.text.body);
        assert.ok(cL[0].startsWith('Tudo certo, Ana! ✅ Sua reserva no Hotel Cabanas está confirmada') && cL[0].includes('Reserva nº ' + rv.silbeck_id), JSON.stringify(cL));
        assert.ok(cL.at(-1).startsWith('Muito obrigado por escolher o Cabanas, Ana!'), 'e o agradecimento');
        assert.ok(chamadas.some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/tarefas?id=eq.') && c.corpo.feita === true), 'tarefa concluída');
        tarefaGetF = { negocio_id: cob0.negocio_id, tipo: 'Confirmar a reserva', feita: true };
        assert.equal((await api('/api/reserva-lancada', { tarefa_id: crypto.randomUUID() })).status, 409, 'não manda duas vezes');
        tarefaGetF = null; rv.silbeck_item_id = itemAntes;
      }
      // 1d) reservas liberadas no Silbeck real com o Pix do BB em teste (dono, 09/10/2026): a reserva nasce no Silbeck,
      // nenhum Pix fictício sai, a equipe recebe a tarefa e o alerta, e o [[PIX]] vira o aviso de que a equipe manda o Pix
      {
        const S = require('./silbeck'), modoAntes = S.MODO, { travaReservas, pixPelaEquipe } = require('./server');
        S.MODO = () => 'real'; process.env.RESERVAS_AUTO = 'liberadas';
        try {
          assert.deepEqual([travaReservas(), pixPelaEquipe()], [false, true]);
          reservasF.length = 0; alertasF.length = 0; iaAuto = 'pix';
          const nCob = cobrancasF.length, nE = enviosMeta().length, nRes = reservasF.length;
          await postar(msgCliente('wamid.AUTO1D', 'Pode reservar! Vou pagar no Pix'));
          assert.ok(await aguardar(() => enviosMeta().length >= nE + 2), 'respondeu');
          const tx = enviosMeta().slice(nE).map(c => c.corpo.text.body);
          assert.equal(tx[0], 'Reserva garantida, Ana! 🌿');
          assert.ok(/^A equipe já está gerando o Pix do sinal \(50%\) de \*R\$ [\d.,]+\* e te manda aqui em instantes/.test(tx[1]), JSON.stringify(tx));
          assert.ok(!tx.some(t => t.includes('[[') || t.includes('copia e cola')), 'nada de Pix fictício nem marcador');
          assert.equal(reservasF.length, nRes + 1, 'a reserva foi criada'); assert.equal(reservasF.at(-1).situacao, 'nao_confirmada');
          assert.equal(cobrancasF.length, nCob, 'nenhuma cobrança no CRM');
          const tp = chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo;
          assert.equal(tp.tipo, 'Enviar Pix'); assert.ok(tp.descricao.includes('reserva ' + reservasF.at(-1).silbeck_id) && tp.descricao.includes('app do banco'), tp.descricao);
          assert.ok(await aguardar(() => alertasF.some(a => a.titulo === 'Gilberto: mandar o Pix')), 'a equipe é avisada');
          assert.ok(JSON.stringify(pedidosIA.at(-1).messages).includes('PIX NESTA FASE'));
          const res = pedidosIA.at(-1).messages.at(-1).content.map(x => x.content).join(' ');
          assert.ok(res.includes('pix_pela_equipe'), res);
          r = await api('/api/cobranca', { conversa_id: conv, tipo: 'sinal', valor: '100' });
          assert.equal(r.status, 409, 'o Pix do CRM continua travado');
          // 1e) número de teste da equipe: Pix SIMULADO mesmo com o Silbeck real; o pagamento simulado não lança nada no Silbeck
          configF.numeros_teste = { numeros: ['6799990000'] };
          reservasF.length = 0; alertasF.length = 0;
          const nCobT = cobrancasF.length, nET = enviosMeta().length;
          await postar(msgCliente('wamid.AUTO1E', 'Pode reservar! Vou pagar no Pix'));
          assert.ok(await aguardar(() => enviosMeta().length >= nET + 3), 'texto, Pix e copia e cola');
          const txT = enviosMeta().slice(nET).map(c => c.corpo.text.body);
          assert.ok(txT[1].startsWith('Segue o Pix do sinal (50%)') && txT[2].includes('SIMULADOR'), JSON.stringify(txT));
          assert.equal(cobrancasF.length, nCobT + 1); assert.equal(cobrancasF.at(-1).reserva_id, reservasF.at(-1).id);
          assert.ok(!JSON.stringify(pedidosIA.at(-1).messages).includes('PIX NESTA FASE'), 'na conversa de teste o Gilberto segue o fluxo normal do Pix');
          const rT = await api('/api/cobranca-acao', { id: cobrancasF.at(-1).id, acao: 'simular_pagamento' });
          assert.equal(rT.status, 200, await rT.clone().text());
          assert.equal(reservasF.at(-1).situacao, 'nao_confirmada', 'nada lançado no Silbeck: a reserva não confirma sozinha');
          const tT = chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo;
          assert.equal(tT.tipo, 'Confirmar a reserva'); assert.ok(tT.descricao.includes('Pix SIMULADO (teste): nada foi lançado no Silbeck') && !tT.descricao.includes('Depois de conferir'), tT.descricao);
          delete configF.numeros_teste;
          assert.equal((await api('/api/cobranca-acao', { id: cobrancasF.at(-1).id, acao: 'simular_pagamento' })).status, 409, 'fora dos números de teste, nada de pagamento simulado no Silbeck real');
        } finally { S.MODO = modoAntes; delete process.env.RESERVAS_AUTO; delete configF.numeros_teste; reservasF.length = 0; alertasF.length = 0; }
      }
      // 2) trava: sem reserva no Silbeck, o Pix não sai
      reservasF.length = 0; iaAuto = 'sem_reserva';
      const nCob = cobrancasF.length, n2 = enviosMeta().length;
      await postar(msgCliente('wamid.AUTO2', 'Manda o Pix'));
      assert.ok(await aguardar(() => enviosMeta().length >= n2 + 1));
      assert.equal(cobrancasF.length, nCob, 'sem reserva, nenhum Pix');
      const resTrava = JSON.parse(pedidosIA.at(-1).messages.at(-1).content[0].content);
      assert.equal(resTrava.ok, false); assert.ok(resTrava.erro.includes('depois da reserva'));
      // 2b) muitas consultas: na última rodada a IA responde sem ferramentas (o cliente não fica sem resposta)
      iaAuto = 'laco'; const nIAl = pedidosIA.length, nl = enviosMeta().length;
      await postar(msgCliente('wamid.AUTO2B', 'Faz um orçamento para 3 diárias em novembro'));
      assert.ok(await aguardar(() => enviosMeta().length >= nl + 1), 'respondeu mesmo depois de muitas consultas');
      assert.equal(pedidosIA.length - nIAl, 6); assert.deepEqual(pedidosIA.at(-1).tool_choice, { type: 'none' });
      assert.equal(enviosMeta().at(-1).corpo.text.body, 'Separei as opções para novembro! A *Cabana Casal* sai por *R$ 2.111,40*. Qual semana fica melhor?', 'negrito do WhatsApp com 1 asterisco');
      // Retomada automática: a última mensagem é do hotel; o Gilberto escreve mesmo assim (antes desistia calado com 409)
      {
        const G = require('./gilberto'), antes = iaAuto; iaAuto = 'marcador';
        const hist = [{ direcao: 'entrada', tipo: 'text', corpo: 'Quero um orçamento', enviada_em: '2026-10-02T10:00:00Z' }, { direcao: 'saida', tipo: 'text', corpo: 'Segue o orçamento!', enviada_em: '2026-10-02T10:01:00Z' }];
        await assert.rejects(G.sugerir(hist, { modo: 'automatico' }), e => e.http === 409, 'sem retomada: nada a responder');
        await G.sugerir(hist, { modo: 'automatico', retomada: true, gatilho: 'retomada automática: teste' });
        const ms = pedidosIA.at(-1).messages, ult = ms.filter(m => m.role !== 'system').at(-1);
        assert.ok(ult.role === 'user' && JSON.stringify(ult.content).includes('não é mensagem do cliente'), JSON.stringify(ult));
        assert.ok(JSON.stringify(ms.at(-1).content).includes('RETOMADA AUTOMÁTICA'));
        iaAuto = antes;
      }
      // 2c) resposta com dado a completar: o cliente recebe um aviso (nada de silêncio) e a equipe é chamada; o Gilberto segue na conversa
      iaAuto = 'marcador'; alertasF.length = 0; const nm = enviosMeta().length, nChm = chamadas.length;
      await postar(msgCliente('wamid.AUTO2C', 'Quero para 8 pessoas'));
      assert.ok(await aguardar(() => enviosMeta().length >= nm + 1));
      assert.ok(/vou confirmar um detalhe com a equipe/i.test(enviosMeta().at(-1).corpo.text.body), 'aviso de espera ao cliente');
      assert.ok(!enviosMeta().slice(nm).some(c => c.corpo.text.body.includes('[[')), 'o marcador nunca vai ao cliente');
      const pausouDesde = n => chamadas.slice(n).some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/conversas?id=eq.' + conv) && c.corpo.gilberto_pausado === true);
      assert.ok(!pausouDesde(nChm), 'avisar a equipe não pausa o Gilberto (dono, 06/10/2026)');
      assert.ok(await aguardar(() => alertasF.length > 0)); assert.equal(alertasF.at(-1).titulo, 'Gilberto: resposta para revisar'); assert.ok(alertasF.at(-1).info.includes('Combinação'));
      // 2d) a IA falha (mesmo tentando de novo): aviso ao cliente (sem repetir a mesma frase) e alerta, sem pausar
      iaAuto = 'erro'; alertasF.length = 0; process.env.GILBERTO_REPETIR_MS = '0'; const nIAe = pedidosIA.length, ne = enviosMeta().length;
      await postar(msgCliente('wamid.AUTO2D', 'Oi'));
      assert.ok(await aguardar(() => enviosMeta().length >= ne + 1));
      assert.ok(pedidosIA.length - nIAe >= 2, 'tentou de novo antes de desistir');
      assert.ok(/ainda estou vendo esse ponto com a equipe/i.test(enviosMeta().at(-1).corpo.text.body), 'segundo aviso seguido: outra frase');
      assert.ok(await aguardar(() => alertasF.length > 0)); assert.equal(alertasF.at(-1).titulo, 'Gilberto não conseguiu responder');
      assert.ok(!pausouDesde(nChm), 'nem a falha pausa o Gilberto');
      // 2e) reclamação: o Gilberto acolhe, avisa a equipe (alerta de reclamação) e continua na conversa
      iaAuto = 'reclamacao'; alertasF.length = 0; const nrc = enviosMeta().length, nChr = chamadas.length;
      await postar(msgCliente('wamid.AUTO2E', 'O ar-condicionado da cabana não funciona, estou muito chateada'));
      assert.ok(await aguardar(() => enviosMeta().length >= nrc + 1));
      assert.ok(enviosMeta().at(-1).corpo.text.body.startsWith('Sinto muito pelo transtorno'));
      assert.ok(await aguardar(() => alertasF.some(a => a.tipo === 'reclamacao')), JSON.stringify(alertasF));
      assert.ok(!pausouDesde(nChr), 'reclamação: avisa a equipe sem pausar');
      // 2f) o Gilberto oferece extras: o link vai como cartão com foto e botão, não no texto
      iaAuto = 'extras'; vitrinesF.length = 0; const nx = chamadas.length;
      await postar(msgCliente('wamid.AUTO2F', 'O que mais tem para fazer aí?'));
      assert.ok(await aguardar(() => chamadas.slice(nx).some(c => c.url === '/graph/111/messages' && c.corpo.type === 'interactive')));
      const env2f = chamadas.slice(nx).filter(c => c.url === '/graph/111/messages').map(c => c.corpo);
      assert.ok(env2f.find(c => c.type === 'text').text.body.startsWith('Para deixar a estadia ainda melhor') && !env2f.some(c => c.type === 'text' && c.text.body.includes('/e/')), JSON.stringify(env2f));
      assert.equal(env2f.find(c => c.type === 'interactive').interactive.action.parameters.display_text, 'Ver as opções');
      assert.equal(vitrinesF[0].enviada, true, 'conta como oferta');
      iaAuto = 'sem_reserva'; alertasF.length = 0;
      // 3) conversa assumida pela equipe: o Gilberto não responde
      autoPausado = true; const nIA3 = pedidosIA.length, n3 = enviosMeta().length;
      await postar(msgCliente('wamid.AUTO3', 'Oi?'));
      await new Promise(ok => setTimeout(ok, 400));
      assert.equal(pedidosIA.length, nIA3); assert.equal(enviosMeta().length, n3);
      // 4) quem responde à mão assume; o botão devolve ao Gilberto
      autoPausado = false;
      r = await api('/api/enviar', { conversa_id: conv, baloes: ['Oi, aqui é o Jagles!'] });
      assert.equal(r.status, 200);
      assert.ok(chamadas.some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/conversas?id=eq.' + conv) && c.corpo.gilberto_pausado === true), 'resposta à mão pausa o Gilberto');
      r = await api('/api/conversa-gilberto', { conversa_id: conv, pausado: false });
      assert.equal(r.status, 200);
      assert.ok(chamadas.findLast(c => c.metodo === 'PATCH' && c.url === '/rest/v1/conversas?id=eq.' + conv).corpo.gilberto_pausado === false);
      // 5) desligado no geral: não responde
      assert.equal((await api('/api/gilberto-auto', { ligado: false })).status, 200);
      const nIA5 = pedidosIA.length;
      await postar(msgCliente('wamid.AUTO5', 'Oi de novo'));
      await new Promise(ok => setTimeout(ok, 400));
      assert.equal(pedidosIA.length, nIA5, 'desligado: nada');
      // pedido interno sem o código desta instância é recusado
      assert.equal((await fetch(base + '/interno/gilberto', { method: 'POST', body: JSON.stringify({ conversa_id: conv, mensagem_id: MSG_MIDIA }) })).status, 403);
      iaAuto = null; autoUltimaId = null; reservasF.length = 0; alertasF.length = 0;
    }
    const salvo = orcs.at(-1);
    assert.equal(salvo.primeiro_nome, null); assert.equal(salvo.numero_whatsapp, '15551829766'); assert.equal(salvo.fonte, 'simulador');
    const tok = resOrc.link.split('/o/')[1];
    r = await fetch(base + '/o/' + tok);
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.ok(html.includes('Bangalô Especial') && html.includes('Apartamento Standard') && html.includes('valores fictícios'));
    // Benefícios antes das opções; opções da mais em conta para a maior
    assert.ok(html.indexOf('Por que o Cabanas') < html.indexOf('class="op') && html.includes('cercado por dois rios') && html.indexOf('Já está incluso') < html.indexOf('class="op'));
    assert.ok(html.includes('class="slogan">Seu lugar de conexão com a natureza<') && html.includes('acompanhamento de guia'), 'slogan e texto novo do Por que o Cabanas');
    assert.ok(html.indexOf('<h2>Apartamento Standard') < html.indexOf('<h2>Bangalô Especial'));
    assert.equal((html.match(/Nossa sugestão para vocês/g) || []).length, 1);
    assert.ok(html.indexOf('Nossa sugestão para vocês') > html.indexOf('<h2>Apartamento Standard') && html.indexOf('Nossa sugestão para vocês') < html.indexOf('<h2>Bangalô Especial'), 'selo no Bangalô (2ª opção)');
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
    // Extras pagos não aparecem no orçamento (são oferecidos depois da reserva paga); o servidor ainda aceita os de páginas antigas abertas
    assert.ok(!html.includes('class="ex-sel"') && !html.includes('data-codigo="DECO"') && html.includes('Depois de garantir a reserva'));
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
    // Vídeos (dono, 06/10/2026): do Drive para a biblioteca (MP4 até 16 MB), link público com Range e envio como vídeo
    {
      assert.equal((await trazer({ drive_id: 'VIDEO-GRANDE', grupo: 'INST', descricao: 'Vídeo institucional bruto', video: true })).status, 413, 'grande demais até para converter');
      assert.equal((await trazer({ drive_id: 'PDF-DRIVE', grupo: 'INST', descricao: 'Arquivo que não é vídeo', video: true })).status, 400, 'só vídeo');
      // Acima do limite do WhatsApp: o CRM reduz (ffmpeg) e guarda a versão leve
      assert.ok(VIDEO_GRANDE.length > 1024 * 1024, 'o vídeo de teste passa do limite');
      r = await trazer({ drive_id: 'VIDEO-REDUZIR', grupo: 'CBM', descricao: 'Vídeo da Cabana Master por dentro e por fora', video: true });
      const tr = await r.json();
      assert.equal(r.status, 200, JSON.stringify(tr));
      assert.ok(tr.reduzido && tr.reduzido.para < tr.reduzido.de, JSON.stringify(tr.reduzido));
      const sr = guardados.get('biblioteca/' + tr.foto.arquivo);
      assert.ok(sr.dados.length <= 1024 * 1024 && sr.dados.subarray(4, 8).toString() === 'ftyp', 'MP4 abaixo do limite');
      const fr = require('path').join(require('os').tmpdir(), 'teste-video-reduzido.mp4'); require('fs').writeFileSync(fr, sr.dados);
      const prob = JSON.parse(require('child_process').execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', fr]).toString());
      const vs = prob.streams.find(x => x.codec_type === 'video');
      assert.deepEqual([vs.codec_name, vs.height, prob.streams.some(x => x.codec_type === 'audio')], ['h264', 720, true], 'H.264 em 720p, com som');
      r = await trazer({ drive_id: 'VIDEO-DRIVE-01', grupo: 'INST', descricao: 'Vídeo institucional: os dois rios, as cabanas e as atividades', etiquetas: ['institucional', 'rios'], video: true });
      const tv = await r.json();
      assert.equal(r.status, 200, JSON.stringify(tv));
      assert.match(tv.foto.arquivo, /^INST-v[0-9a-f]{8}\.mp4$/); assert.equal(tv.foto.video, true);
      const sv = guardados.get('biblioteca/' + tv.foto.arquivo);
      assert.ok(sv && sv.mime === 'video/mp4' && sv.dados.length === MP4_DRIVE.length, 'vídeo inteiro no Storage');
      r = await fetch(base + '/videos/' + tv.foto.arquivo);
      assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'video/mp4'); assert.equal(Buffer.from(await r.arrayBuffer()).length, MP4_DRIVE.length);
      r = await fetch(base + '/videos/' + tv.foto.arquivo, { headers: { Range: 'bytes=0-9' } });
      assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 0-9/' + MP4_DRIVE.length); assert.equal(Buffer.from(await r.arrayBuffer()).length, 10);
      assert.equal((await fetch(base + '/videos/INST-v00000000.mp4')).status, 404);
      const orc = require('./orcamento');
      assert.ok(!orc.escolherFotos({ codigo_acomodacao: '', etiquetas: ['institucional'], quantidade: 5 }).some(f => orc.ehVideo(f.arquivo)), 'vídeo não entra como foto');
      assert.equal(orc.escolherVideo({ codigo_acomodacao: '', etiquetas: [] }).arquivo, tv.foto.arquivo, 'sem assunto: o institucional');
      assert.equal(orc.escolherVideo({ codigo_acomodacao: '', etiquetas: [] }, [tv.foto.arquivo]), null, 'nunca repete o que a conversa já recebeu');
      assert.equal(orc.escolherVideo({ codigo_acomodacao: 'CBM', etiquetas: [] }).arquivo, tr.foto.arquivo, 'o vídeo da Cabana Master');
      assert.equal(orc.escolherVideo({ codigo_acomodacao: 'BGE', etiquetas: [] }), null, 'sem vídeo do Bangalô Especial: nada (não manda outro qualquer)');
      const nMeta = chamadas.filter(c => c.url === '/graph/111/messages').length;
      assert.equal((await envF({ conversa_id: conv, fotos: [tv.foto.arquivo] })).status, 200);
      const mv = chamadas.filter(c => c.url === '/graph/111/messages').slice(nMeta)[0].corpo;
      assert.equal(mv.type, 'video'); assert.ok(mv.video.link.endsWith('/videos/' + tv.foto.arquivo));
      assert.ok(chamadas.some(c => c.url === '/rest/v1/rpc/registrar_saida_midia' && c.corpo.p_tipo === 'video' && c.corpo.p_mime === 'video/mp4'));
    }
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
    // Apartamentos pela numeração (migração 026): ligar foto a apartamento, descrição de cada um
    {
      const aptoF = c => fetch(base + '/api/foto-apartamento', { method: 'POST', headers: eq, body: JSON.stringify(c) });
      r = await aptoF({ arquivo: 'BGE-2.jpg', apartamento: 42 });
      assert.equal(r.status, 400); assert.ok((await r.json()).erro.includes('migração 026'), 'sem a tabela, avisa a migração');
      aptosF.push({ numero: 42, codigo_silbeck: 'BANG4C', categoria: 'BGE', descricao: null, ativo: true });
      assert.equal((await aptoF({ arquivo: 'BGE-2.jpg', apartamento: 42 })).status, 200);
      assert.equal(fotosBib.find(f => f.arquivo === 'BGE-2.jpg').apartamento, 42);
      const jf = await (await fetch(base + '/api/fotos', { headers: eq })).json();
      assert.deepEqual(jf.apartamentos.map(a => [a.numero, a.nome]), [[42, 'Bangalô Especial']]);
      assert.equal(jf.grupos.find(g => g.grupo === 'BGE').fotos.find(f => f.arquivo === 'BGE-2.jpg').apartamento, 42);
      assert.equal((await aptoF({ arquivo: 'BGE-2.jpg', apartamento: 99 })).status, 400, 'apartamento que não existe');
      assert.equal((await fetch(base + '/api/apartamento', { method: 'POST', headers: eq, body: JSON.stringify({ numero: 42, descricao: 'Duas camas king' }) })).status, 200);
      assert.equal(aptosF[0].descricao, 'Duas camas king');
      assert.equal((await aptoF({ arquivo: 'BGE-2.jpg', apartamento: null })).status, 200);
      assert.equal(fotosBib.find(f => f.arquivo === 'BGE-2.jpg').apartamento, null);
    }
    // volta ao estado inicial para os testes seguintes
    await statusF({ arquivo: tz.foto.arquivo, ativo: false });
    const { escolherFotos } = require('./orcamento');
    assert.deepEqual(escolherFotos({ codigo_acomodacao: 'BGE', etiquetas: [], quantidade: 5 }).map(f => f.arquivo), ['BGE-1.jpg', 'BGE-2.jpg']);
    assert.deepEqual(escolherFotos({ codigo_acomodacao: '', etiquetas: ['boia cross'], quantidade: 2 }).map(f => f.arquivo), ['BOIA-1.jpg']);
    assert.deepEqual(escolherFotos({ codigo_acomodacao: 'CBM', etiquetas: [], quantidade: 2 }), []);
    { // Fotos de acomodação (dono, 06/10/2026): uma de fora e uma do quarto; banheiro só se o cliente pedir (banco real)
      const k = require.resolve('./orcamento'), velho = require.cache[k], dirAntes = process.env.FOTOS_DIR;
      process.env.FOTOS_DIR = require('path').join(__dirname, 'public', 'fotos'); delete require.cache[k];
      const real = require('./orcamento');
      const desc = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'public', 'fotos', 'descricoes.json'), 'utf8'));
      const et = a => (desc[a] || {}).etiquetas || [];
      for (const c of ['CBD', 'CBT', 'CBM', 'BG', 'BGE', 'CJ', 'SUP', 'STD', 'QST']) {
        const [fora, dentro] = real.escolherFotos({ codigo_acomodacao: c, etiquetas: [], quantidade: 2 }).map(f => f.arquivo);
        assert.ok(['fachada', 'área externa', 'varanda'].some(t => et(fora).includes(t)), c + ': 1ª foto de fora (' + fora + ')');
        assert.ok(et(dentro).includes('quarto'), c + ': 2ª foto do quarto (' + dentro + ')');
        assert.ok(!real.escolherFotos({ codigo_acomodacao: c, etiquetas: [], quantidade: 5 }).some(f => et(f.arquivo).includes('banheiro')), c + ': sem banheiro');
      }
      assert.ok(real.escolherFotos({ codigo_acomodacao: 'CBD', etiquetas: ['banheiro'], quantidade: 1 }).some(f => et(f.arquivo).includes('banheiro')), 'banheiro quando o cliente pede');
      // Apartamentos pela numeração (dono, 08/10/2026): o 31 (Duplo Casa Standard) só tem cama de casal; nunca as fotos do Standard
      assert.equal(real.escolherFotos({ codigo_acomodacao: 'CST', etiquetas: [], quantidade: 2 }).length, 0, 'sem fotos próprias, o Duplo Casa Standard não usa as do Standard');
      const APT = [{ numero: 20, codigo_silbeck: 'STD', categoria: 'STD', descricao: 'Cama de casal e cama de solteiro' }, { numero: 31, codigo_silbeck: 'STD1', categoria: 'CST', descricao: 'Só uma cama de casal' }];
      const stds = real.biblioteca().find(g => g.grupo === 'STD').fotos.map(f => f.arquivo);
      real.definirVivas([{ arquivo: stds[0], grupo: 'STD', origem: 'base', ativo: true, apartamento: 31 }, { arquivo: stds[1], grupo: 'STD', origem: 'base', ativo: true, apartamento: 20 }], APT);
      const bibA = real.biblioteca();
      assert.deepEqual(bibA.find(g => g.grupo === 'CST').fotos.map(f => [f.arquivo, f.apartamento]), [[stds[0], 31]], 'a foto ligada ao 31 passa para o Duplo Casa Standard');
      assert.ok(!bibA.find(g => g.grupo === 'STD').fotos.some(f => f.arquivo === stds[0]), 'e sai do Standard');
      const cst = real.escolherFotos({ codigo_acomodacao: 'CST', etiquetas: [], quantidade: 2 });
      assert.ok(cst.length === 1 && cst[0].descricao.startsWith('Apto 31 (Só uma cama de casal): '), JSON.stringify(cst));
      assert.equal(real.porApartamento([{ arquivo: 'a', apartamento: 11 }, { arquivo: 'b' }, { arquivo: 'c', apartamento: 20 }, { arquivo: 'd', apartamento: 20 }]).map(f => f.arquivo).join(''), 'cdba', 'um apartamento por vez');
      real.definirVivas([], []);
      require.cache[k] = velho; process.env.FOTOS_DIR = dirAntes;
    }
    const { pagina } = require('./orcamento');
    assert.ok(!pagina({ ...salvo, primeiro_nome: '<script>' }).includes('<script>alert') && pagina({ ...salvo, frase_de_abertura: '<b>x</b>' }).includes('&lt;b&gt;'));
    const { cotar } = require('./silbeck');
    assert.equal((await cotar({ data_entrada: '2020-01-01', data_saida: '2020-01-03', adultos: 2, idades_criancas: [] })).ok, false);
    assert.equal((await cotar({ data_entrada: '2026-12-10', data_saida: '2026-12-09', adultos: 2, idades_criancas: [] })).ok, false);
    if (emDias(0) < '2026-12-29') { // o simulador traz o Réveillon 2026 com as Cabanas Casal esgotadas
      const reveillon = await cotar({ data_entrada: '2026-12-29', data_saida: '2027-01-02', adultos: 2, idades_criancas: [] });
      assert.ok(reveillon.esgotados_no_periodo.includes('Cabana Casal') && !reveillon.opcoes.some(o => o.codigo === 'CBD'));
    }
    // Documentos que ensinam o Gilberto: qualquer pessoa envia, só o dono aprova; aprovado entra nas instruções
    {
      const g = require('./gilberto');
      r = await api('/api/gilberto-documentos', { tipo: 'texto', titulo: 'Gruta', texto: 'curto' });
      assert.equal(r.status, 400, 'texto curto demais');
      r = await api('/api/gilberto-documentos', { tipo: 'pdf', arquivo: 'x.pdf', dados: Buffer.from('não é pdf').toString('base64') });
      assert.equal(r.status, 400, 'PDF falso');
      const nIA = pedidosIA.length;
      r = await api('/api/gilberto-documentos', { tipo: 'pdf', arquivo: 'gruta.pdf', dados: 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 teste da gruta').toString('base64') });
      const dj = await r.json();
      assert.equal(r.status, 200, JSON.stringify(dj));
      const pd = pedidosIA.at(-1);
      assert.equal(pedidosIA.length, nIA + 1); assert.equal(pd.messages[0].content[0].type, 'document'); assert.equal(pd.messages[0].content[0].source.media_type, 'application/pdf');
      const doc = docsF.at(-1);
      assert.deepEqual([doc.titulo, doc.situacao, doc.tipo, doc.enviado_por, doc.conflitos.length], ['Gruta do Lago Azul', 'aguardando', 'pdf', 'u-1', 1]);
      assert.ok(!('dados' in doc), 'o arquivo original não é guardado');
      // Antes de aprovar, o Gilberto não usa
      const { catalogoParaTeste } = require('./server');
      assert.ok(!(await catalogoParaTeste()).documentos.length);
      assert.equal((await api('/api/gilberto-documento-acao', { id: doc.id, acao: 'aprovar' })).status, 403, 'só o dono aprova');
      assert.equal((await api('/api/gilberto-documento-acao', { id: doc.id, acao: 'editar', titulo: 'Gruta do Lago Azul (regras)', conteudo: doc.conteudo + '\n\n- Leve tênis.' })).status, 200, 'quem enviou ajusta enquanto aguarda');
      assert.equal((await api('/api/gilberto-documento-acao', { id: doc.id, acao: 'aprovar' }, 'token-dono')).status, 200);
      assert.equal(doc.situacao, 'aprovado'); assert.equal(doc.aprovado_por, 'u-dono');
      const cat = await catalogoParaTeste();
      assert.equal(cat.documentos.length, 1);
      const bloco = g.blocoDocumentos(cat.documentos);
      assert.ok(bloco.includes('<documentos_aprovados>') && bloco.includes('Leve tênis') && bloco.includes('valem MAIS que estes documentos'));
      assert.equal((await api('/api/gilberto-documento-acao', { id: doc.id, acao: 'editar', titulo: 'x', conteudo: 'mudança depois de aprovado' })).status, 403, 'aprovado: só o dono edita');
      // Biblioteca grande: o que não cabe fica para a busca
      const muitos = [{ titulo: 'A', conteudo: 'x'.repeat(59990) }, { titulo: 'Passeios', conteudo: 'Rio da Prata: flutuação de 2 horas.\n\nBuraco das Araras: trilha leve.' }];
      assert.ok(g.blocoDocumentos(muitos).includes('Outros documentos aprovados (consulte com consultar_documentos quando o assunto aparecer): Passeios'));
      const busca = g.consultarDocumentos(muitos, 'flutuação no Rio da Prata');
      assert.equal(busca.trechos[0].documento, 'Passeios'); assert.ok(busca.trechos[0].texto.startsWith('Rio da Prata'));
      assert.equal((await api('/api/gilberto-documento-acao', { id: doc.id, acao: 'conferido' })).status, 403, 'só o dono marca conferido');
      assert.equal((await api('/api/gilberto-documento-acao', { id: doc.id, acao: 'conferido' }, 'token-dono')).status, 200);
      assert.ok(chamadas.some(c => c.metodo === 'PATCH' && c.url.startsWith('/rest/v1/gilberto_documentos?id=eq.') && Array.isArray(c.corpo.alertas) && !c.corpo.alertas.length && !c.corpo.conflitos.length), 'conferido tira os avisos');
      assert.equal((await api('/api/gilberto-documento-acao', { id: doc.id, acao: 'desligar' }, 'token-dono')).status, 200);
      assert.ok(!(await catalogoParaTeste()).documentos.length, 'desligado: o Gilberto deixa de usar');
      assert.equal((await api('/api/gilberto-documento-acao', { id: doc.id, acao: 'apagar' }, 'token-dono')).status, 200);
      assert.equal(docsF.length, 0);
    }
    // Mensagem que chega enquanto o Gilberto ainda manda a resposta anterior: ele lê no fim, como pendente
    {
      const { emOrdemDeLeitura } = require('./server');
      const m = (id, direcao, t, corpo) => ({ id, direcao, enviada_em: '2026-10-05T03:37:' + t + '+00:00', corpo });
      const h1 = [m('a', 'entrada', '01', 'Oi'), m('b', 'entrada', '20', 'Quero reservar de 15 a 20/12'), m('c', 'saida', '25', 'Oi! Aqui é o Gilberto')];
      assert.deepEqual(emOrdemDeLeitura(h1, 'b', h1[0].enviada_em).map(x => x.id), ['a', 'c', 'b'], 'a resposta ao Oi vem antes do pedido que ela não leu');
      assert.deepEqual(emOrdemDeLeitura(h1, 'b', null).map(x => x.id), ['a', 'c', 'b'], 'sem memória (servidor reiniciou): pelo menos a mensagem que disparou');
      const { montarMensagens } = require('./gilberto');
      assert.equal(montarMensagens(emOrdemDeLeitura(h1, 'b', h1[0].enviada_em)).at(-1).role, 'user', 'a última mensagem volta a ser do cliente: o Gilberto responde');
      const h2 = [m('a', 'entrada', '01', 'Oi'), m('b', 'entrada', '10', 'tudo bem?'), m('c', 'saida', '25', 'Oi!'), m('d', 'entrada', '30', 'quero reservar')];
      assert.deepEqual(emOrdemDeLeitura(h2, 'd', h2[0].enviada_em).map(x => x.id), ['a', 'c', 'b', 'd'], 'duas mensagens não lidas, na ordem');
      const h3 = [m('a', 'entrada', '01', 'Oi'), m('c', 'saida', '05', 'Oi!'), m('d', 'entrada', '30', 'quero reservar')];
      assert.deepEqual(emOrdemDeLeitura(h3, 'd', h3[0].enviada_em).map(x => x.id), ['a', 'c', 'd'], 'ordem normal: nada muda');
    }
    // Combinações (grupo em mais de uma acomodação; dono, 05/10/2026)
    {
      const { distribuir } = require('./silbeck');
      const g8 = await cotar({ data_entrada: emDias(50), data_saida: emDias(53), adultos: 8, idades_criancas: [] });
      assert.equal(g8.ok, true, JSON.stringify(g8));
      assert.ok(g8.opcoes.length >= 2 && g8.opcoes.length <= 5 && g8.opcoes.every(o => o.combinacao && o.acomodacoes.length >= 2));
      assert.ok(g8.opcoes.every(o => o.acomodacoes.every(a => a.adultos >= 1) && o.acomodacoes.reduce((s, a) => s + a.adultos, 0) === 8), 'todo mundo distribuído, 1 adulto ao menos em cada');
      assert.ok(g8.opcoes.every((o, i, l) => !i || l[i - 1].valor_total <= o.valor_total), 'da mais em conta para a maior');
      assert.ok(g8.opcoes.every(o => Math.abs(o.valor_total - o.acomodacoes.reduce((s, a) => s + a.valor_total, 0)) < 0.02), 'total = soma das acomodações');
      // Família com criança pequena: ela nunca vai para Cabana Casal/Tripla
      const fam = await cotar({ data_entrada: emDias(50), data_saida: emDias(53), adultos: 4, idades_criancas: [2, 7, 10] });
      assert.ok(fam.opcoes.length && fam.opcoes.every(o => o.acomodacoes.every(a => !(a.idades_criancas.some(i => i <= 4) && ['CBD', 'CBT'].includes(a.codigo)))));
      assert.equal(distribuir([{ codigo: 'CBD', maximoOcupantes: 2 }, { codigo: 'CBD', maximoOcupantes: 2 }], 2, [3]), null);
      assert.equal(distribuir([{ codigo: 'STD', maximoOcupantes: 3 }, { codigo: 'STD', maximoOcupantes: 3 }], 1, [8]), null, 'sem adulto para a segunda acomodação');
      // Divisão pedida pelo cliente: dois casais, cada um no seu
      const casais = await cotar({ data_entrada: emDias(50), data_saida: emDias(53), adultos: 4, idades_criancas: [], grupos_por_acomodacao: [{ adultos: 2, idades_criancas: [] }, { adultos: 2, idades_criancas: [] }] });
      assert.ok(casais.opcoes.length && casais.opcoes.every(o => o.combinacao && o.acomodacoes.length === 2 && o.acomodacoes.every(a => a.adultos === 2)));
      assert.equal((await cotar({ data_entrada: emDias(50), data_saida: emDias(53), adultos: 4, idades_criancas: [], grupos_por_acomodacao: [{ adultos: 2, idades_criancas: [] }, { adultos: 1, idades_criancas: [] }] })).ok, false, 'divisão que não soma o grupo');
      // Grupo grande: com a equipe
      const grande = await cotar({ data_entrada: emDias(50), data_saida: emDias(53), adultos: 18, idades_criancas: [] });
      assert.ok(!grande.opcoes.length && /equipe/.test(grande.aviso));
      // Orçamento com 2 combinações (uma delas fora da lista, recotada na hora) e a página
      const [c1] = g8.opcoes;
      r = await api('/api/orcamento', { conversa_id: conv, data_entrada: emDias(50), data_saida: emDias(53), adultos: 8, idades_criancas: [], opcoes: [{ acomodacoes: c1.codigo.split('+').reverse() }, { acomodacoes: ['BG', 'BG'] }], sugerida: c1.codigo });
      const oc = await r.json();
      assert.equal(r.status, 200, JSON.stringify(oc));
      const so = orcs.at(-1);
      assert.ok(so.opcoes.every(o => o.combinacao) && so.opcoes.some(o => o.codigo === 'BG+BG' && o.nome === '2 × Bangalô'));
      assert.ok(so.opcoes.find(o => o.codigo === c1.codigo).sugerida, 'selo na combinação sugerida (em qualquer ordem)');
      const hp = await (await fetch(base + '/o/' + so.token + '?previa=1')).text();
      assert.ok(hp.includes('class="quartos"') && hp.includes('2 × Bangalô') && hp.includes('4 adultos') && hp.includes('data-codigo="BG+BG"'));
      assert.equal((await api('/api/orcamento', { conversa_id: conv, data_entrada: emDias(50), data_saida: emDias(53), adultos: 8, idades_criancas: [], opcoes: [{ acomodacoes: ['CBD', 'CBD'] }] })).status, 400, 'combinação em que o grupo não cabe');
      { // conferência no aceite (criar_reserva): mesma combinação, mesma divisão, mesmo valor
        const bgOp = so.opcoes.find(o => o.codigo === 'BG+BG');
        const rec = await require('./silbeck').cotarCombinacao({ data_entrada: emDias(50), data_saida: emDias(53), adultos: 8, idades_criancas: [], grupos_por_acomodacao: bgOp.acomodacoes.map(x => ({ adultos: x.adultos, idades_criancas: x.idades_criancas })) }, bgOp.acomodacoes.map(x => x.codigo));
        assert.equal(rec.ok, true, JSON.stringify(rec)); assert.equal(rec.opcao.valor_total, bgOp.valor_total); assert.equal(rec.opcao.codigo, 'BG+BG');
      }
      // Reserva da combinação: uma reserva no Silbeck, um item por acomodação, um Pix só; o pagamento é dividido entre os itens
      reservasF.length = 0;
      r = await api('/api/fechar-reserva', { conversa_id: conv, opcao_codigo: 'BG+BG', titular: 'Ana Souza Lima', email: 'ana@exemplo.com', acompanhantes: ['Bruno Lima', 'Carla Dias'], forma: 'pix', percentual: 50 });
      const fcb = await r.json();
      assert.equal(r.status, 200, JSON.stringify(fcb));
      const rc = reservasF.at(-1);
      assert.deepEqual([rc.codigo, rc.acomodacao, rc.itens.length], ['BG+BG', '2 × Bangalô', 2]);
      assert.ok(rc.itens.every(i => /^\d+$/.test(i.item_id)) && rc.itens[0].item_id !== rc.itens[1].item_id, 'um item do Silbeck por acomodação');
      const totalBG = so.opcoes.find(o => o.codigo === 'BG+BG').valor_total;
      assert.equal(rc.valor_total, totalBG); assert.equal(fcb.cobranca.valor, Math.round(totalBG * 50) / 100);
      assert.equal((await api('/api/fechar-reserva', { conversa_id: conv, opcao_codigo: 'BG+BG', titular: 'Ana Souza Lima', email: 'ana@exemplo.com', forma: 'pix', percentual: 50 })).status, 409, 'não duplica a reserva combinada');
      r = await api('/api/cobranca-acao', { id: fcb.cobranca.id, acao: 'simular_pagamento' });
      assert.equal((await r.json()).pagas, 1);
      assert.equal(rc.situacao, 'confirmada');
      const tcb = chamadas.findLast(c => c.url === '/rest/v1/tarefas' && c.metodo === 'POST').corpo.descricao;
      assert.ok(tcb.includes('dividido entre as 2 acomodações') && tcb.includes('confirmada automaticamente'), tcb);
      reservasF.length = 0;
    }
    assert.equal((await fetch(base + '/api/sugerir', { method: 'POST', headers: { Authorization: 'Bearer token-estranho' }, body: JSON.stringify({ conversa_id: conv }) })).status, 403);
    const { montarMensagens } = require('./gilberto');
    assert.deepEqual(montarMensagens([{ direcao: 'entrada', tipo: 'audio', transcricao: 'quero 2 noites', transcricao_status: 'ok' }]),
      [{ role: 'user', content: '[áudio do cliente, transcrição automática: "quero 2 noites"]' }]);
    assert.deepEqual(montarMensagens([{ direcao: 'saida', tipo: 'text', corpo: 'oi' }, { direcao: 'entrada', tipo: 'image', corpo: 'essa?' }, { direcao: 'entrada', tipo: 'text', corpo: 'tem vaga?' }]),
      [{ role: 'user', content: '[enviou uma foto: essa?]\ntem vaga?' }]);


    // Recomeçar conversa de teste: só números de teste da equipe (conferido no servidor)
    {
      delete configF.numeros_teste;
      assert.equal((await api('/api/recomecar-conversa', { conversa_id: conv })).status, 403, 'número fora da lista: recusa');
      assert.equal((await api('/api/numeros-teste', { numeros: ['123'] })).status, 400);
      r = await api('/api/numeros-teste', { numeros: ['(67) 99999-0000'] });
      assert.equal(r.status, 200); assert.deepEqual(configF.numeros_teste, { numeros: ['6799990000'] }, 'guardado sem 55 e sem o 9 (casa com o número que a Meta manda)');
      const nDel = chamadas.filter(c => c.metodo === 'DELETE').length;
      r = await api('/api/recomecar-conversa', { conversa_id: conv });
      assert.equal(r.status, 200, await r.clone().text());
      const dels = chamadas.filter(c => c.metodo === 'DELETE').slice(nDel).map(c => c.url.split('?')[0].replace('/rest/v1/', ''));
      assert.deepEqual(dels, ['reservas', 'cobrancas', 'vendas', 'orcamentos', 'negocios', 'conversas']);
      assert.ok(chamadas.some(c => c.metodo === 'DELETE' && c.url === '/rest/v1/conversas?id=eq.' + conv));
      delete configF.numeros_teste;
    }
    // Oportunidades (sem sino): tarefa de retomar orçamento parado e o resumo do dia às 8h
    {
      const { retomarOrcamentos, resumoDoDia, proximoExpediente, sinalQuente } = require('./server');
      { // Quente = interesse real, não a abertura logo após o envio
        const A = Date.parse('2026-10-05T15:00:00Z'), t = h => new Date(A - h * 3600e3).toISOString();
        assert.equal(sinalQuente({ aberto_primeira_vez_em: t(1), ultima_abertura_em: t(0.5), aberturas: 3 }, null, A), 'voltou', 'voltou dentro de 2 h (dono, 07/10/2026)');
        assert.equal(sinalQuente({ aberto_primeira_vez_em: t(1), ultima_abertura_em: t(1 - 5 / 60), aberturas: 2 }, null, A), null, 'reabrir em 5 min (atualizar a página) não conta');
        assert.equal(sinalQuente({ aberto_primeira_vez_em: t(20), ultima_abertura_em: t(1), aberturas: 2 }, null, A), 'voltou', 'voltou horas depois');
        assert.equal(sinalQuente({ aberto_primeira_vez_em: t(20), ultima_abertura_em: t(1), aberturas: 2 }, t(0.5), A), null, 'já escreveu depois: está na conversa');
        assert.equal(sinalQuente({ aberto_primeira_vez_em: t(30), ultima_abertura_em: t(26), aberturas: 2 }, null, A), null, 'mais de 24 h: esfriou');
        assert.equal(sinalQuente({ aberto_primeira_vez_em: t(1), ultima_abertura_em: t(1), escolhida_em: t(0.8) }, null, A), 'quero_reservar', 'tocou em Quero reservar e não mandou');
        assert.equal(sinalQuente({ escolhida_em: t(0.8) }, t(0.7), A), null, 'tocou e mandou a mensagem');
      }
      assert.equal(proximoExpediente(new Date('2026-10-05T14:00:00Z')).toISOString(), '2026-10-05T14:00:00.000Z', '10h em Bonito: agora');
      assert.equal(proximoExpediente(new Date('2026-10-05T23:00:00Z')).toISOString(), '2026-10-06T11:30:00.000Z', '19h: amanhã 7h30');
      assert.equal(proximoExpediente(new Date('2026-10-05T09:00:00Z')).toISOString(), '2026-10-05T11:30:00.000Z', '5h da manhã: hoje 7h30');
      const H = 3600e3, agora = Date.parse('2026-10-05T12:05:00Z'); // 8h05 em Bonito
      const iso = t => new Date(t).toISOString();
      // C1: orçamento de 30 h sem resposta → tarefa; C2: cliente respondeu → nada; C3: reservado → nada; C4: 10 h → cedo
      const ORC = [{ id: 'o1', conversa_id: 'C1', criado_em: iso(agora - 30 * H), aberturas: 2 }, { id: 'o2', conversa_id: 'C2', criado_em: iso(agora - 30 * H), aberturas: 1 },
        { id: 'o3', conversa_id: 'C3', criado_em: iso(agora - 40 * H), aberturas: 0 }, { id: 'o4', conversa_id: 'C4', criado_em: iso(agora - 10 * H), aberturas: 3, aberto_primeira_vez_em: iso(agora - 9 * H), ultima_abertura_em: iso(agora - 2 * H) },
        { id: 'o5', conversa_id: 'C5', criado_em: iso(agora - 5 * H), aberturas: 4, aberto_primeira_vez_em: iso(agora - 4 * H), ultima_abertura_em: iso(agora - 4 * H + 5 * 60e3) }]; // C5: só atualizou a página logo após abrir → não é quente
      const NEG = { C1: { id: 'N1', etapa: 'orc', responsavel_id: 'U1', conversa_id: 'C1' }, C2: { id: 'N2', etapa: 'orc', responsavel_id: 'U1', conversa_id: 'C2' }, C3: { id: 'N3', etapa: 'res', responsavel_id: 'U1', conversa_id: 'C3' }, C4: { id: 'N4', etapa: 'orc', responsavel_id: 'U1', conversa_id: 'C4' }, C5: { id: 'N5', etapa: 'orc', responsavel_id: 'U2', conversa_id: 'C5' } };
      const MSG = [{ conversa_id: 'C2', direcao: 'entrada', enviada_em: iso(agora - 20 * H) }];
      const TAR = [], CFG = {}, PUSH = [];
      const q = (u, k) => decodeURIComponent((u.searchParams.getAll(k).map(v => v.replace(/^(eq|gte|lte|gt|in)\.\(?/, '').replace(/\)$/, ''))[0]) || '');
      const resp = (obj, st = 200) => new Response(obj === null ? null : JSON.stringify(obj), { status: st, headers: { 'Content-Type': 'application/json' } });
      const fb = async (url, o = {}) => {
        const u = new URL(url), p = u.pathname.replace('/rest/v1/', ''), m = o.method || 'GET', body = o.body && typeof o.body === 'string' ? JSON.parse(o.body) : null;
        if (url.startsWith('https://fcm.googleapis.com/')) { PUSH.push(o); return resp(null, 201); }
        if (p === 'conversas') return resp([{ ultima_msg_cliente_em: null }]);
        if (p === 'orcamentos') return resp(u.searchParams.get('or') ? ORC.filter(x => (x.ultima_abertura_em || '') >= u.searchParams.get('or').split('gte.')[1].split(',')[0] || (x.escolhida_em || '') >= u.searchParams.get('or').split('gte.')[1].split(',')[0])
          : u.searchParams.get('conversa_id') ? ORC.filter(x => x.conversa_id === q(u, 'conversa_id') && x.criado_em > q(u, 'criado_em'))
          : ORC.filter(x => x.criado_em >= u.searchParams.getAll('criado_em')[0].slice(4) && x.criado_em <= u.searchParams.getAll('criado_em')[1].slice(4)).sort((a, b) => b.criado_em.localeCompare(a.criado_em)));
        if (p === 'negocios') return resp(u.searchParams.get('conversa_id') ? [NEG[q(u, 'conversa_id')]].filter(Boolean) : Object.values(NEG).filter(n => n.id === q(u, 'id')));
        if (p === 'mensagens') return resp(MSG.filter(x => x.conversa_id === q(u, 'conversa_id') && x.direcao === 'entrada' && x.enviada_em > q(u, 'enviada_em')));
        if (p === 'tarefas' && m === 'POST') { TAR.push({ id: 'T' + (TAR.length + 1), feita: false, criado_em: iso(agora), ...body }); return resp(null, 201); }
        if (p === 'tarefas' && m === 'PATCH') { Object.assign(TAR.find(t => t.id === q(u, 'id')), body); return resp(null, 204); }
        if (p === 'tarefas') return resp(TAR.filter(t => (!u.searchParams.get('negocio_id') || t.negocio_id === q(u, 'negocio_id')) && (!u.searchParams.get('tipo') || t.tipo === q(u, 'tipo'))
          && (!u.searchParams.get('feita') || String(t.feita) === q(u, 'feita')) && (!u.searchParams.get('quando') || t.quando <= q(u, 'quando'))));
        if (p === 'negocio_eventos') return resp(null, 201);
        if (p === 'config' && m === 'POST') { CFG[body.chave] = body.valor; return resp(null, 201); }
        if (p === 'config') return resp(CFG[q(u, 'chave')] ? [{ valor: CFG[q(u, 'chave')] }] : []);
        if (p === 'usuarios') return resp([{ id: 'U1', nome: 'Jagles Balta' }, { id: 'U2', nome: 'Márcio Toshio' }]);
        if (p === 'push_inscricoes' && m === 'GET') return resp([{ id: 'P1', usuario_id: 'U1', endpoint: 'https://fcm.googleapis.com/fcm/send/x', ...(() => { const e = crypto.createECDH('prime256v1'); e.generateKeys(); return { p256dh: e.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') }; })() }].filter(x => q(u, 'usuario_id').split(',').includes(x.usuario_id)));
        if (p === 'push_inscricoes') return resp(null, 204);
        throw new Error('fake sem rota: ' + m + ' ' + url);
      };
      process.env.RETOMAR_INTERVALO_MS = '0';
      let rr = await retomarOrcamentos(fb, agora);
      assert.deepEqual(rr, { criadas: 1, fechadas: 0 });
      assert.deepEqual(TAR.map(t => [t.negocio_id, t.responsavel_id, t.tipo]), [['N1', 'U1', 'Retomar orçamento']]);
      assert.ok(TAR[0].descricao.includes('abriu 2x') && TAR[0].quando === iso(agora), 'no expediente: para agora');
      rr = await retomarOrcamentos(fb, agora + 60e3);
      assert.equal(rr.criadas, 0, 'uma tarefa por orçamento');
      MSG.push({ conversa_id: 'C1', direcao: 'entrada', enviada_em: iso(agora + 30 * 60e3) });
      rr = await retomarOrcamentos(fb, agora + H);
      assert.deepEqual(rr, { criadas: 0, fechadas: 1 }); assert.equal(TAR[0].feita, true, 'o cliente respondeu: a tarefa fecha sozinha');
      // Resumo do dia: só com a chave dos avisos, só uma vez por dia, só para quem tem algo
      TAR.push({ id: 'T9', negocio_id: 'N4', responsavel_id: 'U1', tipo: 'Retomar orçamento', feita: false, quando: iso(agora - H), criado_em: iso(agora - H) });
      assert.equal(await resumoDoDia(fb, new Date(agora)), 0, 'sem a chave dos avisos, nada');
      process.env.VAPID_CHAVE = JSON.stringify(crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' }));
      const fetchReal = globalThis.fetch;
      try {
        assert.equal(await resumoDoDia(fb, new Date(Date.parse('2026-10-05T18:00:00Z'))), 0, '14h: fora da hora do resumo');
        assert.equal(await resumoDoDia(fb, new Date(agora)), 1, 'U1 recebe; U2 só tem o C5, que abriu logo após o envio (não é quente)');
        assert.equal(PUSH.length, 1);
        assert.equal(await resumoDoDia(fb, new Date(agora + 30 * 60e3)), 0, 'uma vez por dia');
        CFG.resumo_dia_enviado = null; CFG.resumo_dia_desligado = { usuarios: ['U1'] };
        assert.equal(await resumoDoDia(fb, new Date(agora)), 0, 'quem desligou não recebe');
      } finally { globalThis.fetch = fetchReal; delete process.env.VAPID_CHAVE; }
      // Retomada automática pelo Gilberto (dono, 07/10/2026): um toque por orçamento, janela aberta, cliente calado
      {
        const { motivoRetomada, retomadaAutomatica, ehRobo, zerarCacheAuto } = require('./server');
        const B = Date.parse('2026-10-05T15:00:00Z'), ti = h => iso(B - h * H), sai = h => ({ direcao: 'saida', enviada_em: ti(h) });
        assert.equal(motivoRetomada({ criado_em: ti(1), escolhida_em: ti(0.25) }, ti(1.1), sai(1), B), 'quero_reservar', 'tocou em Quero reservar há 15 min');
        assert.equal(motivoRetomada({ criado_em: ti(1), escolhida_em: ti(0.1) }, ti(1.1), sai(1), B), null, 'ainda não deu 10 min');
        assert.equal(motivoRetomada({ criado_em: ti(1.5), aberto_primeira_vez_em: ti(1.4), ultima_abertura_em: ti(0.6) }, ti(1.6), sai(1.5), B), 'voltou', 'voltou dentro de 2 h; 30 min depois o Gilberto escreve');
        assert.equal(motivoRetomada({ criado_em: ti(1.5), aberto_primeira_vez_em: ti(1.4), ultima_abertura_em: ti(0.2) }, ti(1.6), sai(1.5), B), null, 'voltou agora há pouco: espera 30 min');
        assert.equal(motivoRetomada({ criado_em: ti(1.5), aberto_primeira_vez_em: ti(1.4), ultima_abertura_em: ti(1.35) }, ti(1.6), sai(1.5), B), null, 'só atualizou a página');
        assert.equal(motivoRetomada({ criado_em: ti(1.5), aberto_primeira_vez_em: ti(1.4), ultima_abertura_em: ti(0.6) }, ti(0.5), sai(0.3), B), null, 'o cliente escreveu depois de voltar');
        assert.equal(motivoRetomada({ criado_em: ti(20) }, ti(21), sai(20), B), 'silencio', '20 h sem resposta, janela ainda aberta');
        assert.equal(motivoRetomada({ criado_em: ti(23) }, ti(23.5), sai(23), B), null, 'janela fechando: fica a tarefa da equipe');
        assert.equal(motivoRetomada({ criado_em: ti(1), escolhida_em: ti(0.5) }, ti(0.3), { direcao: 'entrada', enviada_em: ti(0.3) }, B), null, 'cliente esperando resposta');
        assert.equal(motivoRetomada({ criado_em: ti(1), escolhida_em: ti(0.5) }, ti(1.1), sai(0.05), B), null, 'acabou de receber mensagem');
        assert.ok(ehRobo({ headers: { 'user-agent': 'WhatsApp/2.23.20.0 A' } }) && ehRobo({ headers: { 'user-agent': 'facebookexternalhit/1.1' } }), 'prévia do link não conta como abertura');
        assert.ok(!ehRobo({ headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1' } }));
        // O laço: C7 voltou ao orçamento → dispara uma vez; C8 equipe assumiu → nada; C9 já retomado → nada
        const R_ORC = [{ id: 'r7', conversa_id: 'C7', criado_em: ti(1.5), aberto_primeira_vez_em: ti(1.4), ultima_abertura_em: ti(0.6) },
          { id: 'r8', conversa_id: 'C8', criado_em: ti(1.5), escolhida_em: ti(0.5) }, { id: 'r9', conversa_id: 'C9', criado_em: ti(1.5), escolhida_em: ti(0.5) }];
        const R_CONV = { C7: { status: 'aberta', canal: 'wa', gilberto_pausado: false, ultima_msg_cliente_em: ti(1.6) }, C8: { status: 'aberta', canal: 'wa', gilberto_pausado: true, ultima_msg_cliente_em: ti(1.6) }, C9: { status: 'aberta', canal: 'wa', gilberto_pausado: false, ultima_msg_cliente_em: ti(1.6) } };
        const R_EV = [{ orcamento_id: 'r9', tipo: 'retomada' }], DISP = [], EVN = [];
        const fr = async (url, o = {}) => {
          const u = new URL(url), p = u.pathname.replace('/rest/v1/', ''), m = o.method || 'GET', body = o.body && typeof o.body === 'string' ? JSON.parse(o.body) : null;
          if (u.pathname === '/interno/gilberto') { DISP.push(body); return resp({ ok: true }); }
          if (p === 'config') return resp([{ valor: { ligado: true } }]);
          if (p === 'orcamentos') return resp(R_ORC);
          if (p === 'orcamento_eventos' && m === 'POST') { R_EV.push(body); return resp(null, 201); }
          if (p === 'orcamento_eventos') return resp(R_EV.filter(e => e.orcamento_id === q(u, 'orcamento_id') && e.tipo === q(u, 'tipo')));
          if (p === 'conversas') return resp([R_CONV[q(u, 'id')]].filter(Boolean));
          if (p === 'negocios') return resp(u.searchParams.get('conversa_id') ? [{ id: 'N' + q(u, 'conversa_id'), etapa: 'orc' }] : [{ etapa: 'orc' }]);
          if (p === 'mensagens') return resp(u.searchParams.get('direcao') ? [{ id: 'aaaaaaaa-0000-0000-0000-00000000000' + q(u, 'conversa_id').slice(1) }] : [sai(1.5)]);
          if (p === 'negocio_eventos') { EVN.push(body); return resp(null, 201); }
          throw new Error('fake sem rota: ' + m + ' ' + url);
        };
        zerarCacheAuto(); process.env.RETOMAR_INTERVALO_MS = '0';
        assert.equal(await retomadaAutomatica(fr, B), 1);
        assert.deepEqual(DISP.map(d => [d.conversa_id, d.retomada]), [['C7', 'voltou']]);
        assert.ok(EVN.some(e => e.texto.includes('O Gilberto retomou o orçamento (voltou ao orçamento)')));
        assert.equal(await retomadaAutomatica(fr, B + 60e3), 0, 'um toque só por orçamento');
        const dg = await retomadaAutomatica(fr, B, { simular: true });
        assert.deepEqual(dg.orcamentos.map(x => [x.orcamento, x.resultado]), [['r7', 'não retoma: já retomado (um toque por orçamento)'], ['r8', 'não retoma: a equipe assumiu a conversa (Gilberto pausado)'], ['r9', 'não retoma: já retomado (um toque por orçamento)']]);
        assert.equal(DISP.length, 1, 'o diagnóstico não manda nada');
        assert.equal(motivoRetomada({ criado_em: ti(2), aberturas: 2, aberto_primeira_vez_em: ti(1.9), ultima_abertura_em: ti(1.88) }, ti(2.1), sai(2), B, true).porque, 'abriu, mas não voltou (as aberturas foram em menos de 10 min)');
        R_EV.length = 1; zerarCacheAuto();
        assert.equal(await retomadaAutomatica(fr, Date.parse('2026-10-06T02:00:00Z')), 0, '22h em Bonito: fora do horário');
        zerarCacheAuto();
      }
    }
    // Diagnóstico da cotação no Silbeck, passo a passo (no simulador, tudo certo)
    {
      const dc = await require('./silbeck').diagnosticoCotacao({ adultos: 2 });
      assert.ok(Object.values(dc.passos).every(p => p.ok), JSON.stringify(dc.passos));
      assert.equal(dc.passos.cotacaoCompleta.resultado, 'ok'); assert.ok(dc.passos.cotacaoCompleta.opcoes.length > 0);
      // Promoção do site (desligada por padrão): −41% a partir de 2 diárias, 1 diária pelo preço cheio
      {
        const S2 = require('./silbeck'), dia = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
        const base2 = await S2.cotar({ data_entrada: dia(50), data_saida: dia(52), adultos: 2, idades_criancas: [] });
        assert.ok(base2.ok && !base2.opcoes[0].valor_cheio && !base2.promocao, 'desligada: nada muda');
        assert.ok(base2.opcoes.every(o => o.valor_total === o.diarias), 'preço igual ao do site: só as diárias, sem somar ISS e taxa de serviço');
        S2.definirFontePromocao(async () => ({ ligada: true, percentual: 41, minimo_diarias: 2 }));
        const p2 = await S2.cotar({ data_entrada: dia(50), data_saida: dia(52), adultos: 2, idades_criancas: [] });
        const o = p2.opcoes.find(x => x.codigo === base2.opcoes[0].codigo);
        assert.equal(o.valor_cheio, base2.opcoes[0].valor_total, 'valor cheio = o preço sem desconto');
        assert.ok(Math.abs(o.valor_total - base2.opcoes[0].valor_total * 0.59) < 0.05, o.valor_total + ' x ' + base2.opcoes[0].valor_total);
        assert.ok(p2.promocao.includes('41%'));
        const p1 = await S2.cotar({ data_entrada: dia(50), data_saida: dia(51), adultos: 2, idades_criancas: [] });
        assert.ok(!p1.opcoes[0].valor_cheio && p1.promocao.includes('1 diária sai pelo preço cheio'), '1 diária: preço cheio');
        const O2 = require('./orcamento');
        const html = O2.pagina({ token: 'x'.repeat(22), data_entrada: dia(50), data_saida: dia(52), adultos: 2, criancas_idades: [], opcoes: [o], fonte: 'simulador' }, {});
        assert.ok(html.includes('<s>') && html.includes('−41%'), 'a página mostra o preço cheio riscado');
        S2.definirFontePromocao(async () => ({ ligada: false }));
      }
      const dt = await require('./silbeck').diagnosticoTarifa({ adultos: 2 });
      assert.ok(dt.precos.CBD && dt.precos.CBD.semPensao.total > 0, JSON.stringify(dt).slice(0, 400));
      // Silbeck real (08/10/2026): tipo de hóspede como texto e códigos próprios das acomodações
      const S = require('./silbeck');
      assert.deepEqual(S._categoriasDoGrupo([{ id: 7, tipo: '1' }, { id: 8, tipo: '3' }, { id: 9, tipo: '4' }], 2, [3, 8]).lista, [{ id: 7, quantidade: 2 }, { id: 8, quantidade: 1 }, { id: 9, quantidade: 1 }]);
      assert.deepEqual(['2026-10-18', '2026-10-18T00:00:00', '18/10/2026'].map(S._diaISO), ['2026-10-18', '2026-10-18', '2026-10-18'], 'data do dia em qualquer formato');
      assert.deepEqual(S._paraCRM([{ codigo: 'CAB', id: 1 }, { codigo: 'BANG3', id: 2 }, { codigo: 'STD1', id: 3 }, { codigo: 'DPLS', id: 4 }, { codigo: 'BANG4C', id: 5 }]).map(t => [t.codigo, t.codigo_silbeck || null, t.id]),
        [['CBD', 'CAB', 1], ['BANG3', null, 2], ['CST', 'STD1', 3], ['SUP', 'DPLS', 4], ['BGE', 'BANG4C', 5]]);
      const O = require('./orcamento');
      assert.equal(O.CATALOGO.BANG4.nome, 'Bangalô Quádruplo'); assert.equal(O.FOTO_DE.BANG3, 'BG');
    }
    // Todo módulo local usado pelo servidor precisa estar no Dockerfile (senão o Cloud Run não sobe)
    const fsD = require('fs'), docker = fsD.readFileSync(require('path').join(__dirname, 'Dockerfile'), 'utf8');
    const locais = new Set(fsD.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'teste.js').flatMap(f => [...fsD.readFileSync(require('path').join(__dirname, f), 'utf8').matchAll(/require\('\.\/([\w-]+)'\)/g)].map(m => m[1] + '.js')));
    for (const f of [...locais, 'server.js']) assert.ok(new RegExp('^COPY .*\\b' + f.replace('.', '\\.') + '\\b', 'm').test(docker), 'falta no Dockerfile: ' + f);
    console.log('TODOS OS TESTES PASSARAM');
    servidor.close(); falso.close();
  });
});
