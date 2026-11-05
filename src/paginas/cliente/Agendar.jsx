// Página pública: o cliente escolhe serviço, dia e horário e reserva
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useLoja, estiloDaLoja, CabecalhoLoja, LojaIndisponivel } from '../../componentes/Loja';
import { Aviso, Botao, Campo, Carregando, useToast } from '../../componentes/ui';
import { LinkRelatar } from '../../componentes/Relatar';
import {
  diaDaSemana, diaDoMes, diaSemanaCurto, dataLonga, isoDia, moeda, somarDias, mascaraTelefone, telefoneValido, hora,
} from '../../utils';

function lerJSON(chave) {
  try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; }
}

export default function Agendar() {
  const { slug } = useParams();
  const navegar = useNavigate();
  const toast = useToast();
  const { loja, erro: erroLoja, recarregar } = useLoja(slug);

  const [servico, setServico] = useState(null);
  const [dia, setDia] = useState(null);
  const [horarios, setHorarios] = useState(null);
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

  // Ao escolher o serviço, já seleciona o primeiro dia aberto
  function escolherServico(s) {
    setServico(s);
    setHorario(null);
    if (!dia) setDia(dias.find((d) => d.aberto)?.iso || null);
  }

  useEffect(() => {
    if (!servico || !dia) return;
    let ativo = true;
    setHorarios(null);
    setErroHorarios(null);
    api(`/publico/${slug}/disponibilidade?servicoId=${servico._id}&data=${dia}`, { autenticado: false })
      .then((d) => ativo && setHorarios(d.horarios))
      .catch((e) => ativo && setErroHorarios(e.message));
    return () => { ativo = false; };
  }, [slug, servico, dia, atualizar]);

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
        corpo: { servicoId: servico._id, inicio: horario.inicio, nome: nome.trim(), whatsapp: whatsapp.replace(/\D/g, '') },
      });
      localStorage.setItem('cliente', JSON.stringify({ nome: nome.trim(), whatsapp }));
      if (r.status === 'pendente') {
        localStorage.setItem(`reserva:${slug}`, JSON.stringify({ id: r.id, c: r.codigo, expiraEm: r.expiraEm }));
      }
      navegar(`/b/${slug}/reserva/${r.id}?c=${r.codigo}`, { state: { reserva: r } });
    } catch (e) {
      if (e.status === 409) {
        toast(e.message, 'erro');
        setHorario(null);
        setEtapa('escolher');
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
  const valorPix = servico?.valorPix ?? 0;

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
              <h2 id="t-servico">Qual serviço?</h2>
              {loja.servicos.length === 0 && <p className="suave">Esta barbearia ainda não cadastrou serviços.</p>}
              {loja.servicos.map((s) => (
                <button key={s._id} className="servico" aria-pressed={servico?._id === s._id} onClick={() => escolherServico(s)}>
                  <div>
                    <b>{s.nome}</b>
                    <div className="suave pequeno">{s.duracaoMinutos} min{s.descricao ? ` · ${s.descricao}` : ''}</div>
                  </div>
                  <div className="preco">
                    {moeda(s.preco)}
                    {s.valorPix > 0 && s.valorPix < s.preco && <div className="suave pequeno">Sinal {moeda(s.valorPix)}</div>}
                  </div>
                </button>
              ))}
            </section>

            {servico && (
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

            {servico && dia && (
              <section aria-labelledby="t-hora">
                <h2 id="t-hora">Qual horário?</h2>
                {erroHorarios && <Aviso tipo="erro">{erroHorarios} <button className="btn btn-texto" onClick={() => setAtualizar((n) => n + 1)}>Tentar de novo</button></Aviso>}
                {!horarios && !erroHorarios && <Carregando texto="Buscando horários livres…" />}
                {horarios && horarios.length === 0 && (
                  <p className="vazio">Nenhum horário livre neste dia. Escolha outro dia acima.</p>
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

        {etapa === 'dados' && (
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
            <div className="aviso aviso-info pilha-p">
              <div><b>{servico.nome}</b> · {moeda(servico.preco)}</div>
              <div>{dataLonga(horario.inicio)} às {hora(horario.inicio)}</div>
              {!pagaNoLocal && valorPix > 0 && (
                <div>
                  Para garantir o horário, pague {valorPix < servico.preco ? `o sinal de ${moeda(valorPix)}` : moeda(valorPix)} no Pix
                  em até {loja.regras.minutosParaPagar} minutos.
                </div>
              )}
              {pagaNoLocal && <div>O pagamento é feito na barbearia.</div>}
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
                {servico ? <b>{servico.nome}</b> : <b>Escolha um serviço</b>}
                <span className="suave">{horario ? `${diaSemanaCurto(horario.inicio)}, ${hora(horario.inicio)}` : servico ? 'Escolha dia e horário' : ''}</span>
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
