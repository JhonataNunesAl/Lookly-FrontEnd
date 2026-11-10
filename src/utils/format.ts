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

/**
 * Quebra um preço em partes para o "número de portão" do feed: `289,90` vira
 * `{ inteiro: '289', centavos: '90' }`, e o inteiro é o que ganha escala.
 * Valor ausente/inválido devolve `null` — quem chama decide o que mostrar.
 */
export function partesDoPreco(n: Numerico): { inteiro: string; centavos: string } | null {
  if (n == null || n === '') return null;
  const valor = paraNumero(n);
  const [inteiro, centavos = '00'] = valor.toFixed(2).split('.');
  return { inteiro: formatarNumero(Number(inteiro)), centavos };
}

/** "1 curtida" / "3 curtidas": número formatado + a forma certa do plural. */
export function contar(n: number, singular: string, plural: string): string {
  return `${formatarNumero(n)} ${n === 1 ? singular : plural}`;
}

/**
 * Lê o que a pessoa digitou num campo de preço ("289,90", "1.299,90", "289.9",
 * "R$ 50") e devolve o número, ou `null` se não for um valor válido (vazio,
 * letras, negativo). Aceita vírgula ou ponto como separador de centavos.
 */
export function lerPreco(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '');
  if (!limpo) return null;
  // "1.299,90" → o ponto é milhar; "289.90" → o ponto é decimal.
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(limpo)
      ? limpo.replace(/\./g, '')
      : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : null;
}

/** 289.9 → "289,90" — para preencher o campo de preço ao editar uma peça. */
export function precoParaCampo(n: Numerico): string {
  if (n == null || n === '') return '';
  return paraNumero(n).toFixed(2).replace('.', ',');
}
