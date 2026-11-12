// Registra o service worker (o que deixa o app instalável e recebe as notificações).
// Alguns navegadores e robôs (ex.: Google-Read-Aloud) recusam o registro. Isso não é
// um defeito do app: o site continua funcionando normalmente, só sem instalar.
export function registrarApp() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* recusado pelo navegador: segue sem modo app */
      });
    } catch {
      /* navegador bloqueou na hora de chamar: segue sem modo app */
    }
  });
}
