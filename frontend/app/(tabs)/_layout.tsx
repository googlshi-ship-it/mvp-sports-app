import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#000' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tabs.Screen name="competitions" options={{ title: 'Competitions' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
    </Tabs>
  );
}