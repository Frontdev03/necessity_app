import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  date: string;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  items: OrderLineItem[];
  itemCount: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  company: string;
  paymentStatus: 'Paid' | 'Refunded' | 'Pending';
  shippingAddress?: string;
}

const initialState: Order[] = [
  {
    id: 'ORD-98234',
    date: '22 Oct 2024',
    status: 'Processing',
    itemCount: 50,
    subtotal: 122881,
    gstAmount: 22119,
    total: 145000,
    company: 'B2B Partners Ltd.',
    paymentStatus: 'Paid',
    shippingAddress: '45 Industrial Estate, Sector 12, Delhi - 110078',
    items: [
      { productId: 'p1', productName: 'Handcrafted Wooden Dining Table', quantity: 10, unitPrice: 22000, total: 220000 },
      { productId: 'p2', productName: 'Bohemian Macrame Wall Hangings', quantity: 40, unitPrice: 650, total: 26000 },
    ],
  },
  {
    id: 'ORD-87122',
    date: '15 Oct 2024',
    status: 'Delivered',
    itemCount: 120,
    subtotal: 69492,
    gstAmount: 12508,
    total: 82000,
    company: 'Design Studio Pvt Ltd',
    paymentStatus: 'Paid',
    shippingAddress: '12 MG Road, Koramangala, Bangalore - 560034',
    items: [
      { productId: 'p3', productName: 'Industrial Vintage Pendant Lights', quantity: 20, unitPrice: 1200, total: 24000 },
      { productId: 'p4', productName: 'Luxury Cotton Bed Linens', quantity: 100, unitPrice: 1450, total: 145000 },
    ],
  },
  {
    id: 'ORD-76019',
    date: '02 Sep 2024',
    status: 'Cancelled',
    itemCount: 200,
    subtotal: 13220,
    gstAmount: 2380,
    total: 15600,
    company: 'Cafe Monarch',
    paymentStatus: 'Refunded',
    shippingAddress: '78 Park Street, Kolkata - 700016',
    items: [
      { productId: 'p5', productName: 'Ceramic Dinner Sets - 24 Pieces', quantity: 20, unitPrice: 3000, total: 60000 },
      { productId: 'p2', productName: 'Bohemian Macrame Wall Hangings', quantity: 180, unitPrice: 650, total: 117000 },
    ],
  },
];

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    cancelOrder: (state, action: PayloadAction<string>) => {
      const order = state.find((o) => o.id === action.payload);
      if (order && order.status === 'Processing') {
        order.status = 'Cancelled';
        order.paymentStatus = 'Refunded';
      }
    },
  },
});

export const { cancelOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
