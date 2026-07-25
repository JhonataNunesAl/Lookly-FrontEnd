import api from './api';
import {
  SellerCreate,
  SellerUpdate,
  SellerResponse,
  SellerSearchResponse,
  DocumentInput,
  DocumentVerifyResponse,
  FeedResponse,
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

/** Busca de looks por texto/categoria (fora do feed — não exclui já vistos). */
export async function searchLooks(
  q?: string,
  category?: string,
  cursor?: string | null,
): Promise<FeedResponse> {
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (category) params.category = category;
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<FeedResponse>('/looks/search', { params });
  return data;
}
