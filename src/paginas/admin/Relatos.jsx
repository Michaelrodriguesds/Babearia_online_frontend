// Aba Relatos: bugs, erros automáticos e sugestões de clientes e barbeiros
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { Aviso, Botao, Carregando, useToast } from '../../componentes/ui';
import { dataHora, linkWhatsapp, telefoneValido } from '../../utils';

const FILTROS = [['novo', 'Novos'], ['analisando', 'Em análise'], ['resolvido', 'Resolvidos'], ['', 'Todos']];
const ORIGENS = [['', 'Todas as origens'], ['cliente', 'Clientes'], ['barbeiro', 'Barbeiros'], ['automatico', 'Erros automáticos']];
const TIPO = { problema: ['Problema', 'conflito'], sugestao: ['Sugestão', 'confirmado'], outro: ['Mensagem', 'bloqueado'], erro_automatico: ['Erro automático', 'conflito'] };
const ORIGEM = { cliente: 'Cliente', barbeiro: 'Barbeiro', automatico: 'App' };

export default function Relatos({ aoMudar }) {
  const [status, setStatus] = useState('novo');
  const [origem, setOrigem] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(() => {
    const p = new URLSearchParams({ pagina: String(pagina) });
    if (status) p.set('status', status);
    if (origem) p.set('origem', origem);
    api(`/admin/relatos?${p}`)
      .then((d) => { setDados(d); setErro(null); })
      .catch((e) => setErro(e.message));
  }, [status, origem, pagina]);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="pilha">
      <div className="opcoes" role="group" aria-label="Situação">
        {FILTROS.map(([v, t]) => <button key={v} className="opcao" aria-pressed={status === v} onClick={() => { setStatus(v); setPagina(1); }}>{t}</button>)}
      </div>
      <select className="entrada" value={origem} onChange={(e) => { setOrigem(e.target.value); setPagina(1); }} aria-label="Origem">
        {ORIGENS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!dados && !erro && <Carregando />}
      {dados && dados.itens.length === 0 && <p className="vazio">Nada por aqui. {status === 'novo' ? 'Nenhum relato novo.' : ''}</p>}
      {dados?.itens.map((r) => <CartaoRelato key={r._id} relato={r} aoSalvar={() => { carregar(); aoMudar?.(); }} />)}
      {dados && dados.paginas > 1 && (
        <div className="linha-entre">
          <button className="btn btn-contorno btn-pequeno" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anteriores</button>
          <span className="suave pequeno">Página {pagina} de {dados.paginas}</span>
          <button className="btn btn-contorno btn-pequeno" disabled={pagina >= dados.paginas} onClick={() => setPagina(pagina + 1)}>Próximos</button>
        </div>
      )}
    </div>
  );
}

function CartaoRelato({ relato: r, aoSalvar }) {
  const toast = useToast();
  const [resposta, setResposta] = useState(r.resposta || '');
  const [salvando, setSalvando] = useState(null);

  async function salvar(dados, mensagem) {
    setSalvando(dados.status || 'resposta');
    try {
      await api(`/admin/relatos/${r._id}`, { metodo: 'PATCH', corpo: dados });
      toast(mensagem);
      aoSalvar();
    } catch (e) {
      toast(e.message, 'erro');
    } finally {
      setSalvando(null);
    }
  }

  const [tipoTexto, tipoChip] = TIPO[r.tipo] || ['Relato', 'bloqueado'];
  const contatoZap = telefoneValido(r.contato) || /^55\d{10,11}$/.test(String(r.contato).replace(/\D/g, ''));

  return (
    <article className="secao pilha-p">
      <div className="linha-entre">
        <span className={`chip chip-${tipoChip}`}>{tipoTexto}</span>
        <span className="suave pequeno">{dataHora(r.ultimaVez || r.createdAt)}</span>
      </div>
      <div className="pequeno suave">
        {ORIGEM[r.origem]}{r.barbeariaNome ? ` · ${r.barbeariaNome}` : ''}{r.pagina ? ` · ${r.pagina}` : ''}
        {r.ocorrencias > 1 ? ` · aconteceu ${r.ocorrencias} vezes` : ''}
      </div>
      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.mensagem}</p>
      {r.contato && (
        contatoZap
          ? <a className="btn btn-zap btn-pequeno" style={{ alignSelf: 'flex-start' }} target="_blank" rel="noreferrer" href={linkWhatsapp(r.contato, 'Olá! Aqui é do suporte da agenda. Recebemos sua mensagem.')}>Responder no WhatsApp</a>
          : <div className="pequeno">Contato: {r.contato}</div>
      )}
      <details className="pequeno suave">
        <summary>Detalhes técnicos</summary>
        <div className="pilha-tecnica">{r.navegador}{r.pilha ? `\n\n${r.pilha}` : ''}</div>
      </details>
      {r.origem === 'barbeiro' && (
        <>
          <textarea className="entrada" rows={2} placeholder="Resposta para o barbeiro (ele vê no app e recebe notificação)" value={resposta} onChange={(e) => setResposta(e.target.value)} maxLength={1000} />
          <Botao className="btn-contorno btn-pequeno" style={{ alignSelf: 'flex-start' }} carregando={salvando === 'resposta'} disabled={resposta === (r.resposta || '')}
            onClick={() => salvar({ resposta }, 'Resposta enviada.')}>Enviar resposta</Botao>
        </>
      )}
      <div className="linha" style={{ flexWrap: 'wrap', gap: 8 }}>
        {r.status !== 'analisando' && <Botao className="btn-contorno btn-pequeno" carregando={salvando === 'analisando'} onClick={() => salvar({ status: 'analisando' }, 'Marcado como em análise.')}>Em análise</Botao>}
        {r.status !== 'resolvido' && <Botao className="btn-primario btn-pequeno" carregando={salvando === 'resolvido'} onClick={() => salvar({ status: 'resolvido' }, 'Marcado como resolvido.')}>Resolvido</Botao>}
        {r.status !== 'descartado' && <Botao className="btn-texto btn-pequeno" carregando={salvando === 'descartado'} onClick={() => salvar({ status: 'descartado' }, 'Relato descartado.')}>Descartar</Botao>}
      </div>
    </article>
  );
}
