// SUA área (desenvolvedor): barbearias, relatos e aviso/manutenção
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, sessao } from '../../api';
import { ativarPush, pushAtivo } from '../../push';
import { useToast } from '../../componentes/ui';
import Barbearias from './Barbearias';
import Relatos from './Relatos';
import AvisoAdmin from './AvisoAdmin';

export default function Admin() {
  const navegar = useNavigate();
  const toast = useToast();
  const [busca, setBusca] = useSearchParams();
  const aba = busca.get('aba') || 'barbearias';
  const [novos, setNovos] = useState(0);
  const [avisosAtivos, setAvisosAtivos] = useState(true);

  useEffect(() => {
    api('/admin/resumo').then((r) => setNovos(r.relatosNovos || 0)).catch(() => {});
    pushAtivo().then(setAvisosAtivos).catch(() => setAvisosAtivos(false));
  }, [aba]);

  async function ativarAvisos() {
    try {
      await ativarPush('/admin');
      setAvisosAtivos(true);
      toast('Você vai receber os relatos neste celular.');
    } catch (e) {
      toast(e.message, 'erro');
    }
  }

  const abas = [
    ['barbearias', 'Barbearias'],
    ['relatos', novos ? `Relatos (${novos})` : 'Relatos'],
    ['aviso', 'Aviso e manutenção'],
  ];

  return (
    <div>
      <header className="topo-painel">
        <div className="polo" />
        <div className="conteudo">
          <b className="letreiro">Administração</b>
          <button className="btn btn-texto" style={{ color: '#fff' }} onClick={() => { sessao.sair(); navegar('/login'); }}>Sair</button>
        </div>
      </header>
      <main className="pagina-painel pilha">
        <div className="opcoes" role="tablist" aria-label="Seções">
          {abas.map(([v, t]) => (
            <button key={v} role="tab" className="opcao" aria-pressed={aba === v} aria-selected={aba === v} onClick={() => setBusca(v === 'barbearias' ? {} : { aba: v })}>{t}</button>
          ))}
        </div>
        {!avisosAtivos && (
          <button className="btn btn-contorno btn-largo" onClick={ativarAvisos}>Receber relatos e erros como notificação neste celular</button>
        )}
        {aba === 'barbearias' && <Barbearias />}
        {aba === 'relatos' && <Relatos aoMudar={() => api('/admin/resumo').then((r) => setNovos(r.relatosNovos || 0)).catch(() => {})} />}
        {aba === 'aviso' && <AvisoAdmin />}
      </main>
    </div>
  );
}
