// Massagem com a parceira (Natália) pelo WhatsApp (dono, 06/10/2026).
// Páginas: /p/<token> (a parceira confirma ou indica até 3 horários) e /mc/<token> (o hóspede escolhe um deles).
// Mesmo visual da página de extras (orcamento.css + vitrine.css + massagem.css); o script é /o/massagem.js.
const { HORARIOS, horaBR, diaBR, esc } = require('./vitrine');

const PRAZO_AVISO_MS = 3 * 3600e3;   // sem resposta da parceira: aviso para a equipe
const VALIDADE_MS = 24 * 3600e3;     // depois disso o pedido expira e nada mais vai para a parceira
const MAX_OPCOES = 3;
const quando = (d, h) => diaBR(String(d).slice(0, 10)) + ' às ' + horaBR(h);
const detalhe = pd => [pd.servico, quando(pd.data, pd.horario), pd.local ? String(pd.local).toLowerCase() : '',
  (pd.adicionais || []).length ? 'adicionais: ' + pd.adicionais.join(', ') : ''].filter(Boolean).join(' · ');

// Dias que a parceira pode indicar: os da estadia do hóspede a partir de hoje (sem estadia: 7 dias a partir do pedido)
function diasPossiveis(pd, estadia, hoje) {
  const soma = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const dp = String(pd.data).slice(0, 10);
  const naEstadia = estadia && estadia.data_entrada && estadia.data_saida && estadia.data_entrada <= dp && dp <= estadia.data_saida;
  const ini = naEstadia ? estadia.data_entrada : dp, fim = naEstadia ? estadia.data_saida : soma(dp, 7);
  const out = [];
  for (let d = ini; d <= fim && out.length < 14; d = soma(d, 1)) if (d >= hoje) out.push(d);
  return out;
}
// Confere as opções que a parceira marcou
function validarOpcoes(opcoes, dias, ocupados, pd) {
  if (!Array.isArray(opcoes) || !opcoes.length) return { erro: 'Marque pelo menos um horário livre.' };
  if (opcoes.length > MAX_OPCOES) return { erro: 'Marque no máximo ' + MAX_OPCOES + ' horários.' };
  const out = [];
  for (const o of opcoes) {
    const data = String(o && o.data || ''), horario = String(o && o.horario || '');
    if (!dias.includes(data) || !HORARIOS.includes(horario)) return { erro: 'Horário inválido.' };
    if ((ocupados[data] || []).includes(horario)) return { erro: 'O horário de ' + quando(data, horario) + ' já está reservado.' };
    if (data === String(pd.data).slice(0, 10) && horario === pd.horario) return { erro: 'Esse é o horário que você não pode: escolha outros.' };
    if (!out.some(x => x.data === data && x.horario === horario)) out.push({ data, horario });
  }
  return { opcoes: out };
}

