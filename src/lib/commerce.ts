import api from './api';
import { CartItem, Order } from '../types/commerce';

/**
 * Carrinho fala com o backend de verdade (`/cart-items`); pedidos/checkout
 * continuam RASCUNHO — o Lucker não tem `orders`/`payments` ainda. Ver
 * "Commerce invariants" no CLAUDE.md do Lucker antes de implementar
 * `checkout` de verdade — idempotência, sub-pedido por loja e snapshot de
 * preço não são opcionais.
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

// ─── Pedidos — ainda rascunho, o Lucker não tem orders/payments ──────────────

const MOCK_ORDER: Order = {
  id: '#LK-882910',
  createdAt: '2026-05-07T12:00:00Z',
  total: '299.90',
  address: {
    line1: 'Rua das Fashionistas, 123',
    line2: 'Bloco A, Apt 42',
    neighborhood: 'Jardins',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
  },
  subOrders: [
    {
      id: '#LK-882910-1',
      sellerId: 'mock-seller',
      sellerName: 'Lookly Studio',
      status: 'preparing',
      items: [
        {
          id: '1',
          lookName: 'Jaqueta Puffer Noir',
          photo: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
          unitPrice: '299.90',
          quantity: 1,
          selectedSize: 'G',
        },
      ],
    },
  ],
};

// TODO(commerce): POST /api/orders — não implementar sem antes desenhar o
// backend (idempotency_key, reserva de estoque, split por loja).
export async function checkout(): Promise<Order> {
  throw new Error('checkout ainda não implementado — ver src/lib/commerce.ts');
}

// TODO(commerce): GET /api/orders
export async function fetchOrders(): Promise<Order[]> {
  return [MOCK_ORDER];
}

// TODO(commerce): GET /api/orders/{id}
export async function fetchOrder(orderId: string): Promise<Order | null> {
  return MOCK_ORDER.id === orderId ? MOCK_ORDER : null;
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
