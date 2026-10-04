// CRM Cabanas: service worker só para os avisos no celular. Não guarda páginas nem dados no aparelho.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (er) { m = {}; }
  e.waitUntil(self.registration.showNotification(m.titulo || 'CRM Cabanas', {
    body: m.corpo || 'Novo alerta para a equipe.', tag: m.tag || undefined, renotify: !!m.tag,
    icon: '/o/icone-192.png', badge: '/o/icone-aviso.png', data: { url: m.url || '/caixa' },
  }));
});

// Tocar no aviso: abre o CRM (ou traz para a frente o que já está aberto) direto na conversa
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || '/caixa', self.location.origin);
  if (alvo.origin !== self.location.origin) return;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = abertas.find(x => new URL(x.url).pathname === '/caixa');
    if (c) { await c.focus(); c.postMessage({ abrir: alvo.hash }); return; }
    await self.clients.openWindow('/caixa' + alvo.hash);
  })());
});
