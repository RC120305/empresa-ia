// Gilberto em modo "sugestão" (fase 2): lê a conversa, escreve a resposta que mandaria e devolve para a
// equipe aprovar, editar ou descartar. Nada é enviado ao cliente por aqui.
// Instruções: crm/gilberto/prompt-sistema.md (blocos A e B no "system", com cache; bloco C como mensagem
// de sistema no fim da conversa, sem cache). Fatos: base-conhecimento.md + contexto/hotel-operacional.md.
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const silbeck = require('./silbeck');

// Modelo escolhido pelo dono (A6): Sonnet 5.5 no dia a dia; troca por configuração, sem mexer no código.
const MODELO = process.env.GILBERTO_MODELO || 'claude-sonnet-5-5';
const ESFORCO = process.env.GILBERTO_ESFORCO || 'medium';

// Na imagem publicada os arquivos ficam em ./conhecimento (copiados na publicação); no repositório, nas pastas de origem.
function ler(nome, ...origem) {
  for (const p of [path.join(__dirname, 'conhecimento', nome), path.join(__dirname, ...origem)]) {
    try { return fs.readFileSync(p, 'utf8'); } catch (e) { /* tenta o próximo */ }
  }
  return null;
}

const PRODUTOS = [
  'COMBO · Combo boia cross + arvorismo · R$ 170 por pessoa · 5 anos ou mais e 1,15 m · prioridade 1',
  'BOIA · Boia cross (1 h, 1.200 m no Rio Formoso) · R$ 100 por pessoa · 5 anos ou mais e 1,15 m · prioridade 2',
  'ARVO · Arvorismo (18 obstáculos e 2 tirolesas, a última aquática) · R$ 120 por pessoa · 5 anos ou mais e 1,15 m · prioridade 3',
  'DECO · Decoração especial · Simples R$ 350 ou Completa R$ 600 · pedir com 3 dias de antecedência',
  'MASS · Massagem (Massagem360, relaxante ou linfática, parceira Natália) · R$ 220 · lançada na conta do hóspede',
].join('\n');

// Produtos e respostas fixas vêm do banco (telas Produtos e Ajustes do agente); sem banco, vale a lista acima.
function montarSistema() {
  const prompt = ler('prompt-sistema.md', '..', 'gilberto', 'prompt-sistema.md');
  const base = ler('base-conhecimento.md', '..', 'gilberto', 'base-conhecimento.md');
  const operacional = ler('hotel-operacional.md', '..', '..', 'contexto', 'hotel-operacional.md');
  if (!prompt || !base) return null;
  const corte = prompt.indexOf('=== BLOCO C');
  return (corte > 0 ? prompt.slice(0, corte) : prompt)
    .replace('{{base_conhecimento}}', base + (operacional ? '\n\n<fatos_operacionais>\n' + operacional + '\n</fatos_operacionais>' : ''));
}
const MODELO_SISTEMA = montarSistema();
const SISTEMA = MODELO_SISTEMA;
// Um produto do catálogo (tela Produtos) como o Gilberto lê: o que é, preço, opções, para quem e regras.
const reais = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function linhaProduto(p) {
  const por = p.unidade === 'pessoa' ? ' por pessoa' : '';
  const vs = Array.isArray(p.variacoes) ? p.variacoes : [], ads = Array.isArray(p.adicionais) ? p.adicionais : [];
  return [p.codigo, p.nome + (p.descricao ? ' (' + p.descricao + ')' : ''),
    vs.length ? 'opções: ' + vs.map(v => v.nome + ' ' + reais(v.preco) + por + (v.descricao ? ' (' + v.descricao + ')' : '')).join('; ') : (p.preco_valor != null ? reais(p.preco_valor) + por : p.preco),
    ads.length ? 'adicionais: ' + ads.map(a => a.nome + ' ' + reais(a.preco)).join(', ') : '',
    p.perfis && p.perfis.length ? 'para: ' + p.perfis.join(', ') : '',
    p.idade_minima ? 'a partir de ' + p.idade_minima + ' anos' : '', p.altura_minima_cm ? 'altura mínima ' + (p.altura_minima_cm / 100).toLocaleString('pt-BR') + ' m' : '',
    p.regras, p.antecedencia_dias ? 'pedir com ' + p.antecedencia_dias + ' dias de antecedência' : '', p.quando_oferecer ? 'oferecer: ' + p.quando_oferecer : '',
    p.grupo_fotos ? 'fotos: enviar_fotos com codigo_acomodacao "' + p.grupo_fotos + '"' : '', 'prioridade ' + p.prioridade].filter(Boolean).join(' · ');
}
function sistemaCom(catalogo) {
  const prods = catalogo && catalogo.produtos && catalogo.produtos.length
    ? catalogo.produtos.map(linhaProduto).join('\n')
    : PRODUTOS;
  let fixas = catalogo && catalogo.respostas && catalogo.respostas.filter(r => r.fixa).length
    ? catalogo.respostas.filter(r => r.fixa).map(r => `- id ${r.id} · quando perguntarem: ${r.pergunta}\n  texto exato: ${r.resposta}`).join('\n')
    : '(vazia nesta fase)';
  const refs = catalogo && catalogo.respostas ? catalogo.respostas.filter(r => !r.fixa) : [];
  if (refs.length) fixas += '\n\nRespostas de referência aprovadas pela equipe (adapte ao contexto, sem copiar se não couber):\n' + refs.map(r => `- ${r.pergunta}\n  ${r.resposta}`).join('\n');
  return MODELO_SISTEMA.replace('{{biblioteca_respostas_fixas}}', fixas).replace('{{produtos_ativos}}', prods);
}

