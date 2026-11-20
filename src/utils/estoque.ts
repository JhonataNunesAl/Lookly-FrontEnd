import { CanalVenda, SituacaoEnvio, SituacaoEstoque, TipoMovimento } from '../types/api';

/** Rótulos da gestão de estoque. Espelham os valores aceitos pelo back
 *  (schemas/inventory.py e CONDICOES em schemas/look.py). */

export const CONDICOES: { id: string; rotulo: string }[] = [
  { id: 'novo', rotulo: 'Novo' },
  { id: 'seminovo', rotulo: 'Seminovo' },
  { id: 'usado', rotulo: 'Usado' },
  { id: 'vintage', rotulo: 'Vintage' },
];

export function rotuloCondicao(id?: string | null): string | null {
  return CONDICOES.find((c) => c.id === id)?.rotulo ?? null;
}

export const SITUACOES: { id: SituacaoEstoque; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todas' },
  { id: 'disponivel', rotulo: 'À venda' },
  { id: 'acabando', rotulo: 'Acabando' },
  { id: 'esgotado', rotulo: 'Esgotadas' },
  { id: 'reservado', rotulo: 'Reservadas' },
  { id: 'parado', rotulo: 'Paradas' },
  { id: 'pausado', rotulo: 'Pausadas' },
];

export const ORDENS: { id: string; rotulo: string }[] = [
  { id: 'recentes', rotulo: 'Mais recentes' },
  { id: 'mais_vendidos', rotulo: 'Mais vendidas' },
  { id: 'parados', rotulo: 'Há mais tempo sem vender' },
  { id: 'estoque_asc', rotulo: 'Menos estoque' },
  { id: 'estoque_desc', rotulo: 'Mais estoque' },
  { id: 'preco_desc', rotulo: 'Maior preço' },
  { id: 'preco_asc', rotulo: 'Menor preço' },
  { id: 'nome', rotulo: 'Nome (A–Z)' },
  { id: 'antigos', rotulo: 'Mais antigas' },
];

type Icone = 'package-variant-plus' | 'cash-register' | 'cellphone-check' | 'counter' | 'package-variant-remove'
  | 'keyboard-return' | 'bookmark-outline' | 'bookmark-off-outline';

export const MOVIMENTOS: Record<TipoMovimento, { rotulo: string; acao: string; icone: Icone; dica: string }> = {
  venda_externa: { rotulo: 'Venda fora do app', acao: 'Vendi fora do app', icone: 'cash-register', dica: 'Instagram, WhatsApp, loja física ou feira. Entra no faturamento.' },
  entrada: { rotulo: 'Entrada', acao: 'Chegou peça', icone: 'package-variant-plus', dica: 'Reposição ou peça nova que chegou.' },
  reserva: { rotulo: 'Reserva', acao: 'Reservar', icone: 'bookmark-outline', dica: 'Separou para alguém. Continua no estoque, mas some do app.' },
  liberacao: { rotulo: 'Reserva desfeita', acao: 'Desfazer reserva', icone: 'bookmark-off-outline', dica: 'A peça volta a ficar à venda no app.' },
  ajuste: { rotulo: 'Ajuste de contagem', acao: 'Corrigir contagem', icone: 'counter', dica: 'Contou as peças? Informe o total que existe agora.' },
  perda: { rotulo: 'Perda', acao: 'Perda ou avaria', icone: 'package-variant-remove', dica: 'Peça danificada, extraviada ou doada.' },
  devolucao: { rotulo: 'Devolução', acao: 'Devolução', icone: 'keyboard-return', dica: 'A cliente devolveu e a peça voltou ao estoque.' },
  venda_app: { rotulo: 'Venda no app', acao: 'Venda no app', icone: 'cellphone-check', dica: 'Pagamento aprovado pelo Mercado Pago.' },
};

/** Ordem dos tipos no seletor (venda_app não é manual). */
export const MOVIMENTOS_MANUAIS: Exclude<TipoMovimento, 'venda_app'>[] = [
  'venda_externa', 'entrada', 'reserva', 'liberacao', 'ajuste', 'perda', 'devolucao',
];

export const CANAIS: { id: CanalVenda; rotulo: string }[] = [
  { id: 'instagram', rotulo: 'Instagram' },
  { id: 'whatsapp', rotulo: 'WhatsApp' },
  { id: 'loja_fisica', rotulo: 'Loja física' },
  { id: 'feira', rotulo: 'Feira/bazar' },
  { id: 'site', rotulo: 'Site próprio' },
  { id: 'outro', rotulo: 'Outro' },
];

export function rotuloCanal(id: string): string {
  if (id === 'app') return 'App Lookly';
  return CANAIS.find((c) => c.id === id)?.rotulo ?? 'Outro';
}

export const ENVIO: Record<SituacaoEnvio, string> = {
  pending: 'A enviar',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

/** "20/11 14:32" a partir de um ISO — sem Intl (ver utils/format.ts). */
export function dataHoraCurta(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "2026-11-20" → "20/11". */
export function diaCurto(dia: string): string {
  const [, m, d] = dia.split('-');
  return `${d}/${m}`;
}

/** Variação percentual entre dois períodos, ou null quando não há base. */
export function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}
