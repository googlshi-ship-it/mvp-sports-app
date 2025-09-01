import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../src/store/auth';

export default function RootLayout() {
  const rehydrate = useAuth((s) => s.rehydrate);

  useEffect(() => {
    // Keep auth persistence; non-blocking
    rehydrate();
  }, [rehydrate]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerTransparent: false }} />
    </SafeAreaProvider>
  );
}