import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Image, TouchableOpacity, RefreshControl, Platform, ToastAndroid, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiGet } from "../../src/api/client";

function TypeBadge({ type }: { type?: string }) {
  const label = (type || "").toUpperCase();
  const bg = type === "league" ? "#1f2940" : "#3a1f2a";
  const color = type === "league" ? "#7ea8ff" : "#ff9bb2";
  return &lt;View style={[styles.badge, { backgroundColor: bg }]}&gt;&lt;Text style={[styles.badgeTxt, { color }]}&gt;{label || "UNKNOWN"}&lt;/Text&gt;&lt;/View&gt;;
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
  matches.forEach((m) =&gt; {
    const raw = m?.startTime;
    if (!raw) { out[2].data.push(m); return; }
    const st = new Date(raw);
    if (isNaN(st.getTime())) { out[2].data.push(m); return; }
    if (st &lt;= todayEnd) out[0].data.push(m);
    else if (st &lt;= tomorrowEnd) out[1].data.push(m);
    else out[2].data.push(m);
  });
  return out.filter((g) =&gt; g.data.length &gt; 0);
}

export default function CompetitionDetail() {
  const { id } = useLocalSearchParams();
  const [comp, setComp] = useState&lt;any | null&gt;(null);
  const [matches, setMatches] = useState&lt;any[]&gt;([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState&lt;string | null&gt;(null);
  const router = useRouter();

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const toast = (m: string) =&gt; { if (Platform.OS === "android") ToastAndroid.show(m, ToastAndroid.SHORT); else Alert.alert(m); };

  const load = async () =&gt; {
    try {
      setError(null);
      const c = await apiGet(`/api/competitions/${id}`);
      const ms = await apiGet(`/api/competitions/${id}/matches?tz=${encodeURIComponent(tz)}`);
      setComp(c); setMatches(Array.isArray(ms) ? ms : []);
    } catch (e: any) { console.warn(e); setError("Failed to load competition"); toast("Failed to load competition"); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() =&gt; { load(); }, [id]);

  const onRefresh = () =&gt; { setRefreshing(true); load(); };

  if (loading) return (&lt;View style={styles.center}&gt;&lt;ActivityIndicator color="#9b8cff" /&gt;&lt;/View&gt;);
  if (!comp) return (
    &lt;View style={styles.center}&gt;
      &lt;Text style={{ color: "#fff", marginBottom: 8 }}&gt;Not found&lt;/Text&gt;
      &lt;TouchableOpacity onPress={load} style={styles.retryBtn}&gt;&lt;Text style={styles.retryTxt}&gt;Retry&lt;/Text&gt;&lt;/TouchableOpacity&gt;
    &lt;/View&gt;
  );

  const sections = groupByDate(matches);

  const Retry = () =&gt; (
    &lt;TouchableOpacity onPress={load} style={styles.retryBtn}&gt;&lt;Text style={styles.retryTxt}&gt;Retry&lt;/Text&gt;&lt;/TouchableOpacity&gt;
  );

  return (
    &lt;View style={styles.container}&gt;
      &lt;View style={styles.header}&gt;
        {comp?.logoUrl ? &lt;Image source={{ uri: comp.logoUrl }} style={styles.logo} /&gt; : &lt;View style={[styles.logo, { backgroundColor: "#101526" }]} /&gt;}
        &lt;View style={{ flex: 1 }}&gt;
          &lt;Text style={styles.name}&gt;{comp?.name || "—"}&lt;/Text&gt;
          &lt;Text style={styles.meta}&gt;Season {comp?.season || "—"} • {comp?.countryCode || comp?.country || "—"}&lt;/Text&gt;
        &lt;/View&gt;
        &lt;TypeBadge type={comp?.type} /&gt;
      &lt;/View&gt;

      {error ? &lt;View style={{ paddingHorizontal: 16, marginBottom: 8 }}&gt;&lt;Text style={[styles.meta, { textAlign: "center", marginBottom: 8 }]}&gt;{error}&lt;/Text&gt;&lt;Retry /&gt;&lt;/View&gt; : null}

      &lt;FlatList
        data={sections}
        keyExtractor={(s) =&gt; s.title}
        refreshControl={&lt;RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9b8cff" /&gt;}
        renderItem={({ item: section }) =&gt; (
          &lt;View style={{ marginBottom: 18 }}&gt;
            &lt;Text style={styles.sectionTitle}&gt;{section.title}&lt;/Text&gt;
            {section.data.map((m) =&gt; (
              &lt;TouchableOpacity key={m?._id || `${m?.homeTeam?.name}-${m?.awayTeam?.name}-${m?.startTime}`} style={styles.row} onPress={() =&gt; router.push(`/match/${m._id}`)}&gt;
                &lt;View style={{ flex: 1 }}&gt;
                  &lt;Text style={styles.time}&gt;{m?.start_time_local ? new Date(m.start_time_local).toLocaleTimeString() : (m?.startTime ? new Date(m.startTime).toLocaleTimeString() : "—")}&lt;/Text&gt;
                  &lt;Text style={styles.matchLine}&gt;{m?.homeTeam?.name || "—"} — {m?.awayTeam?.name || "—"}&lt;/Text&gt;
                  {(m?.stadium || m?.venue) ? &lt;Text style={styles.meta}&gt;{m.stadium || m.venue}&lt;/Text&gt; : null}
                &lt;/View&gt;
              &lt;/TouchableOpacity&gt;
            ))}
          &lt;/View&gt;
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={&lt;View&gt;&lt;Text style={styles.empty}&gt;No upcoming matches&lt;/Text&gt;&lt;Retry /&gt;&lt;/View&gt;}
      /&gt;
    &lt;/View&gt;
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
  retryBtn: { alignSelf: "center", marginTop: 8, backgroundColor: "#1f1b3a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  retryTxt: { color: "#fff", fontWeight: "700" },
});