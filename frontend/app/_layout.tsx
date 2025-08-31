import { Stack } from "expo-router";
import { useColorScheme, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../src/store/auth";

export default function RootLayout() {
  const scheme = useColorScheme();
  const rehydrate = useAuth((s) => s.rehydrate);
  useEffect(() => { rehydrate(); }, [rehydrate]);
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </>
  );
}