// Captura erros do app sozinho e manda para você, e mostra uma tela amigável
import { Component } from 'react';
import { api } from '../api';

const enviados = new Set();

// Manda o erro para o /admin (no máximo 5 por visita, sem repetir o mesmo)
export function relatarErroAutomatico(erro) {
  try {
    const mensagem = String(erro?.message || erro || 'Erro desconhecido').slice(0, 500);
    if (enviados.has(mensagem) || enviados.size >= 5) return;
    // erros de extensões do navegador e de rede não são bugs do app
    if (/ResizeObserver|Script error|chrome-extension|Failed to fetch|Load failed|NetworkError/i.test(mensagem)) return;
    enviados.add(mensagem);
    api('/relatos/automatico', {
      metodo: 'POST',
      corpo: { mensagem, pilha: String(erro?.stack || '').slice(0, 4000), pagina: window.location.pathname },
    }).catch(() => {});
  } catch {
    /* nunca deixa o próprio relato quebrar o app */
  }
}

export function ativarCapturaDeErros() {
  window.addEventListener('error', (e) => relatarErroAutomatico(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => relatarErroAutomatico(e.reason));
}

// Se uma tela quebrar, mostra isto em vez de uma página branca
export class LimiteDeErro extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro) {
    relatarErroAutomatico(erro);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="tela-entrada">
        <div className="polo" />
        <main className="miolo pilha centro">
          <h1 className="letreiro">Algo deu errado nesta tela</h1>
          <p className="suave">O problema já foi enviado para o suporte. Recarregue a página para continuar.</p>
          <button className="btn btn-escuro btn-largo" onClick={() => window.location.reload()}>Recarregar</button>
        </main>
      </div>
    );
  }
}
