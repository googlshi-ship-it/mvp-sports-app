import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { useAuth } from "../src/store/auth";

export default function RootLayout() {
  const scheme = useColorScheme();
  const rehydrate = useAuth((s) =&gt; s.rehydrate);

  useEffect(() =&gt; {
    rehydrate();
  }, [rehydrate]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitleAlign: "center",
          headerBackTitle: "Back",
          headerTintColor: scheme === "dark" ? "#fff" : "#000",
          headerStyle: {
            backgroundColor: scheme === "dark" ? "#000" : "#fff",
          },
        }}
      />
    </>
  );
}