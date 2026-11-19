// Tipos de negócio: a lógica é a mesma, muda só o visual, as palavras e o ícone.
import { ICONES, iconeValido } from './icones';

// Para criar um tipo novo: copie um bloco, ajuste as palavras e crie o tema em styles.css
// (:root[data-tema='<tipo>']). No backend, inclua o nome no enum "tipo" do modelo Barbearia.

export const TIPOS = {
  barbearia: {
    rotulo: 'Barbearia',
    seu: 'Sua barbearia', nomeCampo: 'Nome da barbearia', iconePadrao: 'poste',
    corPadrao: '#c4302b',
    corTema: '#1B2238', // cor da barra do navegador
    a: 'a barbearia', A: 'A barbearia', da: 'da barbearia', na: 'na barbearia',
    esta: 'Esta barbearia', avisada: 'avisada', ela: 'ela',
    servicos: 'serviços', Servicos: 'Serviços', servico: 'serviço', novoServico: 'Novo serviço',
    pergunta: 'Quais serviços?',
    exemploServico: 'Ex.: Corte degradê',
    sugestoes: [
      { nome: 'Corte', preco: 40, duracaoMinutos: 30 },
      { nome: 'Barba', preco: 30, duracaoMinutos: 30 },
      { nome: 'Corte + Barba', preco: 60, duracaoMinutos: 60 },
    ],
  },
  salao: {
    rotulo: 'Salão de beleza',
    seu: 'Seu salão', nomeCampo: 'Nome do salão', iconePadrao: 'brilho',
    corPadrao: '#b5657a',
    corTema: '#4A2530',
    a: 'o salão', A: 'O salão', da: 'do salão', na: 'no salão',
    esta: 'Este salão', avisada: 'avisado', ela: 'ele',
    servicos: 'procedimentos', Servicos: 'Procedimentos', servico: 'procedimento', novoServico: 'Novo procedimento',
    pergunta: 'Quais procedimentos?',
    exemploServico: 'Ex.: Escova modelada',
    sugestoes: [
      { nome: 'Escova', preco: 45, duracaoMinutos: 45 },
      { nome: 'Manicure', preco: 30, duracaoMinutos: 45 },
      { nome: 'Pedicure', preco: 35, duracaoMinutos: 45 },
      { nome: 'Design de sobrancelha', preco: 35, duracaoMinutos: 30 },
    ],
  },
  outro: {
    rotulo: 'Outro negócio',
    seu: 'Seu negócio', nomeCampo: 'Nome do negócio', iconePadrao: 'calendario',
    corPadrao: '#1f6f78',
    corTema: '#1D2B33',
    a: 'o estabelecimento', A: 'O estabelecimento', da: 'do estabelecimento', na: 'no estabelecimento',
    esta: 'Este estabelecimento', avisada: 'avisado', ela: 'ele',
    servicos: 'serviços', Servicos: 'Serviços', servico: 'serviço', novoServico: 'Novo serviço',
    pergunta: 'Quais serviços?',
    exemploServico: 'Ex.: Sessão de 1 hora',
    sugestoes: [],
  },
};

export const textosDo = (tipo) => TIPOS[tipo] || TIPOS.barbearia;

/** Ícone que o negócio usa: o escolhido, ou o padrão do tipo */
export const iconeDo = (tipo, icone) => iconeValido(icone) || textosDo(tipo).iconePadrao;

/** Nome do tipo para mostrar (no "Outro negócio" é o que o dono escreveu) */
export const nomeDoTipo = (tipo, tipoNome) => (tipo === 'outro' && tipoNome?.trim() ? tipoNome.trim() : textosDo(tipo).rotulo);

const PADRAO = { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png', manifest: '/manifest.webmanifest' };
function trocarLink(rel, href) {
  const el = document.querySelector(`link[rel="${rel}"]`);
  if (el && el.getAttribute('href') !== href) el.setAttribute('href', href);
}

/**
 * Aplica o visual do negócio na página inteira: cores, fontes, barra do navegador,
 * ícone da aba, ícone do iPhone e o manifest do app (ícone no Android).
 * Chame aplicarTema(null) para voltar ao padrão do app.
 */
export function aplicarTema(tipo, icone) {
  try {
    const raiz = document.documentElement;
    if (!tipo) {
      delete raiz.dataset.tema;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', TIPOS.barbearia.corTema);
      trocarLink('icon', PADRAO.icon);
      trocarLink('apple-touch-icon', PADRAO.apple);
      trocarLink('manifest', PADRAO.manifest);
      return;
    }
    const t = TIPOS[tipo] ? tipo : 'barbearia';
    if (t === 'barbearia') delete raiz.dataset.tema;
    else raiz.dataset.tema = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', TIPOS[t].corTema);
    const chave = iconeDo(t, icone);
    trocarLink('icon', `/icons/tipos/${chave}-192.png`);
    trocarLink('apple-touch-icon', `/icons/tipos/${chave}-180.png`);
    trocarLink('manifest', `/icons/tipos/${chave}.webmanifest`);
  } catch {
    /* sem DOM (ex.: testes): ignora */
  }
}

export { ICONES };
