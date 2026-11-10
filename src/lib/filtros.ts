import { formatarMoeda } from '../utils/format';
import { ordenarTamanhos } from '../utils/tamanhos';

/**
 * Filtros da busca de peças (`GET /looks/search`). O servidor filtra e ordena — a
 * tela só guarda a escolha e a manda junto a cada página (filtrar só o que já
 * chegou esconderia peças que estão nas páginas seguintes).
 */
export type OrdemBusca = 'recent' | 'price_asc' | 'price_desc' | 'popular';

export interface FiltrosBusca {
  ordem: OrdemBusca;
  precoMin: number | null;
  precoMax: number | null;
  tamanhos: string[];
  soComEstoque: boolean;
}

export const FILTROS_VAZIOS: FiltrosBusca = {
  ordem: 'recent',
  precoMin: null,
  precoMax: null,
  tamanhos: [],
  soComEstoque: false,
};

export const ORDENS: { id: OrdemBusca; rotulo: string; dica: string }[] = [
  { id: 'recent', rotulo: 'Mais recentes', dica: 'Chegaram agora ao catálogo' },
  { id: 'popular', rotulo: 'Mais procuradas', dica: 'Curtidas e salvos das pessoas' },
  { id: 'price_asc', rotulo: 'Menor preço', dica: 'Do mais barato ao mais caro' },
  { id: 'price_desc', rotulo: 'Maior preço', dica: 'Do mais caro ao mais barato' },
];

/** Faixas de preço de um toque. `null` = sem limite daquele lado. */
export const FAIXAS_DE_PRECO: { rotulo: string; min: number | null; max: number | null }[] = [
  { rotulo: 'Até R$ 100', min: null, max: 100 },
  { rotulo: 'R$ 100 a 300', min: 100, max: 300 },
  { rotulo: 'R$ 300 a 500', min: 300, max: 500 },
  { rotulo: 'Acima de R$ 500', min: 500, max: null },
];

/** Quantos filtros estão valendo (a ordem padrão não conta). */
export function contarFiltros(f: FiltrosBusca): number {
  return (
    (f.ordem !== 'recent' ? 1 : 0) +
    (f.precoMin != null || f.precoMax != null ? 1 : 0) +
    (f.tamanhos.length > 0 ? 1 : 0) +
    (f.soComEstoque ? 1 : 0)
  );
}

export type ChaveFiltro = 'ordem' | 'preco' | 'tamanhos' | 'estoque';

/** Um rótulo por filtro ativo, para as etiquetas removíveis sob a busca. */
export function descreverFiltros(f: FiltrosBusca): { chave: ChaveFiltro; rotulo: string }[] {
  const itens: { chave: ChaveFiltro; rotulo: string }[] = [];
  if (f.ordem !== 'recent') {
    itens.push({ chave: 'ordem', rotulo: ORDENS.find((o) => o.id === f.ordem)?.rotulo ?? f.ordem });
  }
  if (f.precoMin != null || f.precoMax != null) {
    const min = f.precoMin != null ? formatarMoeda(f.precoMin, true) : null;
    const max = f.precoMax != null ? formatarMoeda(f.precoMax, true) : null;
    itens.push({
      chave: 'preco',
      rotulo: min && max ? `${min} a ${max}` : min ? `A partir de ${min}` : `Até ${max}`,
    });
  }
  if (f.tamanhos.length > 0) {
    itens.push({ chave: 'tamanhos', rotulo: `Tam. ${ordenarTamanhos(f.tamanhos).join(', ')}` });
  }
  if (f.soComEstoque) itens.push({ chave: 'estoque', rotulo: 'Em estoque' });
  return itens;
}

/** Tira um filtro, mantendo os outros. */
export function removerFiltro(f: FiltrosBusca, chave: ChaveFiltro): FiltrosBusca {
  switch (chave) {
    case 'ordem': return { ...f, ordem: 'recent' };
    case 'preco': return { ...f, precoMin: null, precoMax: null };
    case 'tamanhos': return { ...f, tamanhos: [] };
    case 'estoque': return { ...f, soComEstoque: false };
  }
}

/** Parâmetros da query: só o que foi escolhido (o servidor tem os mesmos padrões). */
export function filtrosParaParams(f: FiltrosBusca): Record<string, string | boolean | string[]> {
  const params: Record<string, string | boolean | string[]> = {};
  if (f.ordem !== 'recent') params.sort = f.ordem;
  if (f.precoMin != null) params.price_min = String(f.precoMin);
  if (f.precoMax != null) params.price_max = String(f.precoMax);
  if (f.tamanhos.length > 0) params.sizes = f.tamanhos;
  if (f.soComEstoque) params.in_stock = true;
  return params;
}
