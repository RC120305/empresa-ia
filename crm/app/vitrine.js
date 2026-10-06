// Páginas de extras (/e/<token>): a oferta de produtos por link, em dois temas (dono, 02/10/2026).
// O cliente escolhe produto, opção, adicionais, pessoas e dia; o servidor confere tudo e registra a venda.
// Mesmo visual da página do orçamento (orcamento.css) + vitrine.css / vitrine.js.
const TEMAS = {
  aventuras: { nome: 'Aventuras no Rio Formoso', titulo: 'Aventuras no <em>Rio Formoso</em>', botao: 'Ver as aventuras',
    intro: 'Boia cross, arvorismo ou o combo das duas: tudo dentro do hotel, com guias. Escolha o que quiser, quantas pessoas e o dia.' },
  momentos: { nome: 'Momentos especiais', titulo: 'Momentos <em>especiais</em>', botao: 'Ver as opções',
    intro: 'Decoração no quarto para comemorar e massagem para relaxar. Escolha a opção, os adicionais e o dia.' },
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reais = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2, maximumFractionDigits: 2 });
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const isoOk = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(new Date(d + 'T12:00:00Z'));
const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const diaBR = d => { const x = new Date(d + 'T12:00:00Z'); return SEMANA[x.getUTCDay()] + ', ' + d.slice(8, 10) + '/' + d.slice(5, 7); };
// Dias em que o extra pode acontecer: da chegada até a saída (se a estadia é conhecida)
function diasDaEstadia(est) {
  if (!est || !isoOk(est.data_entrada) || !isoOk(est.data_saida) || est.data_saida < est.data_entrada) return null;
  const out = [];
  for (let d = est.data_entrada; d <= est.data_saida && out.length < 30; d = somaDias(d, 1)) out.push(d);
  return out;
}
const pessoasAptas = (p, est) => est && est.adultos ? est.adultos + (est.criancas_idades || []).filter(i => !p.idade_minima || i >= p.idade_minima).length : null;
// Massagem (parceira, tipo_reserva 'terc'): 6 horários por dia e o local (dono, 01/10/2026)
const HORARIOS = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'];
const LOCAIS = ['À beira do rio', 'No quarto'];
const horaBR = h => String(h).replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
const comHorario = p => p.tipo_reserva === 'terc';
const variacoes = p => (Array.isArray(p.variacoes) ? p.variacoes : []);
const adicionais = p => (Array.isArray(p.adicionais) ? p.adicionais : []);

