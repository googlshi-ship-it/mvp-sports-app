import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import AppWrapper from '../AppWrapper';

console.log('BOOT: importing root layout');

export default function RootLayout() {
  console.log('BOOT: rendering RootLayout');
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppWrapper>
        <View style={{ flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#0f0', fontSize: 18, fontWeight: '700' }}>BOOT OK: Root mounted</Text>
          <Text style={{ color: '#9AA3B2', marginTop: 8 }}>If you see this, JS executed successfully</Text>
        </View>
      </AppWrapper>
    </SafeAreaProvider>
  );
}