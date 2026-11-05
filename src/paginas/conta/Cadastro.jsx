import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, sessao } from '../../api';
import { Aviso, Botao, Campo } from '../../componentes/ui';
import { mascaraTelefone, telefoneValido } from '../../utils';

export default function Cadastro() {
  const navegar = useNavigate();
  const [d, setD] = useState({ nomeBarbearia: '', nome: '', email: '', whatsapp: '', senha: '' });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const mudar = (campo) => (e) => setD({ ...d, [campo]: campo === 'whatsapp' ? mascaraTelefone(e.target.value) : e.target.value });

  async function cadastrar(e) {
    e.preventDefault();
    const er = {};
    if (d.nomeBarbearia.trim().length < 2) er.nomeBarbearia = 'Digite o nome da barbearia.';
    if (d.nome.trim().length < 2) er.nome = 'Digite seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(d.email)) er.email = 'Digite um e-mail válido.';
    if (!telefoneValido(d.whatsapp)) er.whatsapp = 'Digite o WhatsApp com DDD.';
    if (d.senha.length < 8) er.senha = 'Use pelo menos 8 caracteres.';
    setErros(er);
    if (Object.keys(er).length) return;

    setEnviando(true);
    setErro(null);
    try {
      const r = await api('/auth/cadastro', { metodo: 'POST', autenticado: false, corpo: { ...d, whatsapp: d.whatsapp.replace(/\D/g, '') } });
      sessao.salvar({ token: r.token, papel: 'dono', nome: d.nome });
      navegar('/painel/ajustes?boasvindas=1', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-entrada">
      <div className="polo" />
      <main className="miolo">
        <form className="pilha" onSubmit={cadastrar} noValidate>
          <div>
            <h1 className="letreiro">Criar conta</h1>
            <p className="suave" style={{ margin: '6px 0 0' }}>30 dias grátis. Sem cartão.</p>
          </div>
          <Campo rotulo="Nome da barbearia" erro={erros.nomeBarbearia}>
            <input className="entrada" value={d.nomeBarbearia} onChange={mudar('nomeBarbearia')} aria-invalid={Boolean(erros.nomeBarbearia)} />
          </Campo>
          <Campo rotulo="Seu nome" erro={erros.nome}>
            <input className="entrada" value={d.nome} onChange={mudar('nome')} autoComplete="name" aria-invalid={Boolean(erros.nome)} />
          </Campo>
          <Campo rotulo="Seu WhatsApp" ajuda="É por ele que seus clientes falam com você." erro={erros.whatsapp}>
            <input className="entrada" value={d.whatsapp} onChange={mudar('whatsapp')} inputMode="tel" autoComplete="tel" placeholder="(21) 99999-8888" aria-invalid={Boolean(erros.whatsapp)} />
          </Campo>
          <Campo rotulo="E-mail" erro={erros.email}>
            <input className="entrada" type="email" value={d.email} onChange={mudar('email')} autoComplete="email" aria-invalid={Boolean(erros.email)} />
          </Campo>
          <Campo rotulo="Senha" erro={erros.senha}>
            <input className="entrada" type="password" value={d.senha} onChange={mudar('senha')} autoComplete="new-password" aria-invalid={Boolean(erros.senha)} />
          </Campo>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Botao type="submit" className="btn-primario btn-largo" carregando={enviando}>Começar teste grátis</Botao>
          <Link className="btn btn-texto" to="/login">Já tenho conta</Link>
        </form>
      </main>
    </div>
  );
}