const FORMATO = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      mensagem: { type: 'string', description: 'O texto exato para o cliente, em 1 a 3 balões separados por uma linha contendo só ---' },
      notas_internas: { type: 'string', description: 'Para a equipe (não vai ao cliente): o que conferir ou fazer antes de enviar, ferramentas que seriam chamadas, dúvidas.' },
      precisa_equipe: { type: 'boolean', description: 'true se o caso deve ir para uma pessoa (reclamação, cancelamento, alteração, pedido especial, fora da base).' },
      produto_oferecido: { type: 'string', description: 'Código do produto pago (de <produtos_ativos>) oferecido nesta mensagem, ex.: COMBO. String vazia se a mensagem não oferece produto.' },
    },
    required: ['mensagem', 'notas_internas', 'precisa_equipe', 'produto_oferecido'],
    additionalProperties: false,
  },
};

// Ferramentas ligadas nesta fase: só a cotação no Silbeck (definição em crm/gilberto/ferramentas.json).
const LIGADAS = ['consultar_disponibilidade', 'gerar_orcamento', 'enviar_fotos', 'enviar_link_extras'];
const FERRAMENTAS = (() => {
  try { return JSON.parse(ler('ferramentas.json', '..', 'gilberto', 'ferramentas.json')).filter(t => LIGADAS.includes(t.name)); } catch (e) { return []; }
})();
const MAX_RODADAS = 4;

async function executarFerramenta(nome, entrada, executores = {}) {
  if (executores[nome]) {
    try { return await executores[nome](entrada); } catch (e) {
      console.warn(JSON.stringify({ evento: 'ferramenta_falhou', nome, erro: String(e.message || e).slice(0, 200) }));
      return { ok: false, erro: 'A ferramenta falhou agora. Não invente o dado: use [[...]] e avise a equipe nas notas_internas.' };
    }
  }
  if (nome === 'consultar_disponibilidade') {
    try { return await silbeck.cotar(entrada); } catch (e) {
      console.warn(JSON.stringify({ evento: 'silbeck_falhou', erro: String(e.message || e).slice(0, 200) }));
      return { ok: false, erro: 'O Silbeck não respondeu agora. Não informe preço nem vaga: diga que vai conferir e avise a equipe nas notas_internas.' };
    }
  }
  return { ok: false, erro: 'Ferramenta não ligada nesta fase: use [[...]] e notas_internas.' };
}

