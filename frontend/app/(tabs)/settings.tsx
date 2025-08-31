import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, TextInput, Platform, ToastAndroid } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { registerForPushNotificationsAsync, getRegisteredPushToken, sendLocalTestNotification } from "../../src/notifications";
import { apiGet, apiPost } from "../../src/api/client";
import { useUIStore } from "../../src/store/ui";
import Constants from "expo-constants";

const ADMIN_ENABLED = (typeof __DEV__ !== "undefined" && __DEV__) || (process.env.EXPO_PUBLIC_ADMIN_DEBUG === "1");

export default function SettingsScreen() {
  const [r7, setR7] = useState(true);
  const [r1d, setR1d] = useState(true);
  const [r1h, setR1h] = useState(true);
  const [clubLikeNational, setClubLikeNational] = useState(false);

  const [pushToken, setPushToken] = useState<string | null>(null);
  const [remind12h, setRemind12h] = useState(false);
  const [country, setCountry] = useState("CH");
  const [hours, setHours] = useState("48");
  const [stats, setStats] = useState<any | null>(null);
  const [pendingList, setPendingList] = useState<any[] | null>(null);
  const tz = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } }, []);

  const reduceEffects = useUIStore((s) => s.reduceEffects);
  const setReduceEffects = useUIStore((s) => s.setReduceEffects);
  const demoMode = useUIStore((s) => s.demoMode);
  const setDemoMode = useUIStore((s) => s.setDemoMode);

  const backendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || (Constants.expoConfig as any)?.extra?.backend || "");

  const toast = (msg: string) => { if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert(msg); };

  useEffect(() => { const existing = getRegisteredPushToken(); if (existing) setPushToken(existing); refreshStats(); }, []);

  const refreshStats = async () => { try { const s = await apiGet("/api/notifications/stats"); setStats(s); } catch (e) {} };

  const enablePush = async () => { try { const token = await registerForPushNotificationsAsync(country, remind12h); setPushToken(token); toast("Push enabled"); } catch (e: any) { Alert.alert("Notifications", e?.message || "Failed to enable push"); } };
  const reRegister = async () => { try { const token = await registerForPushNotificationsAsync(country, remind12h); setPushToken(token); toast("Re-registered"); } catch (e: any) { Alert.alert("Notifications", e?.message || "Failed to re-register"); } };
  const onToggle12h = async (val: boolean) => { setRemind12h(val); try { if (pushToken) await registerForPushNotificationsAsync(country, val); } catch {} };
  const sendTestPush = async () => { try { const token = pushToken || getRegisteredPushToken(); if (!token) return Alert.alert("Enable Push first"); await apiPost("/api/notifications/test_push", { token, body: "Test push from MVP" }); toast("Test push requested"); } catch (e: any) { Alert.alert("Failed", e?.message || "Error"); } };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}><Text style={styles.label}>Demo Mode</Text><Switch value={demoMode} onValueChange={setDemoMode} /></View>
      <View style={styles.row}><Text style={styles.label}>Reduce effects</Text><Switch value={reduceEffects} onValueChange={setReduceEffects} /></View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Diagnostics</Text>
        <View style={styles.row}><Text style={styles.label}>Backend URL</Text><Text style={styles.value} numberOfLines={1}>{backendUrl || "(not set)"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Device timezone</Text><Text style={styles.value}>{tz}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Force Demo Mode</Text><Switch value={demoMode} onValueChange={setDemoMode} /></View>
      </View>

      <TouchableOpacity onPress={enablePush} style={styles.button}><Text style={styles.buttonTxt}>Enable Push (Expo)</Text></TouchableOpacity>

      {ADMIN_ENABLED && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Debug</Text>
          <TouchableOpacity onPress={() => sendLocalTestNotification()} style={styles.buttonSecondary}><Text style={styles.buttonTxt}>Send local test notification</Text></TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", padding: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#242436" },
  label: { color: "#c7d1df", maxWidth: "50%" },
  value: { color: "#fff", fontWeight: "700", maxWidth: "50%" },
  button: { marginTop: 16, backgroundColor: "#4a56e2", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  buttonSecondary: { marginTop: 10, backgroundColor: "#1f1b3a", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  buttonTxt: { color: "#fff", fontWeight: "700" },
  section: { marginTop: 24, borderRadius: 12, borderWidth: 1, borderColor: "#242436", padding: 12 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 8 },
});