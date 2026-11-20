import api from './api';
import {
  ItensEstoqueResponse,
  LookResponse,
  Metricas,
  Movimento,
  MovimentoCreate,
  MovimentosResponse,
  OrdemEstoque,
  SituacaoEnvio,
  SituacaoEstoque,
  VendasResponse,
} from '../types/api';

/** Gestão de estoque da loja (`/api/inventory/*` — ver README do back). */

export interface FiltroItens {
  q?: string;
  situacao?: SituacaoEstoque;
  categoryId?: string | null;
  sort?: OrdemEstoque;
  offset?: number;
  limit?: number;
}

export async function fetchItensEstoque(f: FiltroItens = {}): Promise<ItensEstoqueResponse> {
  const params: Record<string, string | number> = {
    situacao: f.situacao ?? 'todos',
    sort: f.sort ?? 'recentes',
    limit: f.limit ?? 30,
    offset: f.offset ?? 0,
  };
  // O back recusa `q=` vazio (min_length=1).
  if (f.q && f.q.trim()) params.q = f.q.trim();
  if (f.categoryId) params.category_id = f.categoryId;
  const { data } = await api.get<ItensEstoqueResponse>('/inventory/items', { params });
  return data;
}

export async function registrarMovimento(
  lookId: string,
  dados: MovimentoCreate,
): Promise<{ movement: Movimento; item: LookResponse }> {
  const { data } = await api.post(`/inventory/items/${lookId}/movements`, dados);
  return data;
}

/** Pausar (sai do feed, continua no estoque) ou reativar. */
export async function alterarStatusPeca(lookId: string, status: 'active' | 'draft'): Promise<LookResponse> {
  const { data } = await api.patch<LookResponse>(`/inventory/items/${lookId}/status`, { status });
  return data;
}

export async function fetchMovimentos(
  f: { lookId?: string; kind?: string; cursor?: string | null } = {},
): Promise<MovimentosResponse> {
  const params: Record<string, string | number> = { limit: 40 };
  if (f.lookId) params.look_id = f.lookId;
  if (f.kind) params.kind = f.kind;
  if (f.cursor) params.cursor = f.cursor;
  const { data } = await api.get<MovimentosResponse>('/inventory/movements', { params });
  return data;
}

export async function fetchVendas(situacao: SituacaoEnvio | 'todos' = 'todos'): Promise<VendasResponse> {
  const { data } = await api.get<VendasResponse>('/inventory/sales', { params: { situacao } });
  return data;
}

export async function atualizarEnvio(
  orderId: string,
  fulfillment_status: 'shipped' | 'delivered',
  tracking_code?: string,
): Promise<void> {
  await api.patch(`/inventory/sales/${orderId}`, { fulfillment_status, tracking_code });
}

export type Periodo = 7 | 30 | 90 | 365;

export async function fetchMetricas(days: Periodo = 30): Promise<Metricas> {
  const { data } = await api.get<Metricas>('/inventory/metrics', { params: { days } });
  return data;
}

/** Mensagem do back (`detail`) ou um texto padrão — para os avisos de erro. */
export function mensagemDeErro(e: any, padrao: string): string {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace(/^Value error, /, '');
  return padrao;
}
