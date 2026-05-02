// ─── Domain enums ────────────────────────────────────────────────────────────

export type Gender = 'feminino' | 'masculino' | 'unissex';
export type PriceRange = 'budget' | 'mid' | 'premium';

export type Category =
  | 'vestido'
  | 'calça'
  | 'saia'
  | 'top'
  | 'blazer'
  | 'casaco'
  | 'conjunto'
  | 'bermuda'
  | 'short';

export type StyleTag =
  | 'casual'
  | 'boho'
  | 'minimalista'
  | 'streetwear'
  | 'elegante'
  | 'romântico'
  | 'vintage'
  | 'preppy'
  | 'gótico'
  | 'esportivo'
  | 'colorido';

export type InteractionType = 'like' | 'skip' | 'save';

// ─── Product ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  price_range: PriceRange;
  category: Category;
  gender: Gender;
  style_tags: StyleTag[];
  colors: string[];
  description: string;
  image: string;
}

// ─── User profile / algorithm ─────────────────────────────────────────────────

export interface ScoreMap {
  [key: string]: number;
}

export interface TasteScores {
  tags: ScoreMap;
  colors: ScoreMap;
  categories: ScoreMap;
  brands: ScoreMap;
  price_ranges: ScoreMap;
}

export interface UserProfile {
  interactions: number;
  scores: TasteScores;
  wishlist: string[];
  seen: string[];
}

export interface CategoryStat {
  cat: string;
  pct: number;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootTabParamList = {
  Feed: undefined;
  Buscar: undefined;
  Salvos: undefined;
  Perfil: undefined;
};
