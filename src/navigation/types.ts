import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type EcommerceStackParamList = {
  Explore: undefined;
  ProductDetail: { productId: string };
  ProductList: { category?: string } | undefined;
};

export type CartStackParamList = {
  Cart: undefined;
  Checkout: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  PersonalInformation: undefined;
  Security: undefined;
  Notifications: undefined;
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
};

export type MainTabParamList = {
  Shop: NavigatorScreenParams<EcommerceStackParamList>;
  Cart: NavigatorScreenParams<CartStackParamList>;
  Orders: NavigatorScreenParams<OrdersStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {
      OrderDetail: { orderId: string };
    }
  }
}
