import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GlassCard from "../../src/components/GlassCard";
import { tokens } from "../../src/ui/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiGet, apiPost, RIVALRY_UI } from "../../src/api/client";

type Team = { name: string };
type Match = {
  id: string; _id?: string;
  tournament: string;
  subgroup?: string | null;
  homeTeam: Team; awayTeam: Team;
  startTime: string;
  sport?: "football" | "basketball" | "ufc";
  rivalry?: { enabled: boolean; tag?: string };
};

const DEFAULT_COUNTRY = "CH";

export default function MatchesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const grouped = await apiGet(`/api/matches/grouped?country=${DEFAULT_COUNTRY}`);
      const map = (key: string) => (grouped?.[key] || []).map((m: any) => ({ key: m.id, ...m }));
      setSections([
        { title: "Today", data: map("today") },
        { title: "Tomorrow", data: map("tomorrow") },
        { title: "This Week", data: map("week") },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onImport = async () => { try { await apiPost("/api/import/thesportsdb", { days: 3 }); await load(); } catch {} };

  const Card = ({ item }: { item: Match }) => {
    const time = new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/match/${item._id || item.id}`)}>
        <GlassCard fixedHeight={172} topGlow={RIVALRY_UI && !!item.rivalry?.enabled}>
          <View style={styles.row}>
            <Text style={styles.time}>{time}</Text>
            <View style={styles.tournamentRow}>
              <Ionicons name="football-outline" size={16} color="#C9D1FF" />
              <Text style={styles.tournament} numberOfLines={1}>  {item.tournament}</Text>
              {RIVALRY_UI && item.rivalry?.enabled ? <Text style={styles.chip}>🔥 {item.rivalry?.tag || "Derby"}</Text> : null}
            </View>
          </View>
          {item.subgroup ? <Text style={styles.subgroup}>{item.subgroup}</Text> : null}
          <View style={[styles.row, { marginTop: 10 }]}>
            <Text style={styles.team} numberOfLines={1}>{item.homeTeam?.name}</Text>
            <Text style={styles.vs}> — </Text>
            <Text style={styles.team} numberOfLines={1}>{item.awayTeam?.name}</Text>
          </View>
          <Text style={styles.channels} numberOfLines={1}>Channels ({DEFAULT_COUNTRY}): TBD</Text>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={["top","left","right","bottom"]} style={[styles.screen, { backgroundColor: '#000' }]}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>MVP</Text>
        <TouchableOpacity onPress={onImport} style={styles.importBtn}>
          <Ionicons name="cloud-download-outline" color="#fff" size={18} />
          <Text style={styles.importTxt}>Import</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(i: Match) => i.id}
        renderItem={({ item }) => <Card item={item} />}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={tokens.brand} />}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: '#000' }}
        contentContainerStyle={{ padding: tokens.spacing, paddingBottom: 120 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    paddingHorizontal: tokens.spacing, paddingTop: tokens.spacing, paddingBottom: 8,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  h1: { color: tokens.text, fontSize: 28, fontWeight: "800" },

  importBtn: { flexDirection: "row", gap: 6, backgroundColor: "#1f1b3a",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  importTxt: { color: "#fff", fontWeight: "600" },

  section: { color: tokens.textDim, fontSize: 14, marginTop: 8, marginBottom: 8, paddingHorizontal: 2 },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  time: { color: tokens.text, fontSize: 16, fontWeight: "700" },
  tournamentRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tournament: { color: "#DDE1F2", fontSize: 14, maxWidth: 190 },
  chip: {
    marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: "rgba(255,77,109,0.18)", color: "#FFD6DD", overflow: "hidden", fontWeight: "800", fontSize: 12,
  },
  subgroup: { color: "#9AA3B2", marginTop: 4 },
  team: { color: tokens.text, fontSize: 18, fontWeight: "800", flexShrink: 1 },
  vs: { color: "#A0A0A0", marginHorizontal: 8, fontWeight: "600" },
  channels: { color: "#A6B1BE", marginTop: 12, fontSize: 12 },
});