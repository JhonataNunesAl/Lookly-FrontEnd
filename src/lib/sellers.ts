import api from './api';
import { FILTROS_VAZIOS, FiltrosBusca, filtrosParaParams } from './filtros';
import {
  SellerCreate,
  SellerUpdate,
  SellerResponse,
  SellerSearchResponse,
  DocumentInput,
  DocumentVerifyResponse,
  FeedResponse,
  LookResponse,
  LookCreate,
  LookUpdate,
} from '../types/api';

/** Vira vendedor — mesma chamada usada pelo cadastro de empresa, aqui
 *  reaproveitada pelo fluxo de upgrade a partir do perfil de usuário comum. */
export async function createStore(dados: SellerCreate): Promise<SellerResponse> {
  const { data } = await api.post<SellerResponse>('/sellers', dados);
  return data;
}

/** Prévia da verificação de CNPJ/CPF — não grava nada, só confirma antes de enviar. */
export async function verifySellerDocument(dados: DocumentInput): Promise<DocumentVerifyResponse> {
  const { data } = await api.post<DocumentVerifyResponse>('/sellers/verify-document', dados);
  return data;
}

/** Grava o documento (o servidor valida, verifica e cifra — ver CLAUDE.md do Lucker). */
export async function submitSellerDocument(dados: DocumentInput): Promise<void> {
  await api.put('/sellers/me/document', dados);
}

/** Busca pública de lojas por nome/descrição. `q` vazio é omitido — o backend
 *  exige `min_length=1` quando o parâmetro é enviado (rejeita `q=` com 422),
 *  então mandar string vazia quebra a busca sem termo nenhum digitado. */
export async function searchSellers(q?: string, cursor?: string | null): Promise<SellerSearchResponse> {
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<SellerSearchResponse>('/sellers/search', { params });
  return data;
}

/** Storefront pública de uma loja. */
export async function fetchSellerPublic(sellerId: string): Promise<SellerResponse> {
  const { data } = await api.get<SellerResponse>(`/sellers/${sellerId}`);
  return data;
}

/** Minha própria loja (dono autenticado). */
export async function fetchMyStore(): Promise<SellerResponse> {
  const { data } = await api.get<SellerResponse>('/sellers/me');
  return data;
}

/** Atualiza nome/descrição/logo/site da minha loja. */
export async function updateMyStore(dados: SellerUpdate): Promise<SellerResponse> {
  const { data } = await api.put<SellerResponse>('/sellers/me', dados);
  return data;
}

/** Looks ativos de uma loja (a "vitrine" pública dela). */
export async function fetchSellerLooks(sellerId: string, cursor?: string | null): Promise<FeedResponse> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<FeedResponse>(`/sellers/${sellerId}/looks`, { params });
  return data;
}

/** Todos os looks da MINHA loja, qualquer status (ativos, esgotados, em
 *  revisão) — usado pela tela de gestão de catálogo/estoque. Diferente de
 *  `fetchSellerLooks`, que é a vitrine pública (só `status='active'`). */
export async function fetchMyLooks(cursor?: string | null): Promise<FeedResponse> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<FeedResponse>('/looks/mine', { params });
  return data;
}

/** Ajusta só o estoque de um look já publicado. */
export async function updateLookStock(lookId: string, stock_quantity: number): Promise<LookResponse> {
  const { data } = await api.put<LookResponse>(`/looks/${lookId}`, { stock_quantity });
  return data;
}

/** Busca de looks por texto/categoria (fora do feed — não exclui já vistos). */
export async function searchLooks(
  q?: string,
  category?: string,
  cursor?: string | null,
  filtros: FiltrosBusca = FILTROS_VAZIOS,
): Promise<FeedResponse> {
  const params: Record<string, string | boolean | string[]> = { ...filtrosParaParams(filtros) };
  if (q) params.q = q;
  if (category) params.category = category;
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<FeedResponse>('/looks/search', {
    params,
    // `sizes=P&sizes=M` (o FastAPI não entende o `sizes[]=P` padrão do axios)
    paramsSerializer: { indexes: null },
  });
  return data;
}

/** Publica uma peça nova (só quem tem loja). Exige categoria e 1–6 fotos já enviadas
 *  (ver `lib/media.ts`). */
export async function createLook(dados: LookCreate): Promise<LookResponse> {
  const { data } = await api.post<LookResponse>('/looks', dados);
  return data;
}

/** Edita uma peça da minha loja (nome, preço, fotos, categoria, estoque...). */
export async function updateLook(lookId: string, dados: LookUpdate): Promise<LookResponse> {
  const { data } = await api.put<LookResponse>(`/looks/${lookId}`, dados);
  return data;
}

/** Remove uma peça da minha loja. */
export async function deleteLook(lookId: string): Promise<void> {
  await api.delete(`/looks/${lookId}`);
}

/** Todas as peças da minha loja (junta as páginas de `/looks/mine`). Usado pelo
 *  painel e pelos insights, que somam sobre o catálogo inteiro. Teto de 10
 *  páginas (500 peças) para não pendurar a tela numa loja gigante. */
export async function fetchTodosMeusLooks(): Promise<LookResponse[]> {
  const todos: LookResponse[] = [];
  let cursor: string | null = null;
  for (let pagina = 0; pagina < 10; pagina++) {
    const res: FeedResponse = await fetchMyLooks(cursor);
    todos.push(...res.items);
    if (!res.next_cursor) break;
    cursor = res.next_cursor;
  }
  return todos;
}
