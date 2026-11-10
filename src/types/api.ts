/**
 * Contrato do backend (Lucker) — cópia tipada dos DTOs do FastAPI.
 *
 * Espelha `app/schemas/*.py` do repositório Lucker (schema v2). É a fonte única
 * de tipos para qualquer chamada real à API; as telas hoje rodam em mock, mas
 * quando forem ligadas devem consumir estes tipos, não inventar formato.
 *
 * Convenções do backend:
 * - Tudo sob `/api`, auth via JWT do Supabase em `Authorization: Bearer`.
 * - Identificadores em snake_case (mantidos aqui de propósito, batem com o JSON).
 * - UUID e datas chegam como string no JSON.
 */

export type UUID = string;
/** ISO 8601, ex.: "2026-07-21T12:00:00Z". */
export type ISODateTime = string;
/** ISO date, ex.: "2001-05-14". */
export type ISODate = string;
/** O Pydantic serializa `Decimal` como STRING no JSON (ex.: "189.90"), não como
 *  número. Use os helpers de utils/format (toleram os dois) ao exibir. */
export type Decimal = number | string;

// ─── Perfil (GET/PUT /api/profiles/me) ────────────────────────────────────────
// v2: `age` virou `birth_date`; dados corporais saíram daqui (ver BodyProfile).

export interface ProfileResponse {
  id: UUID;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  birth_date: ISODate | null;
  status: string;
  /** Papel resolvido no servidor — NUNCA declarado pelo cliente. */
  is_seller: boolean;
  seller_id: UUID | null;
}

export interface ProfileUpdate {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  /** Exige 18+; o backend recusa datas mais novas que isso. */
  birth_date?: ISODate;
}

// ─── Dados corporais (/api/body-profile/me) ───────────────────────────────────
// Recurso separado, só do dono, atrás de consentimento LGPD explícito (pro
// provador virtual com IA — guardar a medida em si não depende do consentimento).
// O cliente manda/recebe em CLARO, sobre HTTPS, num endpoint já autenticado —
// o servidor cifra/decifra (ver CLAUDE.md do Lucker). A foto é uma chave de
// bucket privado, servida por signed URL, nunca URL pública (upload não
// implementado ainda — mesmo gap de mídia do AddProductScreen).

export interface BodyProfileResponse {
  weight_kg: number | null;
  height_cm: number | null;
  measurements: string | null;
  body_photo_key: string | null;
  ai_consent_at: ISODateTime | null;
  ai_consent_revoked_at: ISODateTime | null;
  consent_version: string | null;
}

export interface BodyProfileUpdate {
  weight_kg?: number;
  height_cm?: number;
  measurements?: string;
  body_photo_key?: string;
}

/** Versão do texto de consentimento aceito — bump isso se o texto mudar, pra
 *  saber quem consentiu numa versão antiga. */
export const AI_CONSENT_VERSION = '1.0';

// ─── Vendedor / loja (/api/sellers) ───────────────────────────────────────────
// O documento (CPF/CNPJ) NÃO faz parte deste payload: é cifrado e gravado à
// parte via PUT /api/sellers/me/document. Ver SellerDocument.

export interface SellerResponse {
  id: UUID;
  owner_profile_id: UUID;
  store_name: string;
  store_slug: string;
  store_logo_url: string | null;
  description: string | null;
  store_url: string | null;
  /** Cache mantido por trigger no banco — cliente não escreve. */
  rating: Decimal | null;
  total_reviews: number | null;
  status: string;
}

export interface SellerCreate {
  store_name: string;
  store_slug: string;
  store_logo_url?: string;
  description?: string;
  store_url?: string;
}

export type SellerUpdate = Partial<SellerCreate>;

/** GET /api/sellers/search?q=&limit=&cursor= */
export interface SellerSearchResponse {
  items: SellerResponse[];
  next_cursor: string | null;
}

