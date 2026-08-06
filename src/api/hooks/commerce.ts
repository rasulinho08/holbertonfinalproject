import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';
import type {
  Address,
  CartSummary,
  DeliveryMethod,
  Order,
  Paginated,
  PaymentMethod,
} from '@/types';

export function useCart() {
  return useQuery({
    queryKey: qk.cart,
    queryFn: () => api.get<CartSummary>(Endpoints.cart.get),
  });
}

/** Item count for the tab-bar badge — reads the cart cache without refetching. */
export function useCartCount(): number {
  const { data } = useCart();
  return data?.itemCount ?? 0;
}

export function useAddToCart() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, quantity = 1 }: { bookId: string; quantity?: number }) =>
      api.post<CartSummary>(Endpoints.cart.addItem, { bookId, quantity }),
    onSuccess: (cart) => client.setQueryData(qk.cart, cart),
  });
}

export function useUpdateCartItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, quantity }: { bookId: string; quantity: number }) =>
      api.patch<CartSummary>(Endpoints.cart.updateItem(bookId), { quantity }),
    onSuccess: (cart) => client.setQueryData(qk.cart, cart),
  });
}

export function useRemoveCartItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => api.delete<CartSummary>(Endpoints.cart.removeItem(bookId)),
    onSuccess: (cart) => client.setQueryData(qk.cart, cart),
  });
}

export function useClearCart() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<CartSummary>(Endpoints.cart.clear),
    onSuccess: (cart) => client.setQueryData(qk.cart, cart),
  });
}

/* -------------------------------- checkout -------------------------------- */

export interface PlaceOrderInput {
  address: Address;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  giftCardCode?: string;
}

/**
 * Checkout returns an array: a multi-publisher cart becomes one order per
 * publisher, which is the behaviour the spec asks for.
 */
export function usePlaceOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => api.post<Order[]>(Endpoints.orders.create, input),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.cart }),
        client.invalidateQueries({ queryKey: qk.orders.all }),
        client.invalidateQueries({ queryKey: qk.wallet }),
        client.invalidateQueries({ queryKey: qk.books.all }),
        client.invalidateQueries({ queryKey: qk.notifications }),
      ]),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: qk.orders.all,
    queryFn: () => api.get<Paginated<Order>>(Endpoints.orders.list, { limit: 50 }),
    select: (page) => page.data,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: qk.orders.detail(id ?? ''),
    queryFn: () => api.get<Order>(Endpoints.orders.detail(id!)),
    enabled: !!id,
    // Orders advance through their delivery timeline, so keep this one fresh.
    refetchInterval: 30_000,
  });
}

export function useCancelOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Order>(Endpoints.orders.cancel(id)),
    onSuccess: (order) => {
      client.setQueryData(qk.orders.detail(order.id), order);
      return client.invalidateQueries({ queryKey: qk.orders.all });
    },
  });
}

export interface Receipt {
  orderId: string;
  code: string;
  issuedAt: string;
  url: string | null;
  lines: { title: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

export function useReceipt(orderId: string | undefined) {
  return useQuery({
    queryKey: qk.orders.receipt(orderId ?? ''),
    queryFn: () => api.get<Receipt>(Endpoints.orders.receipt(orderId!)),
    enabled: !!orderId,
  });
}

/* --------------------------- wallet & gift cards -------------------------- */

export function useWallet() {
  return useQuery({
    queryKey: qk.wallet,
    queryFn: () => api.get<{ balance: number; currency: string }>(Endpoints.wallet.get),
  });
}

export function useRedeemGiftCard() {
  return useMutation({
    mutationFn: (code: string) =>
      api.post<{ code: string; amount: number; valid: boolean }>(
        Endpoints.wallet.redeemGiftCard,
        { code },
      ),
  });
}
