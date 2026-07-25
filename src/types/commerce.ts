import { UUID, ISODateTime, Decimal } from './api';

/**
 * RASCUNHO — nada aqui é persistido de verdade ainda. O backend (Lucker) não
 * tem camada de comércio (pedidos/pagamentos/estoque); ver "Commerce
 * invariants" no CLAUDE.md dele antes de implementar isso pra valer — os
 * tipos abaixo já seguem aquele desenho (sub-pedido por loja, item como
 * snapshot, pagamento como tabela própria) pra front e back não divergirem
 * quando alguém construir o backend real. `src/lib/commerce.ts` é o outro
 * lado deste rascunho — comece por ele.
 */

export interface CartItem {
  lookId: UUID;
  name: string;
  photo: string;
  unitPrice: number;
  quantity: number;
  selectedSize?: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Address {
  line1: string;
  line2?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export type PaymentMethod =
  | { type: 'credit_card'; lastFourDigits: string; installments: number }
  | { type: 'pix' }
  | { type: 'boleto' };

/** Snapshot — nome/preço/foto copiados na hora da compra. O look pode mudar
 *  ou sumir depois; o pedido não pode. */
export interface OrderItem {
  id: UUID;
  lookName: string;
  photo: string;
  unitPrice: Decimal;
  quantity: number;
  selectedSize?: string;
}

/** Um pedido pode ter várias lojas — um pagamento/endereço, uma sub_order por
 *  vendedor, cada uma com status e rastreio próprios (uma loja atrasar não
 *  trava as outras). */
export interface SubOrder {
  id: UUID;
  sellerId: UUID;
  sellerName: string;
  status: OrderStatus;
  items: OrderItem[];
  trackingCode?: string;
}

export interface Order {
  id: UUID;
  createdAt: ISODateTime;
  total: Decimal;
  address: Address;
  subOrders: SubOrder[];
}
