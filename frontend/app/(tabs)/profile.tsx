import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../../src/store/auth";
import { apiGet } from "../../src/api/client";

export default function ProfileScreen() {
  const { user, clear } = useAuth();
  const [me, setMe] = useState<any | null>(user);

  useEffect(() => {
    const load = async () => {
      try { const m = await apiGet("/api/me"); setMe(m); } catch {}
    };
    load();
  }, []);

  const logout = () => {
    clear();
    Alert.alert("Logged out");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.row}>Email: <Text style={styles.value}>{me?.email || "-"}</Text></Text>
      <Text style={styles.row}>Score: <Text style={styles.value}>{me?.score ?? 0}</Text></Text>
      <TouchableOpacity onPress={logout} style={styles.button}><Text style={styles.buttonTxt}>Logout</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", padding: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  row: { color: "#c7d1df", marginTop: 6 },
  value: { color: "#fff", fontWeight: "700" },
  button: { marginTop: 16, backgroundColor: "#4a56e2", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  buttonTxt: { color: "#fff", fontWeight: "700" },
});