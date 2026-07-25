import api from './api';
import { LookResponse } from '../types/api';

/**
 * Chamadas do armário (looks salvos) contra o backend Lucker.
 *
 * Existia só localmente antes (AsyncStorage via utils/algorithm.ts): um save
 * feito no feed real (POST /api/saved-looks) nunca aparecia em "Salvos" porque
 * a tela lia de outro lugar. Este módulo fecha esse ciclo.
 */

export async function fetchSavedLooks(): Promise<LookResponse[]> {
  const { data } = await api.get<LookResponse[]>('/saved-looks');
  return data;
}

export async function removeSavedLook(lookId: string): Promise<void> {
  await api.delete(`/saved-looks/${lookId}`);
}
