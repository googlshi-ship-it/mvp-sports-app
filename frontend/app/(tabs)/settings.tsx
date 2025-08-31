import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { registerForPushNotificationsAsync, getRegisteredPushToken } from "../../src/notifications";
import { apiPost } from "../../src/api/client";

export default function SettingsScreen() {
  const [r7, setR7] = useState(true);
  const [r1d, setR1d] = useState(true);
  const [r1h, setR1h] = useState(true);
  const [clubLikeNational, setClubLikeNational] = useState(false);

  const [pushToken, setPushToken] = useState<string | null>(null);
  const [remind12h, setRemind12h] = useState(false); // default OFF per spec
  const [country, setCountry] = useState("CH");
  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  useEffect(() => {
    const existing = getRegisteredPushToken();
    if (existing) setPushToken(existing);
  }, []);

  const enablePush = async () => {
    try {
      const token = await registerForPushNotificationsAsync(country, remind12h);
      setPushToken(token);
      Alert.alert("Push enabled", token);
    } catch (e: any) {
      Alert.alert("Notifications", e?.message || "Failed to enable push");
    }
  };

  const onToggle12h = async (val: boolean) => {
    setRemind12h(val);
    try {
      if (pushToken) {
        await registerForPushNotificationsAsync(country, val);
      }
    } catch {}
  };

  const sendTestPush = async () => {
    try {
      const token = pushToken || getRegisteredPushToken();
      if (!token) return Alert.alert("Enable Push first");
      await apiPost("/api/notifications/test_push", { token, body: "Test push from MVP" });
      Alert.alert("Sent", "Test push requested");
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Error");
    }
  };

  const dispatchNow = async () => {
    try {
      const res = await apiPost("/api/notifications/dispatch_now");
      Alert.alert("Dispatch", `Sent: ${res.sent}`);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Error");
    }
  };

  const scheduleAll48h = async () => {
    try {
      const res = await apiPost("/api/notifications/schedule_for_next_48h");
      Alert.alert("Scheduled", `Matches processed: ${res.count}`);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Error");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.row}><Text style={styles.label}>Default country</Text><Text style={styles.value}>{country}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Theme</Text><Text style={styles.value}>Auto</Text></View>
      <View style={styles.row}><Text style={styles.label}>Reminders 7d</Text><Switch value={r7} onValueChange={setR7} /></View>
      <View style={styles.row}><Text style={styles.label}>Reminders 1d</Text><Switch value={r1d} onValueChange={setR1d} /></View>
      <View style={styles.row}><Text style={styles.label}>Reminders 1h</Text><Switch value={r1h} onValueChange={setR1h} /></View>
      <View style={styles.row}><Text style={styles.label}>12h vote reminder</Text><Switch value={remind12h} onValueChange={onToggle12h} /></View>

      <TouchableOpacity onPress={enablePush} style={styles.button}><Text style={styles.buttonTxt}>Enable Push (Expo)</Text></TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Debug</Text>
        <View style={styles.row}><Text style={styles.label}>Device token</Text><Text style={styles.mono}>{pushToken ? pushToken.slice(0, 16) + "..." : "—"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Country</Text><Text style={styles.value}>{country}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Timezone</Text><Text style={styles.value}>{tz}</Text></View>
        <View style={styles.row}><Text style={styles.label}>12h remind</Text><Text style={styles.value}>{remind12h ? "ON" : "OFF"}</Text></View>

        <View style={{ height: 8 }} />
        <TouchableOpacity onPress={sendTestPush} style={styles.buttonSecondary}><Text style={styles.buttonTxt}>Send test push</Text></TouchableOpacity>
        <TouchableOpacity onPress={dispatchNow} style={styles.buttonSecondary}><Text style={styles.buttonTxt}>Dispatch now</Text></TouchableOpacity>
        <TouchableOpacity onPress={scheduleAll48h} style={styles.buttonSecondary}><Text style={styles.buttonTxt}>Schedule all (next 48h)</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", padding: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#242436" },
  label: { color: "#c7d1df" },
  value: { color: "#fff", fontWeight: "700" },
  button: { marginTop: 16, backgroundColor: "#4a56e2", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  buttonSecondary: { marginTop: 10, backgroundColor: "#1f1b3a", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  buttonTxt: { color: "#fff", fontWeight: "700" },
  section: { marginTop: 24, borderRadius: 12, borderWidth: 1, borderColor: "#242436", padding: 12 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  mono: { color: "#c7d1df", fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) as any },
});