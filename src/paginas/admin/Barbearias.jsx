// Aba Barbearias do admin: situação do plano, renovar, bloquear, nova senha
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { Aviso, Carregando, useToast } from '../../componentes/ui';
import { dataCurta, linkWhatsapp, mascaraTelefone } from '../../utils';

const FILTROS = [
  ['', 'Todas'],
  ['vencido', 'Vencidas'],
  ['vencendo', 'Vencendo'],
  ['teste', 'Em teste'],
  ['ativo', 'Pagantes'],
];
const CHIP = { vencido: 'conflito', vencendo: 'pendente', teste: 'bloqueado', ativo: 'confirmado' };
const TEXTO = { vencido: 'Vencida', vencendo: 'Vencendo', teste: 'Em teste', ativo: 'Pagante' };

export default function Barbearias() {
  const toast = useToast();
  const [filtro, setFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);
  const [acao, setAcao] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([api(`/admin/barbearias${filtro ? `?situacao=${filtro}` : ''}`), api('/admin/resumo')]);
      setLista(l);
      setResumo(r);
      setErro(null);
    } catch (e) {
      setErro(e.message);
    }
  }, [filtro]);
  useEffect(() => { carregar(); }, [carregar]);

  async function executar(b, tipo) {
    let corpo;
    if (tipo === 'renovar') {
      const dias = window.prompt(`Quantos dias liberar para ${b.nome}?`, '30');
      if (!dias) return;
      const n = Number(dias);
      if (!Number.isInteger(n) || n < 1 || n > 366) { toast('Digite um número de dias entre 1 e 366.', 'erro'); return; }
      const observacao = window.prompt('Observação (opcional), ex.: Pix recebido em 24/10', '') || undefined;
      corpo = { dias: n, observacao };
    }
    if (tipo === 'bloquear' && !window.confirm(`Bloquear ${b.nome} agora? A agenda online e o painel param na hora.`)) return;
    if (tipo === 'resetar-senha') {
      const novaSenha = window.prompt(`Nova senha para ${b.dono?.email || b.nome} (mínimo 8 caracteres):`);
      if (!novaSenha) return;
      if (novaSenha.length < 8) { toast('A senha precisa ter pelo menos 8 caracteres.', 'erro'); return; }
      corpo = { novaSenha };
    }
    setAcao(b._id);
    try {
      await api(`/admin/barbearias/${b._id}/${tipo}`, { metodo: 'POST', corpo });
      toast(tipo === 'renovar' ? 'Plano renovado.' : tipo === 'bloquear' ? 'Barbearia bloqueada.' : 'Senha alterada. Mande para o barbeiro.');
      carregar();
    } catch (e) {
      toast(e.message, 'erro');
    } finally {
      setAcao(null);
    }
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = (lista || []).filter((b) => !termo || `${b.nome} ${b.dono?.email || ''} ${b.whatsapp}`.toLowerCase().includes(termo));

  return (
    <div className="pilha">
        {resumo && (
          <div className="numeros">
            <div className="numero"><b>{resumo.total - resumo.vencido}</b><span>com acesso</span></div>
            <div className="numero"><b>{resumo.teste}</b><span>em teste</span></div>
            <div className="numero"><b>{resumo.vencido}</b><span>vencidas</span></div>
          </div>
        )}
        <div className="opcoes" role="group" aria-label="Filtrar">
          {FILTROS.map(([v, t]) => <button key={v} className="opcao" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{t}</button>)}
        </div>
        <input className="entrada" type="search" placeholder="Buscar por nome, e-mail ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar barbearia" />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {!lista && !erro && <Carregando />}
        {lista && visiveis.length === 0 && <p className="vazio">Nenhuma barbearia aqui.</p>}
        {visiveis.map((b) => (
          <article key={b._id} className="secao pilha-p">
            <div className="linha-entre">
              <b>{b.nome}</b>
              <span className={`chip chip-${CHIP[b.licenca.situacao]}`}>{TEXTO[b.licenca.situacao]}</span>
            </div>
            <div className="suave pequeno">
              {b.dono?.nome} · {b.dono?.email}<br />
              {b.licenca.ativa ? `Acesso até ${dataCurta(b.licenca.acessoAte)} (${b.licenca.diasRestantes} dias)` : `Venceu em ${dataCurta(b.licenca.acessoAte)}`}
              {b.observacao ? <><br />Obs.: {b.observacao}</> : null}
            </div>
            <div className="acoes linha" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primario btn-pequeno" disabled={acao === b._id} onClick={() => executar(b, 'renovar')}>Renovar</button>
              <a className="btn btn-zap btn-pequeno" target="_blank" rel="noreferrer" href={linkWhatsapp(b.whatsapp, `Olá, ${b.dono?.nome || ''}! Aqui é do suporte da agenda da ${b.nome}.`)}>{mascaraTelefone(b.whatsapp)}</a>
              <button className="btn btn-contorno btn-pequeno" disabled={acao === b._id} onClick={() => executar(b, 'resetar-senha')}>Nova senha</button>
              {b.licenca.ativa && <button className="btn btn-perigo btn-pequeno" disabled={acao === b._id} onClick={() => executar(b, 'bloquear')}>Bloquear</button>}
            </div>
          </article>
        ))}
    </div>
  );
}
