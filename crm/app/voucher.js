// Voucher de confirmação da reserva em PDF (dono, 07/10/2026): vai ao cliente logo depois da mensagem de confirmação.
// Tudo o que está na mensagem + uma foto real da acomodação, na identidade do Cabanas (paleta, Playfair e Josefin, logo).
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const orcamento = require('./orcamento');
const { brl } = require('./produtos');

const PUB = path.join(__dirname, 'public', 'o');
const FONTES = path.join(__dirname, 'fontes'); // as mesmas da página, em TTF (o pdfkit não embute woff2)
const COR = { escuro: '#3B3128', fundo: '#F7F3EC', borda: '#E3DACB', texto: '#2E2620', sec: '#6B5D4F', verde: '#5A7026', verdeCl: '#C9DC8F', laranja: '#F58634', aviso: '#FBF1DC', avisoTxt: '#8A5A00' };
const HOTEL = {
  endereco: 'Rodovia Bonito/Balneário Municipal, km 06 · Zona Rural · Bonito/MS · CEP 79290-000',
  contato: 'Telefone (67) 99110-7635 · contato@hotelcabanas.com.br · hotelcabanas.com.br',
};
const SLOGAN = 'Seu lugar de conexão com a natureza';
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const dataLonga = d => { const x = new Date(String(d).slice(0, 10) + 'T12:00:00Z'); return DIAS[x.getUTCDay()] + ', ' + x.toISOString().slice(0, 10).split('-').reverse().join('/'); };
const noites = (a, b) => Math.round((new Date(String(b).slice(0, 10)) - new Date(String(a).slice(0, 10))) / 864e5);

// Foto da acomodação: a 1ª foto fixa da biblioteca (sem a decoração especial); quádruplos usam a do duplo/triplo
function fotoDaAcomodacao(codigo) {
  const cods = String(codigo || '').toUpperCase().split('+').map(c => c.trim()).filter(Boolean);
  const bib = orcamento.biblioteca();
  for (const c of cods) {
    const g = bib.find(x => x.grupo === orcamento.grupoFotos(c, bib));
    const f = g && orcamento.porApartamento(g.fotos).find(f => !f.video && !f.decoracao && fs.existsSync(path.join(orcamento.PASTA_FOTOS, f.arquivo)));
    if (f) return path.join(orcamento.PASTA_FOTOS, f.arquivo);
  }
  return null;
}

