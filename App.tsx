/**
 * NECESSITY B2B Ecommerce
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store } from 'src/store';
import { hydrateAuthThunk, refreshAuthProfileThunk } from 'src/store/authSlice';
import { RootNavigator } from 'src/navigation/RootNavigator';
import { colors } from 'src/theme/colors';

function App(): React.JSX.Element {
  useEffect(() => {
    void store.dispatch(hydrateAuthThunk()).then((action) => {
      if (
        hydrateAuthThunk.fulfilled.match(action) &&
        action.payload?.token &&
        action.payload.user?.role === 'customer'
      ) {
        void store.dispatch(refreshAuthProfileThunk());
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={colors.background}
          />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <Toast />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;
