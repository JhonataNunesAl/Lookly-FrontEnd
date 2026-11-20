import { UUID, ISODateTime, Decimal } from './api';

/** Item do carrinho como a tela usa (vem de `/cart-items/user/`). */
export interface CartItem {
  lookId: UUID;
  name: string;
  photo: string;
  unitPrice: number;
  quantity: number;
  selectedSize?: string;
}

/** Endereço digitado no checkout (mesmos campos de `EnderecoEntrega` no backend). */
export interface EnderecoEntrega {
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

export interface CheckoutResultado {
  order_id: UUID;
  total: Decimal;
  /** Página de pagamento do Mercado Pago. */
  payment_url: string;
}

/** Situação do pedido (`orders.status`). */
export type StatusPedido = 'pending' | 'paid' | 'shipped' | 'delivered' | 'canceled';
/** Situação do pagamento (`orders.payment_status`). */
export type StatusPagamento = 'pending' | 'approved' | 'refused' | 'refunded';

/** Snapshot — nome/preço/foto da hora da compra. */
export interface ItemPedido {
  look_id: UUID;
  name: string;
  photo: string;
  quantity: number;
  unit_price: Decimal;
  subtotal: Decimal;
}

export interface Pedido {
  id: UUID;
  status: StatusPedido;
  payment_status: StatusPagamento;
  total: Decimal;
  shipping_address: Partial<EnderecoEntrega>;
  created_at: ISODateTime;
  items: ItemPedido[];
  /** Só em pedido aguardando pagamento: retomar no Mercado Pago. */
  payment_url: string | null;
}
