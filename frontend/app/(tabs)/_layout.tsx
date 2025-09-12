import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import HeaderAvatar from '../../components/HeaderAvatar';

export default function TabsLayout() {
  return (
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
    </Tabs>
  );
}