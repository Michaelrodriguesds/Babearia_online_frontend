// Página pública: o cliente escolhe um ou mais serviços, dia e horário e reserva
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useLoja, estiloDaLoja, CabecalhoLoja, LojaIndisponivel } from '../../componentes/Loja';
import { Aviso, Botao, Campo, Carregando, useToast } from '../../componentes/ui';
import { LinkRelatar } from '../../componentes/Relatar';
import { calcularCobranca, somarPrecos } from '../../dinheiro';
import {
  diaDaSemana, diaDoMes, diaSemanaCurto, dataLonga, isoDia, moeda, somarDias, mascaraTelefone, telefoneValido, hora,
} from '../../utils';

const MAX_SERVICOS = 10;
const MAX_MINUTOS = 480;

function lerJSON(chave) {
  try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; }
}

export default function Agendar() {
  const { slug } = useParams();
  const navegar = useNavigate();
  const toast = useToast();
  const { loja, erro: erroLoja, recarregar } = useLoja(slug);

  const [escolhidos, setEscolhidos] = useState([]); // ids, na ordem em que o cliente tocou
  const [dia, setDia] = useState(null);
  const [horarios, setHorarios] = useState(null);
  const [valoresServidor, setValoresServidor] = useState(null); // { chave, precoTotal, valorPix }
  const [erroHorarios, setErroHorarios] = useState(null);
  const [horario, setHorario] = useState(null);
  const [etapa, setEtapa] = useState('escolher');

  const salvo = lerJSON('cliente') || {};
  const [nome, setNome] = useState(salvo.nome || '');
  const [whatsapp, setWhatsapp] = useState(salvo.whatsapp || '');
  const [errosCampos, setErrosCampos] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState(null);
  const [atualizar, setAtualizar] = useState(0);

  // Reserva aguardando Pix feita antes neste celular
  const pendente = useMemo(() => {
    const r = lerJSON(`reserva:${slug}`);
    return r && new Date(r.expiraEm) > new Date() ? r : null;
  }, [slug]);

  // Próximos dias em que a barbearia atende
  const dias = useMemo(() => {
    if (!loja) return [];
    const hoje = isoDia();
    const total = Math.min(loja.regras.antecedenciaMaxDias || 30, 45);
    const abertos = new Set(loja.horarios.map((h) => h.dia));
    return Array.from({ length: total }, (_, i) => {
      const iso = somarDias(hoje, i);
      return { iso, aberto: abertos.has(diaDaSemana(iso)) && !loja.folgas.includes(iso) };
    });
  }, [loja]);

  // Soma dos serviços escolhidos (em centavos, igual ao servidor)
  const escolha = useMemo(() => {
    if (!loja || !escolhidos.length) return null;
    const lista = escolhidos.map((id) => loja.servicos.find((s) => s._id === id)).filter(Boolean);
    if (!lista.length) return null;
    const preco = somarPrecos(lista.map((s) => s.preco));
    return {
      lista,
      ids: lista.map((s) => s._id),
      chave: lista.map((s) => s._id).join(','),
      preco,
      duracaoMinutos: lista.reduce((t, s) => t + s.duracaoMinutos, 0),
      valorPix: calcularCobranca(loja.regras, preco),
    };
  }, [loja, escolhidos]);
  const chave = escolha?.chave || '';

  // Valor que vale é o do servidor (quando já chegou para esta mesma escolha)
  const doServidor = valoresServidor && valoresServidor.chave === chave ? valoresServidor : null;
  const precoTotal = doServidor ? doServidor.precoTotal : escolha?.preco ?? 0;
  const valorPix = doServidor ? doServidor.valorPix : escolha?.valorPix ?? 0;

  // Toque marca ou desmarca. Ao marcar o primeiro, já escolhe o primeiro dia aberto.
  function alternarServico(s) {
    setHorario(null);
    if (escolhidos.includes(s._id)) {
      setEscolhidos(escolhidos.filter((id) => id !== s._id));
      return;
    }
    if (escolhidos.length >= MAX_SERVICOS) {
      toast(`Escolha no máximo ${MAX_SERVICOS} serviços por horário.`, 'erro');
      return;
    }
    if ((escolha?.duracaoMinutos || 0) + s.duracaoMinutos > MAX_MINUTOS) {
      toast('Os serviços escolhidos passariam de 8 horas.', 'erro');
      return;
    }
    setEscolhidos([...escolhidos, s._id]);
    if (!dia) setDia(dias.find((d) => d.aberto)?.iso || null);
  }

  useEffect(() => {
    if (!chave || !dia) return;
    let ativo = true;
    setHorarios(null);
    setErroHorarios(null);
    api(`/publico/${slug}/disponibilidade?servicoIds=${chave}&data=${dia}`, { autenticado: false })
      .then((d) => {
        if (!ativo) return;
        setHorarios(d.horarios);
        setValoresServidor({ chave, precoTotal: d.precoTotal, valorPix: d.valorPix });
      })
      .catch((e) => ativo && setErroHorarios(e.message));
    return () => { ativo = false; };
  }, [slug, chave, dia, atualizar]);

  const grupos = useMemo(() => {
    const g = { Manhã: [], Tarde: [], Noite: [] };
    (horarios || []).forEach((h) => {
      const hh = Number(h.hora.slice(0, 2));
      g[hh < 12 ? 'Manhã' : hh < 18 ? 'Tarde' : 'Noite'].push(h);
    });
    return Object.entries(g).filter(([, lista]) => lista.length);
  }, [horarios]);

  async function reservar() {
    const erros = {};
    if (nome.trim().length < 2) erros.nome = 'Digite seu nome.';
    if (!telefoneValido(whatsapp)) erros.whatsapp = 'Digite o WhatsApp com DDD, ex.: (21) 99999-8888.';
    setErrosCampos(erros);
    if (Object.keys(erros).length) return;

    setEnviando(true);
    setErroEnvio(null);
    try {
      const r = await api(`/publico/${slug}/agendamentos`, {
        metodo: 'POST',
        autenticado: false,
        corpo: { servicoIds: escolha.ids, inicio: horario.inicio, nome: nome.trim(), whatsapp: whatsapp.replace(/\D/g, '') },
      });
      localStorage.setItem('cliente', JSON.stringify({ nome: nome.trim(), whatsapp }));
      if (r.status === 'pendente') {
        localStorage.setItem(`reserva:${slug}`, JSON.stringify({ id: r.id, c: r.codigo, expiraEm: r.expiraEm }));
      }
      navegar(`/b/${slug}/reserva/${r.id}?c=${r.codigo}`, { state: { reserva: r } });
    } catch (e) {
      if (e.status === 409 || e.status === 404) {
        // horário ocupado ou serviço que saiu do ar: volta para escolher de novo
        toast(e.message, 'erro');
        setHorario(null);
        setEtapa('escolher');
        if (e.status === 404) recarregar();
        setAtualizar((n) => n + 1);
      } else {
        setErroEnvio(e.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (erroLoja) return <LojaIndisponivel erro={erroLoja} aoTentar={recarregar} />;
  if (!loja) return (<><CabecalhoLoja loja={null} /><Carregando texto="Abrindo a agenda…" /></>);

  const pagaNoLocal = loja.regras.cobranca === 'local';
  const quantos = escolha?.lista.length || 0;
  const textoQuantos = quantos === 1 ? '1 serviço' : `${quantos} serviços`;

  return (
    <div style={estiloDaLoja(loja)}>
      <CabecalhoLoja loja={loja} />
      <main className="pagina pilha">
        {pendente && (
          <Aviso tipo="atencao">
            Você tem uma reserva aguardando o Pix.{' '}
            <Link to={`/b/${slug}/reserva/${pendente.id}?c=${pendente.c}`}><b>Ver o Pix</b></Link>
          </Aviso>
        )}

        {etapa === 'escolher' && (
          <>
            <section className="pilha-p" aria-labelledby="t-servico">
              <h2 id="t-servico">Quais serviços?</h2>
              {loja.servicos.length > 1 && (
                <p className="suave pequeno" style={{ margin: 0 }}>Pode escolher mais de um. Toque de novo para tirar.</p>
              )}
              {loja.servicos.length === 0 && <p className="suave">Esta barbearia ainda não cadastrou serviços.</p>}
              {loja.servicos.map((s) => {
                const marcado = escolhidos.includes(s._id);
                return (
                  <button key={s._id} className="servico" aria-pressed={marcado} onClick={() => alternarServico(s)}>
                    <span className="caixa" aria-hidden="true">{marcado ? '✓' : ''}</span>
                    <div>
                      <b>{s.nome}</b>
                      <div className="suave pequeno">{s.duracaoMinutos} min{s.descricao ? ` · ${s.descricao}` : ''}</div>
                    </div>
                    <div className="preco">
                      {moeda(s.preco)}
                      {s.valorPix > 0 && s.valorPix < s.preco && <div className="suave pequeno">Sinal {moeda(s.valorPix)}</div>}
                    </div>
                  </button>
                );
              })}
              {quantos > 1 && (
                <div className="total-servicos">
                  <span>{textoQuantos} · {escolha.duracaoMinutos} min</span>
                  <b>Total {moeda(precoTotal)}</b>
                </div>
              )}
            </section>

            {escolha && (
              <section className="pilha-p" aria-labelledby="t-dia">
                <h2 id="t-dia">Qual dia?</h2>
                <div className="dias" role="list">
                  {dias.map((d) => (
                    <button key={d.iso} role="listitem" className="dia" disabled={!d.aberto} aria-pressed={dia === d.iso}
                      onClick={() => { setDia(d.iso); setHorario(null); }}
                      aria-label={dataLonga(`${d.iso}T12:00:00-03:00`)}>
                      <span>{d.iso === isoDia() ? 'hoje' : diaSemanaCurto(`${d.iso}T12:00:00-03:00`)}</span>
                      <b>{diaDoMes(`${d.iso}T12:00:00-03:00`)}</b>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {escolha && dia && (
              <section aria-labelledby="t-hora">
                <h2 id="t-hora">Qual horário?</h2>
                {quantos > 1 && <p className="suave pequeno" style={{ margin: '4px 0 0' }}>Horários com tempo para os {quantos} serviços ({escolha.duracaoMinutos} min).</p>}
                {erroHorarios && <Aviso tipo="erro">{erroHorarios} <button className="btn btn-texto" onClick={() => setAtualizar((n) => n + 1)}>Tentar de novo</button></Aviso>}
                {!horarios && !erroHorarios && <Carregando texto="Buscando horários livres…" />}
                {horarios && horarios.length === 0 && (
                  <p className="vazio">Nenhum horário livre neste dia{quantos > 1 ? ' com tempo para todos os serviços' : ''}. Escolha outro dia acima.</p>
                )}
                {grupos.map(([periodo, lista]) => (
                  <div key={periodo}>
                    <div className="periodo">{periodo}</div>
                    <div className="horarios">
                      {lista.map((h) => (
                        <button key={h.inicio} className="horario" aria-pressed={horario?.inicio === h.inicio} onClick={() => setHorario(h)}>
                          {h.hora}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {etapa === 'dados' && escolha && (
          <section className="secao pilha">
            <div>
              <h2>Seus dados</h2>
              <p className="suave pequeno" style={{ margin: '4px 0 0' }}>A confirmação chega no seu WhatsApp.</p>
            </div>
            <Campo rotulo="Seu nome" erro={errosCampos.nome}>
              <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" aria-invalid={Boolean(errosCampos.nome)} />
            </Campo>
            <Campo rotulo="WhatsApp" erro={errosCampos.whatsapp}>
              <input className="entrada" value={whatsapp} onChange={(e) => setWhatsapp(mascaraTelefone(e.target.value))}
                inputMode="tel" autoComplete="tel" placeholder="(21) 99999-8888" aria-invalid={Boolean(errosCampos.whatsapp)} />
            </Campo>
            <div className="aviso aviso-info pilha-p resumo-reserva">
              {escolha.lista.map((s) => (
                <div key={s._id} className="linha-entre"><span>{s.nome}</span><span>{moeda(s.preco)}</span></div>
              ))}
              {quantos > 1 && <div className="linha-entre total"><b>Total</b><b>{moeda(precoTotal)}</b></div>}
              <div>{dataLonga(horario.inicio)} às {hora(horario.inicio)} ({escolha.duracaoMinutos} min)</div>
              {!pagaNoLocal && valorPix > 0 && (
                <div>
                  Para garantir o horário, pague {valorPix < precoTotal ? `o sinal de ${moeda(valorPix)}` : moeda(valorPix)} no Pix
                  em até {loja.regras.minutosParaPagar} minutos.
                  {valorPix < precoTotal && ` O restante (${moeda((Math.round(precoTotal * 100) - Math.round(valorPix * 100)) / 100)}) é pago na barbearia.`}
                </div>
              )}
              {(pagaNoLocal || valorPix <= 0) && <div>O pagamento é feito na barbearia.</div>}
            </div>
            {erroEnvio && <Aviso tipo="erro">{erroEnvio}</Aviso>}
          </section>
        )}

        <LinkRelatar slug={slug} />
      </main>

      <div className="barra-fixa">
        <div className="conteudo">
          {etapa === 'escolher' ? (
            <>
              <div className="resumo">
                {escolha ? <b>{moeda(precoTotal)} · {textoQuantos}</b> : <b>Escolha um ou mais serviços</b>}
                <span className="suave">
                  {escolha
                    ? `${escolha.duracaoMinutos} min · ${horario ? `${diaSemanaCurto(horario.inicio)}, ${hora(horario.inicio)}` : 'Escolha dia e horário'}`
                    : ''}
                </span>
              </div>
              <button className="btn btn-primario" disabled={!horario} onClick={() => { setEtapa('dados'); window.scrollTo(0, 0); }}>
                Continuar
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-contorno" onClick={() => setEtapa('escolher')} disabled={enviando}>Voltar</button>
              <Botao className="btn-primario" style={{ flex: 1 }} carregando={enviando} onClick={reservar}>
                {pagaNoLocal || valorPix <= 0 ? 'Confirmar horário' : 'Reservar e pagar no Pix'}
              </Botao>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
