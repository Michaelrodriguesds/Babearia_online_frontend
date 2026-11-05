// Depois de reservar: Pix para pagar e, quando pago, a confirmação
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../../api';
import { useLoja, estiloDaLoja, CabecalhoLoja } from '../../componentes/Loja';
import { Aviso, Carregando, useToast } from '../../componentes/ui';
import { LinkRelatar } from '../../componentes/Relatar';
import { copiarTexto, dataLonga, hora, linkGoogleAgenda, linkWhatsapp, moeda } from '../../utils';

function useContagem(ate) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const resta = Math.max(0, new Date(ate).getTime() - agora);
  const min = Math.floor(resta / 60000);
  const seg = Math.floor((resta % 60000) / 1000);
  return { resta, texto: `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}` };
}

export default function Reserva() {
  const { slug, id } = useParams();
  const [busca] = useSearchParams();
  const codigo = busca.get('c');
  const { state } = useLocation();
  const toast = useToast();
  const { loja } = useLoja(slug);

  const inicial = state?.reserva
    ? { ...state.reserva, servico: state.reserva.servico, pix: state.reserva.pix && { ...state.reserva.pix, modo: loja?.pagamentoModo } }
    : null;
  const [ag, setAg] = useState(inicial);
  const [erro, setErro] = useState(null);
  const [qr, setQr] = useState(null);

  // Busca a situação; enquanto aguarda o Pix, consulta a cada 5 segundos
  useEffect(() => {
    let ativo = true;
    let timer;
    async function consultar() {
      try {
        const d = await api(`/publico/agendamentos/${id}?c=${encodeURIComponent(codigo || '')}`, { autenticado: false });
        if (!ativo) return;
        setAg((anterior) => ({ ...anterior, ...d, pix: d.pix || (d.status === 'pendente' ? anterior?.pix : null) }));
        setErro(null);
        if (d.status === 'pendente') timer = setTimeout(consultar, document.hidden ? 15000 : 5000);
        else localStorage.removeItem(`reserva:${slug}`);
      } catch (e) {
        if (!ativo) return;
        if (e.status === 404) setErro('Reserva não encontrada. Confira se o link está completo.');
        else timer = setTimeout(consultar, 8000); // erro de rede: tenta de novo sozinho
      }
    }
    consultar();
    return () => { ativo = false; clearTimeout(timer); };
  }, [id, codigo, slug]);

  const copiaCola = ag?.pix?.copiaCola;
  useEffect(() => {
    if (copiaCola) QRCode.toDataURL(copiaCola, { margin: 1, width: 440, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(null));
  }, [copiaCola]);

  const contagem = useContagem(ag?.expiraEm || Date.now());

  async function copiar() {
    const ok = await copiarTexto(copiaCola);
    toast(ok ? 'Código Pix copiado. Cole no app do seu banco.' : 'Não foi possível copiar. Segure o código e copie manualmente.', ok ? 'ok' : 'erro');
  }

  if (erro) {
    return (
      <div style={estiloDaLoja(loja)}>
        <CabecalhoLoja loja={loja} />
        <main className="pagina pilha"><Aviso tipo="erro">{erro}</Aviso><Link className="btn btn-primario btn-largo" to={`/b/${slug}`}>Ir para a agenda</Link></main>
      </div>
    );
  }
  if (!ag) return (<><CabecalhoLoja loja={loja} /><Carregando texto="Carregando sua reserva…" /></>);

  const quando = (
    <div>
      <div className="data-grande">{dataLonga(ag.inicio)}</div>
      <div className="data-grande">{hora(ag.inicio)}</div>
      <p className="suave" style={{ margin: '6px 0 0' }}>{ag.servico}</p>
    </div>
  );
  const zapLoja = loja?.whatsapp;

  return (
    <div style={estiloDaLoja(loja)}>
      <CabecalhoLoja loja={loja} />
      <main className="pagina pilha">
        {ag.status === 'pendente' && (
          <>
            <div className="pilha-p">
              <h2>Pague o Pix para garantir seu horário</h2>
              {quando}
            </div>
            <section className="secao pilha centro">
              <div>
                <div className="suave pequeno">Valor</div>
                <div className="data-grande">{moeda(ag.valorCobrado)}</div>
              </div>
              {contagem.resta > 0 ? (
                <div>
                  <div className="contador" aria-live="off">{contagem.texto}</div>
                  <div className="suave pequeno">para pagar antes do horário ser liberado</div>
                </div>
              ) : (
                <Aviso tipo="atencao">O prazo acabou. Estamos conferindo se o pagamento chegou…</Aviso>
              )}
              {copiaCola ? (
                <>
                  <button className="btn btn-primario btn-largo" onClick={copiar}>Copiar código Pix</button>
                  <div className="codigo-pix" aria-label="Código Pix copia e cola">{copiaCola}</div>
                  {qr && <img className="qr" src={qr} alt="QR Code do Pix" />}
                  <p className="suave pequeno" style={{ margin: 0 }}>Abra o app do banco, escolha Pix copia e cola (ou leia o QR Code em outro celular) e confirme.</p>
                </>
              ) : (
                <Aviso tipo="atencao">O código Pix não está disponível neste aparelho. Fale com a barbearia para pagar.</Aviso>
              )}
            </section>
            {ag.pix?.modo !== 'mercadopago' && zapLoja && (
              <section className="secao pilha-p">
                <b>Já pagou?</b>
                <p className="suave pequeno" style={{ margin: 0 }}>A barbearia confere o Pix e confirma. Para agilizar, mande o comprovante.</p>
                <a className="btn btn-zap btn-largo" target="_blank" rel="noreferrer"
                  href={linkWhatsapp(zapLoja, `Olá! Paguei o Pix da reserva: ${ag.servico}, ${dataLonga(ag.inicio)} às ${hora(ag.inicio)}. Segue o comprovante.`)}>
                  Enviar comprovante no WhatsApp
                </a>
              </section>
            )}
            <p className="suave pequeno centro">Esta tela atualiza sozinha quando o pagamento for confirmado.</p>
          </>
        )}

        {(ag.status === 'confirmado' || ag.status === 'concluido') && (
          <>
            <Aviso tipo="ok"><b>Horário confirmado.</b> Te esperamos!</Aviso>
            {quando}
            {loja?.endereco && <p style={{ margin: 0 }}>{loja.endereco}</p>}
            <a className="btn btn-escuro btn-largo" target="_blank" rel="noreferrer"
              href={linkGoogleAgenda({ titulo: `${ag.servico} - ${loja?.nome || 'Barbearia'}`, inicio: ag.inicio, fim: ag.fim || ag.inicio, local: loja?.endereco })}>
              Salvar na minha agenda
            </a>
            {zapLoja && <a className="btn btn-contorno btn-largo" target="_blank" rel="noreferrer" href={linkWhatsapp(zapLoja)}>Falar com a barbearia</a>}
            {ag.status === 'confirmado' && (
              <Link className="btn btn-texto" to={`/b/${slug}/cancelar/${id}?c=${codigo}`}>Preciso cancelar</Link>
            )}
          </>
        )}

        {ag.status === 'expirado' && (
          <>
            <h2>O prazo do Pix acabou</h2>
            <p className="suave">O horário foi liberado para outras pessoas. Se ainda quiser, escolha um novo horário.</p>
            <Link className="btn btn-primario btn-largo" to={`/b/${slug}`}>Escolher outro horário</Link>
          </>
        )}

        {ag.status === 'cancelado' && (
          <>
            <h2>Agendamento cancelado</h2>
            {quando}
            <Link className="btn btn-primario btn-largo" to={`/b/${slug}`}>Marcar novo horário</Link>
          </>
        )}

        {ag.status === 'conflito' && (
          <>
            <Aviso tipo="atencao"><b>Recebemos seu pagamento</b>, mas ele chegou depois do prazo e o horário já tinha sido ocupado.</Aviso>
            <p>A barbearia já foi avisada e vai combinar com você um novo horário ou a devolução do valor.</p>
            {zapLoja && <a className="btn btn-zap btn-largo" target="_blank" rel="noreferrer" href={linkWhatsapp(zapLoja, `Olá! Paguei o Pix depois do prazo (${ag.servico}, ${dataLonga(ag.inicio)}). Como resolvemos?`)}>Falar com a barbearia</a>}
          </>
        )}
        <LinkRelatar slug={slug} />
      </main>
    </div>
  );
}
