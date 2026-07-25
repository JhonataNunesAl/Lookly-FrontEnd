import api from './api';
import { CategoryResponse, CategoryAffinityResponse } from '../types/api';

/** Categorias reais (GET /api/categories) — só leitura, sempre pública. */
export async function fetchCategories(): Promise<CategoryResponse[]> {
  const { data } = await api.get<CategoryResponse[]>('/categories');
  return data;
}

/** Placar real de afinidade por categoria do usuário logado — alimentado por
 *  curtir/salvar no backend (ver trg_affinity_like/trg_affinity_save). */
export async function fetchCategoryAffinity(): Promise<CategoryAffinityResponse[]> {
  const { data } = await api.get<CategoryAffinityResponse[]>('/profiles/me/category-affinity');
  return data;
}
