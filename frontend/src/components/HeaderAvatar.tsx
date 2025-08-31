import React from "react";
import { Pressable, View, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function HeaderAvatar() {
  const router = useRouter();
  const onPress = () => {
    // Stub action per requirements: open a simple menu later; for now go to Settings
    try { router.push("/settings"); } catch (e) { Alert.alert("Profile", "Profile modal coming soon"); }
  };
  return (
    <Pressable accessibilityRole="button" hitSlop={12} onPress={onPress} style={styles.hitbox}>
      <View style={styles.avatar} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitbox: { padding: 8 }, // 28 + 8*2 = 44 touch target
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#2a2f45", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
});