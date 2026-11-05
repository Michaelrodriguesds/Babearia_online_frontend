// Estrutura do painel do barbeiro: topo, conteúdo e abas embaixo
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Aviso, Carregando, Icone } from '../../componentes/ui';
import { dataCurta } from '../../utils';

const PainelContexto = createContext(null);
export const usePainel = () => useContext(PainelContexto);

export default function LayoutPainel() {
  const navegar = useNavigate();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setDados(await api('/painel/me'));
      setErro(null);
    } catch (e) {
      if (e.status !== 402) setErro(e.message);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  // Plano venceu em qualquer chamada → tela de renovação
  useEffect(() => {
    const ir = () => navegar('/painel/plano', { replace: true });
    window.addEventListener('plano-vencido', ir);
    return () => window.removeEventListener('plano-vencido', ir);
  }, [navegar]);

  if (erro) {
    return (
      <main className="pagina-painel pilha">
        <Aviso tipo="erro">{erro}</Aviso>
        <button className="btn btn-escuro" onClick={recarregar}>Tentar de novo</button>
      </main>
    );
  }
  if (!dados) return <Carregando texto="Abrindo seu painel…" />;

  const { barbearia, licenca } = dados;
  return (
    <PainelContexto.Provider value={{ barbearia, licenca, linkPublico: dados.linkPublico, recarregar }}>
      <header className="topo-painel">
        <div className="polo" />
        <div className="conteudo">
          <b className="letreiro" style={{ fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{barbearia.nome}</b>
          {(licenca.situacao === 'teste' || licenca.situacao === 'vencendo') && (
            <NavLink to="/painel/plano" className="pequeno" style={{ whiteSpace: 'nowrap' }}>
              {licenca.situacao === 'teste' ? `Teste: ${licenca.diasRestantes} dias` : `Vence ${dataCurta(licenca.acessoAte)}`}
            </NavLink>
          )}
        </div>
      </header>
      <main className="pagina-painel">
        <Outlet />
      </main>
      <nav className="abas" aria-label="Menu do painel">
        <NavLink to="/painel" end>{Icone.agenda}Agenda</NavLink>
        <NavLink to="/painel/servicos">{Icone.tesoura}Serviços</NavLink>
        <NavLink to="/painel/clientes">{Icone.pessoas}Clientes</NavLink>
        <NavLink to="/painel/ajustes">{Icone.ajustes}Ajustes</NavLink>
      </nav>
    </PainelContexto.Provider>
  );
}
