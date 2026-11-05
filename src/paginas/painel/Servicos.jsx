// Serviços da barbearia (nome, preço, duração)
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { Aviso, Botao, Campo, Carregando, Modal, useToast } from '../../componentes/ui';
import { moeda } from '../../utils';

const DURACOES = [15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180];
const VAZIO = { nome: '', preco: '', duracaoMinutos: 30, descricao: '' };
const SUGESTOES = [
  { nome: 'Corte', preco: 40, duracaoMinutos: 30 },
  { nome: 'Barba', preco: 30, duracaoMinutos: 30 },
  { nome: 'Corte + Barba', preco: 60, duracaoMinutos: 60 },
];

export default function Servicos() {
  const toast = useToast();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState(null);
  const [editando, setEditando] = useState(null); // null fechado | {} novo | serviço

  const carregar = useCallback(() => api('/painel/servicos').then(setLista).catch((e) => setErro(e.message)), []);
  useEffect(() => { carregar(); }, [carregar]);

  async function alternarAtivo(s) {
    try {
      await api(`/painel/servicos/${s._id}`, { metodo: 'PUT', corpo: { ativo: !s.ativo } });
      toast(s.ativo ? 'Serviço escondido da agenda.' : 'Serviço voltou para a agenda.');
      carregar();
    } catch (e) {
      toast(e.message, 'erro');
    }
  }

  async function criarSugestoes() {
    try {
      for (const s of SUGESTOES) await api('/painel/servicos', { metodo: 'POST', corpo: s });
      toast('Serviços criados. Ajuste os preços se precisar.');
      carregar();
    } catch (e) {
      toast(e.message, 'erro');
    }
  }

  return (
    <div className="pilha">
      <div className="linha-entre">
        <h1 className="letreiro" style={{ fontSize: '1.4rem' }}>Serviços</h1>
        <button className="btn btn-escuro btn-pequeno" onClick={() => setEditando(VAZIO)}>Novo serviço</button>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!lista && !erro && <Carregando />}
      {lista && lista.length === 0 && (
        <section className="secao pilha-p centro">
          <p style={{ margin: 0 }}>Cadastre o que você oferece para os clientes poderem agendar.</p>
          <button className="btn btn-primario" onClick={criarSugestoes}>Começar com Corte, Barba e Corte + Barba</button>
        </section>
      )}
      {lista && lista.length > 0 && (
        <section className="secao">
          {lista.map((s) => (
            <div key={s._id} className="lista-item" style={{ opacity: s.ativo ? 1 : 0.55 }}>
              <div className="info">
                <b>{s.nome}</b>
                <span className="suave pequeno">{moeda(s.preco)} · {s.duracaoMinutos} min{s.ativo ? '' : ' · escondido'}</span>
              </div>
              <button className="btn btn-contorno btn-pequeno" onClick={() => setEditando(s)}>Editar</button>
              <button className="btn btn-texto pequeno" onClick={() => alternarAtivo(s)}>{s.ativo ? 'Esconder' : 'Mostrar'}</button>
            </div>
          ))}
        </section>
      )}
      <ModalServico servico={editando} aoFechar={() => setEditando(null)} aoSalvar={() => { setEditando(null); carregar(); }} />
    </div>
  );
}

function ModalServico({ servico, aoFechar, aoSalvar }) {
  const toast = useToast();
  const [d, setD] = useState(VAZIO);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (servico) setD({ ...VAZIO, ...servico, preco: servico.preco === '' ? '' : String(servico.preco).replace('.', ',') });
    setErro(null);
  }, [servico]);

  async function salvar() {
    const texto = String(d.preco).trim();
    // aceita "40", "39,90", "39.90" e "1.200,00"
    const preco = Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
    if (d.nome.trim().length < 2) return setErro('Digite o nome do serviço.');
    if (!Number.isFinite(preco) || preco < 0) return setErro('Digite um preço válido, ex.: 40 ou 39,90.');
    setEnviando(true);
    setErro(null);
    const corpo = { nome: d.nome.trim(), preco, duracaoMinutos: Number(d.duracaoMinutos), descricao: d.descricao || '' };
    try {
      if (servico._id) await api(`/painel/servicos/${servico._id}`, { metodo: 'PUT', corpo });
      else await api('/painel/servicos', { metodo: 'POST', corpo });
      toast('Serviço salvo.');
      aoSalvar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={servico?._id ? 'Editar serviço' : 'Novo serviço'} aberto={Boolean(servico)} aoFechar={aoFechar}>
      <Campo rotulo="Nome"><input className="entrada" value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} placeholder="Ex.: Corte degradê" maxLength={60} /></Campo>
      <div className="grade-2">
        <Campo rotulo="Preço (R$)"><input className="entrada" inputMode="decimal" value={d.preco} onChange={(e) => setD({ ...d, preco: e.target.value })} placeholder="40,00" /></Campo>
        <Campo rotulo="Duração">
          <select className="entrada" value={d.duracaoMinutos} onChange={(e) => setD({ ...d, duracaoMinutos: e.target.value })}>
            {DURACOES.map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </Campo>
      </div>
      <Campo rotulo="Descrição (opcional)"><input className="entrada" value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} maxLength={200} /></Campo>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Botao className="btn-escuro btn-largo" carregando={enviando} onClick={salvar}>Salvar serviço</Botao>
    </Modal>
  );
}
