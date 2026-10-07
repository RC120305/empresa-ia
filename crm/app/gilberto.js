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
  // Correções da equipe ao questionário: valem no lugar do que a base diz sobre o mesmo assunto
  const correcoes = catalogo && catalogo.respostas ? catalogo.respostas.filter(r => r.origem === 'correcao') : [];
  if (correcoes.length) fixas += '\n\nCorreções da equipe ao questionário (valem NO LUGAR do que <base_conhecimento> diz sobre o mesmo assunto; use estas):\n' + correcoes.map(r => `- ${r.pergunta}\n  ${r.resposta}`).join('\n');
  const refs = catalogo && catalogo.respostas ? catalogo.respostas.filter(r => !r.fixa && r.origem !== 'correcao') : [];
  if (refs.length) fixas += '\n\nRespostas de referência aprovadas pela equipe (adapte ao contexto, sem copiar se não couber):\n' + refs.map(r => `- ${r.pergunta}\n  ${r.resposta}`).join('\n');
  return MODELO_SISTEMA.replace('{{biblioteca_respostas_fixas}}', fixas).replace('{{produtos_ativos}}', prods) + blocoDocumentos(catalogo && catalogo.documentos);
}

// ---------- Documentos que ensinam o Gilberto (aprovados pelo dono; Ajustes do agente > Documentos) ----------
// Até LIMITE_DOCS caracteres entram inteiros nas instruções; os que passarem disso ficam para consultar_documentos.
const LIMITE_DOCS = Number(process.env.GILBERTO_LIMITE_DOCS || 60000);
function dividirDocumentos(docs) {
  const dentro = [], fora = [];
  let usado = 0;
  for (const d of docs || []) {
    const t = String(d.conteudo || '');
    if (usado + t.length <= LIMITE_DOCS) { dentro.push(d); usado += t.length; } else fora.push(d);
  }
  return { dentro, fora };
}
function blocoDocumentos(docs) {
  if (!docs || !docs.length) return '';
  const { dentro, fora } = dividirDocumentos(docs);
  return '\n\n<documentos_aprovados>\nMaterial aprovado pelo dono para você estudar e usar nas conversas. Regras: (1) os fatos do hotel em <base_conhecimento>, <fatos_operacionais>, nas correções da equipe e nas ferramentas valem MAIS que estes documentos; se um documento disser outra coisa sobre o hotel, use a base e avise a equipe nas notas_internas. (2) Informação de terceiros (atrativos, parceiros, a cidade) é referência: não prometa em nome deles; preços e horários de terceiros mudam, diga que confirma. (3) Nunca diga ao cliente que está lendo um documento.\n'
    + dentro.map(d => `\n<documento titulo="${String(d.titulo || '').replace(/"/g, "'")}">\n${d.conteudo}\n</documento>`).join('\n')
    + (fora.length ? `\n\nOutros documentos aprovados (consulte com consultar_documentos quando o assunto aparecer): ${fora.map(d => d.titulo).join('; ')}.` : '')
    + '\n</documentos_aprovados>';
}
// Busca simples por palavras nos documentos que não couberam nas instruções (trechos separados por linha em branco)
const normalizar = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function consultarDocumentos(docs, busca) {
  const { fora } = dividirDocumentos(docs);
  if (!fora.length) return { ok: true, trechos: [], aviso: 'Todos os documentos aprovados já estão nas suas instruções.' };
  const termos = [...new Set(normalizar(busca).split(/[^a-z0-9]+/).filter(t => t.length > 2))];
  if (!termos.length) return { ok: false, erro: 'Diga o assunto que procura (ex.: "horário da Gruta do Lago Azul").' };
  const trechos = [];
  for (const d of fora) for (const parte of String(d.conteudo || '').split(/\n\s*\n/)) {
    const n = normalizar(parte), pontos = termos.filter(t => n.includes(t)).length;
    if (pontos) trechos.push({ documento: d.titulo, texto: parte.trim().slice(0, 1500), pontos });
  }
  trechos.sort((a, b) => b.pontos - a.pontos);
  return { ok: true, trechos: trechos.slice(0, 5).map(({ pontos, ...t }) => t), ...(trechos.length ? {} : { aviso: 'Nada encontrado nos documentos sobre isso: não invente; diga que vai confirmar.' }) };
}

