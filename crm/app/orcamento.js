// Orçamento do Hotel Cabanas: cria (a partir da cotação do Silbeck) e monta a página pública /o/<token>.
// A página só mostra o primeiro nome, a estadia e as opções: nada de telefone, e-mail ou documento.
// Visual: crm/prototipo/orcamento-exemplo.html (aprovado pelo dono).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Descrição de cada acomodação (contexto/hotel-operacional.md §2). Códigos = os do Silbeck (validados pelo dono).
const CATALOGO = {
  CBD: { nome: 'Cabana Casal', cap: '30 m² · para 2 pessoas', dest: ['Toda em madeira, elevada a 3 m do solo', 'Varanda privativa com rede', 'Cama king e garagem privativa'] },
  CBT: { nome: 'Cabana Tripla', cap: '35 m² · para 3 pessoas', dest: ['Em madeira, elevada a 3 m do solo', 'Varanda privativa com rede', 'Cama queen + solteiro e garagem privativa'] },
  CBM: { nome: 'Cabana Master', cap: '85 m² · de 2 a 5 pessoas', dest: ['A única com banheira de hidromassagem', 'Dois ambientes e varanda ampla com balanço', 'Estacionamento coberto para 2 carros'] },
  BG: { nome: 'Bangalô', cap: '40 m² · de 2 a 4 pessoas', dest: ['Não divide paredes com outra acomodação', 'Varanda privativa com rede, vista para a mata', 'TV 40" e garagem em frente'] },
  BGE: { nome: 'Bangalô Especial', cap: '45 m² · até 4 pessoas', dest: ['Duas camas de casal king, ideal para famílias', 'Ampla varanda privativa com rede e banco', 'Não divide paredes com outra acomodação'] },
  CJ: { nome: 'Apartamento Conjugado', cap: '55 m² em dois pisos · até 5 pessoas', dest: ['Suíte queen em cima, com varanda para a natureza', 'Térreo com 3 camas de solteiro e banheiro', 'Pensado para famílias com filhos'] },
  SUP: { nome: 'Apartamento Superior', cap: '25 m² · de 2 a 3 pessoas', dest: ['Mais amplo que o standard', 'No andar de cima', 'Cama queen + solteiro'] },
  QES: { nome: 'Superior Quádruplo', cap: '25 m² · até 4 pessoas', dest: ['Mais amplo que o standard', 'No andar de cima', 'Cama queen + 2 de solteiro'] },
  STD: { nome: 'Apartamento Standard', cap: '20 a 25 m² · de 2 a 3 pessoas', dest: ['O mais econômico', 'Térreo, com estacionamento em frente', 'Cama queen + solteiro'] },
  QST: { nome: 'Standard Quádruplo', cap: '20 a 25 m² · até 4 pessoas', dest: ['Ótimo custo para família ou grupo', 'Térreo, com estacionamento em frente', 'Cama queen + 2 de solteiro'] },
  CST: { nome: 'Duplo Casa Standard', cap: 'para 2 pessoas', dest: ['Opção econômica para casal', 'Ar quente e frio, frigobar e Wi-Fi', 'Café da manhã incluso'] },
};
const INCLUSO = ['Café da manhã (6h30 às 9h30)', 'Piscina climatizada', 'Hidromassagem aquecida', 'Sauna', 'Trilhas e decks nos dois rios', 'Caiaque e stand up com monitor', 'Arco e flecha', 'Playground e salão de jogos'];
const EXTRAS = [
  { nome: 'Combo boia cross + arvorismo', txt: 'As duas aventuras dentro do hotel, com guias. A partir de 5 anos e 1,15 m.', preco: 'R$ 170 por pessoa', combo: true },
  { nome: 'Boia cross', txt: '1.200 m de corredeiras e cachoeiras do Rio Formoso, com guias (1 h).', preco: 'R$ 100 por pessoa', combo: true },
  { nome: 'Arvorismo', txt: '18 obstáculos e 2 tirolesas, a última sobre o Rio Formoso.', preco: 'R$ 120 por pessoa', combo: true },
  { nome: 'Decoração especial no quarto', txt: 'Simples ou completa, para datas especiais. Pedido com 3 dias de antecedência.', preco: 'R$ 350 ou R$ 600' },
  { nome: 'Massagem', txt: 'Com a massoterapeuta parceira do hotel; o horário é combinado com você.', preco: 'R$ 220' },
];

