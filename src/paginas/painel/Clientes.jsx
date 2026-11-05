// Clientes que já agendaram (criados automaticamente)
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Aviso, Carregando } from '../../componentes/ui';
import { linkWhatsapp, mascaraTelefone } from '../../utils';

export default function Clientes() {
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0, paginas: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // espera a pessoa parar de digitar antes de buscar
  useEffect(() => {
    setCarregando(true);
    const t = setTimeout(() => {
      api(`/painel/clientes?pagina=${pagina}&busca=${encodeURIComponent(busca)}`)
        .then((d) => setDados((ant) => ({ ...d, itens: pagina === 1 ? d.itens : [...ant.itens, ...d.itens] })))
        .catch((e) => setErro(e.message))
        .finally(() => setCarregando(false));
    }, 300);
    return () => clearTimeout(t);
  }, [busca, pagina]);

  return (
    <div className="pilha">
      <h1 className="letreiro" style={{ fontSize: '1.4rem' }}>Clientes</h1>
      <input className="entrada" type="search" placeholder="Buscar por nome ou telefone" value={busca}
        onChange={(e) => { setBusca(e.target.value); setPagina(1); }} aria-label="Buscar cliente" />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!carregando && dados.itens.length === 0 && (
        <p className="vazio">{busca ? 'Ninguém encontrado com essa busca.' : 'Os clientes aparecem aqui depois do primeiro agendamento.'}</p>
      )}
      {dados.itens.length > 0 && (
        <section className="secao">
          {dados.itens.map((c) => (
            <div key={c._id} className="lista-item">
              <div className="info">
                <b>{c.nome}</b>
                <span className="suave pequeno">{mascaraTelefone(c.whatsapp)} · {c.totalAgendamentos} {c.totalAgendamentos === 1 ? 'agendamento' : 'agendamentos'}</span>
              </div>
              <a className="btn btn-zap btn-pequeno" href={linkWhatsapp(c.whatsapp, `Olá, ${c.nome}!`)} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          ))}
        </section>
      )}
      {carregando && <Carregando />}
      {!carregando && pagina < dados.paginas && (
        <button className="btn btn-contorno btn-largo" onClick={() => setPagina(pagina + 1)}>Carregar mais</button>
      )}
    </div>
  );
}
