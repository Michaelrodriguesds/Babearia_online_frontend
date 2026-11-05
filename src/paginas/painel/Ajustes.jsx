// Ajustes da barbearia: dados, horários, folgas, regras, Pix e conta
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, sessao } from '../../api';
import { usePainel } from './LayoutPainel';
import CartaoApp from '../../componentes/CartaoApp';
import Ajuda from './Ajuda';
import { Aviso, Botao, Campo, useToast } from '../../componentes/ui';
import { dataLonga, HORAS_15, mascaraTelefone, NOMES_DIAS, telefoneValido } from '../../utils';

// Salva uma seção e mostra o resultado
function useSalvar() {
  const toast = useToast();
  const { recarregar } = usePainel();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  async function salvar(caminho, corpo, mensagem = 'Alterações salvas.') {
    setEnviando(true);
    setErro(null);
    try {
      await api(caminho, { metodo: caminho.includes('senha') ? 'POST' : 'PUT', corpo });
      toast(mensagem);
      await recarregar();
      return true;
    } catch (e) {
      const detalhe = e.dados?.detalhes?.[0]?.mensagem;
      setErro(detalhe ? `${e.message} ${detalhe}` : e.message);
      return false;
    } finally {
      setEnviando(false);
    }
  }
  return { salvar, enviando, erro, setErro };
}

export default function Ajustes() {
  const [busca] = useSearchParams();
  const navegar = useNavigate();
  return (
    <div className="pilha">
      <h1 className="letreiro" style={{ fontSize: '1.4rem' }}>Ajustes</h1>
      {busca.get('boasvindas') && (
        <Aviso tipo="ok">
          <b>Conta criada!</b> Para começar a receber agendamentos: cadastre sua chave Pix aqui embaixo, confira seus horários e depois crie seus serviços na aba Serviços.
        </Aviso>
      )}
      <Pix />
      <Horarios />
      <Regras />
      <Folgas />
      <Perfil />
      <CartaoApp />
      <Ajuda />
      <Senha />
      <button className="btn btn-contorno btn-largo" onClick={() => navegar('/painel/plano')}>Meu plano</button>
      <button className="btn btn-texto" onClick={() => { sessao.sair(); navegar('/login', { replace: true }); }}>Sair da conta</button>
    </div>
  );
}

