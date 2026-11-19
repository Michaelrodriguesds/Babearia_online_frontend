// Dados públicos da barbearia + cabeçalho com a cor dela
import { useEffect, useState } from 'react';
import { api, acordarServidor, ErroApi } from '../api';
import { corTextoSobre } from '../utils';
import { aplicarTema, textosDo } from '../tipos';

export function useLoja(slug) {
  const [loja, setLoja] = useState(null);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    acordarServidor();
    setErro(null);
    api(`/publico/${encodeURIComponent(slug)}`, { autenticado: false })
      .then((d) => {
        if (!ativo) return;
        // Só mostra a agenda se os dados vieram completos
        if (!d || !d.regras || !Array.isArray(d.servicos) || !Array.isArray(d.horarios)) {
          setErro(new ErroApi(0, 'Não foi possível abrir a agenda. Tente de novo.'));
          return;
        }
        setLoja({ ...d, folgas: Array.isArray(d.folgas) ? d.folgas : [] });
      })
      .catch((e) => ativo && setErro(e));
    return () => { ativo = false; };
  }, [slug, tentativa]);

  // Tema do tipo de negócio (barbearia, salão…) enquanto a página estiver aberta
  const tipo = loja?.tipo;
  useEffect(() => {
    if (!tipo) return undefined;
    aplicarTema(tipo);
    return () => aplicarTema(null);
  }, [tipo]);

  return { loja, erro, recarregar: () => setTentativa((n) => n + 1) };
}

export function estiloDaLoja(loja) {
  const cor = loja?.corPrimaria && loja.corPrimaria.toLowerCase() !== '#111827' ? loja.corPrimaria : textosDo(loja?.tipo).corPadrao;
  return { '--marca': cor, '--marca-texto': corTextoSobre(cor) };
}

export function CabecalhoLoja({ loja }) {
  const iniciais = (loja?.nome || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="cabecalho-loja">
      <div className="polo" />
      <div className="conteudo">
        {loja?.logoUrl ? <img className="logo-loja" src={loja.logoUrl} alt="" /> : <div className="logo-loja" aria-hidden="true">{iniciais}</div>}
        <div style={{ minWidth: 0 }}>
          <h1 className="letreiro" style={{ fontSize: '1.35rem' }}>{loja?.nome || ''}</h1>
          {loja?.endereco && <p className="suave pequeno" style={{ margin: 0 }}>{loja.endereco}</p>}
        </div>
      </div>
    </header>
  );
}

// Tela para quando a barbearia não existe ou está com a agenda fechada
export function LojaIndisponivel({ erro, aoTentar }) {
  const titulo = erro.status === 404 ? 'Agenda não encontrada' : erro.status === 403 ? 'Agenda fechada no momento' : 'Não foi possível abrir a agenda';
  const texto = erro.status === 404
    ? 'Confira se o link está completo, do jeito que você recebeu.'
    : erro.status === 403
      ? 'Os agendamentos online estão pausados. Fale direto com o estabelecimento para marcar seu horário.'
      : erro.message;
  return (
    <div className="tela-entrada">
      <div className="polo" />
      <main className="miolo pilha centro">
        <h1 className="letreiro">{titulo}</h1>
        <p className="suave">{texto}</p>
        {erro.status !== 404 && erro.status !== 403 && <button className="btn btn-escuro" onClick={aoTentar}>Tentar de novo</button>}
      </main>
    </div>
  );
}
