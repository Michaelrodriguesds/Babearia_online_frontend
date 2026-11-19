// Números do negócio: movimento, clientes que mais rendem, o que mais vende, meses.
// Serve para o dono planejar promoções e chamar de volta quem sumiu.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Aviso, Carregando } from '../../componentes/ui';
import { linkWhatsapp, moeda } from '../../utils';
import { usePainel } from './LayoutPainel';

const PERIODOS = [
  { valor: '30', rotulo: '30 dias' },
  { valor: '90', rotulo: '3 meses' },
  { valor: '365', rotulo: '12 meses' },
];
const CURTO = { Segunda: 'Seg', Terça: 'Ter', Quarta: 'Qua', Quinta: 'Qui', Sexta: 'Sex', Sábado: 'Sáb', Domingo: 'Dom' };

function moedaCurta(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',').replace(',0', '')} mil`;
  return `R$ ${Math.round(v)}`;
}
const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';
const quandoFoi = (dias) => (dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`);

function Colunas({ itens, valor, rotulo, texto, titulo, soMaior = false }) {
  const maior = Math.max(...itens.map(valor), 0);
  return (
    <div className="colunas" role="img" aria-label={titulo}>
      {itens.map((it) => {
        const v = valor(it);
        return (
          <div key={rotulo(it)} className={`coluna${v > 0 && v === maior ? ' destaque' : ''}`}>
            <span className="valor">{v > 0 && (!soMaior || v === maior) ? texto(it) : ''}</span>
            <div className="pilar" style={{ height: maior ? `${Math.max((v / maior) * 100, 2)}%` : '2%' }} />
            <span className="rotulo">{rotulo(it)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Numeros() {
  const { tx, linkPublico } = usePainel();
  const [periodo, setPeriodo] = useState('90');
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [ordemClientes, setOrdemClientes] = useState('gasto');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setDados(null);
    setErro(null);
    api(`/painel/relatorios?periodo=${periodo}`)
      .then((d) => ativo && setDados(d))
      .catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [periodo, tentativa]);

  const clientes = useMemo(() => {
    if (!dados) return [];
    const lista = [...dados.clientesTop];
    if (ordemClientes === 'visitas') lista.sort((a, b) => b.visitas - a.visitas || b.faturamento - a.faturamento);
    return lista.slice(0, 10);
  }, [dados, ordemClientes]);

  const nomePeriodo = PERIODOS.find((p) => p.valor === periodo).rotulo;
  const vazio = dados && dados.resumo.atendimentos === 0 && dados.sumidos.length === 0;

  const mensagemVolta = (c) =>
    `Olá, ${primeiroNome(c.nome)}! Sentimos sua falta aqui ${tx.na}. Que tal marcar seu próximo horário? É só escolher aqui: ${linkPublico}`;

  return (
    <div className="pilha">
      <h1 className="letreiro" style={{ fontSize: '1.4rem' }}>Números</h1>
      <div className="opcoes" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button key={p.valor} className="opcao" aria-pressed={periodo === p.valor} onClick={() => setPeriodo(p.valor)}>{p.rotulo}</button>
        ))}
      </div>

      {erro && <Aviso tipo="erro">{erro} <button className="btn btn-texto" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</button></Aviso>}
      {!dados && !erro && <Carregando texto="Fazendo as contas…" />}

      {vazio && (
        <p className="vazio">Os números aparecem aqui depois dos primeiros atendimentos. Compartilhe seu link para começar a receber agendamentos.</p>
      )}

      {dados && !vazio && (
        <>
          {dados.dicas.length > 0 && (
            <section className="aviso aviso-info pilha-p" aria-label="Dicas">
              <b>Dicas para o seu negócio</b>
              <ul className="dicas">{dados.dicas.map((d) => <li key={d}>{d}</li>)}</ul>
            </section>
          )}

          <div className="metricas">
            <div className="metrica"><span>Faturamento</span><b>{moeda(dados.resumo.faturamento)}</b><small>{nomePeriodo}</small></div>
            <div className="metrica"><span>Atendimentos</span><b>{dados.resumo.atendimentos}</b><small>{nomePeriodo}</small></div>
            <div className="metrica"><span>Ticket médio</span><b>{moeda(dados.resumo.ticketMedio)}</b><small>por atendimento</small></div>
            <div className="metrica"><span>Clientes</span><b>{dados.resumo.clientes}</b><small>{dados.resumo.clientesNovos} {dados.resumo.clientesNovos === 1 ? 'novo' : 'novos'}</small></div>
          </div>

          <section className="secao">
            <h2>Movimento por dia da semana</h2>
            <Colunas titulo="Atendimentos por dia da semana" itens={dados.porDiaSemana} valor={(d) => d.atendimentos}
              rotulo={(d) => CURTO[d.dia]} texto={(d) => d.atendimentos} />
            {(() => {
              const com = dados.porDiaSemana.filter((d) => d.atendimentos > 0);
              if (!com.length) return null;
              const forte = [...com].sort((a, b) => b.faturamento - a.faturamento)[0];
              return <p className="suave pequeno" style={{ margin: '10px 0 0' }}>Dia que mais fatura: <b>{forte.dia}</b> ({moeda(forte.faturamento)}).</p>;
            })()}
          </section>

          {dados.porHora.length > 0 && (
            <section className="secao">
              <h2>Horários mais procurados</h2>
              {(() => {
                const maior = Math.max(...dados.porHora.map((h) => h.atendimentos));
                return dados.porHora.map((h) => (
                  <div key={h.hora} className="linha-barra">
                    <span>{h.hora}</span>
                    <div className="trilho"><div className="enchimento" style={{ width: `${(h.atendimentos / maior) * 100}%` }} /></div>
                    <b style={{ textAlign: 'right' }}>{h.atendimentos}</b>
                  </div>
                ));
              })()}
            </section>
          )}

          {dados.servicos.length > 0 && (
            <section className="secao">
              <h2>O que mais rende</h2>
              {dados.servicos.slice(0, 8).map((s) => (
                <div key={s.nome} className="servico-renda">
                  <div className="linha-entre">
                    <b>{s.nome}</b>
                    <b>{moeda(s.faturamento)}</b>
                  </div>
                  <div className="suave pequeno">{s.quantidade}x · {s.percentual}% do faturamento</div>
                  <div className="trilho"><div className="enchimento" style={{ width: `${Math.max(s.percentual, 1)}%` }} /></div>
                </div>
              ))}
            </section>
          )}

          <section className="secao">
            <h2>Últimos 12 meses</h2>
            <Colunas titulo="Faturamento por mês" itens={dados.meses} valor={(m) => m.faturamento}
              rotulo={(m) => m.rotulo.slice(0, 3)} texto={(m) => moedaCurta(m.faturamento)} soMaior />
            {(() => {
              const melhor = [...dados.meses].sort((a, b) => b.faturamento - a.faturamento)[0];
              return melhor?.faturamento > 0
                ? <p className="suave pequeno" style={{ margin: '10px 0 0' }}>Melhor mês: <b>{melhor.rotulo}</b>, com {melhor.atendimentos} atendimentos e {moeda(melhor.faturamento)}.</p>
                : null;
            })()}
          </section>

          {clientes.length > 0 && (
            <section className="secao">
              <div className="linha-entre" style={{ marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>Clientes top</h2>
              </div>
              <div className="opcoes" role="group" aria-label="Ordenar clientes" style={{ marginBottom: 6 }}>
                <button className="opcao" aria-pressed={ordemClientes === 'gasto'} onClick={() => setOrdemClientes('gasto')}>Mais gastam</button>
                <button className="opcao" aria-pressed={ordemClientes === 'visitas'} onClick={() => setOrdemClientes('visitas')}>Mais vêm</button>
              </div>
              {clientes.map((c, i) => (
                <div key={`${c.whatsapp}-${c.nome}`} className="lista-item">
                  <b style={{ width: 22, color: 'var(--tinta-2)' }}>{i + 1}</b>
                  <div className="info">
                    <b>{c.nome}</b>
                    <div className="suave pequeno">{c.visitas} {c.visitas === 1 ? 'visita' : 'visitas'} · {moeda(c.faturamento)} · última {quandoFoi(c.diasSemVir)}</div>
                  </div>
                  {c.whatsapp && (
                    <a className="btn btn-contorno btn-pequeno" target="_blank" rel="noreferrer" href={linkWhatsapp(c.whatsapp, `Olá, ${primeiroNome(c.nome)}!`)}>WhatsApp</a>
                  )}
                </div>
              ))}
            </section>
          )}

          <section className="secao">
            <h2>Clientes fixos que sumiram</h2>
            <p className="suave pequeno" style={{ margin: '0 0 6px' }}>Vieram 2 vezes ou mais e não voltam há mais de 30 dias. Um recado pode trazer de volta.</p>
            {dados.sumidos.length === 0 && <p className="suave pequeno" style={{ margin: 0 }}>Ninguém sumido. Seus clientes fixos estão voltando.</p>}
            {dados.sumidos.map((c) => (
              <div key={`${c.whatsapp}-${c.nome}`} className="lista-item">
                <div className="info">
                  <b>{c.nome}</b>
                  <div className="suave pequeno">Sem vir {quandoFoi(c.diasSemVir)} · {c.visitasTotal} visitas · {moeda(c.faturamentoTotal)} no ano</div>
                </div>
                {c.whatsapp && (
                  <a className="btn btn-zap btn-pequeno" target="_blank" rel="noreferrer" href={linkWhatsapp(c.whatsapp, mensagemVolta(c))}>Chamar de volta</a>
                )}
              </div>
            ))}
            {dados.retorno.diasEntreVisitas && (
              <p className="suave pequeno" style={{ margin: '10px 0 0' }}>
                Quem volta costuma voltar a cada <b>{dados.retorno.diasEntreVisitas} dias</b>.
              </p>
            )}
          </section>

          <section className="secao">
            <h2>Desistências e faltas</h2>
            <div className="metricas">
              <div className="metrica"><span>Desistiram</span><b>{dados.perdas.desistencias}</b></div>
              <div className="metrica"><span>Faltaram</span><b>{dados.perdas.faltas}</b></div>
              <div className="metrica"><span>Não pagaram o Pix</span><b>{dados.perdas.pixNaoPago}</b></div>
              <div className="metrica"><span>Perda</span><b>{dados.perdas.taxaPerda}%</b><small>dos horários marcados</small></div>
            </div>
            {dados.perdas.motivos.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <b className="pequeno">Motivos de desistência</b>
                {dados.perdas.motivos.map((m) => (
                  <div key={m.motivo} className="linha-entre pequeno" style={{ padding: '4px 0' }}><span>{m.motivo}</span><b>{m.quantidade}</b></div>
                ))}
              </div>
            )}
            <p className="suave pequeno" style={{ margin: '10px 0 0' }}>Quando um cliente não aparecer, toque em <b>Faltou</b> no horário dele na Agenda.</p>
          </section>

          <p className="suave pequeno centro">
            Faturamento = valor dos {tx.servicos} atendidos ({moeda(dados.resumo.recebidoPix)} pelo Pix, o resto pago {tx.na}).
          </p>
        </>
      )}
    </div>
  );
}