// Prepara um documento enviado pela equipe: vira fatos e perguntas e respostas para o Gilberto, com os conflitos
// com a base do hotel apontados. Nada é usado antes de o dono aprovar.
const FORMATO_DOC = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      titulo: { type: 'string', description: 'Título curto do assunto (ex.: "Gruta do Lago Azul: regras de visita").' },
      resumo: { type: 'string', description: 'Uma ou duas frases: do que trata e para que serve no atendimento.' },
      conteudo: { type: 'string', description: 'O material para o Gilberto, em português do Brasil e em markdown: primeiro os fatos em tópicos curtos, depois perguntas e respostas no formato "- **P:** ...\\n  **R:** ...". Blocos separados por linha em branco, um assunto por bloco. Sem dados pessoais.' },
      conflitos: { type: 'array', items: { type: 'string' }, description: 'Cada ponto em que o documento contradiz a base do hotel (diga o que o documento diz e o que a base diz). Lista vazia se não houver.' },
      alertas: { type: 'array', items: { type: 'string' }, description: 'O que o dono deve conferir antes de aprovar: dado pessoal removido, informação que parece velha, preço de terceiro, promessa arriscada, texto ilegível etc. Lista vazia se não houver.' },
    },
    required: ['titulo', 'resumo', 'conteudo', 'conflitos', 'alertas'],
    additionalProperties: false,
  },
};
const INSTRUCAO_DOC = `Você prepara material de estudo para o Gilberto, o consultor de vendas e reservas do Hotel Cabanas (Bonito/MS) no WhatsApp.
A equipe enviou o documento acima. Transforme-o no que o Gilberto precisa saber para atender clientes:
- Fique só com o que é útil no atendimento; deixe de fora o que não for. Não invente nada que não esteja no documento.
- Reescreva em português do Brasil, claro e curto. Fatos primeiro, depois perguntas e respostas que um cliente faria.
- Tire qualquer dado pessoal (nome de hóspede, telefone, e-mail, documento, endereço de pessoa) e avise em "alertas".
- Compare com a base do hotel (em <base_do_hotel>): todo ponto que contradiz a base vai em "conflitos". No conteúdo, sobre o hotel, fique com o que a base diz.
- Se o documento não tiver nada útil para o atendimento, diga isso no resumo e deixe o conteúdo curto.`;
async function prepararDocumento({ titulo, texto, pdf }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new ErroSugestao(503, 'A IA do Gilberto ainda não está ligada (falta a chave da Anthropic no cofre).');
  const base = ler('base-conhecimento.md', '..', 'gilberto', 'base-conhecimento.md') || '';
  const operacional = ler('hotel-operacional.md', '..', '..', 'contexto', 'hotel-operacional.md') || '';
  const conteudo = [];
  if (pdf) conteudo.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf }, title: String(titulo || 'Documento').slice(0, 200) });
  conteudo.push({ type: 'text', text: (texto ? `<documento titulo="${String(titulo || '').replace(/"/g, "'")}">\n${texto}\n</documento>\n\n` : '') + INSTRUCAO_DOC });
  const pedido = {
    model: MODELO, max_tokens: 32000,
    system: [{ type: 'text', text: '<base_do_hotel>\n' + base + '\n\n' + operacional + '\n</base_do_hotel>' }],
    messages: [{ role: 'user', content: conteudo }],
    output_config: { effort: 'medium', format: FORMATO_DOC },
  };
  let r;
  try {
    try { r = await anthropic().beta.messages.stream({ ...pedido, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { timeout: 240000 }).finalMessage(); }
    catch (e) { if (!(e instanceof Anthropic.BadRequestError)) throw e; r = await anthropic().messages.stream(pedido, { timeout: 240000 }).finalMessage(); } // sem o beta de reserva: refaz sem ele
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) throw new ErroSugestao(400, 'A IA não conseguiu ler este arquivo (' + String(e.message || '').slice(0, 120) + '). Se for PDF escaneado ou protegido, mande o texto.');
    if (e instanceof Anthropic.RateLimitError) throw new ErroSugestao(429, 'A IA está ocupada agora. Tente de novo em alguns minutos.');
    if (e instanceof Anthropic.APIError) throw new ErroSugestao(502, 'A IA não respondeu agora (erro ' + e.status + '). Tente de novo.');
    throw e;
  }
  console.log(JSON.stringify({ evento: 'documento_preparado', modelo: r.model, entrada: (r.usage || {}).input_tokens, saida: (r.usage || {}).output_tokens, parada: r.stop_reason }));
  if (r.stop_reason === 'refusal') throw new ErroSugestao(422, 'A IA recusou preparar este documento.');
  if (r.stop_reason === 'max_tokens') throw new ErroSugestao(413, 'O documento é grande demais para preparar de uma vez. Divida em partes menores.');
  const txt = (r.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let out;
  try { out = JSON.parse(txt); } catch (e) { throw new ErroSugestao(502, 'A preparação veio num formato inesperado. Tente de novo.'); }
  return { titulo: String(out.titulo || titulo || 'Documento').slice(0, 160), resumo: String(out.resumo || '').slice(0, 600), conteudo: String(out.conteudo || '').slice(0, 200000),
    conflitos: (out.conflitos || []).map(String).slice(0, 30), alertas: (out.alertas || []).map(String).slice(0, 30) };
}

