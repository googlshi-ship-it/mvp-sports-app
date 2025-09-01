import React from "react";
import { Tabs } from "expo-router";
import { tokens } from "../../src/ui/theme";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTransparent: true,
        headerTitleAlign: "center",
        headerTintColor: tokens.text,
        tabBarActiveTintColor: tokens.brand,
        tabBarInactiveTintColor: "#9AA3B2",
        tabBarStyle: {
          backgroundColor: "#0B0B11",
          borderTopColor: "transparent",
          height: 64,
          paddingBottom: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="competitions"
        options={{
          title: "Competitions",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="medal-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}