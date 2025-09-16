import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TeamNewsStub() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team News</Text>
      <Text style={styles.text}>Coming soon. This screen will aggregate news for selected teams.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", padding: 16, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  text: { color: "#c7d1df", textAlign: "center" },
});