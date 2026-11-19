// Escolha do ícone do negócio (aparece na aba do navegador e no ícone do app no celular)
import { ICONES } from '../icones';

export function EscolherIcone({ valor, padrao, aoMudar }) {
  const atual = valor || padrao;
  return (
    <div className="icones-grid" role="radiogroup" aria-label="Ícone do negócio">
      {Object.entries(ICONES).map(([chave, { rotulo }]) => (
        <button key={chave} type="button" role="radio" aria-checked={atual === chave} className="icone-opcao"
          onClick={() => aoMudar(chave === padrao ? '' : chave)}>
          <img src={`/icons/tipos/${chave}-192.png`} alt="" width="44" height="44" loading="lazy" />
          <span>{rotulo}</span>
        </button>
      ))}
    </div>
  );
}
