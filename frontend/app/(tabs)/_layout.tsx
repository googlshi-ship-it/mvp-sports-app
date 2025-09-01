import React from "react";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { tokens } from "../../src/ui/theme";
import { Ionicons } from "@expo/vector-icons";
import HeaderAvatar from "../../src/components/HeaderAvatar";

export default function TabsLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerTransparent: false,
          headerTitleAlign: "center",
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: '#000' },
          headerRight: () => <HeaderAvatar />,
          tabBarActiveTintColor: tokens.brand,
          tabBarInactiveTintColor: "#9AA3B2",
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopColor: "transparent",
            height: 64,
            paddingBottom: 10,
          },
        }}
      >
        <Tabs.Screen
          name="competitions"
          options={{
            title: "Competitions",
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: "Matches",
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}