const ROTULO = { image: 'uma foto', audio: 'um áudio', video: 'um vídeo', document: 'um documento', sticker: 'uma figurinha', location: 'uma localização', contacts: 'um contato', reaction: 'uma reação' };
function textoParaModelo(m) {
  if (m.tipo === 'text' || m.tipo === 'button' || m.tipo === 'interactive') return m.corpo || '';
  if (m.tipo === 'audio' && m.transcricao) return `[áudio do cliente, transcrição automática: "${m.transcricao}"]`;
  if (m.tipo === 'audio' && m.transcricao_status === 'longo') return '[enviou um áudio longo demais para transcrever: a equipe vai ouvir]';
  const r = ROTULO[m.tipo] || m.tipo;
  return `[enviou ${r}${m.corpo ? ': ' + m.corpo : ''}]`;
}

// Converte o histórico do banco em turnos user/assistant (cliente = user; equipe/Gilberto = assistant).
function montarMensagens(historico) {
  const msgs = [];
  for (const m of historico) {
    const role = m.direcao === 'entrada' ? 'user' : 'assistant';
    const t = textoParaModelo(m).trim();
    if (!t) continue;
    const ult = msgs[msgs.length - 1];
    if (ult && ult.role === role) ult.content += '\n' + t;
    else msgs.push({ role, content: t });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

function contextoTurno(c) {
  const agora = new Date();
  const fmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Campo_Grande', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const [h, mi] = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Campo_Grande', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(agora).split(':').map(Number);
  const minutos = h * 60 + mi;
  const aberto = minutos >= 7 * 60 + 30 && minutos < 17 * 60;
  return `<contexto_crm>
Agora: ${fmt.format(agora)} (horário de Bonito/MS)
Canal: ${c.canal === 'wa' ? 'WhatsApp' : c.canal}
Expediente da equipe aberto agora: ${aberto ? 'sim' : 'não'}
De plantão: não informado
Modo: sugestao
Gatilho deste turno: a equipe pediu uma sugestão de resposta para a última mensagem do cliente
Contato (dados já conhecidos): nome do perfil do WhatsApp: ${c.nome || 'não informado'}
Pendências (reservas, cobranças, alertas abertos): não disponíveis nesta fase
Ofertas de produtos nesta conversa: ${c.ofertas && c.ofertas.length ? c.ofertas.map(o => o.produto_nome + ' (' + ({ oferecido: 'oferecido, sem resposta', aceito: 'aceito', recusado: 'recusado' })[o.situacao] + ', por ' + (o.por === 'gilberto' ? 'você' : 'a equipe') + ')').join('; ') + '. Não ofereça outro produto nesta conversa (no máximo 1 oferta; recusou, não insista), a não ser que o cliente peça.' : 'nenhuma ainda. Se for o momento certo (regra 9), ofereça 1 produto que caiba no grupo e preencha produto_oferecido com o código.'}
Resumo das conversas anteriores: não disponível
</contexto_crm>
Ferramentas ligadas nesta fase: consultar_disponibilidade (vagas e valores do Silbeck), gerar_orcamento (cria a página do orçamento e devolve o link; nesta fase, uma acomodação por opção), enviar_fotos (escolhe fotos reais da biblioteca; a equipe envia junto com a sua mensagem) e enviar_link_extras (link da página de extras: 'aventuras' ou 'momentos'; é assim que você oferece os produtos pagos, com o link na mensagem). Use consultar_disponibilidade sempre que for falar de preço ou vaga e já tiver datas e pessoas (com a idade de cada criança); se faltar algum dado, pergunte ao cliente em vez de chamar. Ao mandar o orçamento, chame gerar_orcamento com as opções escolhidas e coloque o link devolvido na mensagem, exatamente como veio. As outras ferramentas ainda não estão ligadas: não tente chamá-las (quando uma resposta fixa da biblioteca couber, escreva o texto exato dela na mensagem, no lugar de usar_resposta_fixa). Onde precisaria delas (reserva, link de pagamento, alerta), escreva a mensagem com marcadores [[...]] no lugar do dado (ex.: [[link de pagamento]]) e diga em notas_internas o que a equipe precisa fazer. Nunca invente preço nem disponibilidade: só use os valores que a ferramenta devolveu.${silbeck.MODO() === 'simulador' ? ' Nesta fase de testes a ferramenta usa o SIMULADOR do Silbeck: os valores são fictícios; use-os normalmente na mensagem e lembre isso em notas_internas.' : ''}`;
}

let cliente = null;
function anthropic() {
  if (!cliente) cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: process.env.ANTHROPIC_BASE_URL || undefined, maxRetries: 2, timeout: 90_000 });
  return cliente;
}

