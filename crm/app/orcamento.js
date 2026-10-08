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
  CST: { nome: 'Duplo Casa Standard', cap: 'para 2 pessoas', dest: ['Uma cama de casal, pensado para o casal', 'Ar quente e frio, frigobar e Wi-Fi', 'Café da manhã incluso'] },
};
// Bangalô Triplo e Quádruplo: no Silbeck real são dois tipos (BANG3 e BANG4), com a descrição e as fotos do Bangalô (dono, 08/10/2026)
CATALOGO.BANG3 = { ...CATALOGO.BG, nome: 'Bangalô Triplo', cap: '40 m² · até 3 pessoas' };
CATALOGO.BANG4 = { ...CATALOGO.BG, nome: 'Bangalô Quádruplo', cap: '40 m² · até 4 pessoas' };
// Fotos: acomodações sem pasta própria usam a da equivalente
// O Duplo Casa Standard (apto 31) NÃO usa as do Standard: lá é só cama de casal (dono, 08/10/2026)
const FOTO_DE = { QES: 'SUP', QST: 'STD', BANG3: 'BG', BANG4: 'BG' };
// Antes das opções e dos valores, os benefícios (dono, 04/10/2026). Fatos aprovados: contexto/hotel-operacional.md
const PORQUE = 'O único hotel de Bonito cercado por dois rios, o Formoso e o Formosinho: 40 hectares de natureza a 6 km do centro, por acesso de asfalto. A diária já inclui o café da manhã e uma programação diária de atividades com acompanhamento de guia como: trilhas com banho de rio, tirolesa, stand up, caiaque e arco e flecha.';
const SLOGAN = 'Seu lugar de conexão com a natureza'; // slogan do Código de Cultura, em destaque no topo (dono, 07/10/2026)
const INCLUSO = ['Café da manhã (6h30 às 9h30)', 'Piscina climatizada', 'Hidromassagem aquecida', 'Sauna', 'Trilhas e decks nos dois rios', 'Caiaque e stand up com monitor', 'Arco e flecha', 'Playground e salão de jogos'];

