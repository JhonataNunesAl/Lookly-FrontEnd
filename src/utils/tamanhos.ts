/**
 * Tamanhos aceitos pelo backend (`TAMANHOS_VALIDOS` em Lucker/app/schemas/look.py) —
 * lista fechada de propósito: com texto livre ("m", "M ", "médio") o filtro por
 * tamanho nunca casaria. Mudou aqui, mude lá.
 */
export const TAMANHOS_LETRAS = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;
/** Calçado (33–44) e roupa (34–48) dividem a mesma numeração. */
export const TAMANHOS_NUMEROS = Array.from({ length: 16 }, (_, i) => String(33 + i));
export const TAMANHO_UNICO = 'Único';

export const GRUPOS_DE_TAMANHO: { titulo: string; itens: string[] }[] = [
  { titulo: 'Letras', itens: [...TAMANHOS_LETRAS] },
  { titulo: 'Numeração', itens: TAMANHOS_NUMEROS },
  { titulo: 'Tamanho único', itens: [TAMANHO_UNICO] },
];

const ORDEM = [...TAMANHOS_LETRAS, ...TAMANHOS_NUMEROS, TAMANHO_UNICO];

/** Põe os tamanhos selecionados na ordem canônica (P, M, G… 38, 40… Único). */
export function ordenarTamanhos(tamanhos: string[]): string[] {
  return [...tamanhos].sort((a, b) => ORDEM.indexOf(a) - ORDEM.indexOf(b));
}
