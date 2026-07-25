/**
 * Formatação pt-BR sem depender de `Intl`/`toLocaleString`: o suporte no Hermes
 * varia por plataforma e build, e um número quebrado no painel do lojista é pior
 * que um formatador de três linhas.
 *
 * Os formatadores aceitam número OU string: o backend serializa `Decimal` (ex.:
 * `price`) como string no JSON, então `189.90` chega como "189.90". Valores
 * inválidos/ausentes viram 0 em vez de derrubar a tela com `.toFixed is not a
 * function`.
 */

type Numerico = number | string | null | undefined;

function paraNumero(n: Numerico): number {
  const v = typeof n === 'string' ? Number(n) : n;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** 45231 → "45.231" (aceita "45231" também) */
export function formatarNumero(n: Numerico): string {
  return Math.round(paraNumero(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 28450 → "R$ 28.450" · com `centavos`, 28450.5 → "R$ 28.450,50" */
export function formatarMoeda(n: Numerico, centavos = false): string {
  const valor = paraNumero(n);
  if (!centavos) return `R$ ${formatarNumero(valor)}`;
  const [inteiro, frac = '00'] = valor.toFixed(2).split('.');
  return `R$ ${formatarNumero(Number(inteiro))},${frac}`;
}

/** 12.4 → "+12,4%" · -3 → "-3,0%" */
export function formatarDelta(pct: Numerico, sufixo = '%'): string {
  const valor = paraNumero(pct);
  const sinal = valor > 0 ? '+' : '';
  return `${sinal}${valor.toFixed(1).replace('.', ',')}${sufixo}`;
}

/** "Lookly Studio" → "lookly-studio". O backend exige um store_slug único. */
export function slugify(nome: string): string {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acentos
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
