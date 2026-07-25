import api from './api';
import { FeedResponse, SwipeDirection } from '../types/api';

/**
 * Chamadas do feed contra o backend Lucker. Mantém a rede fora dos componentes.
 * Tudo aqui exige uma sessão do Supabase válida (o interceptor injeta o JWT);
 * sem login, o backend responde 401.
 */

const PAGE = 20;

/** Página do feed. `category` é opcional no v2; `cursor` é o created_at do
 *  último item da página anterior. */
export async function fetchFeed(
  cursor?: string | null,
  category?: string,
): Promise<FeedResponse> {
  const params: Record<string, string | number> = { limit: PAGE };
  if (cursor) params.cursor = cursor;
  if (category) params.category = category;

  const { data } = await api.get<FeedResponse>('/feed', { params });
  return data;
}

/** Registra o swipe. RIGHT = curtiu, LEFT = passou. NÃO salva no armário. */
export async function sendSwipe(lookId: string, direction: SwipeDirection): Promise<void> {
  await api.post('/swipes', { look_id: lookId, direction });
}

/** Salvar é gesto separado da curtida (v2). */
export async function saveLook(lookId: string): Promise<void> {
  await api.post('/saved-looks', { look_id: lookId });
}
