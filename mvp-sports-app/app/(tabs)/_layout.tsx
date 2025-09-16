import React from 'react';
import { Tabs } from 'expo-router';
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: '#000' },
      headerTintColor: '#fff',
      tabBarStyle: { backgroundColor: '#000' },
      tabBarActiveTintColor: '#60A5FA',
      tabBarInactiveTintColor: '#9CA3AF',
    }}>
      <Tabs.Screen name="competitions" options={{ title: 'Competitions' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
    </Tabs>
  );
}