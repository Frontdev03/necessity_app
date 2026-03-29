import { configureStore } from '@reduxjs/toolkit';
import { setAuthTokenGetter } from 'src/services/necessity';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import ordersReducer from './ordersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    orders: ordersReducer,
  },
});

// Attach immediately so cart/checkout requests send Bearer token even before App's hydrate effect runs.
setAuthTokenGetter(() => store.getState().auth.token);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
