// Recebe as notificações push e abre o app no lugar certo ao tocar
self.addEventListener('push', (evento) => {
  let dados = {};
  try { dados = evento.data ? evento.data.json() : {}; } catch { dados = { corpo: evento.data?.text() }; }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Agenda', {
      body: dados.corpo || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: { url: dados.url || '/painel' },
      vibrate: [120, 60, 120],
    })
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = evento.notification.data?.url || '/painel';
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) {
          janela.navigate(url);
          return janela.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