const FORMATO = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      mensagem: { type: 'string', description: 'O texto exato para o cliente, em 1 a 3 balões separados por uma linha contendo só ---' },
      notas_internas: { type: 'string', description: 'Para a equipe (não vai ao cliente): o que conferir ou fazer antes de enviar, ferramentas que seriam chamadas, dúvidas.' },
      precisa_equipe: { type: 'boolean', description: 'true se o caso precisa de uma pessoa (reclamação, cancelamento, alteração, pedido especial, fora da base): o CRM avisa a equipe e você continua na conversa. Dúvida ou indecisão do cliente e pedido de desconto: false.' },
      produto_oferecido: { type: 'string', description: 'Código do produto pago (de <produtos_ativos>) oferecido nesta mensagem, ex.: COMBO. String vazia se a mensagem não oferece produto.' },
    },
    required: ['mensagem', 'notas_internas', 'precisa_equipe', 'produto_oferecido'],
    additionalProperties: false,
  },
};

// Ferramentas ligadas nesta fase: só a cotação no Silbeck (definição em crm/gilberto/ferramentas.json).
// Modo estrito só nas ferramentas que mexem com reserva e dinheiro (criar_reserva, gerar_cobranca): estrito em todas
// estoura o limite da API ("compiled grammar is too large", 06/10/2026); as demais o CRM valida ao executar.
const LIGADAS = ['consultar_disponibilidade', 'gerar_orcamento', 'criar_reserva', 'gerar_cobranca', 'enviar_fotos', 'enviar_video', 'enviar_link_extras', 'abrir_alerta', 'consultar_documentos', 'rota_ate_o_hotel'];
// Rota de carro até o hotel no Google Maps (dono, 07/10/2026): link de rotas, sem chave de API; o Maps calcula distância e tempo
const DESTINO_HOTEL = 'Hotel Cabanas, Rodovia Bonito/Balneário Municipal km 6, Bonito - MS';
function rotaAteHotel(origem) {
  const o = String(origem || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (o.length < 3) return { ok: false, erro: 'Pergunte de qual cidade (e estado) o cliente sai antes de montar a rota.' };
  const link = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(o) + '&destination=' + encodeURIComponent(DESTINO_HOTEL) + '&travelmode=driving';
  return { ok: true, link, origem: o, aviso: 'Mande o link exatamente como veio, numa linha própria. O Google Maps mostra a distância, o tempo e as alternativas de caminho: não invente quilometragem, tempo nem estrada. Dicas só as que estão na base (ex.: os últimos 6 km até o hotel são asfaltados, a 6 km do centro de Bonito).' };
}
const FERRAMENTAS = (() => {
  try { return JSON.parse(ler('ferramentas.json', '..', 'gilberto', 'ferramentas.json')).filter(t => LIGADAS.includes(t.name)); } catch (e) { return []; }
})();
const MAX_RODADAS = 6; // na última rodada a IA responde sem ferramentas (nunca fica sem resposta)

async function executarFerramenta(nome, entrada, executores = {}, modo = 'sugestao') {
  const semDado = modo === 'automatico'
    ? 'Não invente o dado e não use marcadores [[...]]: diga ao cliente que vai confirmar esse ponto com a equipe e chame abrir_alerta com o resumo.'
    : 'Não invente o dado: use [[...]] e avise a equipe nas notas_internas.';
  if (executores[nome]) {
    try { return await executores[nome](entrada); } catch (e) {
      console.warn(JSON.stringify({ evento: 'ferramenta_falhou', nome, erro: String(e.message || e).slice(0, 200) }));
      return { ok: false, erro: 'A ferramenta falhou agora (' + String(e.message || e).slice(0, 160) + '). ' + semDado };
    }
  }
  if (nome === 'consultar_disponibilidade') {
    try { return await silbeck.cotar(entrada); } catch (e) {
      console.warn(JSON.stringify({ evento: 'silbeck_falhou', erro: String(e.message || e).slice(0, 200) }));
      return { ok: false, erro: 'O Silbeck não respondeu agora. Não informe preço nem vaga: diga que vai conferir' + (modo === 'automatico' ? ' e chame abrir_alerta.' : ' e avise a equipe nas notas_internas.') };
    }
  }
  return { ok: false, erro: 'Ferramenta não ligada nesta fase. ' + semDado };
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
Modo: ${c.modo === 'automatico' ? 'automatico' : 'sugestao'}
Gatilho deste turno: ${c.modo === 'automatico' ? 'mensagem nova do cliente (você responde sozinho: o CRM envia a sua resposta na hora)' : 'a equipe pediu uma sugestão de resposta para a última mensagem do cliente'}
Contato (dados já conhecidos): nome do perfil do WhatsApp: ${c.nome || 'não informado'}
Pendências (reservas, cobranças, alertas abertos): não disponíveis nesta fase
${c.modo === 'automatico' ? 'MODO AUTOMÁTICO: as ferramentas executam na hora. criar_reserva cria a reserva no Silbeck de verdade; gerar_cobranca só funciona depois da reserva criada (Pix: escreva [[PIX]] sozinho no último balão, o CRM troca pelo Pix com o código e já diz que você avisa quando o pagamento cair: não escreva nada depois do [[PIX]] nem repita esse aviso; cartão: diga que o link do cartão chega em instantes pela equipe, sem marcador). Nunca escreva outros marcadores [[...]]: se faltar um dado, pergunte ao cliente ou use abrir_alerta. Depois de abrir_alerta você continua na conversa (só a equipe tira você, ao assumir).\n' : ''}${c.gatilho ? 'Gatilho: ' + c.gatilho + '\n' : ''}Reserva: ${c.reservaPaga ? 'PAGA (card em Reserva concluída; o CRM já mandou a confirmação, os links de extras e um agradecimento perguntando como vão vir a Bonito e oferecendo dicas do que trazer: se responderem de carro, mande a rota_ate_o_hotel; se pedirem dicas, use o documento de clima e mala)' + (c.perfil ? ', perfil ' + c.perfil : '') + '. Se ainda não houve oferta, é o momento de oferecer os extras uma vez (regra 9), com enviar_link_extras no tema certo para o perfil.' : 'ainda não paga. Não ofereça extras pagos por conta própria (só responda se o cliente perguntar; pergunta sobre o que fazer no hotel ou quantos dias ficar conta como pergunta: cite a boia cross e o arvorismo como opcionais pagos à parte e diga que o ideal é pelo menos 2 dias no hotel).'}
Ofertas de produtos nesta conversa: ${c.ofertas && c.ofertas.length ? c.ofertas.map(o => o.produto_nome + ' (' + ({ oferecido: 'oferecido, sem resposta', aceito: 'aceito', recusado: 'recusado' })[o.situacao] + ', por ' + (o.por === 'gilberto' ? 'você' : 'a equipe') + ')').join('; ') + '. Não ofereça outro produto nesta conversa (no máximo 1 oferta; recusou, não insista), a não ser que o cliente peça.' : 'nenhuma ainda.' + (c.reservaPaga ? ' Ofereça 1 vez, pelo link de extras, e preencha produto_oferecido se oferecer um produto específico.' : '')}
Vídeos no banco: ${c.videos && c.videos.length ? c.videos.map(v => v.categoria + ' (' + v.descricao.slice(0, 80) + ')' + (v.enviado ? ' [já enviado nesta conversa]' : '')).join('; ') : 'nenhum ainda'}
Resumo das conversas anteriores: não disponível
</contexto_crm>
Ferramentas ligadas nesta fase: consultar_disponibilidade (vagas e valores do Silbeck), gerar_orcamento (cria a página do orçamento e devolve o link; cada opção é uma acomodação ou uma combinação de acomodações para grupos), enviar_fotos (escolhe fotos reais da biblioteca; vão junto com a sua mensagem), enviar_video (um vídeo real do banco, como argumento de venda) enviar_link_extras (link da página de extras: 'aventuras' ou 'momentos'; é assim que você oferece os produtos pagos, só depois da reserva paga; siga o aviso que ela devolve sobre o link), consultar_documentos (busca nos documentos aprovados pelo dono) e rota_ate_o_hotel (link do Google Maps com a rota de carro da cidade do cliente até o hotel: antes da reserva paga, só se o próprio cliente falar que vem de carro ou perguntar distância/caminho, sem você puxar o assunto; depois da reserva paga, ofereça como auxílio quando ele contar que vem de carro; mande o link e não invente quilometragem nem tempo além do que a base traz). Use consultar_disponibilidade sempre que for falar de preço ou vaga e já tiver datas e pessoas (com a idade de cada criança); se faltar algum dado, pergunte ao cliente em vez de chamar. Ao mandar o orçamento, chame gerar_orcamento com as opções escolhidas e coloque o link devolvido na mensagem, exatamente como veio. Também ligadas: criar_reserva e gerar_cobranca (no aceite, depois de o cliente escolher a acomodação e a forma de pagamento: confirme nome completo do titular, e-mail e acompanhantes, chame criar_reserva e, na mesma resposta, gerar_cobranca; Pix: escreva [[PIX]] sozinho num balão; ${c.modo === 'automatico' ? 'cartão: diga que o link do cartão chega em instantes pela equipe' : 'cartão: [[link do cartão]] sozinho num balão'}; não repita valor, prazo nem dados da conta${c.modo === 'automatico' ? '' : '; a reserva e o Pix são criados quando a equipe aprova o envio'}) e abrir_alerta (quando o caso precisa da equipe: alteração, fora da base, exceção, acessibilidade, reclamação, cancelamento, pede pessoa, problema de pagamento, comprovante, reserva urgente etc.; nunca para pedido de desconto; escreva um resumo útil para a equipe e continue a conversa normalmente, dizendo ao cliente que a equipe vai entrar em contato). As outras ferramentas ainda não estão ligadas: não tente chamá-las (quando uma resposta fixa da biblioteca couber, escreva o texto exato dela na mensagem, no lugar de usar_resposta_fixa). ${c.modo === 'automatico' ? 'Onde precisaria delas (ou se o pedido não couber nas ferramentas, como um grupo acima de 4 acomodações ou 16 pessoas), não use marcadores: responda o que já dá, diga ao cliente que vai montar isso com a equipe e chame abrir_alerta com o resumo do pedido.' : 'Onde precisaria delas, escreva a mensagem com marcadores [[...]] no lugar do dado (ex.: [[link do cartão]]) e diga em notas_internas o que a equipe precisa fazer.'} Nunca invente preço nem disponibilidade: só use os valores que a ferramenta devolveu.${silbeck.MODO() === 'simulador' ? ' Nesta fase de testes a ferramenta usa o SIMULADOR do Silbeck: os valores são fictícios; use-os normalmente na mensagem e lembre isso em notas_internas.' : ''}`;
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
        // O motivo da API (sem dados do cliente) vai junto: um 400 é quase sempre um problema do pedido, não da rede
        throw new ErroSugestao(502, 'A IA não respondeu agora (erro ' + e.status + (e.status === 400 ? ': ' + String(e.message || '').replace(/\s+/g, ' ').slice(0, 220) : '') + '). Tente de novo.');
      } else throw e;
    }
  }

  // Laço das ferramentas: o Gilberto pede uma cotação, o CRM consulta o Silbeck e devolve o resultado.
  const cotacoes = [], orcamentos = [], fotos = [], vitrines = [];
  let reserva = null, pagamento = null, alertou = false;
  let r;
  for (let rodada = 0; ; rodada++) {
    if (rodada + 1 >= MAX_RODADAS) pedido.tool_choice = { type: 'none' }; // última rodada: responde com o que já tem
    r = await chamarIA();
    const u = r.usage || {};
    console.log(JSON.stringify({ evento: 'gilberto_sugestao', modelo: r.model, rodada, entrada: u.input_tokens, cache_lido: u.cache_read_input_tokens, cache_gravado: u.cache_creation_input_tokens, saida: u.output_tokens, parada: r.stop_reason }));
    if (r.stop_reason !== 'tool_use') break;
    if (rodada + 1 >= MAX_RODADAS) throw new ErroSugestao(502, 'O Gilberto fez consultas demais nesta resposta.');
    const resultados = [];
    for (const b of r.content.filter(b => b.type === 'tool_use')) {
      const res = b.name === 'consultar_documentos' && !executores.consultar_documentos ? consultarDocumentos(catalogo && catalogo.documentos, b.input && b.input.busca)
        : b.name === 'rota_ate_o_hotel' && !executores.rota_ate_o_hotel ? rotaAteHotel(b.input && b.input.origem)
        : await executarFerramenta(b.name, b.input, executores, conversa && conversa.modo);
      if (b.name === 'consultar_disponibilidade') cotacoes.push({ pedido: b.input, ok: !!res.ok, fonte: res.fonte || null, opcoes: (res.opcoes || []).length, erro: res.erro || null });
      if (b.name === 'gerar_orcamento' && res.ok) orcamentos.push({ id: res.orcamento_id, link: res.link, fonte: res.fonte });
      if (b.name === 'enviar_link_extras' && res.ok && res.vitrine_id) vitrines.push(res.vitrine_id);
      if (b.name === 'criar_reserva' && res.ok && res.reserva) reserva = res.reserva;
      if (b.name === 'gerar_cobranca' && res.ok && res.pagamento) pagamento = res.pagamento;
      if (b.name === 'abrir_alerta' && res.ok) alertou = true;
      if (b.name === 'enviar_video' && res.ok && res.video && !fotos.some(x => x.arquivo === res.video.arquivo)) fotos.push({ arquivo: res.video.arquivo, descricao: res.video.descricao, video: true });
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
    simulador: cotacoes.some(c => c.fonte === 'simulador') || orcamentos.some(o => o.fonte === 'simulador'), orcamentos, fotos, vitrines, reserva, pagamento, alertou };
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

module.exports = { questionario, sugerir, prepararDocumento, blocoDocumentos, consultarDocumentos, rotaAteHotel, montarMensagens, ErroSugestao, sistemaPronto: () => !!SISTEMA, MODELO, ferramentas: () => FERRAMENTAS.map(t => t.name) };
