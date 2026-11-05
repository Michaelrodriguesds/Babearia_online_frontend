// Rotas do app
import { Navigate, Route, Routes } from 'react-router-dom';
import { sessao } from './api';
import Inicio from './paginas/Inicio';
import Agendar from './paginas/cliente/Agendar';
import Reserva from './paginas/cliente/Reserva';
import Cancelar from './paginas/cliente/Cancelar';
import Login from './paginas/conta/Login';
import Cadastro from './paginas/conta/Cadastro';
import LayoutPainel from './paginas/painel/LayoutPainel';
import Agenda from './paginas/painel/Agenda';
import Servicos from './paginas/painel/Servicos';
import Clientes from './paginas/painel/Clientes';
import Ajustes from './paginas/painel/Ajustes';
import Plano from './paginas/painel/Plano';
import Admin from './paginas/admin/Admin';

function SoLogado({ papel, children }) {
  if (!sessao.token) return <Navigate to="/login" replace />;
  if (papel && sessao.papel !== papel) return <Navigate to={sessao.papel === 'admin' ? '/admin' : '/painel'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />

      {/* Cliente da barbearia (sem login) */}
      <Route path="/b/:slug" element={<Agendar />} />
      <Route path="/b/:slug/reserva/:id" element={<Reserva />} />
      <Route path="/b/:slug/cancelar/:id" element={<Cancelar />} />

      {/* Barbeiro */}
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/painel/plano" element={<SoLogado papel="dono"><Plano /></SoLogado>} />
      <Route path="/painel" element={<SoLogado papel="dono"><LayoutPainel /></SoLogado>}>
        <Route index element={<Agenda />} />
        <Route path="servicos" element={<Servicos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="ajustes" element={<Ajustes />} />
      </Route>

      {/* Você (desenvolvedor) */}
      <Route path="/admin" element={<SoLogado papel="admin"><Admin /></SoLogado>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
