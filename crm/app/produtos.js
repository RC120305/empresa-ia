// Produtos (o que o hotel vende além da diária): validação do cadastro, preço da venda e tarefas que cada venda gera.
// Nesta fase tudo vai para a conta do hóspede e é acertado no check-out (dono, 02/10/2026).
const PERFIS = ['Casal', 'Família com filhos', 'Grupo de amigos', '55+', 'Observador de aves', 'Ciclista', 'Agência'];
const brl = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2, maximumFractionDigits: 2 });

class ErroProduto extends Error { constructor(msg) { super(msg); this.http = 400; } }

const numero = (v, nome, max) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  if (!(n >= 0 && n <= max)) throw new ErroProduto(nome + ' inválido.');
  return n;
};
const texto = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
function listaPrecos(v, nome, comDescricao) {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw new ErroProduto(nome + ' inválidas.');
  const out = v.slice(0, 12).map(x => {
    const it = { nome: texto(x && x.nome, 60), preco: numero(x && x.preco, 'Preço de ' + nome.toLowerCase(), 100000) };
    if (!it.nome || it.preco === null) throw new ErroProduto('Cada item de ' + nome.toLowerCase() + ' precisa de nome e preço.');
    if (comDescricao && x.descricao) it.descricao = texto(x.descricao, 200);
    return it;
  });
  if (new Set(out.map(x => x.nome.toLowerCase())).size !== out.length) throw new ErroProduto(nome + ' com nome repetido.');
  return out;
}

// Campos novos do cadastro (migração 012). Devolve só o que veio no pedido.
function camposExtras(corpo, gruposFotos = []) {
  const d = {};
  if (corpo.perfis !== undefined) {
    if (!Array.isArray(corpo.perfis) || corpo.perfis.some(p => !PERFIS.includes(p))) throw new ErroProduto('Perfil inválido.');
    d.perfis = [...new Set(corpo.perfis)];
  }
  if (corpo.idade_minima !== undefined) { const n = numero(corpo.idade_minima, 'Idade mínima', 99); d.idade_minima = n === null ? null : Math.round(n); }
  if (corpo.altura_minima_cm !== undefined) { const n = numero(corpo.altura_minima_cm, 'Altura mínima', 250); d.altura_minima_cm = n === null ? null : Math.round(n); }
  if (corpo.preco_valor !== undefined) d.preco_valor = numero(corpo.preco_valor, 'Preço', 100000);
  if (corpo.unidade !== undefined) { if (!['pessoa', 'unidade'].includes(corpo.unidade)) throw new ErroProduto('Unidade inválida.'); d.unidade = corpo.unidade; }
  const v = listaPrecos(corpo.variacoes, 'Variações', true); if (v !== undefined) d.variacoes = v;
  const a = listaPrecos(corpo.adicionais, 'Adicionais', false); if (a !== undefined) d.adicionais = a;
  if (corpo.fotos !== undefined) { // fotos escolhidas para o produto, em ordem (a primeira é a capa)
    if (!Array.isArray(corpo.fotos) || corpo.fotos.length > 12) throw new ErroProduto('Escolha no máximo 12 fotos.');
    const fs = [...new Set(corpo.fotos.map(f => texto(f, 80)))];
    if (fs.some(f => !/^[\w.-]+\.jpg$/.test(f))) throw new ErroProduto('Foto inválida.');
    d.fotos = fs;
    d.foto = fs[0] || null;
  }
  if (corpo.foto !== undefined) {
    const f = texto(corpo.foto, 80) || null;
    if (f && !/^[\w.-]+\.jpg$/.test(f)) throw new ErroProduto('Foto inválida.');
    d.foto = f;
  }
  if (corpo.grupo_fotos !== undefined) { // uma ou mais categorias do Banco de fotos ("BOIA,ARVO")
    const gs = [...new Set(String(corpo.grupo_fotos || '').split(',').map(x => x.trim()).filter(Boolean))].slice(0, 4);
    if (gs.some(g => !gruposFotos.includes(g))) throw new ErroProduto('Categoria de fotos inválida.');
    d.grupo_fotos = gs.join(',') || null;
  }
  if (corpo.vitrine !== undefined) {
    const v = texto(corpo.vitrine, 20) || null;
    if (v && !['aventuras', 'momentos'].includes(v)) throw new ErroProduto('Link de extras inválido.');
    d.vitrine = v;
  }
  return d;
}

// Preço como o cliente lê, montado do preço em número ou das variações ("Simples R$ 350 ou Completa R$ 600").
function precoTexto(p) {
  const por = p.unidade === 'pessoa' ? ' por pessoa' : '';
  const vs = p.variacoes || [];
  if (vs.length) {
    const iguais = vs.every(x => Number(x.preco) === Number(vs[0].preco));
    return iguais ? brl(vs[0].preco) + por + ' (' + vs.map(x => x.nome).join(', ') + ')' : vs.map(x => x.nome + ' ' + brl(x.preco)).join(' ou ') + por;
  }
  return p.preco_valor != null ? brl(p.preco_valor) + por : (p.preco || '');
}

