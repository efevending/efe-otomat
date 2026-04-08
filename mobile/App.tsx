import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import FirmaTanimlamaScreen from './src/screens/FirmaTanimlamaScreen';
import PersonelTanimlamaScreen from './src/screens/PersonelTanimlamaScreen';
import OtomatTanimlamaScreen from './src/screens/OtomatTanimlamaScreen';
import UrunTanimlamaScreen from './src/screens/UrunTanimlamaScreen';
import TedarikciTanimlamaScreen from './src/screens/TedarikciTanimlamaScreen';
import DepoTanimlamaScreen from './src/screens/DepoTanimlamaScreen';
import DepoTransferScreen from './src/screens/DepoTransferScreen';
import OtomatUrunHaritalariScreen from './src/screens/OtomatUrunHaritalariScreen';
import UrunFiyatTanimlamaScreen from './src/screens/UrunFiyatTanimlamaScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#2563eb' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 16 },
};

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Efe Otomat' }} />
          <Stack.Screen name="FirmaTanimlama" component={FirmaTanimlamaScreen} options={{ title: 'Firma Tanımlama' }} />
          <Stack.Screen name="PersonelTanimlama" component={PersonelTanimlamaScreen} options={{ title: 'Personel Tanımlama' }} />
          <Stack.Screen name="OtomatTanimlama" component={OtomatTanimlamaScreen} options={{ title: 'Otomat Tanımlama' }} />
          <Stack.Screen name="UrunTanimlama" component={UrunTanimlamaScreen} options={{ title: 'Ürün Tanımlama' }} />
          <Stack.Screen name="TedarikciTanimlama" component={TedarikciTanimlamaScreen} options={{ title: 'Tedarikçi Tanımlama' }} />
          <Stack.Screen name="DepoTanimlama" component={DepoTanimlamaScreen} options={{ title: 'Depo Tanımlama' }} />
          <Stack.Screen name="DepoTransfer" component={DepoTransferScreen} options={{ title: 'Depo Transfer İşlemleri' }} />
          <Stack.Screen name="OtomatUrunHaritalari" component={OtomatUrunHaritalariScreen} options={{ title: 'Otomat Ürün Haritaları' }} />
          <Stack.Screen name="UrunFiyatTanimlama" component={UrunFiyatTanimlamaScreen} options={{ title: 'Ürün Fiyat Tanımlama' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
