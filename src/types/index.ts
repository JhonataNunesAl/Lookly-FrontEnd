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
// Três listas separadas: a stack raiz e uma por bottom-tab. Antes existia só
// `RootTabParamList` com as abas do usuário, usada para os DOIS tab navigators —
// então as abas de empresa (Dashboard/Catalogo/Insights) não eram tipadas e o
// TS não pôde acusar quando "Perfil" apontou para a tela errada.

import type { SellerCreate, SellerResponse, DocumentInput, LookResponse } from './api';

/** Stack raiz (App.tsx): auth + os dois dashboards + modais. */
export type RootStackParamList = {
  Login: undefined;
  RegisterUser: undefined;
  RegisterCompany: undefined;
  /** Pós-cadastro, só quando o projeto exige confirmação por e-mail (sem
   *  sessão ainda). `sellerPayload` só existe vindo do cadastro de empresa —
   *  criar a loja precisa de sessão, que só existe depois do código confirmado. */
  ConfirmEmail: {
    email: string;
    onConfirmedNavigateTo: 'MainUser' | 'MainBusiness';
    sellerPayload?: SellerCreate;
    /** CNPJ digitado no cadastro da empresa — enviado depois da loja criada. */
    documentPayload?: DocumentInput;
  };
  MainUser: undefined;
  MainBusiness: undefined;
  /** Sem `look` = peça nova; com `look` = editar a peça (PUT /looks/{id}). */
  AddProduct: { look?: LookResponse } | undefined;
  Carrinho: undefined;
  Pedidos: undefined;
  CreateStore: undefined;
  StoreDetail: { sellerId: string };
  BodyProfile: undefined;
  EditStore: { loja: SellerResponse };
  SellerDocument: undefined;
  /** Placeholder pra qualquer funcionalidade planejada mas não implementada
   *  ainda — ver ComingSoonScreen.tsx. `icon` é um nome válido do Ionicons. */
  ComingSoon: { title: string; description: string; icon: string };
};

/** Abas do comprador. */
export type UserTabParamList = {
  Feed: undefined;
  Buscar: undefined;
  Salvos: undefined;
  Perfil: undefined;
};

/** Abas da empresa. */
export type BusinessTabParamList = {
  Dashboard: undefined;
  Catalogo: undefined;
  Insights: undefined;
  Perfil: undefined;
};