function Pix() {
  const { barbearia } = usePainel();
  const p = barbearia.pagamento || {};
  const [modo, setModo] = useState(p.modo || 'manual');
  const [chavePix, setChave] = useState(p.chavePix || '');
  const [nomeRecebedor, setNome] = useState(p.nomeRecebedor || '');
  const [cidade, setCidade] = useState(p.cidade || '');
  const [token, setToken] = useState('');
  const { salvar, enviando, erro, setErro } = useSalvar();

  function enviar() {
    if (modo === 'manual' && !chavePix.trim()) return setErro('Digite sua chave Pix.');
    if (modo === 'manual' && !nomeRecebedor.trim()) return setErro('Digite o nome que aparece na sua conta do banco.');
    const corpo = { modo, chavePix: chavePix.trim(), nomeRecebedor: nomeRecebedor.trim(), cidade: cidade.trim() };
    if (modo === 'mercadopago' && token.trim()) corpo.mercadoPagoAccessToken = token.trim();
    salvar('/painel/pagamento', corpo, 'Forma de receber salva.').then((ok) => ok && setToken(''));
  }

  return (
    <section className="secao pilha">
      <h2>Como você recebe o Pix</h2>
      <div className="opcoes" role="group" aria-label="Forma de receber">
        <button className="opcao" aria-pressed={modo === 'manual'} onClick={() => setModo('manual')}>Minha chave Pix</button>
        <button className="opcao" aria-pressed={modo === 'mercadopago'} onClick={() => setModo('mercadopago')}>Mercado Pago</button>
      </div>
      {modo === 'manual' ? (
        <>
          <p className="suave pequeno" style={{ margin: 0 }}>O cliente recebe um Pix copia e cola já com o valor. Você confere na sua conta e toca em Confirmar Pix na agenda.</p>
          <Campo rotulo="Chave Pix" ajuda="CPF, CNPJ, e-mail, telefone com +55 ou chave aleatória.">
            <input className="entrada" value={chavePix} onChange={(e) => setChave(e.target.value)} maxLength={77} />
          </Campo>
          <div className="grade-2">
            <Campo rotulo="Nome na conta"><input className="entrada" value={nomeRecebedor} onChange={(e) => setNome(e.target.value)} maxLength={25} /></Campo>
            <Campo rotulo="Cidade"><input className="entrada" value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={15} /></Campo>
          </div>
        </>
      ) : (
        <>
          <p className="suave pequeno" style={{ margin: 0 }}>O Pix é confirmado sozinho e o dinheiro cai na sua conta do Mercado Pago. O Mercado Pago cobra uma taxa por Pix recebido.</p>
          <Campo rotulo="Access Token de produção" ajuda={p.modo === 'mercadopago' ? 'Já configurado. Preencha só se quiser trocar.' : 'Mercado Pago > Seu negócio > Configurações > Credenciais (começa com APP_USR-).'}>
            <input className="entrada" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="APP_USR-..." />
          </Campo>
        </>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Botao className="btn-escuro" carregando={enviando} onClick={enviar}>Salvar forma de receber</Botao>
    </section>
  );
}

function Horarios() {
  const { barbearia } = usePainel();
  const [dias, setDias] = useState(() =>
    NOMES_DIAS.map((_, dia) => {
      const h = barbearia.horarios.find((x) => x.dia === dia);
      return {
        dia, ativo: Boolean(h), abre: h?.abre || '09:00', fecha: h?.fecha || '19:00',
        pausa: Boolean(h?.pausaInicio), pausaInicio: h?.pausaInicio || '12:00', pausaFim: h?.pausaFim || '13:00',
      };
    })
  );
  const { salvar, enviando, erro, setErro } = useSalvar();
  const mudar = (dia, campo, valor) => setDias(dias.map((d) => (d.dia === dia ? { ...d, [campo]: valor } : d)));

  function enviar() {
    for (const d of dias.filter((x) => x.ativo)) {
      if (d.fecha <= d.abre) return setErro(`${NOMES_DIAS[d.dia]}: o horário de fechar precisa ser depois do de abrir.`);
      if (d.pausa && (d.pausaFim <= d.pausaInicio || d.pausaInicio < d.abre || d.pausaFim > d.fecha)) {
        return setErro(`${NOMES_DIAS[d.dia]}: a pausa precisa ficar dentro do horário de atendimento.`);
      }
    }
    const horarios = dias.filter((d) => d.ativo).map((d) => ({
      dia: d.dia, abre: d.abre, fecha: d.fecha, ...(d.pausa ? { pausaInicio: d.pausaInicio, pausaFim: d.pausaFim } : {}),
    }));
    salvar('/painel/barbearia', { horarios }, 'Horários salvos.');
  }

  const seletor = (valor, aoMudar, rotulo) => (
    <select className="entrada" value={valor} onChange={(e) => aoMudar(e.target.value)} aria-label={rotulo}>
      {HORAS_15.map((h) => <option key={h}>{h}</option>)}
    </select>
  );

  return (
    <section className="secao">
      <h2>Dias e horários de atendimento</h2>
      {dias.map((d) => (
        <div key={d.dia} className="dia-semana pilha-p">
          <label className="alternador">
            <b>{NOMES_DIAS[d.dia]}</b>
            <span className="linha pequeno suave">{d.ativo ? 'Aberto' : 'Fechado'}<input type="checkbox" checked={d.ativo} onChange={(e) => mudar(d.dia, 'ativo', e.target.checked)} /></span>
          </label>
          {d.ativo && (
            <>
              <div className="grade-2">
                {seletor(d.abre, (v) => mudar(d.dia, 'abre', v), `${NOMES_DIAS[d.dia]} abre às`)}
                {seletor(d.fecha, (v) => mudar(d.dia, 'fecha', v), `${NOMES_DIAS[d.dia]} fecha às`)}
              </div>
              <label className="alternador pequeno">
                Pausa (almoço)
                <input type="checkbox" checked={d.pausa} onChange={(e) => mudar(d.dia, 'pausa', e.target.checked)} />
              </label>
              {d.pausa && (
                <div className="grade-2">
                  {seletor(d.pausaInicio, (v) => mudar(d.dia, 'pausaInicio', v), 'Pausa começa')}
                  {seletor(d.pausaFim, (v) => mudar(d.dia, 'pausaFim', v), 'Pausa termina')}
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Botao className="btn-escuro" style={{ marginTop: 12 }} carregando={enviando} onClick={enviar}>Salvar horários</Botao>
    </section>
  );
}

function Regras() {
  const { barbearia } = usePainel();
  const [r, setR] = useState({ ...barbearia.regras });
  const { salvar, enviando, erro } = useSalvar();
  const mudar = (campo, valor) => setR({ ...r, [campo]: valor });
  const numero = (campo, min, max) => (e) => mudar(campo, Math.min(max, Math.max(min, Number(e.target.value) || 0)));

  function enviar() {
    const { cobranca, sinalTipo, sinalValor, minutosParaPagar, antecedenciaMinMinutos, antecedenciaMaxDias, cancelamentoAteHoras, lembrete24h, lembrete2h } = r;
    salvar('/painel/barbearia', {
      regras: { cobranca, sinalTipo, sinalValor: Number(sinalValor), minutosParaPagar: Number(minutosParaPagar), antecedenciaMinMinutos: Number(antecedenciaMinMinutos), antecedenciaMaxDias: Number(antecedenciaMaxDias), cancelamentoAteHoras: Number(cancelamentoAteHoras), lembrete24h, lembrete2h },
    }, 'Regras salvas.');
  }

  return (
    <section className="secao pilha">
      <h2>Regras de agendamento</h2>
      <div>
        <div className="pequeno" style={{ fontWeight: 600, marginBottom: 6 }}>Cobrança no Pix</div>
        <div className="opcoes" role="group" aria-label="Cobrança">
          <button className="opcao" aria-pressed={r.cobranca === 'integral'} onClick={() => mudar('cobranca', 'integral')}>Valor total</button>
          <button className="opcao" aria-pressed={r.cobranca === 'sinal'} onClick={() => mudar('cobranca', 'sinal')}>Só um sinal</button>
          <button className="opcao" aria-pressed={r.cobranca === 'local'} onClick={() => mudar('cobranca', 'local')}>Sem Pix (paga no local)</button>
        </div>
      </div>
      {r.cobranca === 'sinal' && (
        <div className="grade-2">
          <Campo rotulo="Tipo de sinal">
            <select className="entrada" value={r.sinalTipo} onChange={(e) => mudar('sinalTipo', e.target.value)}>
              <option value="percentual">% do serviço</option>
              <option value="fixo">Valor fixo (R$)</option>
            </select>
          </Campo>
          <Campo rotulo={r.sinalTipo === 'percentual' ? 'Porcentagem' : 'Valor (R$)'}>
            <input className="entrada" type="number" inputMode="decimal" value={r.sinalValor} onChange={numero('sinalValor', 0, r.sinalTipo === 'percentual' ? 100 : 10000)} />
          </Campo>
        </div>
      )}
      {r.cobranca !== 'local' && (
        <Campo rotulo="Tempo para pagar o Pix" ajuda="Se não pagar nesse tempo, o horário é liberado para outra pessoa.">
          <select className="entrada" value={r.minutosParaPagar} onChange={(e) => mudar('minutosParaPagar', Number(e.target.value))}>
            {[10, 15, 20, 30, 60, 120].map((m) => <option key={m} value={m}>{m} minutos</option>)}
          </select>
        </Campo>
      )}
      <div className="grade-2">
        <Campo rotulo="Antecedência mínima">
          <select className="entrada" value={r.antecedenciaMinMinutos} onChange={(e) => mudar('antecedenciaMinMinutos', Number(e.target.value))}>
            {[0, 30, 60, 120, 180, 360, 720, 1440].map((m) => <option key={m} value={m}>{m === 0 ? 'Nenhuma' : m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Agenda aberta por">
          <select className="entrada" value={r.antecedenciaMaxDias} onChange={(e) => mudar('antecedenciaMaxDias', Number(e.target.value))}>
            {[7, 14, 21, 30, 45, 60].map((d) => <option key={d} value={d}>{d} dias</option>)}
          </select>
        </Campo>
      </div>
      <Campo rotulo="Cliente pode cancelar até">
        <select className="entrada" value={r.cancelamentoAteHoras} onChange={(e) => mudar('cancelamentoAteHoras', Number(e.target.value))}>
          {[0, 1, 2, 3, 6, 12, 24, 48].map((h) => <option key={h} value={h}>{h === 0 ? 'Qualquer momento' : `${h} h antes`}</option>)}
        </select>
      </Campo>
      <label className="alternador">Lembrete no WhatsApp 1 dia antes<input type="checkbox" checked={r.lembrete24h !== false} onChange={(e) => mudar('lembrete24h', e.target.checked)} /></label>
      <label className="alternador">Lembrete no WhatsApp 2 horas antes<input type="checkbox" checked={Boolean(r.lembrete2h)} onChange={(e) => mudar('lembrete2h', e.target.checked)} /></label>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Botao className="btn-escuro" carregando={enviando} onClick={enviar}>Salvar regras</Botao>
    </section>
  );
}

function Folgas() {
  const { barbearia } = usePainel();
  const [nova, setNova] = useState('');
  const { salvar, enviando, erro } = useSalvar();
  const folgas = [...(barbearia.folgas || [])].sort();

  return (
    <section className="secao pilha-p">
      <h2>Folgas e feriados</h2>
      <p className="suave pequeno" style={{ margin: 0 }}>Dias em que a agenda fica fechada.</p>
      <div className="linha">
        <input className="entrada" type="date" value={nova} onChange={(e) => setNova(e.target.value)} aria-label="Data da folga" />
        <Botao className="btn-escuro" carregando={enviando} disabled={!nova || folgas.includes(nova)}
          onClick={() => salvar('/painel/barbearia', { folgas: [...folgas, nova] }, 'Folga adicionada.').then((ok) => ok && setNova(''))}>
          Adicionar
        </Botao>
      </div>
      {folgas.map((f) => (
        <div key={f} className="lista-item">
          <div className="info">{dataLonga(`${f}T12:00:00-03:00`)}</div>
          <button className="btn btn-texto pequeno" onClick={() => salvar('/painel/barbearia', { folgas: folgas.filter((x) => x !== f) }, 'Folga removida.')}>Remover</button>
        </div>
      ))}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </section>
  );
}

function Perfil() {
  const { barbearia } = usePainel();
  const [d, setD] = useState({
    nome: barbearia.nome, whatsapp: mascaraTelefone(barbearia.whatsapp), endereco: barbearia.endereco || '',
    logoUrl: barbearia.logoUrl || '', corPrimaria: barbearia.corPrimaria && barbearia.corPrimaria !== '#111827' ? barbearia.corPrimaria : '#c4302b',
  });
  const { salvar, enviando, erro, setErro } = useSalvar();
  const [logoQuebrada, setLogoQuebrada] = useState(false);

  function enviar() {
    if (!telefoneValido(d.whatsapp)) return setErro('Digite o WhatsApp com DDD.');
    if (d.logoUrl && !/^https:\/\//.test(d.logoUrl)) return setErro('O link da logo precisa começar com https://');
    if (d.logoUrl && logoQuebrada) return setErro('O link da logo não abre como imagem. Corrija ou apague o campo.');
    salvar('/painel/barbearia', { ...d, whatsapp: d.whatsapp.replace(/\D/g, '') }, 'Dados salvos.');
  }

  return (
    <section className="secao pilha">
      <h2>Sua barbearia</h2>
      <Campo rotulo="Nome"><input className="entrada" value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} maxLength={80} /></Campo>
      <Campo rotulo="WhatsApp" ajuda="Os clientes falam com você por este número.">
        <input className="entrada" inputMode="tel" value={d.whatsapp} onChange={(e) => setD({ ...d, whatsapp: mascaraTelefone(e.target.value) })} />
      </Campo>
      <Campo rotulo="Endereço"><input className="entrada" value={d.endereco} onChange={(e) => setD({ ...d, endereco: e.target.value })} maxLength={200} placeholder="Rua, número, bairro" /></Campo>
      <Campo rotulo="Link da logo (opcional)" ajuda="Aparece no topo da sua página de agendamento. Sem logo, aparecem as iniciais da barbearia. Envie a imagem em postimages.org e cole o “Link direto” (termina em .png ou .jpg).">
        <input className="entrada" value={d.logoUrl} onChange={(e) => { setD({ ...d, logoUrl: e.target.value.trim() }); setLogoQuebrada(false); }} placeholder="https://i.postimg.cc/.../logo.png" />
      </Campo>
      {d.logoUrl && /^https:\/\//.test(d.logoUrl) && (
        <div className="linha">
          {logoQuebrada
            ? <Aviso tipo="erro">Esse link não abre como imagem. Use o “Link direto”, que termina em .png ou .jpg.</Aviso>
            : <><img src={d.logoUrl} alt="Prévia da logo" onError={() => setLogoQuebrada(true)} style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', background: 'var(--tinta)' }} /><span className="suave pequeno">Prévia da logo</span></>}
        </div>
      )}
      <label className="alternador">
        Cor da sua página
        <input type="color" value={d.corPrimaria} onChange={(e) => setD({ ...d, corPrimaria: e.target.value })} style={{ width: 52, height: 40, border: 'none', background: 'none' }} />
      </label>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Botao className="btn-escuro" carregando={enviando} onClick={enviar}>Salvar dados</Botao>
    </section>
  );
}

function Senha() {
  const [senhaAtual, setAtual] = useState('');
  const [novaSenha, setNova] = useState('');
  const { salvar, enviando, erro, setErro } = useSalvar();
  function enviar() {
    if (novaSenha.length < 8) return setErro('A nova senha precisa ter pelo menos 8 caracteres.');
    salvar('/auth/trocar-senha', { senhaAtual, novaSenha }, 'Senha alterada.').then((ok) => ok && (setAtual(''), setNova('')));
  }
  return (
    <section className="secao pilha">
      <h2>Trocar senha</h2>
      <Campo rotulo="Senha atual"><input className="entrada" type="password" autoComplete="current-password" value={senhaAtual} onChange={(e) => setAtual(e.target.value)} /></Campo>
      <Campo rotulo="Nova senha"><input className="entrada" type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNova(e.target.value)} /></Campo>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Botao className="btn-contorno" carregando={enviando} onClick={enviar}>Trocar senha</Botao>
    </section>
  );
}
