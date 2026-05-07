import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Product,
  UserProfile,
  TasteScores,
  InteractionType,
  CategoryStat,
} from '../types';
import { PRODUCTS } from '../data/products';

const PROFILE_KEY = 'fitfeed_profile_v1';
const COLD_START_THRESHOLD = 20;
const DISCOVERY_NOISE = 3; // random noise multiplier keeps 20% discovery

// ─── Defaults ────────────────────────────────────────────────────────────────

const createDefaultProfile = (): UserProfile => ({
  interactions: 0,
  scores: { tags: {}, colors: {}, categories: {}, brands: {}, price_ranges: {} },
  wishlist: [],
  seen: [],
});

// ─── Storage ─────────────────────────────────────────────────────────────────

export const getProfile = async (): Promise<UserProfile> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : createDefaultProfile();
  } catch {
    return createDefaultProfile();
  }
};

const saveProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('[FitFeed] Falha ao salvar perfil:', e);
  }
};

// ─── Score helpers ────────────────────────────────────────────────────────────

const DELTA: Record<InteractionType, number> = { like: 2, save: 4, skip: -1 };

const applyDelta = (
  map: Record<string, number>,
  keys: string[],
  delta: number,
): void => {
  keys.forEach((k) => { map[k] = (map[k] ?? 0) + delta; });
};

const scoreProduct = (product: Product, scores: TasteScores): number => {
  let total = 0;
  product.style_tags.forEach((t) => { total += scores.tags[t] ?? 0; });
  product.colors.forEach((c) => { total += scores.colors[c] ?? 0; });
  total += scores.categories[product.category] ?? 0;
  total += scores.brands[product.brand] ?? 0;
  total += scores.price_ranges[product.price_range] ?? 0;
  return total;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Record a user interaction and persist updated profile. */
export const recordInteraction = async (
  product: Product,
  type: InteractionType,
): Promise<UserProfile> => {
  const profile = await getProfile();
  const delta = DELTA[type];

  applyDelta(profile.scores.tags, product.style_tags, delta);
  applyDelta(profile.scores.colors, product.colors, delta);
  applyDelta(profile.scores.categories, [product.category], delta);
  applyDelta(profile.scores.brands, [product.brand], delta);
  applyDelta(profile.scores.price_ranges, [product.price_range], delta);

  if (!profile.seen.includes(product.id)) profile.seen.push(product.id);
  if (type === 'save' && !profile.wishlist.includes(product.id)) {
    profile.wishlist.push(product.id);
  }

  profile.interactions += 1;
  await saveProfile(profile);
  return profile;
};

/**
 * Build next batch of products for the feed.
 * - Cold start (< 20 interactions): pure random shuffle.
 * - Warm (>= 20 interactions): weighted by taste score + noise for discovery.
 */
export const getNextProducts = async (count = 20): Promise<Product[]> => {
  const profile = await getProfile();
  const unseen = PRODUCTS.filter((p) => !profile.seen.includes(p.id));
  // Reset to full catalog when pool runs dry
  const pool = unseen.length >= Math.min(count, 5) ? unseen : [...PRODUCTS];

  if (profile.interactions < COLD_START_THRESHOLD) {
    return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  }

  return pool
    .map((p) => ({
      product: p,
      weight: scoreProduct(p, profile.scores) + Math.random() * DISCOVERY_NOISE,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count)
    .map((s) => s.product);
};

/** Returns full Product objects from the user's saved wishlist. */
export const getWishlist = async (): Promise<Product[]> => {
  const { wishlist } = await getProfile();
  return PRODUCTS.filter((p) => wishlist.includes(p.id));
};

/** Remove a single product from wishlist. */
export const removeFromWishlist = async (productId: string): Promise<void> => {
  const profile = await getProfile();
  profile.wishlist = profile.wishlist.filter((id) => id !== productId);
  await saveProfile(profile);
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