function casca(titulo, rotulo, corpo, versao, dados) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>${esc(titulo.replace(/<[^>]+>/g, ''))} · Hotel Cabanas</title><link rel="stylesheet" href="/o/orcamento.css?v=${versao}"><link rel="stylesheet" href="/o/vitrine.css?v=${versao}"><link rel="stylesheet" href="/o/massagem.css?v=${versao}"></head>
<body ${Object.entries(dados).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>
<header><div class="cab"><img src="/o/logo-branco.png" alt="Hotel Cabanas · Bonito MS" width="120" height="95">
<span class="rot">${esc(rotulo)}</span><h1>${titulo}</h1></div></header>
<main>${corpo}<div class="rodape"><p>Hotel Cabanas · Bonito, MS</p></div></main>
<script src="/o/massagem.js?v=${versao}"></script></body></html>`;
}
const cartao = pd => `<section class="bloco ms-pedido"><h3 class="sec-t">Pedido</h3><ul class="cond">
<li><b>${esc(pd.servico)}</b></li><li>📅 ${esc(quando(pd.data, pd.horario))}</li>${pd.local ? `<li>📍 ${esc(pd.local)}</li>` : ''}
${(pd.adicionais || []).length ? `<li>➕ ${esc(pd.adicionais.join(', '))}</li>` : ''}${pd.hospede ? `<li>👤 Hóspede: ${esc(pd.hospede)}</li>` : ''}</ul></section>`;
const SITUACAO = {
  confirmado: 'Massagem confirmada. Obrigado! ✅',
  opcoes_enviadas: 'Você indicou outros horários. O hóspede está escolhendo e avisamos você pelo WhatsApp.',
  sem_opcao: 'O hóspede não pôde em nenhum dos horários. A equipe do hotel segue com ele.',
  expirado: 'Este pedido expirou (24 h sem resposta). A equipe do hotel segue com o hóspede.',
  cancelado: 'Este pedido foi cancelado.',
};

// Página da parceira: confirmar ou indicar até 3 horários
function paginaParceira(pd, { dias, ocupados, versao = '', agora = Date.now() }) {
  const vencido = pd.expira_em && new Date(pd.expira_em).getTime() < agora;
  const aberto = pd.situacao === 'aguardando_parceiro' && !vencido;
  const grade = dias.map(d => `<fieldset class="ms-dia"><legend>${esc(diaBR(d))}</legend>${HORARIOS.map(h => {
    const oc = (ocupados[d] || []).includes(h) || (d === String(pd.data).slice(0, 10) && h === pd.horario);
    return `<label class="ms-h${oc ? ' oc' : ''}"><input type="checkbox" class="ms-op" value="${d}|${h}"${oc ? ' disabled' : ''}><span>${esc(horaBR(h))}</span></label>`;
  }).join('')}</fieldset>`).join('');
  const corpo = cartao(pd) + (aberto
    ? `<div class="ms-acoes"><button class="btn" type="button" id="ms-confirmo">✓ Confirmo este horário</button>
<button class="btn sec" type="button" id="ms-nao">Não posso neste horário</button></div>
<section class="bloco" id="ms-outros" hidden><h3 class="sec-t">Quais horários você tem livres?</h3>
<p class="intro">Marque até ${MAX_OPCOES} opções. O hóspede escolhe uma e a massagem já fica confirmada nesse horário.</p>${grade}
<button class="btn" type="button" id="ms-enviar">Enviar opções ao hóspede</button></section>
<p class="ms-msg" id="ms-msg" role="status"></p><p class="vt-regra">Este link vale por 24 horas.</p>`
    : `<p class="intro ms-fim">${esc(vencido && pd.situacao === 'aguardando_parceiro' ? SITUACAO.expirado : SITUACAO[pd.situacao] || 'Pedido respondido.')}</p>`);
  return casca('Pedido de <em>massagem</em>', 'Massagem 360 · Hotel Cabanas', corpo, versao, { papel: 'parceira', token: pd.token_parceiro });
}
// Página do hóspede: escolher um dos horários indicados
function paginaCliente(pd, { versao = '', nome = '' }) {
  const aberto = pd.situacao === 'opcoes_enviadas';
  const ops = (pd.opcoes || []).map((o, k) => `<label class="vt-esc"><input type="radio" name="ms-escolha" value="${k}"${k ? '' : ' checked'}><span><b>${esc(quando(o.data, o.horario))}</b></span></label>`).join('');
  const corpo = `<p class="intro">${nome ? esc(nome) + ', a' : 'A'} massoterapeuta não tem vaga às ${esc(horaBR(pd.horario))} de ${esc(diaBR(String(pd.data).slice(0, 10)))}, mas separou estes horários para você 🌿</p>`
    + (aberto
      ? `<fieldset class="vt-op"><legend>Escolha o horário</legend>${ops}</fieldset>
<div class="ms-acoes"><button class="btn" type="button" id="ms-escolher">Quero este horário</button><button class="btn sec" type="button" id="ms-nenhum">Nenhum serve para mim</button></div>
<p class="ms-msg" id="ms-msg" role="status"></p>`
      : `<p class="intro ms-fim">${pd.situacao === 'confirmado' ? 'Massagem confirmada: ' + esc(quando(pd.data, pd.horario)) + ' ✅' : pd.situacao === 'sem_opcao' ? 'Recebemos. A equipe fala com você pelo WhatsApp.' : 'Este link não está mais ativo. Fale com a gente pelo WhatsApp.'}</p>`)
    + `<section class="bloco"><h3 class="sec-t">${esc(pd.servico)}</h3><ul class="cond">${pd.local ? `<li>📍 ${esc(pd.local)}</li>` : ''}<li>Vai para a conta da hospedagem e é acertado no check-out.</li></ul></section>`;
  return casca('Sua <em>massagem</em>', 'Hotel Cabanas', corpo, versao, { papel: 'cliente', token: pd.token_cliente });
}

module.exports = { PRAZO_AVISO_MS, VALIDADE_MS, MAX_OPCOES, quando, detalhe, diasPossiveis, validarOpcoes, paginaParceira, paginaCliente };
