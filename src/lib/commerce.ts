import { CartItem, Order } from '../types/commerce';

/**
 * RASCUNHO — nenhuma função aqui fala com o backend ainda. Cada uma devolve
 * o mesmo mock que antes vivia direto dentro de `CarrinhoScreen`/`PedidoScreen`,
 * só organizado atrás de uma assinatura estável. Quando `POST /api/orders`
 * (e companhia) existirem no Lucker, troque o CORPO da função por uma chamada
 * real (`api.get`/`api.post`, mesmo padrão de `lib/feed.ts`) — as telas não
 * precisam mudar, porque já consomem essas funções, não o mock diretamente.
 *
 * Ver "Commerce invariants" no CLAUDE.md do Lucker antes de implementar
 * `checkout` de verdade — idempotência, sub-pedido por loja e snapshot de
 * preço não são opcionais.
 */

const MOCK_CART: CartItem[] = [
  {
    lookId: '1',
    name: 'Jaqueta Puffer Noir',
    photo: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
    unitPrice: 299.9,
    quantity: 1,
    selectedSize: 'G',
  },
];

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

// TODO(commerce): GET /api/cart
export async function fetchCart(): Promise<CartItem[]> {
  return MOCK_CART;
}

// TODO(commerce): POST /api/cart/items
export async function addToCart(_item: CartItem): Promise<void> {}

// TODO(commerce): PUT /api/cart/items/{lookId}
export async function updateCartItemQuantity(_lookId: string, _quantity: number): Promise<void> {}

// TODO(commerce): DELETE /api/cart/items/{lookId}
export async function removeFromCart(_lookId: string): Promise<void> {}

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
