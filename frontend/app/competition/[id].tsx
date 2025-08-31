import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Image, TouchableOpacity, RefreshControl, Platform, ToastAndroid, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiGet } from "../../src/api/client";

function TypeBadge({ type }: { type?: string }) {
  const label = (type || "").toUpperCase();
  const bg = type === "league" ? "#1f2940" : "#3a1f2a";
  const color = type === "league" ? "#7ea8ff" : "#ff9bb2";
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeTxt, { color }]}>{label || "UNKNOWN"}</Text></View>;
}

function groupByDate(matches: any[]): { title: string; data: any[] }[] {
  const out: { title: string; data: any[] }[] = [
    { title: "Today", data: [] },
    { title: "Tomorrow", data: [] },
    { title: "This Week", data: [] },
  ];
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(start.getTime() + 24*3600*1000);
  const tomorrowEnd = new Date(start.getTime() + 48*3600*1000);
  matches.forEach((m) => {
    const raw = m?.startTime;
    if (!raw) { out[2].data.push(m); return; }
    const st = new Date(raw);
    if (isNaN(st.getTime())) { out[2].data.push(m); return; }
    if (st <= todayEnd) out[0].data.push(m);
    else if (st <= tomorrowEnd) out[1].data.push(m);
    else out[2].data.push(m);
  });
  return out.filter((g) => g.data.length > 0);
}

export default function CompetitionDetail() {
  const { id } = useLocalSearchParams();
  const [comp, setComp] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const toast = (m: string) => { if (Platform.OS === "android") ToastAndroid.show(m, ToastAndroid.SHORT); else Alert.alert(m); };

  const load = async () => {
    try {
      setError(null);
      const c = await apiGet(`/api/competitions/${id}`);
      const ms = await apiGet(`/api/competitions/${id}/matches?tz=${encodeURIComponent(tz)}`);
      setComp(c); setMatches(Array.isArray(ms) ? ms : []);
    } catch (e: any) { console.warn(e); setError("Failed to load competition"); toast("Failed to load competition"); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return (<View style={styles.center}><ActivityIndicator color="#9b8cff" /></View>);
  if (!comp) return (<View style={styles.center}><Text style={{ color: "#fff" }}>Not found</Text></View>);

  const sections = groupByDate(matches);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {comp?.logoUrl ? <Image source={{ uri: comp.logoUrl }} style={styles.logo} /> : <View style={[styles.logo, { backgroundColor: "#101526" }]} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{comp?.name || "—"}</Text>
          <Text style={styles.meta}>Season {comp?.season || "—"} • {comp?.countryCode || comp?.country || "—"}</Text>
        </View>
        <TypeBadge type={comp?.type} />
      </View>

      {error ? <Text style={[styles.meta, { textAlign: "center", paddingBottom: 8 }]}>{error}</Text> : null}

      <FlatList
        data={sections}
        keyExtractor={(s) => s.title}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9b8cff" />}
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((m) => (
              <TouchableOpacity key={m?._id || `${m?.homeTeam?.name}-${m?.awayTeam?.name}-${m?.startTime}`} style={styles.row} onPress={() => router.push(`/match/${m._id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.time}>{m?.start_time_local ? new Date(m.start_time_local).toLocaleTimeString() : (m?.startTime ? new Date(m.startTime).toLocaleTimeString() : "—")}</Text>
                  <Text style={styles.matchLine}>{m?.homeTeam?.name || "—"} — {m?.awayTeam?.name || "—"}</Text>
                  {(m?.stadium || m?.venue) ? <Text style={styles.meta}>{m.stadium || m.venue}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>No upcoming matches</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  center: { flex: 1, backgroundColor: "#0a0a0f", alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  logo: { width: 48, height: 48, borderRadius: 8, marginRight: 8 },
  name: { color: "#fff", fontWeight: "800", fontSize: 18 },
  meta: { color: "#9aa3b2", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeTxt: { fontWeight: "800", fontSize: 12 },
  sectionTitle: { color: "#c7d1df", paddingHorizontal: 16, marginBottom: 8, fontWeight: "700" },
  row: { padding: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 10 },
  time: { color: "#fff", fontWeight: "700" },
  matchLine: { color: "#fff", marginTop: 4, fontSize: 16, fontWeight: "700" },
  empty: { color: "#9aa3b2", textAlign: "center", padding: 16 },
});