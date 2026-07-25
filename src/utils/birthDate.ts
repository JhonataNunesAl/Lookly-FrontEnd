/**
 * Validação de data de nascimento sem dependência de date-picker nativo (o
 * projeto não tinha nenhuma, e instalar uma exigiria rebuild nativo). Três
 * campos numéricos (dia/mês/ano) bastam e evitam esse custo.
 *
 * Espelha a regra do backend (`schemas/profile.py`: 18 anos, aproximados por
 * dias) — mudar um lado sem o outro reabre o bug que isto corrige: hoje
 * NENHUMA tela envia `birth_date` no cadastro, então todo usuário nasce no
 * banco com a data exata do limite de 18 anos (o fallback do trigger
 * `handle_new_user`), o que torna o gate de maioridade decorativo.
 */

const MIN_AGE_YEARS = 18;

/** "dd", "mm", "aaaa" → "aaaa-mm-dd", ou null se não for uma data real
 *  (rejeita "31/02", meses/dias fora do intervalo, etc. via ida e volta
 *  pelo `Date`, que o JS normaliza silenciosamente se não checarmos). */
export function toISODate(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null;
  if (year.length !== 4) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(Date.UTC(y, m - 1, d));
  const normalizado =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  if (!normalizado) return null;

  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Mesma regra do CHECK no banco: `birth_date <= hoje - 18 anos`. */
export function isAdult(isoDate: string): boolean {
  const limite = new Date();
  limite.setUTCFullYear(limite.getUTCFullYear() - MIN_AGE_YEARS);
  return new Date(`${isoDate}T00:00:00Z`) <= limite;
}
