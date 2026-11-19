import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, sessao } from '../../api';
import { Aviso, Botao, Campo } from '../../componentes/ui';
import { linkWhatsapp } from '../../utils';

const SUPORTE = import.meta.env.VITE_SUPORTE_WHATSAPP;

export default function Login() {
  const navegar = useNavigate();
  const [busca] = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await api('/auth/login', { metodo: 'POST', autenticado: false, corpo: { email, senha } });
      sessao.salvar(r);
      if (r.papel === 'admin') navegar('/admin', { replace: true });
      else navegar(r.licenca && !r.licenca.ativa ? '/painel/plano' : '/painel', { replace: true });
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
        <form className="pilha" onSubmit={entrar} noValidate>
          <h1 className="letreiro">Entrar</h1>
          {busca.get('expirou') && <Aviso tipo="atencao">Sua sessão expirou. Entre de novo.</Aviso>}
          <Campo rotulo="E-mail">
            <input className="entrada" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>
          <Campo rotulo="Senha">
            <input className="entrada" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Campo>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Botao type="submit" className="btn-escuro btn-largo" carregando={enviando}>Entrar</Botao>
          {SUPORTE ? (
            <div className="centro pilha-p">
              <span className="suave pequeno">Esqueceu a senha?</span>
              <a className="btn btn-zap" target="_blank" rel="noreferrer"
                href={linkWhatsapp(SUPORTE, `Olá! Esqueci a senha do meu painel. Meu e-mail de acesso é: ${email || '(escreva aqui)'}`)}>
                Pedir nova senha no WhatsApp
              </a>
            </div>
          ) : (
            <p className="suave pequeno centro">Esqueceu a senha? Fale com o suporte para receber uma nova.</p>
          )}
          <Link className="btn btn-texto" to="/cadastro">Criar conta grátis</Link>
        </form>
      </main>
    </div>
  );
}