/** POST /api/sellers/verify-document e PUT /api/sellers/me/document — o número
 *  vai em claro (HTTPS, endpoint autenticado); o servidor valida, verifica
 *  (CNPJ) e cifra antes de gravar. Nada disso é feito no cliente. */
export interface DocumentInput {
  document_number: string;
  document_type: 'CPF' | 'CNPJ';
}

/** Resposta de POST /api/sellers/verify-document — só uma prévia, não grava nada. */
export interface DocumentVerifyResponse {
  valid: boolean;
  active: boolean | null;
  legal_name: string | null;
  message: string;
}

// ─── Categorias (/api/categories) ─────────────────────────────────────────────

export interface CategoryResponse {
  id: UUID;
  name: string;
  slug: string;
}

/** GET /api/profiles/me/category-affinity — placar real de curtir/salvar por
 *  categoria, alimentado por gatilhos no banco. Só leitura. */
export interface CategoryAffinityResponse {
  category_id: UUID;
  category_name: string;
  score: number;
}

// ─── Looks (/api/looks, /api/feed) ────────────────────────────────────────────
// v2: `creator_id` virou `seller_id` (NOT NULL); ganhou `name`, `price` e os
// contadores `likes_count`/`saves_count` (curtir e salvar são separados agora).

export interface LookResponse {
  id: UUID;
  seller_id: UUID;
  category_id: UUID;
  name: string;
  description: string | null;
  photos: string[];
  videos: string[];
  price: Decimal | null;
  buy_link: string | null;
  /** Saldo disponível, por produto (sem variantes de tamanho/cor). */
  stock_quantity: number;
  /** Tamanhos disponíveis (ver utils/tamanhos.ts). Vazio = não informado; ausente
   *  em respostas de um back-end anterior ao filtro de tamanho. */
  sizes?: string[];
  likes_count: number;
  saves_count: number;
  status: string;
  created_at: ISODateTime | null;
}

export interface LookCreate {
  category_id: UUID;
  name: string;
  /** 1 a 6 fotos. */
  photos: string[];
  /** No máximo 2 vídeos. */
  videos?: string[];
  description?: string;
  price?: number;
  buy_link?: string;
  /** Default 0 no backend se omitido. */
  stock_quantity?: number;
  /** Subconjunto de utils/tamanhos.ts. */
  sizes?: string[];
}

export type LookUpdate = Partial<LookCreate>;

/** GET /api/feed?category=<slug>&limit=<1-50>&cursor=<created_at>.
 *  v2: o filtro de categoria virou OPCIONAL. */
export interface FeedResponse {
  items: LookResponse[];
  next_cursor: string | null;
}

// ─── Swipes (/api/swipes) ─────────────────────────────────────────────────────
// v2: RIGHT deixou de salvar no armário. Curtir (swipe) e salvar
// (POST /api/saved-looks) são gestos separados.

export type SwipeDirection = 'RIGHT' | 'LEFT';

export interface SwipeCreate {
  look_id: UUID;
  direction: SwipeDirection;
}

export interface SwipeResponse {
  look_id: UUID;
  direction: SwipeDirection;
  /** True quando o RIGHT registrou uma curtida (NÃO é "salvou"). */
  liked: boolean;
}

// ─── Armário / salvos (/api/saved-looks) ──────────────────────────────────────
// Salvar é explícito e separado da curtida.

export interface SaveLookRequest {
  look_id: UUID;
}

// ─── Denúncias (/api/reports) ─────────────────────────────────────────────────

export type ReportTarget = 'profile' | 'seller' | 'look';

export interface ReportCreate {
  target_type: ReportTarget;
  target_id: UUID;
  reason: string;
  description?: string;
  contact_email?: string;
}

export interface ReportResponse {
  id: UUID;
  target_type: ReportTarget;
  target_id: UUID;
  reason: string;
  description: string | null;
  status: string;
  created_at: ISODateTime | null;
}
