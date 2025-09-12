import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const errorHandler = (e: any, isFatal?: boolean) => {
      // Log to console to be visible in Expo logs and EAS Update crash traces
      console.error('GLOBAL ERROR', isFatal, e?.message || e, e?.stack || '');
    };
    // @ts-ignore - ErrorUtils exists in RN global scope
    if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
      // @ts-ignore
      ErrorUtils.setGlobalHandler(errorHandler);
    }
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Text style={{ position: 'absolute', bottom: 20, left: 10, color: '#0f0' }}>Debug overlay active</Text>
    </View>
  );
}