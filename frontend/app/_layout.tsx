import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppWrapper from '../AppWrapper';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppWrapper>
        <Stack screenOptions={{ headerShown: false }} />
      </AppWrapper>
    </SafeAreaProvider>
  );
}