// Fotos reais por acomodação (item 2): public/fotos/<CODIGO>-<n>.jpg, listadas em public/fotos/fotos.json.
const PASTA_FOTOS = process.env.FOTOS_DIR || path.join(__dirname, 'public', 'fotos');
let FOTOS = {}, DESCRICOES = {};
try { FOTOS = JSON.parse(fs.readFileSync(path.join(PASTA_FOTOS, 'fotos.json'), 'utf8')); } catch (e) { /* sem fotos ainda */ }
try { DESCRICOES = JSON.parse(fs.readFileSync(path.join(PASTA_FOTOS, 'descricoes.json'), 'utf8')); } catch (e) { /* sem descrições */ }
const ROTULOS = { INST: 'Institucional (o hotel)', ATIV: 'Atividades inclusas', BOIA: 'Boia cross', ARVO: 'Arvorismo', RIO: 'Rios e decks', PISCINA: 'Piscina e hidromassagem', CAFE: 'Café da manhã', DECO: 'Decoração especial (opcional)', MASS: 'Massagem', EXTRAS: 'Outros extras' };
// Vídeos (dono, 06/10/2026): ficam na mesma biblioteca, com extensão .mp4 (vêm do Drive, pasta "Vídeos do hotel cabanas").
const ehVideo = a => /\.mp4$/i.test(String(a || ''));
// Categorias em que a equipe pode pôr fotos (as dos quádruplos usam as do duplo/triplo).
const GRUPOS = [...new Set(['INST', 'ATIV', ...Object.keys(FOTOS), 'CBD', 'CBT', 'CBM', 'BG', 'BANG3', 'BANG4', 'BGE', 'CJ', 'SUP', 'QES', 'STD', 'QST', 'CST', ...Object.keys(ROTULOS)])];
const nomeGrupo = g => (CATALOGO[g] && CATALOGO[g].nome) || ROTULOS[g] || g;
// Ajustes da equipe (tabela fotos_biblioteca): fotos trazidas do Drive e fotos fixas tiradas da biblioteca.
const FOTOS_FIXAS = new Set(Object.values(FOTOS).flat());
let VIVAS = [], APTOS = [];
// Apartamentos pela numeração (tabela apartamentos, migração 026): foto ligada a um apartamento fica na categoria dele
const definirVivas = (linhas, aptos) => { VIVAS = Array.isArray(linhas) ? linhas : []; if (Array.isArray(aptos)) APTOS = aptos; };
const apartamentos = () => APTOS.slice();
const aptoDe = n => n == null ? null : APTOS.find(a => Number(a.numero) === Number(n)) || null;
// Biblioteca para a caixa e para o Gilberto: [{grupo, nome, fotos: [{arquivo, descricao, etiquetas, decoracao, origem}]}]
// Com {todas: true}, cada grupo traz também as removidas (para poder devolver).
function biblioteca({ todas = false } = {}) {
  const ajuste = new Map(VIVAS.map(v => [v.arquivo, v]));
  const doApto = n => { const a = aptoDe(n); return a ? { apartamento: Number(a.numero), apto_descricao: a.descricao || '' } : {}; };
  const fixa = a => ({ ...doApto(ajuste.get(a) && ajuste.get(a).apartamento), arquivo: a, descricao: (DESCRICOES[a] && DESCRICOES[a].descricao) || '', etiquetas: (DESCRICOES[a] && DESCRICOES[a].etiquetas) || [],
    decoracao: !!(DESCRICOES[a] && DESCRICOES[a].decoracao), origem: 'base', drive_id: (DESCRICOES[a] && DESCRICOES[a].drive_id) || null, ativo: !(ajuste.get(a) && ajuste.get(a).ativo === false) });
  const nova = v => ({ ...doApto(v.apartamento), arquivo: v.arquivo, descricao: v.descricao || '', etiquetas: v.etiquetas || [], decoracao: !!v.decoracao, origem: 'drive', drive_id: v.drive_id || null, ativo: v.ativo !== false, ...(ehVideo(v.arquivo) ? { video: true } : {}) });
  const novas = VIVAS.filter(v => v.origem === 'drive' && !FOTOS_FIXAS.has(v.arquivo)).sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || String(a.criado_em || '').localeCompare(String(b.criado_em || '')));
  // Categoria de cada foto: a do apartamento, se ligada a um; senão, a de origem
  const comCategoria = [...Object.entries(FOTOS).flatMap(([g, l]) => l.map(a => ({ g, f: fixa(a) }))), ...novas.map(v => ({ g: v.grupo, f: nova(v) }))]
    .map(({ g, f }) => ({ g: (aptoDe(f.apartamento) || {}).categoria || g, f }));
  return GRUPOS.map(grupo => {
    const lista = comCategoria.filter(x => x.g === grupo).map(x => x.f);
    const g = { grupo, nome: nomeGrupo(grupo), fotos: lista.filter(f => f.ativo) };
    if (todas) g.removidas = lista.filter(f => !f.ativo);
    return g;
  }).filter(g => todas || g.fotos.length);
}
// Escolhe fotos para o Gilberto: pelo código da acomodação e/ou etiquetas (até 5).
// Acomodação (dono, 06/10/2026): primeiro uma foto de FORA (fachada/área externa, senão a varanda) e uma do QUARTO
// (de preferência sem a decoração especial); banheiro nunca, a não ser que o cliente peça.
const tem = (f, ...ts) => ts.some(t => f.etiquetas.some(e => e.toLowerCase() === t));
// Fotos de uma acomodação: as da própria categoria; sem nenhuma, as da equivalente (FOTO_DE)
function grupoFotos(cod, bib = biblioteca()) {
  const temFotos = g => bib.some(x => x.grupo === g && x.fotos.some(f => !f.video));
  return temFotos(cod) || !FOTO_DE[cod] ? cod : FOTO_DE[cod];
}
// Um apartamento por vez (dono, 08/10/2026): primeiro as fotos do apartamento com mais fotos, depois as da categoria sem
// apartamento, por último as dos outros apartamentos. Assim o cliente vê um quarto coerente (camas, vista).
function porApartamento(fotos) {
  const n = {}; for (const f of fotos) if (f.apartamento != null) n[f.apartamento] = (n[f.apartamento] || 0) + 1;
  const melhor = Object.keys(n).sort((a, b) => n[b] - n[a] || a - b)[0];
  const peso = f => f.apartamento == null ? 1 : String(f.apartamento) === melhor ? 0 : 2;
  return fotos.map((f, i) => ({ f, i })).sort((a, b) => peso(a.f) - peso(b.f) || a.i - b.i).map(x => x.f);
}
const comApto = f => f.apartamento != null ? { ...f, descricao: 'Apto ' + f.apartamento + (f.apto_descricao ? ' (' + f.apto_descricao + ')' : '') + ': ' + (f.descricao || '') } : f;
function escolherFotos({ codigo_acomodacao, etiquetas, quantidade }) {
  const n = Math.min(5, Math.max(1, Number(quantidade) || 2));
  const bib = biblioteca();
  const tudo = bib.flatMap(g => g.fotos.filter(f => !f.video).map(f => ({ ...f, grupo: g.grupo })));
  const cod = String(codigo_acomodacao || '').toUpperCase().split('+')[0];
  const termos = (etiquetas || []).map(t => String(t).toLowerCase()).filter(Boolean);
  const querBanheiro = termos.some(t => t.includes('banheiro'));
  const pode = f => querBanheiro || !tem(f, 'banheiro');
  const grupoDe = cod ? grupoFotos(cod, bib) : '';
  const pontos = f => (f.grupo === grupoDe ? 10 : 0) + termos.filter(t => f.etiquetas.some(e => e.toLowerCase().includes(t)) || f.descricao.toLowerCase().includes(t)).length;
  const escolhidas = tudo.map(f => ({ f, p: pontos(f) })).filter(x => x.p > 0 && pode(x.f)).sort((a, b) => b.p - a.p).map(x => x.f);
  if (grupoDe && !termos.length) {
    const da = porApartamento(tudo.filter(f => f.grupo === grupoDe));
    const fora = da.find(f => tem(f, 'fachada', 'área externa')) || da.find(f => tem(f, 'varanda'));
    const quarto = da.find(f => tem(f, 'quarto') && !f.decoracao) || da.find(f => tem(f, 'quarto'));
    const primeiro = [fora, quarto].filter(Boolean);
    return [...primeiro, ...da.filter(f => !primeiro.includes(f) && pode(f)), ...escolhidas.filter(f => f.grupo !== grupoDe)].slice(0, n).map(comApto);
  }
  return escolhidas.slice(0, n).map(comApto);
}

