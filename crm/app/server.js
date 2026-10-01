// CRM Cabanas: fase 0. Só confirma que a publicação no Cloud Run funciona.
// Nenhuma chave, nenhum dado de cliente. As rotas reais entram na fase 1.
const http = require('http');

const porta = process.env.PORT || 8080;
const versao = process.env.VERSAO || 'local';

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/saude') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, servico: 'crm-cabanas', versao, hora: new Date().toISOString() }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>CRM Cabanas</title><p style="font-family:sans-serif">CRM Cabanas no ar 🌿 (fase 0). Versão: ' + versao.replace(/[^\w.-]/g, '') + '</p>');
}).listen(porta, () => console.log('CRM Cabanas ouvindo na porta ' + porta));
