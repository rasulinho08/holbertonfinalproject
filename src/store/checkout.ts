import { create } from 'zustand';
import type { Address, DeliveryMethod, PaymentMethod } from '@/types';

/**
 * Checkout draft, shared between `/checkout` (address + delivery) and
 * `/checkout/payment`. Deliberately not persisted — an abandoned checkout
 * should not resurface days later with a stale address.
 */
interface CheckoutState {
  address: Address;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  giftCardCode: string | null;
  giftCardAmount: number;

  setAddress: (patch: Partial<Address>) => void;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  applyGiftCard: (code: string, amount: number) => void;
  clearGiftCard: () => void;
  reset: () => void;
}

const EMPTY_ADDRESS: Address = {
  fullName: '',
  phone: '',
  city: 'Bakı',
  line: '',
  note: '',
};

export const useCheckout = create<CheckoutState>((set) => ({
  address: EMPTY_ADDRESS,
  deliveryMethod: 'courier',
  paymentMethod: 'cod',
  giftCardCode: null,
  giftCardAmount: 0,

  setAddress: (patch) => set((state) => ({ address: { ...state.address, ...patch } })),
  setDeliveryMethod: (deliveryMethod) => set({ deliveryMethod }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  applyGiftCard: (giftCardCode, giftCardAmount) => set({ giftCardCode, giftCardAmount }),
  clearGiftCard: () => set({ giftCardCode: null, giftCardAmount: 0 }),
  reset: () =>
    set({
      address: EMPTY_ADDRESS,
      deliveryMethod: 'courier',
      paymentMethod: 'cod',
      giftCardCode: null,
      giftCardAmount: 0,
    }),
}));

/** Baku is same-day/next-day; regions go through Azerpost. */
export const AZ_CITIES = [
  'Bakı',
  'Sumqayıt',
  'Gəncə',
  'Mingəçevir',
  'Şirvan',
  'Naxçıvan',
  'Lənkəran',
  'Şəki',
  'Quba',
  'Qəbələ',
  'Zaqatala',
  'Digər region',
] as const;