// Valor da venda calculado no servidor (a tela só escolhe variação, adicionais e quantidade).
function calcularVenda(p, { variacao, adicionais, quantidade }) {
  const qtd = Math.round(Number(quantidade) || 1);
  if (!(qtd >= 1 && qtd <= 50)) throw new ErroProduto('Quantidade de 1 a 50.');
  const vs = p.variacoes || [];
  let unit, nomeVar = null;
  if (vs.length) {
    const v = vs.find(x => x.nome === variacao);
    if (!v) throw new ErroProduto('Escolha a opção (' + vs.map(x => x.nome).join(' ou ') + ').');
    unit = Number(v.preco); nomeVar = v.nome;
  } else {
    if (p.preco_valor == null) throw new ErroProduto('Este produto ainda não tem preço em número no cadastro (tela Produtos).');
    unit = Number(p.preco_valor);
  }
  const pedidos = [...new Set(Array.isArray(adicionais) ? adicionais.map(String) : [])];
  const ads = pedidos.map(n => { const a = (p.adicionais || []).find(x => x.nome === n); if (!a) throw new ErroProduto('Adicional inválido: ' + n + '.'); return { nome: a.nome, preco: Number(a.preco) }; });
  unit += ads.reduce((s, a) => s + a.preco, 0);
  return { variacao: nomeVar, adicionais: ads, quantidade: qtd, valor_unitario: unit, valor_total: Math.round(unit * qtd * 100) / 100 };
}

// Horário de Bonito/MS (UTC-4, sem horário de verão)
const as9h = data => new Date(data + 'T09:00:00-04:00');
const diasAntes = (data, n) => { const d = new Date(data + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

// Tarefas que cada venda cria (para quem está de plantão). "agora" só para os testes.
function tarefasDaVenda(p, venda, { data_entrada } = {}, agora = new Date()) {
  const quando = d => (d && d > agora ? d : new Date(agora.getTime() + 3600e3)).toISOString();
  const nome = p.nome + (venda.variacao ? ' (' + venda.variacao + ')' : '');
  const resumo = [venda.quantidade > 1 || p.unidade === 'pessoa' ? venda.quantidade + (p.unidade === 'pessoa' ? (venda.quantidade > 1 ? ' pessoas' : ' pessoa') : 'x') : '',
    venda.data_uso ? 'dia ' + venda.data_uso.split('-').reverse().join('/') : 'data a combinar', venda.horario || '',
    venda.adicionais.length ? 'adicionais: ' + venda.adicionais.map(a => a.nome).join(', ') : ''].filter(Boolean).join(' · ');
  const out = [];
  if (p.tipo_reserva === 'ativ') out.push({ tipo: 'Agendar ' + p.nome.slice(0, 40), descricao: nome + ' · ' + resumo + '. Agendar no sistema das atividades (horário e participantes).', quando: quando(null) });
  else if (p.tipo_reserva === 'terc') out.push({ tipo: 'Pedir horário ao parceiro', descricao: nome + ' · ' + resumo + '. Confirmar o horário com o parceiro e avisar o hóspede.', quando: quando(null) });
  else if (p.antecedencia_dias) out.push({ tipo: 'Preparar ' + p.nome.slice(0, 40), descricao: nome + ' · ' + resumo + '. Encomendar os itens e preparar (pedido com ' + p.antecedencia_dias + ' dias de antecedência).',
    quando: quando(venda.data_uso ? as9h(diasAntes(venda.data_uso, p.antecedencia_dias)) : null) });
  const dia = venda.data_uso || data_entrada;
  out.push({ tipo: 'Lançar na conta do hóspede', descricao: nome + ' · ' + brl(venda.valor_total) + ' · ' + resumo + '. Pago no check-out.', quando: quando(dia ? as9h(dia) : null) });
  return out;
}

// Mensagem do WhatsApp com foto, texto e botões de resposta (só dentro da janela de 24 h).
// Até 2 opções: um botão por opção ("Quero a Completa"); mais que isso: "Eu aceito" e a equipe pergunta qual.
const RODAPE_OFERTA = 'Vai na conta da hospedagem, acertada no check-out';
function botoesOferta(p, ofertaId) {
  const vs = p.variacoes || [];
  const sim = vs.length === 2 ? vs.map((v, i) => ({ id: 'of:' + ofertaId + ':v' + i, title: ('Quero a ' + v.nome).slice(0, 20) })) : [{ id: 'of:' + ofertaId + ':s', title: 'Eu aceito' }];
  return [...sim, { id: 'of:' + ofertaId + ':n', title: 'Não, obrigado' }];
}
function mensagemOferta(p, texto, ofertaId, linkFoto) {
  return {
    type: 'button',
    header: linkFoto ? { type: 'image', image: { link: linkFoto } } : { type: 'text', text: p.nome.slice(0, 60) },
    body: { text: texto.slice(0, 1024) },
    footer: { text: RODAPE_OFERTA },
    action: { buttons: botoesOferta(p, ofertaId).map(b => ({ type: 'reply', reply: b })) },
  };
}
// Resposta do cliente ao botão: "of:<oferta>:s|n|v0|v1"
function lerBotao(id) {
  const m = /^of:([0-9a-f-]{36}):(s|n|v\d)$/.exec(String(id || ''));
  return m ? { oferta: m[1], aceito: m[2] !== 'n', opcao: m[2][0] === 'v' ? Number(m[2].slice(1)) : null } : null;
}

module.exports = { mensagemOferta, botoesOferta, lerBotao, RODAPE_OFERTA, PERFIS, camposExtras, precoTexto, calcularVenda, tarefasDaVenda, ErroProduto, brl };
