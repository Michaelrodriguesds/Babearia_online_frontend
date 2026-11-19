// "Seus horários marcados": o cliente acha de novo o que marcou neste aparelho e pode desistir.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { listarReservas, removerReserva } from '../minhasReservas';
import { dataCurta, diaSemanaCurto, hora } from '../utils';

const ATIVOS = ['pendente', 'confirmado'];

export function MeusHorarios({ slug, tx }) {
  const [lista, setLista] = useState([]);

  useEffect(() => {
    let ativo = true;
    const guardadas = listarReservas(slug);
    if (!guardadas.length) return undefined;
    Promise.all(guardadas.map(async (r) => {
      try {
        const d = await api(`/publico/agendamentos/${r.id}?c=${encodeURIComponent(r.c)}`, { autenticado: false });
        const futuro = new Date(d.inicio).getTime() > Date.now();
        if (ATIVOS.includes(d.status) && futuro) return { ...d, c: r.c };
        removerReserva(slug, r.id); // cancelado, expirado ou já passou: tira da lista
      } catch (e) {
        if (e.status === 404) removerReserva(slug, r.id);
      }
      return null;
    })).then((res) => {
      if (ativo) setLista(res.filter(Boolean).sort((a, b) => new Date(a.inicio) - new Date(b.inicio)));
    });
    return () => { ativo = false; };
  }, [slug]);

  if (!lista.length) return null;
  return (
    <section className="secao pilha-p" aria-labelledby="t-meus">
      <h2 id="t-meus">Seus horários marcados</h2>
      {lista.map((r) => (
        <div key={r.id} className="lista-item">
          <div className="info">
            <b style={{ whiteSpace: 'normal' }}>{diaSemanaCurto(r.inicio)}, {dataCurta(r.inicio)} às {hora(r.inicio)}</b>
            <div className="suave pequeno">
              {r.servico}
              {r.status === 'pendente' ? ' · aguardando o Pix' : ' · confirmado'}
            </div>
            {r.status === 'confirmado' && !r.desistencia?.podeDesistir && (
              <div className="suave pequeno">Para desistir agora, fale com {tx.a}.</div>
            )}
          </div>
          <div className="pilha-p" style={{ gap: 6 }}>
            <Link className={`btn btn-pequeno ${r.status === 'pendente' ? 'btn-primario' : 'btn-contorno'}`} to={`/b/${slug}/reserva/${r.id}?c=${r.c}`}>
              {r.status === 'pendente' ? 'Pagar Pix' : 'Ver'}
            </Link>
            {r.desistencia?.podeDesistir && (
              <Link className="btn btn-texto btn-pequeno" to={`/b/${slug}/cancelar/${r.id}?c=${r.c}`}>Desistir</Link>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
