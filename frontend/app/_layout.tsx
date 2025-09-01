import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { tokens } from "../src/ui/theme";
import { useAuth } from "../src/store/auth";

export default function RootLayout() {
  const rehydrate = useAuth((s) => s.rehydrate);

  useEffect(() => {
    // Do not block UI; just rehydrate on mount
    rehydrate();
  }, [rehydrate]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerTitleAlign: "center",
          headerTintColor: tokens.text,
          headerTitleStyle: { color: tokens.text, fontWeight: "700" },
          contentStyle: { backgroundColor: tokens.bg },
        }}
      />
    </SafeAreaProvider>
  );
}