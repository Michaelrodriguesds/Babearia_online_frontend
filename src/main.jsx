import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider, AvisoServidor } from './componentes/ui';
import AvisoSistema from './componentes/AvisoSistema';
import { LimiteDeErro, ativarCapturaDeErros } from './componentes/Erros';
import './styles.css';

ativarCapturaDeErros(); // erros do app chegam sozinhos no seu /admin

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LimiteDeErro>
      <BrowserRouter>
        <ToastProvider>
          <AvisoServidor />
          <AvisoSistema>
            <App />
          </AvisoSistema>
        </ToastProvider>
      </BrowserRouter>
    </LimiteDeErro>
  </React.StrictMode>
);
