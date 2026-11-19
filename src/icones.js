// Ícones que o negócio pode usar (aba do navegador, ícone do app no celular).
// As imagens ficam em public/icons/tipos/<chave>-192.png (e -512, -180, -maskable-512).
// Desenhos: Tabler Icons (licença MIT, ver public/icons/tipos/LICENSE-tabler.txt); poste = desenho próprio.
// Usado também pelo vite.config.js para gerar um manifest por ícone. No backend, a mesma lista
// fica no enum "icone" do modelo Barbearia.
export const ICONES = {
  poste: { rotulo: 'Barbearia', cor: '#1B2238' },
  brilho: { rotulo: 'Beleza', cor: '#B5657A' },
  tesoura: { rotulo: 'Cabelo', cor: '#7A3E5A' },
  flor: { rotulo: 'Estética', cor: '#4F7A5A' },
  massagem: { rotulo: 'Massagem', cor: '#6B5B95' },
  tatuagem: { rotulo: 'Tatuagem', cor: '#2B2B2B' },
  pet: { rotulo: 'Pet', cor: '#B8742A' },
  academia: { rotulo: 'Academia', cor: '#B23A48' },
  saude: { rotulo: 'Saúde', cor: '#2B6C8F' },
  foto: { rotulo: 'Fotografia', cor: '#45474D' },
  calendario: { rotulo: 'Agenda', cor: '#1F6F78' },
};

export const iconeValido = (chave) => (Object.prototype.hasOwnProperty.call(ICONES, chave) ? chave : null);
