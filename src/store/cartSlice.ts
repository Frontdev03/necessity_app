import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CartItem } from 'src/types/cart';
import {
  ApiProduct,
  type ApiCartItem,
} from 'src/services/ecommerceNecessity';

export interface AppliedPromo {
  code: string;
  discountAmount: number;
}

interface CartState {
  items: CartItem[];
  appliedPromo: AppliedPromo | null;
}

const initialState: CartState = {
  items: [],
  appliedPromo: null,
};

/** Avoid forcing qty to 0 when the catalog payload has stock 0/missing but the server accepted the add. */
function clampQuantityToStock(product: ApiProduct, quantity: number): number {
  const stock = product.inventory?.stockQuantity;
  const q = Math.max(1, quantity);
  if (stock == null || Number.isNaN(Number(stock)) || stock <= 0) {
    return q;
  }
  return Math.min(Number(stock), q);
}

/** Build a minimal ApiProduct from a cart line for display in CartScreen */
function apiCartItemToCartItem(apiItem: ApiCartItem): CartItem {
  const product = apiItem.productId;
  const variant = apiItem.variantId;
  const imageUrl = product.images?.[0]?.url ?? 'https://via.placeholder.com/150';
  const minimalProduct: ApiProduct = {
    _id: product._id,
    basicInfo: {
      name: product.basicInfo.name,
      sku: variant?.skuCode ?? '',
      description: '',
      categoryId: { _id: '', name: '' },
      productType: 'simple',
    },
    status: 'active',
    pricing: {
      unit: variant?.uom ?? 'UNIT',
      basePrice: variant?.basePrice ?? apiItem.unitPrice,
      moq: 1,
    },
    inventory: {
      stockQuantity: 999,
      stockStatus: 'in_stock',
      lowStockThreshold: 0,
    },
    visibilityControl: {
      visibility: 'all',
      selectedGroups: [],
      selectedCustomers: [],
    },
    media: {
      images: [{ url: imageUrl, isPrimary: true, _id: '' }],
      videos: [],
    },
    specifications: {
      materialTypes: [],
      dimensions: { length: 0, width: 0, height: 0, unit: 'cm' },
      weight: { value: 0, unit: 'kg' },
    },
    hasVariants: false,
    createdAt: '',
    updatedAt: '',
    __v: 0,
  };
  return {
    lineId: apiItem._id,
    product: minimalProduct,
    quantity: apiItem.quantity,
    unitPrice: apiItem.unitPrice,
    pricingSource: apiItem.pricingSource,
    variantId: variant?._id,
  };
}

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<{ product: ApiProduct; quantity: number; variantId?: string }>) => {
      const { product, quantity, variantId } = action.payload;
      const existing = state.items.find((i) => i.product._id === product._id && i.variantId === variantId);
      if (existing) {
        existing.quantity = clampQuantityToStock(product, existing.quantity + quantity);
      } else {
        state.items.push({
          lineId: variantId || `${product._id}-${Date.now()}`,
          product,
          quantity: clampQuantityToStock(product, quantity),
          variantId,
        });
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.lineId !== action.payload);
    },
    updateQuantity: (state, action: PayloadAction<{ lineId: string; quantity: number }>) => {
      const { lineId, quantity } = action.payload;
      const item = state.items.find((i) => i.lineId === lineId);
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((i) => i.lineId !== lineId);
        } else {
          item.quantity = clampQuantityToStock(item.product, quantity);
        }
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.appliedPromo = null;
    },
    setCartFromApi: (state, action: PayloadAction<{ items: ApiCartItem[] }>) => {
      state.items = action.payload.items.map(apiCartItemToCartItem);
    },
    setAppliedPromo: (state, action: PayloadAction<AppliedPromo | null>) => {
      state.appliedPromo = action.payload;
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, setCartFromApi, setAppliedPromo } =
  cartSlice.actions;
export default cartSlice.reducer;
