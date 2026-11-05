// Barbeiro relata problemas/sugestões e vê as respostas do suporte
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { JanelaRelatar } from '../../componentes/Relatar';
import { dataCurta } from '../../utils';

const STATUS = {
  novo: ['Recebido', 'pendente'],
  analisando: ['Em análise', 'bloqueado'],
  resolvido: ['Resolvido', 'confirmado'],
  descartado: ['Encerrado', 'cancelado'],
};
const TIPO = { problema: 'Problema', sugestao: 'Sugestão', outro: 'Mensagem' };

export default function Ajuda() {
  const [aberto, setAberto] = useState(false);
  const [relatos, setRelatos] = useState([]);
  const carregar = useCallback(() => api('/painel/relatos').then(setRelatos).catch(() => {}), []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <section className="secao pilha-p" id="ajuda">
      <h2>Ajuda e sugestões</h2>
      <p className="suave pequeno" style={{ margin: 0 }}>Achou um erro ou tem uma ideia para melhorar o sistema? Mande direto para o suporte.</p>
      <button className="btn btn-escuro" onClick={() => setAberto(true)}>Falar com o suporte</button>
      {relatos.length > 0 && (
        <div>
          {relatos.map((r) => (
            <div key={r._id} className="lista-item" style={{ alignItems: 'flex-start' }}>
              <div className="info">
                <div className="linha-entre">
                  <span className="pequeno suave">{TIPO[r.tipo] || 'Mensagem'} · {dataCurta(r.createdAt)}</span>
                  <span className={`chip chip-${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                </div>
                <div className="pequeno" style={{ marginTop: 4 }}>{r.mensagem}</div>
                {r.resposta && <div className="aviso aviso-info pequeno" style={{ marginTop: 8 }}><b>Suporte:</b> {r.resposta}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <JanelaRelatar aberto={aberto} aoFechar={() => setAberto(false)} ehBarbeiro aoEnviar={carregar} />
    </section>
  );
}
