import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, CategoryStat } from '../types';

/**
 * Motor de gosto local — só sobra pra "DNA de Estilo" no perfil, que não tem
 * equivalente real (o backend não carrega style_tags no look). O que
 * alimentava isto (curtir/salvar num catálogo mockado) foi removido junto
 * com o `SearchScreen` mock (sessão de 2026-07-24): a busca agora é real
 * (`GET /api/looks/search`), então não há mais nenhuma tela chamando
 * `recordInteraction`/`getNextProducts`. A afinidade por CATEGORIA real vem
 * de `lib/categories.ts` (`user_category_affinity` no backend) — só
 * "Estilos" continua sem fonte de dado nenhuma, real ou mock.
 */

const PROFILE_KEY = 'fitfeed_profile_v1';

const createDefaultProfile = (): UserProfile => ({
  interactions: 0,
  scores: { tags: {}, colors: {}, categories: {}, brands: {}, price_ranges: {} },
  wishlist: [],
  seen: [],
});

export const getProfile = async (): Promise<UserProfile> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : createDefaultProfile();
  } catch {
    return createDefaultProfile();
  }
};

/** Wipe the profile entirely (used in Settings). */
export const resetProfile = async (): Promise<void> => {
  await AsyncStorage.removeItem(PROFILE_KEY);
};

/** Top N style tags by positive score. */
export const getTopStyles = (profile: UserProfile, topN = 3): string[] =>
  Object.entries(profile.scores.tags)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag]) => tag);

/** Category breakdown as percentage stats for the profile chart. */
export const getTopCategories = (profile: UserProfile): CategoryStat[] => {
  const cats = profile.scores.categories;
  const total =
    Object.values(cats).reduce((sum, v) => sum + Math.max(v, 0), 0) || 1;
  return Object.entries(cats)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => ({ cat, pct: Math.round((val / total) * 100) }));
};

/** Os estilos escolhidos no cadastro viram o ponto de partida do DNA de estilo
 *  (antes eram pedidos ao usuário, "para personalizar o feed", e jogados fora). */
export const seedStyles = async (styles: string[]): Promise<void> => {
  const profile = await getProfile();
  styles.forEach((style) => {
    profile.scores.tags[style] = (profile.scores.tags[style] ?? 0) + 1;
  });
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};
