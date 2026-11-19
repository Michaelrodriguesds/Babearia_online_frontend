// Tipos de negócio: a lógica é a mesma, muda só o visual e as palavras.
// Para criar um tipo novo: copie um bloco, ajuste as palavras e crie o tema em styles.css
// (:root[data-tema='<tipo>']). No backend, inclua o nome no enum "tipo" do modelo Barbearia.

export const TIPOS = {
  barbearia: {
    rotulo: 'Barbearia',
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
};

export const textosDo = (tipo) => TIPOS[tipo] || TIPOS.barbearia;

/** Aplica o tema na página inteira (cores, fontes, barra do navegador). Chame com null para voltar ao padrão. */
export function aplicarTema(tipo) {
  const t = TIPOS[tipo] ? tipo : 'barbearia';
  try {
    if (t === 'barbearia') delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', TIPOS[t].corTema);
  } catch {
    /* sem DOM (ex.: testes): ignora */
  }
}
