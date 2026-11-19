// Horários que o cliente marcou NESTE aparelho (para ele achar de novo e poder desistir).
// Fica só no navegador do cliente; se apagar os dados do site, a lista some (o horário continua marcado).
const CHAVE = 'minhasReservas';
const MAX_POR_LOJA = 10;

function lerTudo() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE));
    return dados && typeof dados === 'object' ? dados : {};
  } catch {
    return {};
  }
}
function gravar(dados) {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch { /* modo anônimo ou sem espaço */ }
}

export function salvarReserva(slug, { id, c, inicio }) {
  if (!slug || !id || !c) return;
  const dados = lerTudo();
  const lista = (dados[slug] || []).filter((r) => r.id !== id);
  lista.push({ id, c, inicio });
  dados[slug] = lista.slice(-MAX_POR_LOJA);
  gravar(dados);
}

export function removerReserva(slug, id) {
  const dados = lerTudo();
  if (!dados[slug]) return;
  dados[slug] = dados[slug].filter((r) => r.id !== id);
  gravar(dados);
}

/** Reservas guardadas desta loja que ainda não passaram (inclui a reserva antiga "reserva:<slug>") */
export function listarReservas(slug) {
  try {
    const antiga = JSON.parse(localStorage.getItem(`reserva:${slug}`));
    if (antiga?.id && antiga?.c) salvarReserva(slug, { id: antiga.id, c: antiga.c, inicio: antiga.inicio || null });
  } catch { /* ignora */ }
  const agora = Date.now();
  return (lerTudo()[slug] || []).filter((r) => !r.inicio || new Date(r.inicio).getTime() > agora - 3 * 3600000);
}
