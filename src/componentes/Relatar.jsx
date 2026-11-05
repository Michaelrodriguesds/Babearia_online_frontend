// Botão + janela para relatar problema ou sugerir melhoria
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { Aviso, Botao, Campo, Modal } from './ui';

const TIPOS = [
  ['problema', 'Algo não funciona'],
  ['sugestao', 'Sugestão de melhoria'],
  ['outro', 'Outro assunto'],
];

export function JanelaRelatar({ aberto, aoFechar, slug, ehBarbeiro, aoEnviar }) {
  const { pathname } = useLocation();
  const [tipo, setTipo] = useState('problema');
  const [mensagem, setMensagem] = useState('');
  const [contato, setContato] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  function fechar() {
    aoFechar();
    if (enviado) { setEnviado(false); setMensagem(''); setContato(''); }
  }

  async function enviar() {
    if (mensagem.trim().length < 5) return setErro('Conte com um pouco mais de detalhe o que aconteceu.');
    setEnviando(true);
    setErro(null);
    try {
      await api('/relatos', {
        metodo: 'POST',
        corpo: { tipo, mensagem: mensagem.trim(), contato: contato.trim() || undefined, pagina: pathname, slug: slug || undefined },
      });
      setEnviado(true);
      aoEnviar?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={enviado ? 'Recebido' : 'Falar com o suporte'} aberto={aberto} aoFechar={fechar}>
      {enviado ? (
        <>
          <Aviso tipo="ok">Obrigado! Sua mensagem chegou para a equipe que cuida do sistema.</Aviso>
          {ehBarbeiro && <p className="suave pequeno" style={{ margin: 0 }}>A resposta aparece em Ajustes, na parte de Ajuda.</p>}
          <button className="btn btn-escuro btn-largo" onClick={fechar}>Fechar</button>
        </>
      ) : (
        <>
          <div className="opcoes" role="group" aria-label="Assunto">
            {TIPOS.map(([v, t]) => <button key={v} className="opcao" aria-pressed={tipo === v} onClick={() => setTipo(v)}>{t}</button>)}
          </div>
          <Campo rotulo={tipo === 'problema' ? 'O que aconteceu?' : tipo === 'sugestao' ? 'O que podia ser melhor?' : 'Sua mensagem'}
            ajuda={tipo === 'problema' ? 'Ex.: cliquei em Reservar e apareceu uma mensagem de erro.' : undefined}>
            <textarea className="entrada" rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={2000} />
          </Campo>
          {!ehBarbeiro && (
            <Campo rotulo="Seu WhatsApp ou e-mail (opcional)" ajuda="Só se quiser que a gente fale com você.">
              <input className="entrada" value={contato} onChange={(e) => setContato(e.target.value)} maxLength={120} />
            </Campo>
          )}
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Botao className="btn-escuro btn-largo" carregando={enviando} onClick={enviar}>Enviar</Botao>
        </>
      )}
    </Modal>
  );
}

// Link discreto para as páginas do cliente
export function LinkRelatar({ slug }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="centro">
      <button className="btn btn-texto pequeno" onClick={() => setAberto(true)}>Encontrou um problema ou tem uma sugestão?</button>
      <JanelaRelatar aberto={aberto} aoFechar={() => setAberto(false)} slug={slug} />
    </div>
  );
}
