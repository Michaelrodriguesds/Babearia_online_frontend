// Aba Aviso e manutenção: avisa todo mundo ou trava o sistema enquanto você mexe
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Aviso, Botao, Campo, Carregando, useToast } from '../../componentes/ui';
import { dataHora } from '../../utils';

const MODELOS = [
  ['Manutenção agora', { tipo: 'manutencao', bloquear: true, mensagem: 'Estamos fazendo uma melhoria rápida no sistema. Voltamos em alguns minutos.' }],
  ['Manutenção programada', { tipo: 'manutencao', bloquear: true, mensagem: 'O sistema vai passar por manutenção. Durante esse período não será possível agendar.' }],
  ['Novidade para barbeiros', { tipo: 'informativo', bloquear: false, mostrarPara: 'barbeiros', mensagem: 'Novidade no app: ' }],
];

// "2026-10-25T22:00" (campo do formulário) <-> data com fuso de Brasília
const paraCampo = (d) => (d ? new Date(new Date(d).getTime() - 3 * 3600000).toISOString().slice(0, 16) : '');
const doCampo = (v) => (v ? `${v}:00-03:00` : null);

export default function AvisoAdmin() {
  const toast = useToast();
  const [a, setA] = useState(null);
  const [situacao, setSituacao] = useState(null);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  function aplicar(d) {
    const av = d.aviso || {};
    setA({
      ativo: Boolean(av.ativo), tipo: av.tipo || 'informativo', mensagem: av.mensagem || '', bloquear: Boolean(av.bloquear),
      mostrarPara: av.mostrarPara || 'todos', inicio: paraCampo(av.inicio), fim: paraCampo(av.fim),
    });
    setSituacao(d.situacao);
  }

  useEffect(() => { api('/admin/aviso').then(aplicar).catch((e) => setErro(e.message)); }, []);

  async function salvar(dados, mensagem) {
    setSalvando(true);
    setErro(null);
    try {
      const d = await api('/admin/aviso', {
        metodo: 'PUT',
        corpo: { ...dados, inicio: doCampo(dados.inicio), fim: doCampo(dados.fim) },
      });
      aplicar(d);
      toast(mensagem);
      window.dispatchEvent(new Event('manutencao')); // atualiza a faixa nesta tela
    } catch (e) {
      const detalhe = e.dados?.detalhes?.[0]?.mensagem;
      setErro(detalhe || e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (!a) return erro ? <Aviso tipo="erro">{erro}</Aviso> : <Carregando />;
  const mudar = (campo, valor) => setA({ ...a, [campo]: valor });

  return (
    <div className="pilha">
      {situacao ? (
        <Aviso tipo={situacao.bloqueando ? 'erro' : 'atencao'}>
          {situacao.bloqueando
            ? <><b>Sistema em manutenção agora.</b> Clientes e barbeiros veem a tela de manutenção. Pix pagos continuam sendo confirmados.</>
            : situacao.situacao === 'programado'
              ? <><b>Aviso programado</b> para começar {dataHora(situacao.inicio)}.</>
              : <><b>Aviso no ar</b> para {situacao.mostrarPara === 'barbeiros' ? 'barbeiros' : 'todos'}.</>}
          {situacao.fim && <> Termina sozinho {dataHora(situacao.fim)}.</>}
        </Aviso>
      ) : (
        <Aviso tipo="ok">Nenhum aviso no ar. O sistema está funcionando normalmente para todos.</Aviso>
      )}

      {(situacao || a.ativo) && (
        <Botao className="btn-escuro btn-largo" carregando={salvando} onClick={() => salvar({ ...a, ativo: false }, 'Aviso encerrado. Sistema liberado.')}>
          Encerrar aviso agora
        </Botao>
      )}

      <section className="secao pilha">
        <h2>Novo aviso</h2>
        <div className="opcoes">
          {MODELOS.map(([nome, m]) => <button key={nome} className="opcao" onClick={() => setA({ ...a, mostrarPara: 'todos', ...m })}>{nome}</button>)}
        </div>
        <div>
          <div className="pequeno" style={{ fontWeight: 600, marginBottom: 6 }}>Tipo</div>
          <div className="opcoes" role="group" aria-label="Tipo">
            <button className="opcao" aria-pressed={a.tipo === 'informativo'} onClick={() => setA({ ...a, tipo: 'informativo', bloquear: false })}>Só um aviso</button>
            <button className="opcao" aria-pressed={a.tipo === 'manutencao'} onClick={() => mudar('tipo', 'manutencao')}>Manutenção</button>
          </div>
        </div>
        <Campo rotulo="Mensagem que as pessoas vão ver">
          <textarea className="entrada" rows={3} value={a.mensagem} onChange={(e) => mudar('mensagem', e.target.value)} maxLength={500} />
        </Campo>
        {a.tipo === 'manutencao' && (
          <label className="alternador">
            <span>Travar o sistema durante a manutenção<br /><small className="suave">Clientes e barbeiros veem a tela de manutenção. Você continua entrando no /admin.</small></span>
            <input type="checkbox" checked={a.bloquear} onChange={(e) => mudar('bloquear', e.target.checked)} />
          </label>
        )}
        {a.tipo === 'informativo' && (
          <Campo rotulo="Quem vê">
            <select className="entrada" value={a.mostrarPara} onChange={(e) => mudar('mostrarPara', e.target.value)}>
              <option value="todos">Clientes e barbeiros</option>
              <option value="barbeiros">Só barbeiros</option>
            </select>
          </Campo>
        )}
        <div className="grade-2">
          <Campo rotulo="Começa em" ajuda="Vazio = agora"><input className="entrada" type="datetime-local" value={a.inicio} onChange={(e) => mudar('inicio', e.target.value)} /></Campo>
          <Campo rotulo="Termina em" ajuda="Vazio = até você encerrar"><input className="entrada" type="datetime-local" value={a.fim} onChange={(e) => mudar('fim', e.target.value)} /></Campo>
        </div>
        {a.tipo === 'manutencao' && a.inicio && (
          <p className="suave pequeno" style={{ margin: 0 }}>Até a hora de começar, todos veem uma faixa avisando da manutenção programada.</p>
        )}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao className="btn-primario btn-largo" carregando={salvando}
          onClick={() => salvar({ ...a, ativo: true }, a.tipo === 'manutencao' && a.bloquear && !a.inicio ? 'Manutenção ligada.' : 'Aviso publicado.')}>
          {a.tipo === 'manutencao' && a.bloquear && !a.inicio ? 'Ligar manutenção agora' : 'Publicar aviso'}
        </Botao>
      </section>
    </div>
  );
}
