// Convida o barbeiro a instalar o app e ativar os avisos no celular
import { useEffect, useState } from 'react';
import { ativarPush, aoPoderInstalar, ehIPhone, estaInstalado, instalarApp, podeInstalar, pushAtivo, pushSuportado } from '../push';
import { Botao, useToast } from './ui';

export default function CartaoApp() {
  const toast = useToast();
  const [instalavel, setInstalavel] = useState(podeInstalar());
  const [avisos, setAvisos] = useState(null); // null = verificando
  const [ativando, setAtivando] = useState(false);
  const [oculto, setOculto] = useState(localStorage.getItem('cartaoAppOculto') === '1');
  const instalado = estaInstalado();

  useEffect(() => aoPoderInstalar(setInstalavel), []);
  useEffect(() => { pushAtivo().then(setAvisos).catch(() => setAvisos(false)); }, []);

  async function ativar() {
    setAtivando(true);
    try {
      await ativarPush();
      setAvisos(true);
      toast('Avisos ativados neste celular.');
    } catch (e) {
      toast(e.message, 'erro');
    } finally {
      setAtivando(false);
    }
  }

  if (oculto || avisos === null || (instalado && avisos)) return null;

  return (
    <section className="secao pilha-p">
      <div className="linha-entre">
        <h2>Receba os avisos no celular</h2>
        <button className="btn btn-texto pequeno" onClick={() => { localStorage.setItem('cartaoAppOculto', '1'); setOculto(true); }}>Agora não</button>
      </div>
      <p className="suave pequeno" style={{ margin: 0 }}>Com o app na tela inicial, você recebe uma notificação a cada novo agendamento e Pix. Não custa nada.</p>

      {!instalado && instalavel && (
        <button className="btn btn-escuro btn-largo" onClick={() => instalarApp().then((ok) => ok && toast('App instalado. Abra pela tela inicial.'))}>
          Instalar app
        </button>
      )}
      {!instalado && !instalavel && ehIPhone() && (
        <ol className="pequeno" style={{ margin: 0, paddingLeft: 20 }}>
          <li>Abra este site no Safari.</li>
          <li>Toque em Compartilhar (quadrado com seta para cima).</li>
          <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
          <li>Abra o app pela tela inicial e volte aqui para ativar os avisos.</li>
        </ol>
      )}
      {!instalado && !instalavel && !ehIPhone() && (
        <p className="pequeno" style={{ margin: 0 }}>No Chrome do Android: menu ⋮ e depois <b>Instalar app</b> (ou Adicionar à tela inicial).</p>
      )}
      {!avisos && (pushSuportado() || !ehIPhone()) && (
        <Botao className="btn-primario btn-largo" carregando={ativando} onClick={ativar}>Ativar avisos neste celular</Botao>
      )}
    </section>
  );
}