function pagina(v, { produtos, fotosDe, estadia, previa = false, versao = '', ocupados = {} }) {
  const t = TEMAS[v.tema];
  const dias = diasDaEstadia(estadia);
  const nome = estadia && estadia.primeiro_nome ? esc(String(estadia.primeiro_nome).split(/\s+/)[0]) : '';
  const hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  const cards = produtos.map(p => {
    const fotos = fotosDe(p).slice(0, 8);
    const vs = variacoes(p), ads = adicionais(p), por = p.unidade === 'pessoa' ? ' por pessoa' : '';
    const precos = { base: p.preco_valor != null ? Number(p.preco_valor) : null, vars: Object.fromEntries(vs.map(x => [x.nome, Number(x.preco)])), ads: Object.fromEntries(ads.map(x => [x.nome, Number(x.preco)])), pessoa: p.unidade === 'pessoa' };
    const aptas = pessoasAptas(p, estadia);
    const qtd = p.unidade === 'pessoa' ? Math.max(1, aptas || 2) : 1;
    const galeria = fotos.length ? `<div class="fotos" tabindex="0" aria-label="Fotos: ${esc(p.nome)}">${fotos.map((f, k) => `<img src="/fotos/${esc(f)}" alt="${esc(p.nome)} · foto ${k + 1}" loading="${k ? 'lazy' : 'eager'}" width="800" height="600">`).join('')}</div>${fotos.length > 1 ? `<div class="pontos" aria-hidden="true">${fotos.map((_, k) => `<i${k ? '' : ' class="on"'}></i>`).join('')}</div>` : ''}` : '';
    const opcoes = vs.length > 1
      ? `<fieldset class="vt-op"><legend>Escolha a opção</legend>${vs.map((x, k) => `<label class="vt-esc"><input type="radio" name="v-${esc(p.codigo)}" value="${esc(x.nome)}"${k ? '' : ' checked'}><span><b>${esc(x.nome)}</b> · ${reais(x.preco)}${por}${x.descricao ? `<small>${esc(x.descricao)}</small>` : ''}</span></label>`).join('')}</fieldset>`
      : `<p class="vt-preco">${vs.length === 1 ? reais(vs[0].preco) + por + ` <small>${esc(vs[0].nome)}</small>` : esc(p.preco)}</p>`;
    const extras = ads.length ? `<fieldset class="vt-op"><legend>Adicionais (opcionais)</legend>${ads.map(a => `<label class="vt-esc"><input type="checkbox" class="vt-ad" value="${esc(a.nome)}"><span>${esc(a.nome)} · +${reais(a.preco)}</span></label>`).join('')}</fieldset>` : '';
    const dia = dias
      ? `<select class="vt-dia" aria-label="Dia">${dias.map((d, k) => `<option value="${d}"${(p.tipo_reserva === 'simples' ? k === 0 : k === Math.min(1, dias.length - 1)) ? ' selected' : ''}>${diaBR(d)}${k === 0 ? ' (chegada)' : k === dias.length - 1 ? ' (saída)' : ''}</option>`).join('')}</select>`
      : `<input type="date" class="vt-dia" min="${hoje}" aria-label="Dia">`;
    const agenda = comHorario(p)
      ? `<div class="vt-linha"><label class="vt-campo">Horário<select class="vt-hora" aria-label="Horário">${HORARIOS.map(h => `<option value="${h}">${horaBR(h)}</option>`).join('')}</select></label>
<fieldset class="vt-op vt-local"><legend>Onde</legend>${LOCAIS.map((l, k) => `<label class="vt-esc"><input type="radio" name="l-${esc(p.codigo)}" value="${esc(l)}"${k ? '' : ' checked'}><span>${esc(l)}</span></label>`).join('')}</fieldset></div>
<p class="vt-regra">A massoterapeuta confirma o horário pelo WhatsApp. Horários riscados já estão reservados.</p>`
      : '';
    return `<article class="op vt-prod" data-codigo="${esc(p.codigo)}" data-nome="${esc(p.nome)}" data-precos="${esc(JSON.stringify(precos))}"${comHorario(p) ? ` data-ocupados="${esc(JSON.stringify(ocupados))}"` : ''}>${galeria}<div class="corpo">
<h2>${esc(p.nome)}</h2>${p.descricao ? `<p class="cap">${esc(p.descricao)}</p>` : ''}${p.regras ? `<p class="vt-regra">${esc(p.regras)}</p>` : ''}
${opcoes}${extras}
<div class="vt-linha"><label class="vt-campo">${p.unidade === 'pessoa' ? 'Pessoas' : 'Quantidade'}<input type="number" class="vt-qtd" min="1" max="20" value="${qtd}" inputmode="numeric"></label><label class="vt-campo">Dia${p.antecedencia_dias ? ` <small>(pedir com ${p.antecedencia_dias} dias de antecedência)</small>` : ''}${dia}</label></div>
${agenda}
${aptas && p.idade_minima && estadia && (estadia.criancas_idades || []).some(i => i < p.idade_minima) ? `<p class="vt-regra">Crianças com menos de ${p.idade_minima} anos não participam: já contamos só quem pode.</p>` : ''}
<label class="ex-quero vt-quero"><input type="checkbox" class="vt-sel"> Quero este <span class="vt-sub"></span></label>
</div></article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>${esc(t.nome)} · Hotel Cabanas</title><link rel="stylesheet" href="/o/orcamento.css?v=${versao}"><link rel="stylesheet" href="/o/vitrine.css?v=${versao}"></head>
<body data-token="${esc(v.token)}"${previa ? ' data-previa="1"' : ''}>
${previa ? '<div class="aviso-teste">Prévia da equipe: esta visita não conta como abertura do cliente.</div>' : ''}
<header><div class="cab"><img src="/o/logo-branco.png" alt="Hotel Cabanas · Bonito MS" width="120" height="95">
<span class="rot">${nome ? `Extras para ${nome}` : 'Extras da sua estadia'}</span>
<h1>${t.titulo}</h1>
${dias ? `<div class="resumo"><span>${diaBR(dias[0])} a ${diaBR(dias[dias.length - 1])}</span></div>` : ''}</div></header>
<main>
<p class="intro">${esc(t.intro)} 🌿</p>
${cards || '<p class="intro">Nenhum extra disponível agora. Fale com a gente pelo WhatsApp.</p>'}
<section class="bloco"><h3 class="sec-t">Como funciona</h3><ul class="cond">
<li>Marque o que quiser e toque em <b>Quero estes</b>: a sua escolha vai para a nossa conversa do WhatsApp.</li>
<li>A equipe confirma o horário com você por lá.</li>
<li>Os extras vão para a conta da hospedagem e são acertados no check-out.</li></ul></section>
<div class="rodape"><p>Hotel Cabanas · Bonito, MS</p></div>
</main>
<div class="barra-extras" id="vt-barra" hidden><span id="vt-total"></span><button class="btn" type="button" id="vt-enviar">Quero estes</button></div>
<div class="passo" id="passo" hidden><div class="folha" role="dialog" aria-modal="true" aria-labelledby="p-tit"><h3 id="p-tit">Sua escolha</h3><div id="p-lista" class="vt-resumo"></div><p id="p-txt"></p>
<button class="btn" type="button" id="p-confirmar">Confirmar</button><a class="btn" id="p-wa" href="#" rel="noopener" hidden>Continuar no WhatsApp</a><button class="btn sec" type="button" id="p-voltar">Voltar</button></div></div>
<script src="/o/vitrine.js?v=${versao}"></script></body></html>`;
}

// Confere o pedido da página contra o catálogo e a estadia. Devolve itens limpos ou {erro}.
function validarPedido(itens, produtos, estadia) {
  if (!Array.isArray(itens) || !itens.length) return { erro: 'Escolha pelo menos um extra.' };
  if (itens.length > 8) return { erro: 'Escolha no máximo 8 extras de uma vez.' };
  const dias = diasDaEstadia(estadia);
  const hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  const out = [];
  for (const it of itens) {
    const p = produtos.find(x => x.codigo === String(it && it.codigo || ''));
    if (!p) return { erro: 'Produto indisponível.' };
    const vs = variacoes(p);
    const v = vs.length > 1 ? vs.find(x => x.nome === it.variacao) : vs[0] || null;
    if (vs.length > 1 && !v) return { erro: 'Escolha a opção de ' + p.nome + '.' };
    const ads = [...new Set(Array.isArray(it.adicionais) ? it.adicionais.map(String) : [])];
    if (ads.some(a => !adicionais(p).some(x => x.nome === a))) return { erro: 'Adicional inválido em ' + p.nome + '.' };
    const qtd = Math.round(Number(it.quantidade));
    if (!(qtd >= 1 && qtd <= 20)) return { erro: 'Quantidade de 1 a 20 em ' + p.nome + '.' };
    const data = it.data ? String(it.data) : null;
    if (data && (!isoOk(data) || (dias ? !dias.includes(data) : data < hoje))) return { erro: 'Dia inválido em ' + p.nome + '.' };
    let horario = null, local = null;
    if (comHorario(p)) {
      horario = String(it.horario || ''); local = String(it.local || '');
      if (!data) return { erro: 'Escolha o dia de ' + p.nome + '.' };
      if (!HORARIOS.includes(horario)) return { erro: 'Escolha o horário de ' + p.nome + '.' };
      if (!LOCAIS.includes(local)) return { erro: 'Escolha onde vai ser ' + p.nome + '.' };
    }
    const chave = p.codigo + '|' + (v ? v.nome : '') + (horario ? '|' + data + '|' + horario : '');
    if (out.some(x => x.chave === chave)) continue;
    out.push({ chave, codigo: p.codigo, nome: p.nome, variacao: v ? v.nome : null, adicionais: ads, quantidade: qtd, data, ...(horario ? { horario, local } : {}) });
  }
  return { itens: out };
}
// Uma linha por item, para a mensagem do WhatsApp e o histórico
const linhaItem = (it, p) => it.nome + (it.variacao && variacoes(p || {}).length > 1 ? ' (' + it.variacao + ')' : '') + ' · ' + it.quantidade + (p && p.unidade === 'pessoa' ? (it.quantidade > 1 ? ' pessoas' : ' pessoa') : 'x')
  + (it.adicionais.length ? ' · + ' + it.adicionais.join(', ') : '') + (it.data ? ' · ' + it.data.slice(8, 10) + '/' + it.data.slice(5, 7) : '')
  + (it.horario ? ' às ' + horaBR(it.horario) : '') + (it.local ? ' · ' + it.local.toLowerCase() : '');

module.exports = { TEMAS, pagina, validarPedido, linhaItem, diasDaEstadia, HORARIOS, LOCAIS, horaBR, diaBR, esc };