// res: linha da tabela reservas; pago: valor pago; pagoEm: data do pagamento. Devolve um Buffer com o PDF.
function gerarVoucher(res, { pago, pagoEm = new Date() } = {}) {
  return new Promise((ok, falha) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: 'Voucher da reserva ' + res.silbeck_id + ' · Hotel Cabanas', Author: 'Hotel Cabanas' } });
    const partes = [];
    doc.on('data', b => partes.push(b)); doc.on('end', () => ok(Buffer.concat(partes))); doc.on('error', falha);
    let TIT = 'Times-Bold', ITA = 'Times-Italic', MARCA = 'Helvetica-Bold';
    try { doc.registerFont('tit', path.join(FONTES, 'playfair-display-latin-700-normal.ttf')); TIT = 'tit'; } catch (e) { /* fonte padrão */ }
    try { doc.registerFont('ita', path.join(FONTES, 'playfair-display-latin-400-italic.ttf')); ITA = 'ita'; } catch (e) { /* fonte padrão */ }
    try { doc.registerFont('marca', path.join(FONTES, 'josefin-sans-latin-600-normal.ttf')); MARCA = 'marca'; } catch (e) { /* fonte padrão */ }
    const W = doc.page.width, M = 44, L = W - 2 * M;
    const n = noites(res.data_entrada, res.data_saida);
    const total = Number(res.valor_total) || 0, valorPago = Number(pago) || 0, resto = Math.round((total - valorPago) * 100) / 100;
    const nome = String(res.titular || '').trim();

    // Topo: faixa escura com logo, slogan e nº da reserva
    doc.rect(0, 0, W, 132).fill(COR.escuro);
    try { doc.image(path.join(PUB, 'logo-branco.png'), M, 22, { height: 88 }); } catch (e) { /* sem logo */ }
    doc.fillColor('#F7F1E6').font(MARCA).fontSize(9).text('VOUCHER DE CONFIRMAÇÃO', M + 130, 30, { width: L - 130, align: 'right', characterSpacing: 1.6 });
    doc.font(TIT).fontSize(24).text('Reserva nº ' + res.silbeck_id, M + 130, 46, { width: L - 130, align: 'right' });
    doc.fillColor(COR.verdeCl).font(ITA).fontSize(15).text(SLOGAN, M + 130, 84, { width: L - 130, align: 'right' });

    // Foto da acomodação (corte em "cover")
    let y = 132;
    const FOTO_H = Array.isArray(res.itens) && res.itens.length > 1 ? 150 : 180; // combinação: uma linha a mais de dados
    const foto = fotoDaAcomodacao(res.codigo);
    if (foto) {
      doc.save(); doc.rect(0, y, W, FOTO_H).clip();
      try { doc.image(foto, 0, y, { cover: [W, FOTO_H], align: 'center', valign: 'center' }); } catch (e) { /* foto ilegível */ }
      doc.restore(); y += FOTO_H;
    }
    doc.rect(0, y, W, 4).fill(COR.laranja); y += 20;

    // Saudação
    doc.fillColor(COR.texto).font(TIT).fontSize(20).text((nome ? nome.split(/\s+/)[0] + ', s' : 'S') + 'ua reserva está confirmada!', M, y, { width: L });
    y = doc.y + 4;
    doc.font('Helvetica').fontSize(10.5).fillColor(COR.sec).text('Guarde este voucher: ele traz os dados da sua hospedagem no Hotel Cabanas.', M, y, { width: L });
    y = doc.y + 12;

    // Dados da hospedagem, em duas colunas
    const campo = (rot, val, x, yy, w) => {
      doc.font(MARCA).fontSize(8).fillColor(COR.sec).text(rot.toUpperCase(), x, yy, { width: w, characterSpacing: 1.1 });
      doc.font('Helvetica-Bold').fontSize(12).fillColor(COR.texto).text(val, x, doc.y + 3, { width: w });
      return doc.y;
    };
    const col = (L - 20) / 2, x2 = M + col + 20;
    const linhas = [
      ['Acomodação', res.acomodacao, 'Titular', nome || '-'],
      ['Check-in', dataLonga(res.data_entrada) + ', a partir das 15h', 'Check-out', dataLonga(res.data_saida) + ', até as 13h'],
      ['Período', orcamento.periodo(res.data_entrada, res.data_saida) + ' (' + n + (n > 1 ? ' noites)' : ' noite)'), 'Hóspedes', orcamento.resumoGrupo({ adultos: res.adultos, idades_criancas: res.criancas_idades || [] })],
    ];
    for (const [r1, v1, r2, v2] of linhas) {
      const a = campo(r1, v1, M, y, col), b = campo(r2, v2, x2, y, col);
      y = Math.max(a, b) + 9;
    }
    if (Array.isArray(res.itens) && res.itens.length > 1) {
      y = campo('Acomodações da reserva', res.itens.map(i => i.nome || i.codigo).join(' · '), M, y, L) + 12;
    }

    // Pagamento
    y += 4;
    const alt = resto >= 1 ? 92 : 66;
    doc.roundedRect(M, y, L, alt, 10).fill(COR.fundo);
    doc.roundedRect(M, y, L, alt, 10).lineWidth(1).stroke(COR.borda);
    doc.font(MARCA).fontSize(8).fillColor(COR.sec).text('PAGAMENTO', M + 16, y + 14, { characterSpacing: 1.1 });
    const linhaPg = (rot, val, yy, destaque) => {
      doc.font('Helvetica').fontSize(11).fillColor(COR.texto).text(rot, M + 16, yy, { width: L - 200 });
      doc.font(destaque ? TIT : 'Helvetica-Bold').fontSize(destaque ? 15 : 11.5).fillColor(destaque ? COR.verde : COR.texto).text(val, M + L - 196, yy - (destaque ? 3 : 0), { width: 180, align: 'right' });
    };
    linhaPg('Valor total da hospedagem', brl(total), y + 30, false);
    linhaPg('Valor pago em ' + new Date(pagoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Campo_Grande' }), brl(valorPago), y + 48, true);
    if (resto >= 1) linhaPg('Restante, pago no check-out', brl(resto), y + 70, false);
    y += alt + 16;

    // Incluso e bom saber
    doc.font(MARCA).fontSize(8).fillColor(COR.sec).text('JÁ INCLUSO NA DIÁRIA', M, y, { width: col, characterSpacing: 1.1 });
    doc.font(MARCA).fontSize(8).text('BOM SABER', x2, y, { width: col, characterSpacing: 1.1 });
    y += 14;
    const lista = (itens, x, yy) => { for (const t of itens) { doc.circle(x + 3, yy + 4.5, 2.2).fill(COR.verde); doc.font('Helvetica').fontSize(9).fillColor(COR.texto).text(t, x + 12, yy, { width: col - 12 }); yy = doc.y + 2; } return yy; };
    const a = lista(['Programação diária de atividades com guia'].concat(orcamento.INCLUSO), M, y);
    const b = lista(['Check-in a partir das 15h e check-out até as 13h. A estrutura fica à disposição antes e depois (vestiários, duchas e guarda-volumes).',
      'Na véspera, enviamos o check-in online pelo WhatsApp.', 'Recepção 24 horas.', 'Os consumos no hotel e os extras vão na conta da hospedagem e são acertados no check-out.'], x2, y);
    y = Math.max(a, b) + 10;

    // Aviso de teste (simulador)
    if (res.fonte === 'simulador') {
      doc.roundedRect(M, y, L, 26, 6).fill(COR.aviso);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COR.avisoTxt).text('TESTE: reserva do SIMULADOR do Silbeck. Este voucher não vale como reserva.', M, y + 8, { width: L, align: 'center' });
    }

    // Rodapé
    const H = doc.page.height;
    doc.rect(0, H - 62, W, 62).fill(COR.escuro);
    doc.font(TIT).fontSize(11).fillColor('#F7F1E6').text('Hotel Cabanas · Bonito, MS', M, H - 50, { width: L, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor('#E3DACB').text(HOTEL.endereco, M, H - 34, { width: L, align: 'center', lineBreak: false });
    doc.text(HOTEL.contato, M, H - 22, { width: L, align: 'center', lineBreak: false });
    doc.end();
  });
}
const nomeDoArquivo = res => 'Voucher-Hotel-Cabanas-Reserva-' + String(res.silbeck_id || '').replace(/[^\w-]/g, '') + '.pdf';

module.exports = { gerarVoucher, nomeDoArquivo, fotoDaAcomodacao };
