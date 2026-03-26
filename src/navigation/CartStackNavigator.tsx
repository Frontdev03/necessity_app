import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CartScreen } from 'src/screens/ecommerce/CartScreen';
import { CheckoutScreen } from 'src/screens/ecommerce/CheckoutScreen';
import { CartStackParamList } from './types';

const Stack = createNativeStackNavigator<CartStackParamList>();

export const CartStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
    </Stack.Navigator>
  );
};
