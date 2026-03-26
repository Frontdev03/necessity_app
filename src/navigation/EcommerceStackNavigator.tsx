import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExploreScreen } from 'src/screens/ecommerce/ExploreScreen';
import { ProductDetailScreen } from 'src/screens/ecommerce/ProductDetailScreen';
import { ProductListScreen } from 'src/screens/ecommerce/ProductListScreen';
import { EcommerceStackParamList } from './types';

const Stack = createNativeStackNavigator<EcommerceStackParamList>();

export const EcommerceStackNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="Explore" component={ExploreScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="ProductList" component={ProductListScreen} />
        </Stack.Navigator>
    );
};
