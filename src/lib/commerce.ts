import { Linking, Platform } from 'react-native';
import api from './api';
import { CartItem, CheckoutResultado, EnderecoEntrega, Pedido } from '../types/commerce';

/**
 * Carrinho (`/cart-items`) e pedidos/pagamento (`/orders`, Mercado Pago) falam
 * com o backend de verdade.
 *
 * Peculiaridades da API de carrinho (todas as rotas terminam com `/`):
 * - Quantidade é por DELTA, não valor absoluto: `PUT /add/{look_id}/` soma,
 *   `PUT /remove/{look_id}/` subtrai. Não existe "setar para N".
 * - `PUT /remove/{look_id}/` quebra com 500 se a subtração zera a
 *   quantidade (o service apaga a linha e devolve `None`, mas a rota exige
 *   `response_model=CartItemsResponse`) — por isso `updateCartItemQuantity`
 *   desvia para `DELETE` nesse caso em vez de chamar `remove`.
 * - `POST /` responde 400 se o look já está no carrinho (não incrementa
 *   sozinho — quem chama precisa tratar esse caso, ver telas que usam
 *   `addToCart`).
 */

interface CartItemLookResponse {
  id: string;
  quantity: number;
  price_quantity_total: number | string;
  look: { id: string; name: string; price: number | string | null; photos: string[] };
  created_at: string;
}

interface ListCartItemResponse {
  looks: CartItemLookResponse[];
  price_total: number | string;
}

export async function fetchCart(): Promise<CartItem[]> {
  const { data } = await api.get<ListCartItemResponse>('/cart-items/user/');
  return data.looks.map((item) => ({
    lookId: item.look.id,
    name: item.look.name,
    photo: item.look.photos[0] ?? '',
    unitPrice: Number(item.look.price ?? 0),
    quantity: item.quantity,
  }));
}

export async function addToCart(item: CartItem): Promise<void> {
  await api.post('/cart-items/', { look_id: item.lookId, quantity: item.quantity || 1 });
}

/** `delta` é o quanto somar/subtrair (não o valor final); `currentQuantity`
 *  é a quantidade atual do item no carrinho, pra saber se a subtração zera. */
export async function updateCartItemQuantity(
  lookId: string,
  delta: number,
  currentQuantity: number,
): Promise<void> {
  if (delta > 0) {
    await api.put(`/cart-items/add/${lookId}/`, { quantity: delta });
  } else if (currentQuantity + delta <= 0) {
    await api.delete('/cart-items/user/', { data: { look_id: lookId } });
  } else {
    await api.put(`/cart-items/remove/${lookId}/`, { quantity: -delta });
  }
}

export async function removeFromCart(lookId: string): Promise<void> {
  await api.delete('/cart-items/user/', { data: { look_id: lookId } });
}

// ─── Pedidos e pagamento (Mercado Pago Checkout Pro) ───────────────────────────
// O backend cria o pedido a partir do carrinho e devolve a URL de pagamento do
// Mercado Pago; a pessoa paga lá (Pix, cartão, boleto) e o webhook marca o pedido
// como pago. O app nunca vê dado de cartão.

export async function checkout(address: EnderecoEntrega): Promise<CheckoutResultado> {
  const { data } = await api.post<CheckoutResultado>('/orders/checkout', { address });
  return data;
}

export async function fetchOrders(): Promise<Pedido[]> {
  const { data } = await api.get<Pedido[]>('/orders');
  return data;
}

export async function fetchOrder(orderId: string): Promise<Pedido | null> {
  try {
    const { data } = await api.get<Pedido>(`/orders/${orderId}`);
    return data;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

/** Abre a página de pagamento do Mercado Pago. No site troca a própria aba (o MP
 *  devolve para o Lookly ao terminar); no celular abre o navegador do sistema. */
export async function abrirPagamento(url: string): Promise<void> {
  if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).location) {
    (globalThis as any).location.href = url;
    return;
  }
  await Linking.openURL(url);
}

/** Endereço pelo CEP (ViaCEP, público e gratuito). Devolve null se não achar. */
export async function buscarCep(cep: string): Promise<Partial<EnderecoEntrega> | null> {
  const digitos = cep.replace(/\D/g, '');
  if (digitos.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    const d = await r.json();
    if (!d || d.erro) return null;
    return { street: d.logradouro ?? '', district: d.bairro ?? '', city: d.localidade ?? '', state: d.uf ?? '' };
  } catch {
    return null;
  }
}

/** Texto do erro de checkout (o back manda `detail` em português). */
export function mensagemDeErroCheckout(e: any): string {
  const detalhe = e?.response?.data?.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (!e?.response) return 'Sem conexão com o servidor. Tente de novo.';
  return 'Não foi possível iniciar o pagamento. Tente de novo.';
}

/** Texto de toast para uma falha de carrinho. O back responde 400 com um `detail`
 *  em português quando falta estoque ("Sem estoque disponível" / "Estoque
 *  insuficiente (restam N)") — esse vale mais que a mensagem genérica. */
export function mensagemDeErroCarrinho(e: any, padrao = 'Não foi possível adicionar ao carrinho'): string {
  const detalhe = e?.response?.data?.detail;
  if (detalhe === 'Look already exists in cart') return 'Esse look já está no seu carrinho';
  if (typeof detalhe === 'string' && (detalhe.startsWith('Sem estoque') || detalhe.startsWith('Estoque insuficiente'))) {
    return detalhe;
  }
  return padrao;
}
