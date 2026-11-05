// Situação do plano. Funciona mesmo com o plano vencido.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, sessao } from '../../api';
import { Aviso, Carregando } from '../../componentes/ui';
import { dataLonga, linkWhatsapp } from '../../utils';

const SUPORTE = import.meta.env.VITE_SUPORTE_WHATSAPP;

export default function Plano() {
  const navegar = useNavigate();
  const [l, setL] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api('/painel/licenca').then(setL).catch((e) => setErro(e.message));
  }, []);

  function sair() {
    sessao.sair();
    navegar('/login', { replace: true });
  }

  if (erro) return <main className="pagina pilha"><Aviso tipo="erro">{erro}</Aviso></main>;
  if (!l) return <Carregando />;

  const suporte = l.suporteWhatsapp || SUPORTE;
  const mensagem = `Olá! Quero ${l.ativa ? 'renovar' : 'reativar'} o plano da ${l.barbeariaNome} (código ${l.barbeariaId}).`;

  return (
    <div className="tela-entrada">
      <div className="polo" />
      <main className="miolo pilha">
        <h1 className="letreiro">{l.ativa ? 'Seu plano' : 'Seu plano venceu'}</h1>
        {l.ativa ? (
          <Aviso tipo={l.situacao === 'vencendo' ? 'atencao' : 'ok'}>
            {l.plano === 'teste' ? 'Teste grátis' : 'Plano mensal'} ativo até <b>{dataLonga(l.acessoAte)}</b> ({l.diasRestantes} {l.diasRestantes === 1 ? 'dia' : 'dias'}).
          </Aviso>
        ) : (
          <>
            <Aviso tipo="erro">O acesso ao painel e os agendamentos online estão pausados desde {dataLonga(l.acessoAte)}.</Aviso>
            <p className="suave">Seus dados, clientes e horários já confirmados continuam guardados. Assim que o pagamento for feito, tudo volta a funcionar na hora.</p>
          </>
        )}
        {suporte && (
          <a className="btn btn-zap btn-largo" target="_blank" rel="noreferrer" href={linkWhatsapp(suporte, mensagem)}>
            {l.ativa ? 'Renovar pelo WhatsApp' : 'Reativar pelo WhatsApp'}
          </a>
        )}
        <p className="suave pequeno">Código da sua barbearia: {l.barbeariaId}</p>
        {l.ativa && <Link className="btn btn-contorno btn-largo" to="/painel">Voltar ao painel</Link>}
        <button className="btn btn-texto" onClick={sair}>Sair da conta</button>
      </main>
    </div>
  );
}
