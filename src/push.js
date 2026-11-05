// Notificações push no celular do barbeiro (grátis)
import { api, ErroApi } from './api';

// Android/Chrome: guarda o convite de instalação para mostrar no nosso botão
let convite = null;
const ouvintesConvite = new Set();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  convite = e;
  ouvintesConvite.forEach((fn) => fn(true));
});
export const podeInstalar = () => Boolean(convite);
export function aoPoderInstalar(fn) { ouvintesConvite.add(fn); return () => ouvintesConvite.delete(fn); }
export async function instalarApp() {
  if (!convite) return false;
  convite.prompt();
  const { outcome } = await convite.userChoice;
  convite = null;
  return outcome === 'accepted';
}

export const pushSuportado =() => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const ehIPhone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const estaInstalado = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function chaveParaBytes(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

export async function pushAtivo() {
  if (!pushSuportado() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(await reg?.pushManager.getSubscription());
}

// Precisa ser chamado dentro de um toque/clique (exigência do iPhone)
export async function ativarPush(area = '/painel') {
  if (!pushSuportado()) {
    throw new ErroApi(0, ehIPhone() && !estaInstalado()
      ? 'No iPhone, primeiro adicione o app à Tela de Início (Compartilhar > Adicionar à Tela de Início) e abra por lá.'
      : 'Este navegador não aceita notificações. Use o Chrome no Android ou o app instalado no iPhone.');
  }
  const { chave } = await api(`${area}/push/chave`);
  if (!chave) throw new ErroApi(0, 'As notificações ainda não foram configuradas no servidor.');

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    throw new ErroApi(0, 'Notificações bloqueadas. Libere nas configurações do navegador para este site.');
  }
  const reg = await navigator.serviceWorker.ready;
  const inscricao = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) }));
  await api(`${area}/push/inscrever`, { metodo: 'POST', corpo: inscricao.toJSON() });
}
