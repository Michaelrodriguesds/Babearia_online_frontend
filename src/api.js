// Comunicação com o backend, com tratamento de erros pensado para o Render grátis
// (que "dorme" e demora até ~1 minuto para acordar).
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export class ErroApi extends Error {
  constructor(status, mensagem, dados = {}) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
}

const MENSAGENS = {
  400: 'Confira os dados informados.',
  401: 'Faça login para continuar.',
  403: 'Você não tem acesso a isso.',
  404: 'Não encontrado.',
  409: 'Esse horário acabou de ser ocupado. Escolha outro.',
  429: 'Muitas tentativas seguidas. Aguarde alguns minutos.',
  500: 'Erro no servidor. Tente de novo em instantes.',
};

// ---- sessão ----
export const sessao = {
  get token() { return localStorage.getItem('token'); },
  get papel() { return localStorage.getItem('papel'); },
  get nome() { return localStorage.getItem('nome'); },
  salvar({ token, papel, nome }) {
    localStorage.setItem('token', token);
    localStorage.setItem('papel', papel || '');
    localStorage.setItem('nome', nome || '');
  },
  sair() {
    ['token', 'papel', 'nome'].forEach((c) => localStorage.removeItem(c));
  },
};

// ---- aviso "servidor acordando" ----
const ouvintes = new Set();
let pendentesLentas = 0;
export function aoServidorLento(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
function avisarLento(delta) {
  pendentesLentas = Math.max(0, pendentesLentas + delta);
  ouvintes.forEach((fn) => fn(pendentesLentas > 0));
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Faz uma chamada à API.
 *  - GET que falha por rede ou 502/503/504 tenta de novo por até 90s (servidor acordando).
 *  - POST/PUT nunca repete sozinho (evita agendamento em dobro).
 *  - Mostra o aviso "acordando o servidor" se a resposta demorar mais de 4s.
 */
export async function api(caminho, { metodo = 'GET', corpo, autenticado = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (autenticado && sessao.token) headers.Authorization = `Bearer ${sessao.token}`;

  const podeRepetir = metodo === 'GET';
  const inicio = Date.now();
  let lento = false;
  const timerLento = setTimeout(() => { lento = true; avisarLento(1); }, 4000);
  const fimLento = () => { clearTimeout(timerLento); if (lento) { lento = false; avisarLento(-1); } };

  try {
    for (;;) {
      let resposta;
      try {
        const controle = new AbortController();
        const limite = setTimeout(() => controle.abort(), 75000);
        resposta = await fetch(API_URL + caminho, {
          method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined, signal: controle.signal,
        });
        clearTimeout(limite);
      } catch {
        if (!navigator.onLine) throw new ErroApi(0, 'Sem internet. Verifique sua conexão e tente de novo.');
        if (podeRepetir && Date.now() - inicio < 90000) { await esperar(3000); continue; }
        throw new ErroApi(0, 'Não foi possível falar com o servidor. Tente de novo em instantes.');
      }

      const dados = await resposta.json().catch(() => ({}));
      if (resposta.ok) return dados;

      // Sistema em manutenção (você ligou no /admin): não adianta repetir
      if (resposta.status === 503 && dados.manutencao) {
        window.dispatchEvent(new CustomEvent('manutencao', { detail: dados }));
        throw new ErroApi(503, dados.erro || 'Sistema em manutenção.', dados);
      }
      // 502/503/504 sem esse aviso = servidor acordando: tenta de novo
      if ([502, 503, 504].includes(resposta.status) && podeRepetir && Date.now() - inicio < 90000) {
        await esperar(3000);
        continue;
      }

      if (resposta.status === 401 && autenticado && sessao.token) {
        sessao.sair();
        window.location.assign('/login?expirou=1');
      }
      if (resposta.status === 402) window.dispatchEvent(new CustomEvent('plano-vencido', { detail: dados }));
      throw new ErroApi(resposta.status, dados.erro || MENSAGENS[resposta.status] || 'Algo deu errado.', dados);
    }
  } finally {
    fimLento();
  }
}

// Acorda o servidor assim que a página abre (o cliente escolhe o serviço enquanto isso)
export function acordarServidor() {
  fetch(API_URL + '/health').catch(() => {});
}
