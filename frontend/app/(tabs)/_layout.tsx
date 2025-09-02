import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import HeaderAvatar from '../../components/HeaderAvatar';

export default function TabsLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          tabBarStyle: { backgroundColor: '#000', borderTopColor: 'transparent', height: 64, paddingBottom: 10 },
          headerRight: () => <HeaderAvatar />,
        }}
      >
        <Tabs.Screen
          name="competitions"
          options={{ title: 'Competitions', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="matches"
          options={{ title: 'Matches', tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} /> }}
        />
        <Tabs.Screen name="leaderboard" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="teams" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}