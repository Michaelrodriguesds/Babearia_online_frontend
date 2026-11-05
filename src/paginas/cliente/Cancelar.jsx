// Cliente cancela pelo link que recebeu no WhatsApp
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useLoja, estiloDaLoja, CabecalhoLoja } from '../../componentes/Loja';
import { Aviso, Botao, Carregando } from '../../componentes/ui';
import { dataLonga, hora, linkWhatsapp, STATUS_TEXTO } from '../../utils';

export default function Cancelar() {
  const { slug, id } = useParams();
  const [busca] = useSearchParams();
  const codigo = busca.get('c') || '';
  const { loja } = useLoja(slug);

  const [ag, setAg] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    api(`/publico/agendamentos/${id}?c=${encodeURIComponent(codigo)}`, { autenticado: false })
      .then(setAg)
      .catch((e) => setErro(e.status === 404 ? 'Agendamento não encontrado. Use o link completo que você recebeu.' : e.message));
  }, [id, codigo]);

  async function cancelar() {
    setEnviando(true);
    setErro(null);
    try {
      setResultado(await api(`/publico/agendamentos/${id}/cancelar`, { metodo: 'POST', autenticado: false, corpo: { codigo } }));
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={estiloDaLoja(loja)}>
      <CabecalhoLoja loja={loja} />
      <main className="pagina pilha">
        {!ag && !erro && <Carregando />}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        {ag && !resultado && (
          ['pendente', 'confirmado'].includes(ag.status) ? (
            <>
              <h2>Cancelar este horário?</h2>
              <div>
                <div className="data-grande">{dataLonga(ag.inicio)}</div>
                <div className="data-grande">{hora(ag.inicio)}</div>
                <p className="suave" style={{ margin: '6px 0 0' }}>{ag.servico}</p>
              </div>
              {ag.status === 'confirmado' && ag.valorCobrado > 0 && (
                <Aviso tipo="atencao">Você já pagou pelo Pix. A barbearia será avisada para combinar a devolução.</Aviso>
              )}
              <Botao className="btn-perigo btn-largo" carregando={enviando} onClick={cancelar}>Cancelar horário</Botao>
              <Link className="btn btn-contorno btn-largo" to={`/b/${slug}`}>Manter horário</Link>
            </>
          ) : (
            <Aviso tipo="info">Este agendamento não pode mais ser cancelado. Situação: {(STATUS_TEXTO[ag.status] || ag.status).toLowerCase()}.</Aviso>
          )
        )}

        {resultado && (
          <>
            <Aviso tipo="ok"><b>Horário cancelado.</b> A barbearia já foi avisada.</Aviso>
            {resultado.jaPago && loja?.whatsapp && (
              <a className="btn btn-zap btn-largo" target="_blank" rel="noreferrer" href={linkWhatsapp(loja.whatsapp, 'Olá! Cancelei meu horário e já tinha pago o Pix. Como fica a devolução?')}>
                Combinar devolução no WhatsApp
              </a>
            )}
            <Link className="btn btn-primario btn-largo" to={`/b/${slug}`}>Marcar outro horário</Link>
          </>
        )}
      </main>
    </div>
  );
}
