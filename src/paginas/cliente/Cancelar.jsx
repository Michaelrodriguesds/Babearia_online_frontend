// Cliente desiste do horário (pela página da agenda, pela reserva ou pelo link do WhatsApp)
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useLoja, estiloDaLoja, CabecalhoLoja } from '../../componentes/Loja';
import { textosDo } from '../../tipos';
import { removerReserva } from '../../minhasReservas';
import { Aviso, Botao, Carregando } from '../../componentes/ui';
import { dataLonga, hora, linkWhatsapp, STATUS_TEXTO } from '../../utils';

export default function Cancelar() {
  const { slug, id } = useParams();
  const [busca] = useSearchParams();
  const codigo = busca.get('c') || '';
  const { loja } = useLoja(slug);
  const tx = textosDo(loja?.tipo);

  const [ag, setAg] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [outro, setOutro] = useState('');
  const MOTIVOS = ['Tive um imprevisto', 'Vou marcar outro dia', 'Marquei errado', 'Outro motivo'];

  useEffect(() => {
    api(`/publico/agendamentos/${id}?c=${encodeURIComponent(codigo)}`, { autenticado: false })
      .then(setAg)
      .catch((e) => setErro(e.status === 404 ? 'Agendamento não encontrado. Use o link completo que você recebeu.' : e.message));
  }, [id, codigo]);

  async function cancelar() {
    setEnviando(true);
    setErro(null);
    try {
      const texto = motivo === 'Outro motivo' ? outro.trim() || 'Outro motivo' : motivo;
      const corpo = texto ? { codigo, motivo: texto.slice(0, 200) } : { codigo };
      setResultado(await api(`/publico/agendamentos/${id}/cancelar`, { metodo: 'POST', autenticado: false, corpo }));
      removerReserva(slug, id);
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
          ag.status === 'confirmado' && ag.desistencia && !ag.desistencia.podeDesistir ? (
            <>
              <Aviso tipo="info">
                Pelo app, só dá para desistir até {ag.desistencia.prazoHoras}h antes do horário. Se não puder vir, avise {tx.a} pelo WhatsApp.
              </Aviso>
              {loja?.whatsapp && (
                <a className="btn btn-zap btn-largo" target="_blank" rel="noreferrer"
                  href={linkWhatsapp(loja.whatsapp, `Olá! Não vou conseguir ir no meu horário: ${ag.servico}, ${dataLonga(ag.inicio)} às ${hora(ag.inicio)}.`)}>
                  Avisar que não vou
                </a>
              )}
            </>
          ) : ['pendente', 'confirmado'].includes(ag.status) ? (
            <>
              <h2>Desistir deste horário?</h2>
              <div>
                <div className="data-grande">{dataLonga(ag.inicio)}</div>
                <div className="data-grande">{hora(ag.inicio)}</div>
                <p className="suave" style={{ margin: '6px 0 0' }}>{ag.servico}</p>
              </div>
              {ag.status === 'confirmado' && ag.valorCobrado > 0 && (
                <Aviso tipo="atencao">Você já pagou pelo Pix. {tx.A} será {tx.avisada} para combinar a devolução.</Aviso>
              )}
              <div className="pilha-p">
                <span className="pequeno"><b>Conte o motivo</b> (opcional, ajuda {tx.a} a se organizar)</span>
                <div className="opcoes" role="group" aria-label="Motivo">
                  {MOTIVOS.map((m) => (
                    <button key={m} type="button" className="opcao" aria-pressed={motivo === m} onClick={() => setMotivo(motivo === m ? '' : m)}>{m}</button>
                  ))}
                </div>
                {motivo === 'Outro motivo' && (
                  <input className="entrada" maxLength={200} value={outro} onChange={(e) => setOutro(e.target.value)} placeholder="Escreva aqui, se quiser" aria-label="Outro motivo" />
                )}
              </div>
              <Botao className="btn-perigo btn-largo" carregando={enviando} onClick={cancelar}>Sim, desistir do horário</Botao>
              <Link className="btn btn-contorno btn-largo" to={`/b/${slug}`}>Manter horário</Link>
            </>
          ) : (
            <Aviso tipo="info">Este horário não pode mais ser desmarcado. Situação: {(STATUS_TEXTO[ag.status] || ag.status).toLowerCase()}.</Aviso>
          )
        )}

        {resultado && (
          <>
            <Aviso tipo="ok"><b>Pronto, você desistiu do horário.</b> {tx.A} já foi {tx.avisada} e o horário ficou livre.</Aviso>
            {resultado.jaPago && loja?.whatsapp && (
              <a className="btn btn-zap btn-largo" target="_blank" rel="noreferrer" href={linkWhatsapp(loja.whatsapp, 'Olá! Desisti do meu horário pelo app e já tinha pago o Pix. Como fica a devolução?')}>
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
