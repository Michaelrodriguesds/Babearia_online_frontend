// Tela inicial para barbeiros (clientes chegam direto pelo link /b/nome-da-barbearia)
import { Link, Navigate } from 'react-router-dom';
import { sessao } from '../api';

const NOME_APP = import.meta.env.VITE_APP_NOME || 'Agenda Barbearia';

export default function Inicio() {
  if (sessao.token) return <Navigate to={sessao.papel === 'admin' ? '/admin' : '/painel'} replace />;
  return (
    <div className="tela-entrada">
      <div className="polo" />
      <main className="miolo pilha">
        <img src="/icons/icon-192.png" alt="" width="72" height="72" style={{ borderRadius: 18 }} />
        <h1 className="letreiro" style={{ fontSize: '2.1rem' }}>{NOME_APP}</h1>
        <p className="suave" style={{ fontSize: '1.1rem' }}>
          Seus clientes marcam o horário pelo celular, pagam o Pix e você só recebe o aviso. Horário marcado fica bloqueado na hora.
        </p>
        <ul className="pilha-p" style={{ paddingLeft: 20, margin: 0 }}>
          <li>Link próprio para mandar no WhatsApp e no Instagram</li>
          <li>Pix com o valor certo, sem conferir na mão</li>
          <li>30 dias grátis para testar</li>
        </ul>
        <Link to="/cadastro" className="btn btn-primario btn-largo">Criar conta grátis</Link>
        <Link to="/login" className="btn btn-contorno btn-largo">Já tenho conta</Link>
      </main>
    </div>
  );
}