class ErroSugestao extends Error { constructor(http, msg) { super(msg); this.http = http; } }

async function sugerir(historico, conversa, executores = {}, catalogo = null) {
  if (!process.env.ANTHROPIC_API_KEY) throw new ErroSugestao(503, 'A IA do Gilberto ainda não está ligada (falta a chave da Anthropic no cofre).');
  if (!SISTEMA) throw new ErroSugestao(503, 'As instruções do Gilberto não foram encontradas no servidor.');
  const mensagens = montarMensagens(historico);
  if (!mensagens.length) throw new ErroSugestao(409, 'Ainda não há mensagem do cliente para responder.');
  if (mensagens[mensagens.length - 1].role !== 'user') throw new ErroSugestao(409, 'A última mensagem já é da equipe. A sugestão aparece quando o cliente escrever de novo.');

  const pedido = {
    model: MODELO,
    max_tokens: 16000,
    system: [{ type: 'text', text: sistemaCom(catalogo), cache_control: { type: 'ephemeral' } }],
    messages: [...mensagens, { role: 'system', content: contextoTurno(conversa) }],
    output_config: { effort: ESFORCO, format: FORMATO },
    ...(FERRAMENTAS.length ? { tools: FERRAMENTAS } : {}),
  };
  let usarFallback = true;
  async function chamarIA() {
    try {
      // Recusa por segurança: a API refaz no modelo de reserva automaticamente (fallbacks "default").
      if (usarFallback) return await anthropic().beta.messages.create({ ...pedido, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
      return await anthropic().messages.create(pedido);
    } catch (e) {
      if (e instanceof Anthropic.BadRequestError && usarFallback) {
        console.warn(JSON.stringify({ evento: 'gilberto_sem_fallback', erro: String(e.message).slice(0, 200) }));
        usarFallback = false;
        return chamarIA();
      } else if (e instanceof Anthropic.AuthenticationError) {
        throw new ErroSugestao(503, 'A chave da Anthropic foi recusada. Confira o segredo anthropic-api-key.');
      } else if (e instanceof Anthropic.RateLimitError) {
        throw new ErroSugestao(429, 'Muitas sugestões ao mesmo tempo. Tente de novo em alguns segundos.');
      } else if (e instanceof Anthropic.APIError) {
        throw new ErroSugestao(502, 'A IA não respondeu agora (erro ' + e.status + '). Tente de novo.');
      } else throw e;
    }
  }

  // Laço das ferramentas: o Gilberto pede uma cotação, o CRM consulta o Silbeck e devolve o resultado.
  const cotacoes = [], orcamentos = [], fotos = [], vitrines = [];
  let r;
  for (let rodada = 0; ; rodada++) {
    r = await chamarIA();
    const u = r.usage || {};
    console.log(JSON.stringify({ evento: 'gilberto_sugestao', modelo: r.model, rodada, entrada: u.input_tokens, cache_lido: u.cache_read_input_tokens, cache_gravado: u.cache_creation_input_tokens, saida: u.output_tokens, parada: r.stop_reason }));
    if (r.stop_reason !== 'tool_use') break;
    if (rodada + 1 >= MAX_RODADAS) throw new ErroSugestao(502, 'O Gilberto fez consultas demais nesta sugestão. Tente de novo.');
    const resultados = [];
    for (const b of r.content.filter(b => b.type === 'tool_use')) {
      const res = await executarFerramenta(b.name, b.input, executores);
      if (b.name === 'consultar_disponibilidade') cotacoes.push({ pedido: b.input, ok: !!res.ok, fonte: res.fonte || null, opcoes: (res.opcoes || []).length, erro: res.erro || null });
      if (b.name === 'gerar_orcamento' && res.ok) orcamentos.push({ id: res.orcamento_id, link: res.link, fonte: res.fonte });
      if (b.name === 'enviar_link_extras' && res.ok && res.vitrine_id) vitrines.push(res.vitrine_id);
      if (b.name === 'enviar_fotos' && res.ok) for (const f of res.fotos) if (!fotos.some(x => x.arquivo === f.arquivo) && fotos.length < 5) fotos.push(f);
      resultados.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(res), ...(res.ok === false ? { is_error: true } : {}) });
    }
    pedido.messages = [...pedido.messages, { role: 'assistant', content: r.content }, { role: 'user', content: resultados }];
  }
  if (r.stop_reason === 'refusal') throw new ErroSugestao(422, 'O Gilberto não conseguiu sugerir para esta conversa. Responda manualmente.');
  if (r.stop_reason === 'max_tokens') throw new ErroSugestao(502, 'A sugestão ficou longa demais. Tente de novo.');
  const txt = (r.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let out;
  try { out = JSON.parse(txt); } catch (e) { throw new ErroSugestao(502, 'A sugestão veio num formato inesperado. Tente de novo.'); }
  return { mensagem: String(out.mensagem || ''), notas_internas: String(out.notas_internas || ''), precisa_equipe: !!out.precisa_equipe, produto_oferecido: String(out.produto_oferecido || '').toUpperCase().slice(0, 8), modelo: r.model, cotacoes,
    simulador: cotacoes.some(c => c.fonte === 'simulador') || orcamentos.some(o => o.fonte === 'simulador'), orcamentos, fotos, vitrines };
}

// Questionário (base de conhecimento) em seções de perguntas e respostas, para a tela Ajustes do agente.
function questionario() {
  const base = ler('base-conhecimento.md', '..', 'gilberto', 'base-conhecimento.md') || '';
  const secoes = [];
  let atual = null, item = null;
  for (const linha of base.split('\n')) {
    const h = linha.match(/^## (?:\d+\.\s*)?(.+)/);
    if (h) { atual = { titulo: h[1].replace(/\s*\(.*\)\s*$/, '').trim(), itens: [] }; secoes.push(atual); item = null; continue; }
    if (!atual) continue;
    const p = linha.match(/^- \*\*P:\*\*\s*(.+)/);
    if (p) { item = { p: p[1].trim(), r: '' }; atual.itens.push(item); continue; }
    const r = linha.match(/^\s+R:\s*(.+)/);
    if (r && item) { item.r = r[1].trim(); continue; }
    const b = linha.match(/^- (.+)/);
    if (b && !/^\*\*P:/.test(b[1])) { atual.itens.push({ p: '', r: b[1].trim() }); item = null; }
  }
  const limpar = t => t.replace(/\s*\*\([^)]*\)\*/g, '').replace(/\s*\(P\d+[a-z]?(?:\/[a-z])?\)/g, '').replace(/\*\*/g, '').trim();
  return secoes.filter(x => x.itens.length && !/^Dúvidas/.test(x.titulo))
    .map(x => ({ titulo: x.titulo, itens: x.itens.map(i => ({ p: limpar(i.p), r: limpar(i.r) })).filter(i => i.r) }));
}

module.exports = { questionario, sugerir, montarMensagens, ErroSugestao, sistemaPronto: () => !!SISTEMA, MODELO, ferramentas: () => FERRAMENTAS.map(t => t.name) };
