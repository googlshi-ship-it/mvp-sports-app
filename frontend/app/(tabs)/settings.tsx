import { View, Text, StyleSheet, Switch } from "react-native";
import { useState } from "react";

export default function SettingsScreen() {
  const [r7, setR7] = useState(true);
  const [r1d, setR1d] = useState(true);
  const [r1h, setR1h] = useState(true);
  const [clubLikeNational, setClubLikeNational] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.row}><Text style={styles.label}>Default country</Text><Text style={styles.value}>🇨🇭 CH</Text></View>
      <View style={styles.row}><Text style={styles.label}>Theme</Text><Text style={styles.value}>Auto</Text></View>
      <View style={styles.row}><Text style={styles.label}>Reminders 7d</Text><Switch value={r7} onValueChange={setR7} /></View>
      <View style={styles.row}><Text style={styles.label}>Reminders 1d</Text><Switch value={r1d} onValueChange={setR1d} /></View>
      <View style={styles.row}><Text style={styles.label}>Reminders 1h</Text><Switch value={r1h} onValueChange={setR1h} /></View>
      <View style={styles.row}><Text style={styles.label}>Display clubs like national teams</Text><Switch value={clubLikeNational} onValueChange={setClubLikeNational} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", padding: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#242436" },
  label: { color: "#c7d1df" },
  value: { color: "#fff", fontWeight: "700" },
});