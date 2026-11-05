// Componentes pequenos usados em várias telas
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { aoServidorLento } from '../api';

export function Girando({ escuro }) {
  return <span className={`girando${escuro ? ' escuro' : ''}`} aria-hidden="true" />;
}

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="carregando" role="status">
      <div className="linha suave"><Girando escuro /> {texto}</div>
    </div>
  );
}

export function Aviso({ tipo = 'info', children }) {
  return <div className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>{children}</div>;
}

export function Botao({ carregando, children, className = 'btn-primario', ...props }) {
  return (
    <button className={`btn ${className}`} disabled={carregando || props.disabled} {...props}>
      {carregando ? <Girando escuro={className.includes('contorno')} /> : null}
      {children}
    </button>
  );
}

export function Campo({ rotulo, ajuda, erro, children }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {erro ? <div className="erro-campo">{erro}</div> : ajuda ? <small>{ajuda}</small> : null}
    </label>
  );
}

export function Modal({ titulo, aberto, aoFechar, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    ref.current?.querySelector('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="fundo-modal" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal pilha" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="linha-entre">
          <h2>{titulo}</h2>
          <button className="btn btn-texto" onClick={aoFechar}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- Toast (mensagem rápida no rodapé) ----
const ToastContexto = createContext(() => {});
export const useToast = () => useContext(ToastContexto);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const mostrar = useCallback((texto, tipo = 'ok') => {
    clearTimeout(timer.current);
    setToast({ texto, tipo });
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  return (
    <ToastContexto.Provider value={mostrar}>
      {children}
      {toast && <div className={`toast ${toast.tipo === 'erro' ? 'erro' : ''}`} role="status">{toast.texto}</div>}
    </ToastContexto.Provider>
  );
}

// ---- Aviso global quando o servidor grátis está acordando ----
export function AvisoServidor() {
  const [lento, setLento] = useState(false);
  useEffect(() => aoServidorLento(setLento), []);
  if (!lento) return null;
  return (
    <div className="servidor-acordando" role="status">
      <Girando />
      <span>Conectando ao servidor. Na primeira vez do dia isso pode levar até 1 minuto.</span>
    </div>
  );
}

// Ícones simples (traço) para as abas
export const Icone = {
  agenda: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  tesoura: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.5 8.5 20 19M8.5 15.5 20 5" /></svg>
  ),
  pessoas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.5 5" /></svg>
  ),
  ajustes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
  ),
};
