import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { tokens } from "../src/ui/theme";

export default function RootLayout() {
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