// Fotos reais por acomodação (item 2): public/fotos/<CODIGO>-<n>.jpg, listadas em public/fotos/fotos.json.
const PASTA_FOTOS = process.env.FOTOS_DIR || path.join(__dirname, 'public', 'fotos');
let FOTOS = {}, DESCRICOES = {};
try { FOTOS = JSON.parse(fs.readFileSync(path.join(PASTA_FOTOS, 'fotos.json'), 'utf8')); } catch (e) { /* sem fotos ainda */ }
try { DESCRICOES = JSON.parse(fs.readFileSync(path.join(PASTA_FOTOS, 'descricoes.json'), 'utf8')); } catch (e) { /* sem descrições */ }
const ROTULOS = { BOIA: 'Boia cross', ARVO: 'Arvorismo', RIO: 'Rios e decks', PISCINA: 'Piscina e hidromassagem', CAFE: 'Café da manhã', DECO: 'Decoração especial (opcional)' };
// Categorias em que a equipe pode pôr fotos (as dos quádruplos usam as do duplo/triplo).
const GRUPOS = [...new Set([...Object.keys(FOTOS), 'CBD', 'CBT', 'CBM', 'BG', 'BGE', 'CJ', 'SUP', 'STD', ...Object.keys(ROTULOS)])];
const nomeGrupo = g => (CATALOGO[g] && CATALOGO[g].nome) || ROTULOS[g] || g;
// Ajustes da equipe (tabela fotos_biblioteca): fotos trazidas do Drive e fotos fixas tiradas da biblioteca.
const FOTOS_FIXAS = new Set(Object.values(FOTOS).flat());
let VIVAS = [];
const definirVivas = linhas => { VIVAS = Array.isArray(linhas) ? linhas : []; };
// Biblioteca para a caixa e para o Gilberto: [{grupo, nome, fotos: [{arquivo, descricao, etiquetas, decoracao, origem}]}]
// Com {todas: true}, cada grupo traz também as removidas (para poder devolver).
function biblioteca({ todas = false } = {}) {
  const ajuste = new Map(VIVAS.map(v => [v.arquivo, v]));
  const fixa = a => ({ arquivo: a, descricao: (DESCRICOES[a] && DESCRICOES[a].descricao) || '', etiquetas: (DESCRICOES[a] && DESCRICOES[a].etiquetas) || [],
    decoracao: !!(DESCRICOES[a] && DESCRICOES[a].decoracao), origem: 'base', drive_id: (DESCRICOES[a] && DESCRICOES[a].drive_id) || null, ativo: !(ajuste.get(a) && ajuste.get(a).ativo === false) });
  const nova = v => ({ arquivo: v.arquivo, descricao: v.descricao || '', etiquetas: v.etiquetas || [], decoracao: !!v.decoracao, origem: 'drive', drive_id: v.drive_id || null, ativo: v.ativo !== false });
  const novas = VIVAS.filter(v => v.origem === 'drive' && !FOTOS_FIXAS.has(v.arquivo)).sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || String(a.criado_em || '').localeCompare(String(b.criado_em || '')));
  return GRUPOS.map(grupo => {
    const lista = [...(FOTOS[grupo] || []).map(fixa), ...novas.filter(v => v.grupo === grupo).map(nova)];
    const g = { grupo, nome: nomeGrupo(grupo), fotos: lista.filter(f => f.ativo) };
    if (todas) g.removidas = lista.filter(f => !f.ativo);
    return g;
  }).filter(g => todas || g.fotos.length);
}
// Escolhe fotos para o Gilberto: pelo código da acomodação e/ou etiquetas (até 5).
function escolherFotos({ codigo_acomodacao, etiquetas, quantidade }) {
  const n = Math.min(5, Math.max(1, Number(quantidade) || 3));
  const tudo = biblioteca().flatMap(g => g.fotos.map(f => ({ ...f, grupo: g.grupo })));
  const cod = String(codigo_acomodacao || '').toUpperCase();
  const termos = (etiquetas || []).map(t => String(t).toLowerCase()).filter(Boolean);
  // Fotos de apartamento quádruplo usam a pasta do duplo/triplo correspondente.
  const grupoDe = { QES: 'SUP', QST: 'STD', CST: 'STD' }[cod] || cod;
  const pontos = f => (f.grupo === grupoDe ? 10 : 0) + termos.filter(t => f.etiquetas.some(e => e.toLowerCase().includes(t)) || f.descricao.toLowerCase().includes(t)).length;
  return tudo.map(f => ({ f, p: pontos(f) })).filter(x => x.p > 0).sort((a, b) => b.p - a.p).slice(0, n).map(x => x.f);
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function periodo(ini, fim) {
  const [a1, m1, d1] = ini.split('-').map(Number), [a2, m2, d2] = fim.split('-').map(Number);
  if (a1 === a2 && m1 === m2) return `${d1} a ${d2} de ${MESES[m1 - 1]}`;
  return `${d1} de ${MESES[m1 - 1]}${a1 !== a2 ? ' de ' + a1 : ''} a ${d2} de ${MESES[m2 - 1]}${a1 !== a2 ? ' de ' + a2 : ''}`;
}
// Sem limite prático: cabem todas as acomodações do hotel (a página mostra uma abaixo da outra).
const MAX_OPCOES = Object.keys(CATALOGO).length;
// Resumo para a mensagem da equipe: "14 a 17 de novembro (3 noites), 2 adultos e 1 criança (3 anos)"
const resumo = o => { const n = noites(o.data_entrada, o.data_saida); return `${periodo(o.data_entrada, o.data_saida)} (${n} ${n > 1 ? 'noites' : 'noite'}), ${grupo(o)}`; };
const noites = (ini, fim) => Math.round((new Date(fim) - new Date(ini)) / 864e5);
function grupo(o) {
  const p = [`${o.adultos} ${o.adultos > 1 ? 'adultos' : 'adulto'}`];
  const c = o.criancas_idades || [];
  if (c.length) p.push(`${c.length} ${c.length > 1 ? 'crianças' : 'criança'} (${c.map(i => i + (i === 1 ? ' ano' : ' anos')).join(', ')})`);
  return p.join(' e ');
}
const novoToken = () => crypto.randomBytes(16).toString('base64url'); // 128 bits
const tokenValido = t => /^[A-Za-z0-9_-]{22}$/.test(t || '');

// Monta o registro do orçamento a partir da cotação (já feita no Silbeck, na hora).
// Nesta fase: uma acomodação por opção (combinações para grupos grandes ficam com a equipe).
function montar(entrada, cotacao) {
  const pedidas = (entrada.opcoes || []).slice(0, MAX_OPCOES);
  if (!pedidas.length) return { erro: 'Informe ao menos uma opção.' };
  if (pedidas.some(o => !o.acomodacoes || o.acomodacoes.length !== 1)) return { erro: 'Nesta fase o orçamento tem uma acomodação por opção. Combinações (grupo em mais de uma acomodação): passe para a equipe montar.' };
  const opcoes = [];
  for (const o of pedidas) {
    const cod = String(o.acomodacoes[0]).toUpperCase();
    const c = (cotacao.opcoes || []).find(x => x.codigo === cod);
    if (!c) return { erro: `${CATALOGO[cod] ? CATALOGO[cod].nome : cod} não tem vaga nessas datas ou não comporta o grupo. Use só códigos que vieram de consultar_disponibilidade.` };
    if (!opcoes.some(x => x.codigo === cod)) opcoes.push({ codigo: cod, nome: (CATALOGO[cod] && CATALOGO[cod].nome) || c.nome, valor_total: c.valor_total, media_por_noite: c.media_por_noite, parcela_6x: c.parcela_6x, diarias: c.diarias, taxas: c.taxas });
  }
  return { opcoes };
}

function pagina(o, { previa = false, produtos = null } = {}) {
  const n = noites(o.data_entrada, o.data_saida);
  const nome = o.primeiro_nome ? esc(o.primeiro_nome) : '';
  const bib = biblioteca();
  const fotosDe = cod => ((bib.find(g => g.grupo === cod) || bib.find(g => g.grupo === { QES: 'SUP', QST: 'STD', CST: 'STD' }[cod]) || { fotos: [] }).fotos).slice(0, 5);
  const cards = (o.opcoes || []).map((op, i) => {
    const cat = CATALOGO[op.codigo] || { nome: op.nome, cap: '', dest: [] };
    const fotos = fotosDe(op.codigo);
    const galeria = fotos.length ? `<div class="fotos" tabindex="0" aria-label="Fotos: ${esc(cat.nome)}">${fotos.map((f, k) => `<img src="/fotos/${esc(f.arquivo)}" alt="${esc(cat.nome)} · foto ${k + 1}" loading="${k ? 'lazy' : 'eager'}" width="800" height="600">`).join('')}</div>${fotos.length > 1 ? `<div class="pontos" aria-hidden="true">${fotos.map((_, k) => `<i${k ? '' : ' class="on"'}></i>`).join('')}</div>` : ''}` : '';
    const comDeco = fotos.some(f => f.decoracao);
    const nota = comDeco ? '<p class="nota-foto">Algumas fotos mostram a decoração especial (pétalas), opcional e cobrada à parte.</p>' : '';
    return `<article class="op${i === 0 ? ' rec' : ''}">${galeria}${nota}<div class="corpo">
${i === 0 ? '<span class="selo">Nossa sugestão para vocês</span>' : ''}<h2>${esc(cat.nome)}</h2><p class="cap">${esc(cat.cap)}</p>
<ul class="dest">${cat.dest.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
<div class="preco"><div><small>Total ${n > 1 ? `das ${n} noites` : 'da noite'}</small><b>${brl(op.valor_total)}</b><small>${n > 1 ? `média de ${brl(op.media_por_noite)} por noite · ` : ''}ou 6x de ${brl(op.parcela_6x)} sem juros</small></div></div>
<button class="btn quero" type="button" data-codigo="${esc(op.codigo)}" data-nome="${esc(cat.nome)}">Quero reservar esta</button></div></article>`;
  }).join('\n');
  // Extras: os produtos cadastrados (tela Produtos); sem banco, a lista fixa acima
  const lista = produtos && produtos.length
    ? produtos.map(p => ({ nome: p.nome, txt: [p.descricao, p.regras].filter(Boolean).join(' '), preco: p.preco, combo: ['COMBO', 'BOIA', 'ARVO'].includes(p.codigo) }))
    : EXTRAS;
  const extras = lista.filter(x => !x.combo || o.pessoas_aptas_combo > 0)
    .map(x => `<div class="ex"><h4>${esc(x.nome)}</h4><p>${esc(x.txt)}</p><div class="pr">${esc(x.preco)}</div></div>`).join('');
  const titulo = `${n > 1 ? `${['', '', 'Duas', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete'][n] || n} noites` : 'Uma noite'} entre <em>dois rios</em>`;
  const abertura = o.frase_de_abertura ? esc(o.frase_de_abertura.trim()) + (/[.!?]$/.test(o.frase_de_abertura.trim()) ? ' ' : '. ') : (nome ? `Oi, ${nome}! ` : 'Oi! ');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>Orçamento · Hotel Cabanas</title><link rel="stylesheet" href="/o/orcamento.css"></head>
<body data-token="${esc(o.token)}"${previa ? ' data-previa="1"' : ''}>
${o.fonte === 'simulador' ? '<div class="aviso-teste">Página de teste: valores fictícios do simulador, não são preços reais.</div>' : ''}
${previa ? '<div class="aviso-teste">Prévia da equipe: esta visita não conta como abertura do cliente.</div>' : ''}
<header><div class="cab"><img src="/o/logo-branco.png" alt="Hotel Cabanas · Bonito MS" width="120" height="95">
<span class="rot">${nome ? `Orçamento para ${nome}` : 'Seu orçamento'}</span>
<h1>${titulo}</h1>
<div class="resumo"><span>${esc(periodo(o.data_entrada, o.data_saida))}</span><span>${n} ${n > 1 ? 'noites' : 'noite'}</span><span>${esc(grupo(o))}</span></div></div></header>
<main>
<p class="intro">${abertura}${o.frase_de_abertura ? (o.opcoes.length > 1 ? `São ${o.opcoes.length} opções` : 'É uma opção') : (o.opcoes.length > 1 ? `Separei ${o.opcoes.length} opções` : 'Separei uma opção')} com vaga nas suas datas. Os valores são os de hoje, conferidos no nosso sistema de reservas, e ficam sujeitos à disponibilidade até a reserva. 🌿<br><small>Equipe do Hotel Cabanas</small></p>
${cards}
<section class="bloco"><h3 class="sec-t">Já está incluso na diária</h3><ul class="inclui">${INCLUSO.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
<section class="bloco"><h3 class="sec-t">Para deixar a viagem completa</h3><p class="extra-intro">Pagos à parte. É só pedir na conversa que a gente organiza.</p><div class="extras">${extras}</div></section>
<section class="bloco"><h3 class="sec-t">Condições</h3><ul class="cond">
<li><b>Formas de pagamento:</b> sinal de 50% no Pix ou no cartão em até 3x, ou 100% no Pix ou no cartão em até 6x sem juros. Com sinal, o restante é pago no check-out.</li>
<li>Check-in a partir das 15h e check-out até as 13h (a estrutura fica à disposição antes e depois).</li>
<li>Cancelamento: com 30 dias ou mais de antecedência, reembolso integral; de 15 a 29 dias, 50% do valor pago; com menos de 15 dias, sem reembolso.</li>
<li>Criança até 4 anos não paga, dormindo na cama dos pais.</li>
<li>Estamos a 6 km do centro de Bonito, com acesso asfaltado.</li></ul></section>
<div class="rodape"><p>Hotel Cabanas · Bonito, MS</p></div>
</main>
<div class="passo" id="passo" hidden><div class="folha" role="dialog" aria-modal="true" aria-labelledby="p-tit"><h3 id="p-tit">Ótima escolha!</h3><p id="p-txt"></p>
<a class="btn" id="p-wa" href="#" rel="noopener">Continuar no WhatsApp</a><button class="btn sec" type="button" id="p-voltar">Voltar</button></div></div>
<script src="/o/orcamento.js"></script></body></html>`;
}

module.exports = { resumo, MAX_OPCOES, montar, pagina, novoToken, tokenValido, CATALOGO, periodo, biblioteca, escolherFotos, PASTA_FOTOS, GRUPOS, nomeGrupo, definirVivas, FOTOS_FIXAS };
