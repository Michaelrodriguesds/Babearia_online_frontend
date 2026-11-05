// Mostra o aviso geral que você liga no /admin:
//  - manutenção com bloqueio: tela inteira "Estamos em manutenção"
//  - aviso informativo ou manutenção programada: faixa no topo (dá para fechar)
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { dataHora } from '../utils';

export default function AvisoSistema({ children }) {
  const { pathname } = useLocation();
  const [aviso, setAviso] = useState(null);
  const [fechado, setFechado] = useState(() => localStorage.getItem('avisoFechado'));

  const consultar = useCallback(() => {
    api('/status', { autenticado: false }).then((d) => setAviso(d.aviso)).catch(() => {});
  }, []);

  useEffect(() => {
    consultar();
    const t = setInterval(consultar, 2 * 60 * 1000);
    window.addEventListener('manutencao', consultar);
    return () => { clearInterval(t); window.removeEventListener('manutencao', consultar); };
  }, [consultar]);

  const areaAdmin = pathname.startsWith('/admin') || pathname.startsWith('/login');
  const areaBarbeiro = pathname.startsWith('/painel');
  const paraEstaPessoa = aviso && (aviso.mostrarPara === 'todos' || areaBarbeiro || areaAdmin);

  // Você continua entrando no /admin para desligar a manutenção
  if (aviso?.bloqueando && !areaAdmin) {
    return (
      <div className="tela-entrada">
        <div className="polo" />
        <main className="miolo pilha centro">
          <img src="/icons/icon-192.png" alt="" width="72" height="72" style={{ borderRadius: 18, margin: '0 auto' }} />
          <h1 className="letreiro">Estamos em manutenção</h1>
          <p style={{ fontSize: '1.1rem' }}>{aviso.mensagem}</p>
          {aviso.fim && <p className="suave">Previsão de volta: <b>{dataHora(aviso.fim)}</b></p>}
          <p className="suave pequeno">Seus horários marcados continuam valendo.</p>
          <button className="btn btn-escuro btn-largo" onClick={() => window.location.reload()}>Tentar de novo</button>
        </main>
      </div>
    );
  }

  const chave = aviso ? `${aviso.versao}` : '';
  const mostrarFaixa = paraEstaPessoa && (fechado !== chave || areaAdmin);

  return (
    <>
      {mostrarFaixa && (
        <div className={`faixa-aviso ${aviso.tipo === 'manutencao' ? 'manutencao' : ''}`} role="status">
          <div className="conteudo">
            <span>
              {areaAdmin && aviso.bloqueando && <b>Manutenção ligada: clientes e barbeiros estão vendo a tela de manutenção. </b>}
              {aviso.situacao === 'programado' && aviso.tipo === 'manutencao' && <b>Manutenção programada para {dataHora(aviso.inicio)}. </b>}
              {aviso.mensagem}
            </span>
            {!areaAdmin && (
              <button className="btn btn-texto pequeno" aria-label="Fechar aviso"
                onClick={() => { localStorage.setItem('avisoFechado', chave); setFechado(chave); }}>Fechar</button>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  );
}
