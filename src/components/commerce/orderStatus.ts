import type { TranslationKey } from '@/i18n';
import type { BadgeTone } from '@/components/ui';
import type { OrderStatus } from '@/types';

/**
 * Single mapping from order status to its label and colour, shared by the
 * orders list, the tracking timeline and the publisher dashboard — so a status
 * never renders green in one place and grey in another.
 */

const LABELS: Record<OrderStatus, TranslationKey> = {
  pending: 'order.statusPending',
  confirmed: 'order.statusConfirmed',
  preparing: 'order.statusPreparing',
  shipped: 'order.statusShipped',
  out_for_delivery: 'order.statusOutForDelivery',
  delivered: 'order.statusDelivered',
  cancelled: 'order.statusCancelled',
};

const TONES: Record<OrderStatus, BadgeTone> = {
  pending: 'neutral',
  confirmed: 'info',
  preparing: 'info',
  shipped: 'primary',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'danger',
};

export function orderStatusLabelKey(status: OrderStatus): TranslationKey {
  return LABELS[status];
}

export function orderStatusTone(status: OrderStatus): BadgeTone {
  return TONES[status];
}

/** The happy-path sequence, used to render the tracking timeline. */
export const ORDER_TIMELINE: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'out_for_delivery',
  'delivered',
];
