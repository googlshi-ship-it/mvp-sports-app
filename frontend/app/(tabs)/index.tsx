import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiGet, apiPost } from "../../src/api/client";
import { useUIStore } from "../../src/store/ui";

const DEFAULT_COUNTRY = "CH";

type Team = { type: "club" | "national"; name: string; countryCode?: string | null };

type Match = {
  _id: string;
  id: string;
  sport: "football" | "basketball" | "ufc";
  tournament: string;
  subgroup?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  startTime: string;
  channelsForCountry?: string[];
};

export default function MatchesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const reduceEffects = useUIStore((s) => s.reduceEffects);

  const iconFor = (sport: Match["sport"]) => {
    if (sport === "football") return <Ionicons name="football-outline" size={16} color="#8a7cff" />;
    if (sport === "basketball") return <MaterialCommunityIcons name="basketball" size={16} color="#ff7c49" />;
    return <MaterialCommunityIcons name="boxing-glove" size={16} color="#ff4d6d" />;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const grouped = await apiGet(`/api/matches/grouped?country=${DEFAULT_COUNTRY}`);
      const make = (key: string, title: string) => (grouped[key] || []).map((m: any) => ({ key: m.id, ...m }));
      const s = [
        { title: "Today", data: make("today", "Today") },
        { title: "Tomorrow", data: make("tomorrow", "Tomorrow") },
        { title: "This Week", data: make("week", "This Week") },
      ];
      setSections(s);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onImport = async () => {
    try { await apiPost("/api/import/thesportsdb", { days: 3 }); await load(); } catch (e) { console.warn(e); }
  };

  const renderItem = ({ item }: { item: Match }) => {
    const time = new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const Card: any = reduceEffects ? View : BlurView;
    const cardProps: any = reduceEffects ? {} : { intensity: 50, tint: "dark" };
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/match/${item.id}`)}>
        <Card {...cardProps} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.time}>{time}</Text>
            <View style={styles.tournamentRow}>
              {iconFor(item.sport)}
              <Text style={styles.tournament} numberOfLines={1}> {item.tournament}</Text>
            </View>
          </View>
          {item.subgroup ? <Text style={styles.subgroup}>{item.subgroup}</Text> : null}
          <View style={styles.teamsRow}>
            <Text style={styles.team}>{item.homeTeam.name}</Text>
            <Text style={styles.vs}> — </Text>
            <Text style={styles.team}>{item.awayTeam.name}</Text>
          </View>
          <Text style={styles.channels} numberOfLines={1}>
            Channels ({DEFAULT_COUNTRY}): {item.channelsForCountry?.join(", ") || "TBD"}
          </Text>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>MVP</Text>
        <TouchableOpacity onPress={onImport} style={styles.importBtn}>
          <Ionicons name="cloud-download-outline" color="#fff" size={18} />
          <Text style={styles.importTxt}>Import</Text>
        </TouchableOpacity>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  importBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1f1b3a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  importTxt: { color: "#fff", fontWeight: "600" },
  sectionHeader: { color: "#b8b8d4", fontSize: 14, marginTop: 8, marginBottom: 8, paddingHorizontal: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { color: "#fff", fontSize: 16, fontWeight: "700" },
  tournamentRow: { flexDirection: "row", alignItems: "center" },
  tournament: { color: "#ddd", fontSize: 14, maxWidth: 220 },
  subgroup: { color: "#9aa3b2", marginTop: 4 },
  teamsRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  team: { color: "#fff", fontSize: 18, fontWeight: "700" },
  vs: { color: "#a0a0a0", marginHorizontal: 8 },
  channels: { color: "#a6b1be", marginTop: 12, fontSize: 12 },
});