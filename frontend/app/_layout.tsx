import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { tokens } from "../src/ui/theme";
import { useAuth } from "../src/store/auth";

export default function RootLayout() {
  const rehydrate = useAuth((s) => s.rehydrate);

  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerLargeTitle: false,
          headerTransparent: false,
          headerTitleAlign: "center",
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: '#000' },
          headerTitleStyle: { color: '#fff', fontWeight: "700" },
          contentStyle: { backgroundColor: '#000' },
        }}
      />
    </SafeAreaProvider>
  );
}