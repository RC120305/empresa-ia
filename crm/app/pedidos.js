// Reconhece, pela mensagem do cliente, pedidos que precisam de uma pessoa da equipe: atendimento humano,
// reclamação, cancelamento e alteração de reserva. Regras simples e explicáveis (sem IA): na dúvida, avisa.
const sem = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const REGRAS = [
  ['reclamacao', /\b(reclama\w*|pessim\w*|horrivel|absurd\w*|decepcion\w*|insatisfeit\w*|desrespeit\w*|vergonh\w*|procon|reclame aqui|nunca mais (volto|venho|me hosped\w*)|descaso|falta de respeito)\b/],
  ['cancelamento', /\b(cancel(ar|o|e|ei|amos|ando|amento)|desist(ir|i|o|imos)|estorn\w*|reembols\w*|devolu(cao|ção) do (dinheiro|valor|sinal)|nao vou (mais )?(poder )?(ir|viajar))\b/],
  ['alteracao', /\b((alterar|mudar|trocar|remarcar|adiar|antecipar|transferir)\b.{0,40}\b(data|datas|reserva|dia|dias|check.?in|check.?out|quarto|acomodacao|cabana)|remarc\w*)\b/],
  ['atendimento_humano', /\b(atendente|falar com (alguem|uma pessoa|um humano|uma atendente|um atendente|o gerente|a gerente|o dono|a recepcao|uma pessoa de verdade)|pessoa de verdade|ser humano|humano|(voce )?e (um )?robo|e robo|to falando com (um )?robo|quero uma pessoa)\b/],
];
// Pergunta sobre a regra (não é pedido): "qual a política de cancelamento?"
const SO_REGRA = /\b(politica|regra|regras|como funciona|qual o prazo|tem multa|se eu precisar)\b.{0,30}\b(cancel\w*|alterar|alteracao|remarc\w*)|\b(cancel\w*|alteracao)\b.{0,20}\b(politica|regra)\b/;
const QUER = /\b(quero|queria|preciso|gostaria|vou|vamos|pode|podem|consegue|da para|tem como)\b/;

function detectarPedido(texto) {
  const t = sem(texto);
  if (!t || t.length < 3) return null;
  for (const [tipo, re] of REGRAS) {
    if (!re.test(t)) continue;
    if ((tipo === 'cancelamento' || tipo === 'alteracao') && SO_REGRA.test(t) && !QUER.test(t.replace(SO_REGRA, ''))) continue;
    return tipo;
  }
  return null;
}
const TITULOS = { atendimento_humano: 'Pede atendimento humano', reclamacao: 'Reclamação', cancelamento: 'Pedido de cancelamento', alteracao: 'Pedido de alteração', gilberto_passou: 'Gilberto passou para a equipe' };
const ATENDIMENTO = Object.keys(TITULOS);

module.exports = { detectarPedido, TITULOS, ATENDIMENTO };
