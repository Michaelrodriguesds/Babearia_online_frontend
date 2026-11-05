// Tela principal do barbeiro: agenda do dia
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { usePainel } from './LayoutPainel';
import CartaoApp from '../../componentes/CartaoApp';
import { Aviso, Botao, Campo, Carregando, Modal, useToast } from '../../componentes/ui';
import {
  copiarTexto, dataLonga, hora, isoDia, linkWhatsapp, moeda, somarDias, HORAS_15, STATUS_TEXTO,
} from '../../utils';

export default function Agenda() {
  const { linkPublico, barbearia } = usePainel();
  const toast = useToast();
  const [busca, setBusca] = useSearchParams();
  const dia = busca.get('data') || isoDia();

  const [itens, setItens] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);
  const [verInativos, setVerInativos] = useState(false);
  const [acao, setAcao] = useState(null); // id em processamento
  const [bloqueioAberto, setBloqueioAberto] = useState(false);
  const seletorData = useRef(null);

  // Agenda e resumo carregam separados: se o resumo falhar, a agenda aparece mesmo assim
  const carregar = useCallback(async () => {
    api('/painel/resumo').then(setResumo).catch(() => {});
    try {
      const lista = await api(`/painel/agendamentos?data=${dia}&limite=50`);
      setItens(lista.itens);
      setErro(null);
    } catch (e) {
      if (e.status !== 402) setErro(e.message);
    }
  }, [dia]);

  useEffect(() => {
    setItens(null);
    carregar();
    const t = setInterval(carregar, 60000); // atualiza sozinho a cada minuto
    const aoVoltar = () => !document.hidden && carregar();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', aoVoltar); };
  }, [carregar]);

  const irPara = (novo) => setBusca(novo === isoDia() ? {} : { data: novo });

  async function executar(id, caminho, metodo, mensagem, pergunta) {
    if (pergunta && !window.confirm(pergunta)) return;
    setAcao(id);
    try {
      await api(caminho, { metodo });
      toast(mensagem);
      await carregar();
    } catch (e) {
      toast(e.message, 'erro');
    } finally {
      setAcao(null);
    }
  }

  async function compartilhar() {
    const dados = { title: barbearia.nome, text: `Agende seu horário na ${barbearia.nome}:`, url: linkPublico };
    if (navigator.share) {
      try { await navigator.share(dados); return; } catch { /* cancelou */ }
    }
    toast((await copiarTexto(linkPublico)) ? 'Link copiado.' : 'Não foi possível copiar.');
  }

  const inativos = ['cancelado', 'expirado'];
  const visiveis = (itens || []).filter((a) => verInativos || !inativos.includes(a.status));
  const qtdInativos = (itens || []).filter((a) => inativos.includes(a.status)).length;
  const semPix = barbearia.regras?.cobranca !== 'local' && barbearia.pagamento?.modo === 'manual' && !barbearia.pagamento?.chavePix;

  return (
    <div className="pilha">
      {semPix && (
        <Aviso tipo="atencao">Cadastre sua chave Pix em Ajustes para os clientes conseguirem reservar.</Aviso>
      )}
      {resumo?.conflitos > 0 && (
        <Aviso tipo="erro">Há {resumo.conflitos} Pix pago depois do prazo com horário ocupado. Combine com o cliente a devolução ou outro horário.</Aviso>
      )}

      {resumo && (
        <div className="numeros">
          <div className="numero"><b>{resumo.hoje}</b><span>hoje</span></div>
          <div className="numero"><b>{resumo.aguardandoPix}</b><span>aguardando Pix</span></div>
          <div className="numero"><b>{resumo.mes.atendimentos}</b><span>no mês · {moeda(resumo.mes.faturamento)}</span></div>
        </div>
      )}

      <section className="secao">
        <div className="navegar-dia">
          <button className="btn btn-contorno btn-pequeno" onClick={() => irPara(somarDias(dia, -1))} aria-label="Dia anterior">‹</button>
          <button className="titulo-dia btn btn-texto" style={{ textDecoration: 'none', color: 'var(--tinta)' }}
            onClick={() => { try { seletorData.current?.showPicker(); } catch { seletorData.current?.focus(); } }}>
            {dia === isoDia() ? 'Hoje' : dataLonga(`${dia}T12:00:00-03:00`)}
          </button>
          <input ref={seletorData} type="date" value={dia} onChange={(e) => e.target.value && irPara(e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} tabIndex={-1} aria-hidden="true" />
          <button className="btn btn-contorno btn-pequeno" onClick={() => irPara(somarDias(dia, 1))} aria-label="Próximo dia">›</button>
        </div>
        {dia !== isoDia() && <div className="centro"><button className="btn btn-texto pequeno" onClick={() => irPara(isoDia())}>Voltar para hoje</button></div>}

        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {!itens && !erro && <Carregando />}
        {itens && visiveis.length === 0 && <p className="vazio">Nenhum horário marcado neste dia.</p>}

        <div>
          {visiveis.map((a) => (
            <article key={a._id} className={`agenda-item${inativos.includes(a.status) ? ' inativo' : ''}`}>
              <div className="hora">{hora(a.inicio)}<small>até {hora(a.fim)}</small></div>
              <div>
                <div className="linha-entre">
                  <b>{a.tipo === 'bloqueio' ? a.motivo || 'Bloqueado' : a.clienteNome}</b>
                  <span className={`chip chip-${a.status}`}>{STATUS_TEXTO[a.status]}</span>
                </div>
                {a.tipo === 'cliente' && (
                  <div className="suave pequeno">
                    {a.servicoNome} · {moeda(a.valorTotal)}
                    {a.valorCobrado > 0 && a.valorCobrado < a.valorTotal ? ` (sinal ${moeda(a.valorCobrado)})` : ''}
                    {a.pagamento?.pagoEm ? ' · Pix recebido' : a.pagamento?.modo === 'local' ? ' · paga no local' : ''}
                  </div>
                )}
                <div className="acoes">
                  {a.status === 'pendente' && (
                    <Botao className="btn-primario btn-pequeno" carregando={acao === a._id}
                      onClick={() => executar(a._id, `/painel/agendamentos/${a._id}/confirmar`, 'POST', 'Pix confirmado. O cliente foi avisado.', `Confirmar que o Pix de ${moeda(a.valorCobrado)} de ${a.clienteNome} caiu na sua conta?`)}>
                      Confirmar Pix
                    </Botao>
                  )}
                  {a.tipo === 'cliente' && a.clienteWhatsapp && (
                    <a className="btn btn-contorno btn-pequeno" href={linkWhatsapp(a.clienteWhatsapp, `Olá, ${a.clienteNome}!`)} target="_blank" rel="noreferrer">WhatsApp</a>
                  )}
                  {['pendente', 'confirmado'].includes(a.status) && (
                    <button className="btn btn-perigo btn-pequeno" disabled={acao === a._id}
                      onClick={() => executar(a._id, `/painel/agendamentos/${a._id}/cancelar`, 'POST', 'Agendamento cancelado. O cliente foi avisado.', `Cancelar o horário de ${a.clienteNome}? O cliente será avisado.`)}>
                      Cancelar
                    </button>
                  )}
                  {a.tipo === 'bloqueio' && (
                    <button className="btn btn-contorno btn-pequeno" disabled={acao === a._id}
                      onClick={() => executar(a._id, `/painel/bloqueios/${a._id}`, 'DELETE', 'Horário liberado.')}>
                      Liberar horário
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {qtdInativos > 0 && (
          <div className="centro">
            <button className="btn btn-texto pequeno" onClick={() => setVerInativos(!verInativos)}>
              {verInativos ? 'Esconder cancelados e expirados' : `Mostrar ${qtdInativos} cancelado(s) ou expirado(s)`}
            </button>
          </div>
        )}
      </section>

      <button className="btn btn-contorno btn-largo" onClick={() => setBloqueioAberto(true)}>Bloquear um horário</button>

      <section className="secao pilha-p">
        <h2>Seu link de agendamento</h2>
        <p className="suave pequeno" style={{ margin: 0 }}>Mande para os clientes e coloque na bio do Instagram.</p>
        <div className="codigo-pix" style={{ fontFamily: 'inherit', fontSize: '0.9rem' }}>{linkPublico}</div>
        <div className="grade-2">
          <button className="btn btn-escuro" onClick={compartilhar}>Compartilhar</button>
          <a className="btn btn-contorno" href={linkPublico} target="_blank" rel="noreferrer">Abrir minha página</a>
        </div>
      </section>

      <CartaoApp />

      <ModalBloqueio aberto={bloqueioAberto} dia={dia} aoFechar={() => setBloqueioAberto(false)} aoSalvar={() => { setBloqueioAberto(false); carregar(); }} />
    </div>
  );
}

function ModalBloqueio({ aberto, dia, aoFechar, aoSalvar }) {
  const toast = useToast();
  const [data, setData] = useState(dia);
  const [inicio, setInicio] = useState('12:00');
  const [fim, setFim] = useState('13:00');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { if (aberto) { setData(dia); setErro(null); } }, [aberto, dia]);

  async function salvar() {
    if (fim <= inicio) { setErro('O fim precisa ser depois do início.'); return; }
    setEnviando(true);
    setErro(null);
    try {
      await api('/painel/bloqueios', {
        metodo: 'POST',
        corpo: { inicio: `${data}T${inicio}:00-03:00`, fim: `${data}T${fim}:00-03:00`, motivo: motivo || undefined },
      });
      toast('Horário bloqueado.');
      aoSalvar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Bloquear horário" aberto={aberto} aoFechar={aoFechar}>
      <p className="suave pequeno" style={{ margin: 0 }}>Os clientes não vão conseguir marcar nesse período.</p>
      <Campo rotulo="Dia"><input className="entrada" type="date" value={data} onChange={(e) => setData(e.target.value)} /></Campo>
      <div className="grade-2">
        <Campo rotulo="De">
          <select className="entrada" value={inicio} onChange={(e) => setInicio(e.target.value)}>{HORAS_15.map((h) => <option key={h}>{h}</option>)}</select>
        </Campo>
        <Campo rotulo="Até">
          <select className="entrada" value={fim} onChange={(e) => setFim(e.target.value)}>{HORAS_15.map((h) => <option key={h}>{h}</option>)}</select>
        </Campo>
      </div>
      <Campo rotulo="Motivo (só você vê)"><input className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: médico, almoço" maxLength={100} /></Campo>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Botao className="btn-escuro btn-largo" carregando={enviando} onClick={salvar}>Bloquear</Botao>
    </Modal>
  );
}
