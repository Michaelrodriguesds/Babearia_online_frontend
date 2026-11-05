// Formatação e pequenos ajudantes
export const FUSO = 'America/Sao_Paulo';

export function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function partes(data, opcoes) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, ...opcoes }).format(new Date(data));
}

export const hora = (d) => partes(d, { hour: '2-digit', minute: '2-digit' });
export const dataCurta = (d) => partes(d, { day: '2-digit', month: '2-digit' });
export const diaSemanaCurto = (d) => partes(d, { weekday: 'short' }).replace('.', '');
export const diaDoMes = (d) => partes(d, { day: 'numeric' });
const primeiraMaiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
// "Sábado, 24 de outubro"
export const dataLonga = (d) => primeiraMaiuscula(partes(d, { weekday: 'long', day: 'numeric', month: 'long' }));
export const dataHora = (d) => `${partes(d, { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${hora(d)}`;

// "AAAA-MM-DD" de uma data no fuso de Brasília
export function isoDia(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
  return p; // en-CA já sai como AAAA-MM-DD
}

// Soma dias a um "AAAA-MM-DD" (meio-dia evita problemas de fuso)
export function somarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return isoDia(d);
}

export function diaDaSemana(iso) {
  return new Date(`${iso}T12:00:00-03:00`).getUTCDay(); // 0 = domingo
}

export const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// (21) 99999-8888 enquanto digita
export function mascaraTelefone(valor) {
  const d = String(valor || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function telefoneValido(valor) {
  const d = String(valor || '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
}

// Link que abre o WhatsApp com a mensagem pronta
export function linkWhatsapp(telefone, texto = '') {
  let d = String(telefone || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return `https://wa.me/${d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

// Horários de 15 em 15 min para os seletores
export const HORAS_15 = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

// Cor do texto (branco ou escuro) que fica legível sobre uma cor de fundo
export function corTextoSobre(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luz = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luz > 0.4 ? '#1b2238' : '#ffffff';
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

// Link "adicionar ao Google Agenda"
export function linkGoogleAgenda({ titulo, inicio, fim, local }) {
  const f = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: titulo, dates: `${f(inicio)}/${f(fim)}`, location: local || '' });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export const STATUS_TEXTO = {
  pendente: 'Aguardando Pix',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  expirado: 'Expirou',
  bloqueado: 'Bloqueado',
  conflito: 'Conflito',
};
