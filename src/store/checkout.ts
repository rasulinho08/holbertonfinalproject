import { create } from 'zustand';
import type { Address, DeliveryMethod, PaymentMethod } from '@/types';

/**
 * Checkout draft shared between:
 * - /checkout
 * - /checkout/payment
 * - checkout summary
 *
 * The selected delivery method is stored globally so it
 * remains available when navigating between checkout screens.
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

const INITIAL_DELIVERY_METHOD: DeliveryMethod = 'courier';
const INITIAL_PAYMENT_METHOD: PaymentMethod = 'cod';

export const useCheckout = create<CheckoutState>((set) => ({
  address: EMPTY_ADDRESS,

  // Default delivery method.
  // User can change it to "pickup" using setDeliveryMethod().
  deliveryMethod: INITIAL_DELIVERY_METHOD,

  paymentMethod: INITIAL_PAYMENT_METHOD,

  giftCardCode: null,
  giftCardAmount: 0,

  setAddress: (patch) =>
    set((state) => ({
      address: {
        ...state.address,
        ...patch,
      },
    })),

  setDeliveryMethod: (method) =>
    set({
      deliveryMethod: method,
    }),

  setPaymentMethod: (method) =>
    set({
      paymentMethod: method,
    }),

  applyGiftCard: (code, amount) =>
    set({
      giftCardCode: code,
      giftCardAmount: amount,
    }),

  clearGiftCard: () =>
    set({
      giftCardCode: null,
      giftCardAmount: 0,
    }),

  reset: () =>
    set({
      address: EMPTY_ADDRESS,
      deliveryMethod: INITIAL_DELIVERY_METHOD,
      paymentMethod: INITIAL_PAYMENT_METHOD,
      giftCardCode: null,
      giftCardAmount: 0,
    }),
}));

/**
 * Supported delivery cities in Azerbaijan.
 * Baku uses same-day/next-day delivery;
 * regions are handled through Azerpost.
 */
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