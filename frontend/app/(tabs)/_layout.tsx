import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderAvatar from "../../src/components/HeaderAvatar";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerRight: () => <HeaderAvatar /> }}>
      <Tabs.Screen name="index" options={{ title: "Matches", tabBarIcon: ({ color, size }) => (<Ionicons name="trophy-outline" size={size} color={color} />) }} />
      <Tabs.Screen name="competitions" options={{ title: "Competitions", tabBarIcon: ({ color, size }) => (<Ionicons name="grid-outline" size={size} color={color} />) }} />
      <Tabs.Screen name="leaderboard" options={{ title: "Leaderboard", tabBarIcon: ({ color, size }) => (<Ionicons name="medal-outline" size={size} color={color} />) }} />
      <Tabs.Screen name="teams" options={{ title: "My Teams", tabBarIcon: ({ color, size }) => (<Ionicons name="star-outline" size={size} color={color} />) }} />
      {/* Profile tab removed per requirements */}
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => (<Ionicons name="settings-outline" size={size} color={color} />) }} />
    </Tabs>
  );
}