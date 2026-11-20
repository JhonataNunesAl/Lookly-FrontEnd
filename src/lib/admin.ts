import api from './api';
import { supabase } from './supabase';

/**
 * Painel de administração (`/api/admin/*`). Quem é admin é decidido no SERVIDOR
 * (e-mail confirmado no Supabase Auth); aqui só se decide se o botão aparece.
 */

/** Só para não chamar o servidor à toa com toda conta: a palavra final é do backend.
 *  EXPO_PUBLIC_ADMIN_EMAILS (separados por vírgula) troca a lista sem mexer no código. */
const EMAILS_ADMIN = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? 'yorn.exe@gmail.com')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export async function souAdmin(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user?.email?.toLowerCase();
    if (!email || !EMAILS_ADMIN.includes(email)) return false;
    await api.get('/admin/me');
    return true;
  } catch {
    return false;
  }
}

export interface Pagina<T> { items: T[]; total: number }

export interface Resumo {
  users: number;
  users_blocked: number;
  stores: number;
  stores_inactive: number;
  looks_active: number;
  looks_total: number;
  orders_paid: number;
  orders_pending: number;
  revenue_paid: string | number;
  reports_open: number;
  new_users_7d: number;
}

export interface UsuarioAdmin {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  created_at: string | null;
  store: { id: string; store_name: string; status: string } | null;
  orders_count: number;
  is_admin: boolean;
}

export interface LojaAdmin {
  id: string;
  store_name: string;
  store_slug: string;
  store_logo_url: string | null;
  description: string | null;
  status: string;
  created_at: string | null;
  owner_id: string;
  owner_username: string | null;
  owner_email: string | null;
  looks_count: number;
  items_sold: number;
  revenue: string | number;
}

export interface PecaAdmin {
  id: string;
  name: string;
  photo: string | null;
  price: string | number | null;
  stock_quantity: number;
  status: string;
  created_at: string | null;
  seller_id: string;
  store_name: string | null;
  category_name: string | null;
  times_sold: number;
}

export interface PedidoAdmin {
  id: string;
  created_at: string | null;
  status: string;
  payment_status: string;
  total: string | number;
  buyer_username: string | null;
  buyer_email: string | null;
  items: {
    look_id: string;
    name: string;
    store_name: string | null;
    quantity: number;
    subtotal: string | number;
    fulfillment_status: string | null;
  }[];
}

export interface CategoriaAdmin {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  looks_count: number;
}

export interface DenunciaAdmin {
  id: string;
  target_type: 'profile' | 'seller' | 'look';
  target_id: string;
  target_label: string | null;
  reason: string;
  description: string | null;
  contact_email: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'rejected';
  created_at: string | null;
  reporter_username: string | null;
}

export interface TaxaConfig {
  demo_active: boolean;
  demo_ends_at: string | null;
  fee_percent: string | number;
  grace_days: number;
  updated_at: string | null;
}

export interface Repasse {
  seller_id: string;
  store_name: string;
  items: number;
  gross: string | number;
  fees: string | number;
  /** Tarifa do Mercado Pago descontada do repasse. */
  mp_fees?: string | number;
  net: string | number;
}

/** Palavra que o servidor exige para apagar. */
export const CONFIRMACAO = 'APAGAR';

type Filtro = { q?: string; status?: string; offset?: number; limit?: number; seller_id?: string };

function params(f: Filtro): Record<string, string | number> {
  const p: Record<string, string | number> = { limit: f.limit ?? 30, offset: f.offset ?? 0 };
  if (f.q?.trim()) p.q = f.q.trim();
  if (f.status) p.status = f.status;
  if (f.seller_id) p.seller_id = f.seller_id;
  return p;
}

export const admin = {
  resumo: async () => (await api.get<Resumo>('/admin/overview')).data,

  usuarios: async (f: Filtro) => (await api.get<Pagina<UsuarioAdmin>>('/admin/users', { params: params(f) })).data,
  editarUsuario: async (id: string, dados: Partial<Pick<UsuarioAdmin, 'status' | 'full_name' | 'username'>>) =>
    (await api.patch<UsuarioAdmin>(`/admin/users/${id}`, dados)).data,
  apagarUsuario: async (id: string, confirm: string) => { await api.delete(`/admin/users/${id}`, { params: { confirm } }); },

  lojas: async (f: Filtro) => (await api.get<Pagina<LojaAdmin>>('/admin/stores', { params: params(f) })).data,
  editarLoja: async (id: string, dados: Partial<Pick<LojaAdmin, 'store_name' | 'description' | 'status'>>) =>
    (await api.patch<LojaAdmin>(`/admin/stores/${id}`, dados)).data,
  apagarLoja: async (id: string, confirm: string) => { await api.delete(`/admin/stores/${id}`, { params: { confirm } }); },

  pecas: async (f: Filtro) => (await api.get<Pagina<PecaAdmin>>('/admin/looks', { params: params(f) })).data,
  editarPeca: async (id: string, dados: { name?: string; price?: string; status?: string }) =>
    (await api.patch<PecaAdmin>(`/admin/looks/${id}`, dados)).data,
  apagarPeca: async (id: string, confirm: string) => { await api.delete(`/admin/looks/${id}`, { params: { confirm } }); },

  pedidos: async (f: Filtro & { payment_status?: string }) => {
    const p = params(f);
    delete p.status;
    if (f.payment_status) p.payment_status = f.payment_status;
    return (await api.get<Pagina<PedidoAdmin>>('/admin/orders', { params: p })).data;
  },

  categorias: async () => (await api.get<CategoriaAdmin[]>('/admin/categories')).data,
  criarCategoria: async (name: string) => (await api.post<CategoriaAdmin>('/admin/categories', { name })).data,
  editarCategoria: async (id: string, dados: Partial<Pick<CategoriaAdmin, 'name' | 'is_active' | 'sort_order'>>) =>
    (await api.patch<CategoriaAdmin>(`/admin/categories/${id}`, dados)).data,
  apagarCategoria: async (id: string, confirm: string) => { await api.delete(`/admin/categories/${id}`, { params: { confirm } }); },

  denuncias: async (f: Filtro) => (await api.get<Pagina<DenunciaAdmin>>('/admin/reports', { params: params(f) })).data,
  editarDenuncia: async (id: string, status: DenunciaAdmin['status']) =>
    (await api.patch<DenunciaAdmin>(`/admin/reports/${id}`, { status })).data,

  taxa: async () => (await api.get<TaxaConfig>('/admin/platform-fee')).data,
  mudarTaxa: async (dados: { fee_percent?: string; grace_days?: number; end_demo_now?: boolean; demo_ends_at?: string | null }) =>
    (await api.put<TaxaConfig>('/admin/platform-fee', dados)).data,
  repasses: async () => (await api.get<Repasse[]>('/admin/payouts')).data,
  marcarRepasse: async (sellerId: string) => (await api.post<{ items_marked: number }>(`/admin/payouts/${sellerId}/paid`)).data,
};

/** Mensagem do servidor (`detail`) ou uma padrão. */
export function erroAdmin(e: any, padrao = 'Não foi possível concluir. Tente de novo.'): string {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg);
  if (e?.response?.status === 403) return 'Acesso restrito à administração.';
  if (!e?.response) return 'Sem conexão com o servidor.';
  return padrao;
}