// Vídeo para o Gilberto usar como argumento de venda: um por vez, sem repetir o que a conversa já recebeu.
// Pelo código da acomodação e/ou etiquetas; sem nada que combine, o institucional.
function videos() { return biblioteca().flatMap(g => g.fotos.filter(f => f.video).map(f => ({ ...f, grupo: g.grupo, nome_grupo: g.nome }))); }
function escolherVideo({ codigo_acomodacao, etiquetas }, ja = []) {
  const cod = String(codigo_acomodacao || '').toUpperCase().split('+')[0];
  const grupoDe = FOTO_DE[cod] && !videos().some(v => v.grupo === cod) ? FOTO_DE[cod] : cod;
  const termos = (etiquetas || []).map(t => String(t).toLowerCase()).filter(Boolean);
  const lista = videos().filter(v => !ja.includes(v.arquivo));
  const pontos = v => (grupoDe && v.grupo === grupoDe ? 10 : 0) + termos.filter(t => v.grupo.toLowerCase() === t || v.nome_grupo.toLowerCase().includes(t) || v.etiquetas.some(e => e.toLowerCase().includes(t)) || v.descricao.toLowerCase().includes(t)).length;
  const melhor = lista.map(v => ({ v, p: pontos(v) })).filter(x => x.p > 0).sort((a, b) => b.p - a.p)[0];
  if (melhor) return melhor.v;
  return (grupoDe || termos.length) ? null : lista.find(v => v.grupo === 'INST') || null;
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
const VERSAO = encodeURIComponent((process.env.VERSAO || 'local').replace(/[^\w.-]/g, ''));
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
const resumoGrupo = a => grupo({ adultos: a.adultos, criancas_idades: a.idades_criancas || [] });
const novoToken = () => crypto.randomBytes(16).toString('base64url'); // 128 bits
const tokenValido = t => /^[A-Za-z0-9_-]{22}$/.test(t || '');

// Monta o registro do orçamento a partir da cotação (já feita no Silbeck, na hora).
// Cada opção é uma acomodação ou uma combinação (grupo em mais de uma acomodação; dono, 05/10/2026).
const codigosDe = o => (o.acomodacoes || []).flatMap(c => String(c).toUpperCase().split('+')).map(c => c.trim()).filter(Boolean);
const chaveCombinacao = cods => [...cods].sort().join('+'); // mesma combinação, qualquer ordem
const nomeCat = c => (CATALOGO[c.codigo] && CATALOGO[c.codigo].nome) || c.nome;
function nomeDaCombinacao(acs) {
  const vistos = [];
  for (const a of acs) { const v = vistos.find(x => x.codigo === a.codigo); if (v) v.n++; else vistos.push({ codigo: a.codigo, nome: nomeCat(a), n: 1 }); }
  return vistos.map(v => (v.n > 1 ? v.n + ' × ' : '') + v.nome).join(' + ');
}
function montar(entrada, cotacao) {
  const pedidas = (entrada.opcoes || []).slice(0, MAX_OPCOES);
  if (!pedidas.length) return { erro: 'Informe ao menos uma opção.' };
  const opcoes = [], sug = String(entrada.sugerida || '').toUpperCase().split('+').filter(Boolean), chaveSug = chaveCombinacao(sug);
  for (const o of pedidas) {
    const cods = codigosDe(o);
    if (!cods.length) return { erro: 'Opção sem acomodação.' };
    if (cods.length === 1) {
      const cod = cods[0];
      const c = (cotacao.opcoes || []).find(x => x.codigo === cod && !x.combinacao);
      if (!c) return { erro: `${CATALOGO[cod] ? CATALOGO[cod].nome : cod} não tem vaga nessas datas ou não comporta o grupo. Use só códigos que vieram de consultar_disponibilidade.` };
      if (!opcoes.some(x => x.codigo === cod)) opcoes.push({ codigo: cod, nome: nomeCat(c), valor_total: c.valor_total, media_por_noite: c.media_por_noite, parcela_6x: c.parcela_6x, diarias: c.diarias, taxas: c.taxas, ...(c.valor_cheio > c.valor_total ? { valor_cheio: c.valor_cheio, promocao: c.promocao } : {}), ...(sug.length === 1 && cod === sug[0] ? { sugerida: true } : {}) });
      continue;
    }
    const chave = chaveCombinacao(cods);
    const c = (cotacao.opcoes || []).find(x => x.combinacao && chaveCombinacao(x.codigo.split('+')) === chave);
    if (!c) return { erro: `A combinação ${cods.join('+')} não tem vaga ou não comporta o grupo nessas datas. Use uma das combinações de consultar_disponibilidade.` };
    if (!opcoes.some(x => x.codigo === c.codigo)) opcoes.push({ codigo: c.codigo, nome: nomeDaCombinacao(c.acomodacoes), combinacao: true,
      acomodacoes: c.acomodacoes.map(a => ({ codigo: a.codigo, nome: nomeCat(a), adultos: a.adultos, idades_criancas: a.idades_criancas || [], valor_total: a.valor_total })),
      valor_total: c.valor_total, media_por_noite: c.media_por_noite, parcela_6x: c.parcela_6x, diarias: c.diarias, taxas: c.taxas, ...(c.valor_cheio > c.valor_total ? { valor_cheio: c.valor_cheio, promocao: c.promocao } : {}), ...(sug.length > 1 && chave === chaveSug ? { sugerida: true } : {}) });
  }
  // Sempre da mais em conta para a de maior valor (dono, 04/10/2026): nunca abrir com a mais cara
  return { opcoes: emOrdemDeValor(opcoes) };
}
const emOrdemDeValor = ops => [...(ops || [])].sort((a, b) => (Number(a.valor_total) || 0) - (Number(b.valor_total) || 0));

function pagina(o, { previa = false, produtos = null } = {}) {
  const n = noites(o.data_entrada, o.data_saida);
  const nome = o.primeiro_nome ? esc(o.primeiro_nome) : '';
  const bib = biblioteca();
  const fotosDe = cod => porApartamento(((bib.find(g => g.grupo === grupoFotos(cod, bib)) || { fotos: [] }).fotos).filter(f => !f.video)).slice(0, 5);
  const cards = emOrdemDeValor(o.opcoes).map((op, i) => {
    const acs = op.combinacao ? op.acomodacoes || [] : null;
    const cat = acs ? { nome: op.nome, cap: `${acs.length} acomodações para o grupo`, dest: [] }
      : CATALOGO[op.codigo] || { nome: op.nome, cap: '', dest: [] };
    const fotos = acs ? [...new Set(acs.map(a => a.codigo))].flatMap(c => fotosDe(c).slice(0, 2)).slice(0, 5) : fotosDe(op.codigo);
    const quem = acs ? `<ul class="quartos">${acs.map(a => `<li><b>${esc(nomeCat(a))}</b><span>${esc(grupo({ adultos: a.adultos, criancas_idades: a.idades_criancas }))}</span></li>`).join('')}</ul>` : '';
    const galeria = fotos.length ? `<div class="fotos" tabindex="0" aria-label="Fotos: ${esc(cat.nome)}">${fotos.map((f, k) => `<img src="/fotos/${esc(f.arquivo)}" alt="${esc(cat.nome)} · foto ${k + 1}" loading="${k ? 'lazy' : 'eager'}" width="800" height="600">`).join('')}</div>${fotos.length > 1 ? `<div class="pontos" aria-hidden="true">${fotos.map((_, k) => `<i${k ? '' : ' class="on"'}></i>`).join('')}</div>` : ''}` : '';
    const comDeco = fotos.some(f => f.decoracao);
    const nota = comDeco ? '<p class="nota-foto">Algumas fotos mostram a decoração especial (pétalas), opcional e cobrada à parte.</p>' : '';
    // Selo na opção que o Gilberto ou a equipe marcou como a que mais combina (dono, 04/10/2026); a ordem é por valor
    return `<article class="op${op.sugerida ? ' rec' : ''}">${galeria}${nota}<div class="corpo">
${op.sugerida ? '<span class="selo">Nossa sugestão para vocês</span>' : ''}<h2>${esc(cat.nome)}</h2><p class="cap">${esc(cat.cap)}</p>
${quem}<ul class="dest">${cat.dest.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
<div class="preco"><div><small>Total ${n > 1 ? `das ${n} noites` : 'da noite'}</small>${op.valor_cheio > op.valor_total ? `<span class="cheio"><s>${brl(op.valor_cheio)}</s> <em class="desc">−${Math.round(Number(op.promocao) || (1 - op.valor_total / op.valor_cheio) * 100)}%</em></span>` : ''}<b>${brl(op.valor_total)}</b><small>${n > 1 ? `média de ${brl(op.media_por_noite)} por noite · ` : ''}ou 6x de ${brl(op.parcela_6x)} sem juros</small></div></div>
<button class="btn quero" type="button" data-codigo="${esc(op.codigo)}" data-nome="${esc(cat.nome)}">Quero reservar esta</button></div></article>`;
  }).join('\n');
  // Extras pagos não entram no orçamento: são oferecidos depois da reserva paga (dono, 04/10/2026)
  const titulo = `${n > 1 ? `${['', '', 'Duas', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete'][n] || n} noites` : 'Uma noite'} entre <em>dois rios</em>`;
  const abertura = o.frase_de_abertura ? esc(o.frase_de_abertura.trim()) + (/[.!?]$/.test(o.frase_de_abertura.trim()) ? ' ' : '. ') : (nome ? `Oi, ${nome}! ` : 'Oi! ');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>Orçamento · Hotel Cabanas</title><link rel="stylesheet" href="/o/orcamento.css?v=${VERSAO}"></head>
<body data-token="${esc(o.token)}"${previa ? ' data-previa="1"' : ''}>
${o.fonte === 'simulador' ? '<div class="aviso-teste">Página de teste: valores fictícios do simulador, não são preços reais.</div>' : ''}
${previa ? '<div class="aviso-teste">Prévia da equipe: esta visita não conta como abertura do cliente.</div>' : ''}
<header><div class="cab"><img src="/o/logo-branco.png" alt="Hotel Cabanas · Bonito MS" width="120" height="95">
<p class="slogan">${esc(SLOGAN)}</p>
<span class="rot">${nome ? `Orçamento para ${nome}` : 'Seu orçamento'}</span>
<h1>${titulo}</h1>
<div class="resumo"><span>${esc(periodo(o.data_entrada, o.data_saida))}</span><span>${n} ${n > 1 ? 'noites' : 'noite'}</span><span>${esc(grupo(o))}</span></div></div></header>
<main>
<p class="intro">${abertura}${o.frase_de_abertura ? (o.opcoes.length > 1 ? `São ${o.opcoes.length} opções` : 'É uma opção') : (o.opcoes.length > 1 ? `Separei ${o.opcoes.length} opções` : 'Separei uma opção')} com vaga nas suas datas. Os valores são os de hoje, conferidos no nosso sistema de reservas, e ficam sujeitos à disponibilidade até a reserva. 🌿<br><small>Equipe do Hotel Cabanas</small></p>
<section class="bloco porque"><h3 class="sec-t">Por que o Cabanas</h3><p class="porque-t">${esc(PORQUE)}</p><h3 class="sec-t">Já está incluso na diária</h3><ul class="inclui">${INCLUSO.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
${cards}
<section class="bloco depois"><p class="depois-t">🌿 Depois de garantir a reserva, a gente te mostra as aventuras no Rio Formoso e os momentos especiais para deixar a viagem completa.</p></section>
<section class="bloco"><h3 class="sec-t">Condições</h3><ul class="cond">
<li><b>Formas de pagamento:</b> sinal de 50% no Pix ou no cartão em até 3x, ou 100% no Pix ou no cartão em até 6x sem juros. Com sinal, o restante é pago no check-out.</li>
<li>Check-in a partir das 15h e check-out até as 13h (a estrutura fica à disposição antes e depois).</li>
<li>Cancelamento: com 30 dias ou mais de antecedência, reembolso integral; de 15 a 29 dias, 50% do valor pago; com menos de 15 dias, sem reembolso.</li>
<li>Criança até 4 anos não paga, dormindo na cama dos pais.</li>
<li>Estamos a 6 km do centro de Bonito, com acesso asfaltado.</li></ul></section>
<div class="rodape"><p>Hotel Cabanas · Bonito, MS</p></div>
</main>
<div class="barra-extras" id="barra-extras" hidden><span id="barra-txt"></span><button class="btn" type="button" id="barra-ir">Escolher a acomodação</button></div>
<div class="passo" id="passo" hidden><div class="folha" role="dialog" aria-modal="true" aria-labelledby="p-tit"><h3 id="p-tit">Ótima escolha!</h3><p id="p-txt"></p>
<a class="btn" id="p-wa" href="#" rel="noopener">Continuar no WhatsApp</a><button class="btn sec" type="button" id="p-voltar">Voltar</button></div></div>
<script src="/o/orcamento.js?v=${VERSAO}"></script></body></html>`;
}

module.exports = { apartamentos, grupoFotos, porApartamento, FOTO_DE, INCLUSO, ehVideo, videos, escolherVideo, resumo, resumoGrupo, MAX_OPCOES, montar, codigosDe, chaveCombinacao, pagina, novoToken, tokenValido, CATALOGO, periodo, biblioteca, escolherFotos, PASTA_FOTOS, GRUPOS, nomeGrupo, definirVivas, FOTOS_FIXAS };
