import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity } from "react-native";
import GlassCard from "../../src/components/GlassCard";
import { useRouter } from "expo-router";
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
  const reduceEffects = useUIStore((s) =&gt; s.reduceEffects);

  const iconFor = (sport: Match["sport"]) =&gt; {
    if (sport === "football") return &lt;Ionicons name="football-outline" size={16} color="#8a7cff" /&gt;;
    if (sport === "basketball") return &lt;MaterialCommunityIcons name="basketball" size={16} color="#ff7c49" /&gt;;
    return &lt;MaterialCommunityIcons name="boxing-glove" size={16} color="#ff4d6d" /&gt;;
  };

  const load = useCallback(async () =&gt; {
    setLoading(true);
    try {
      const grouped = await apiGet(`/api/matches/grouped?country=${DEFAULT_COUNTRY}`);
      const make = (key: string, title: string) =&gt; (grouped[key] || []).map((m: any) =&gt; ({ key: m.id, ...m }));
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

  useEffect(() =&gt; { load(); }, [load]);

  const onImport = async () =&gt; {
    try { await apiPost("/api/import/thesportsdb", { days: 3 }); await load(); } catch (e) { console.warn(e); }
  };

  const renderItem = ({ item }: { item: Match }) =&gt; {
    const time = new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      &lt;TouchableOpacity
        activeOpacity={0.8}
        onPress={() =&gt; router.push(`/match/${item.id}`)}
        onLongPress={() =&gt; {
          if (typeof window !== "undefined" &amp;&amp; (window as any).ActionSheetIOS) {
            // Web/iOS fallback: simple alert for MVP
            alert("Share / Add to Calendar / Copy Link coming soon");
          } else {
            alert("Share / Add to Calendar / Copy Link coming soon");
          }
        }}
      &gt;
        &lt;GlassCard fixedHeight={172}&gt;
          &lt;View style={styles.rowBetween}&gt;
            &lt;Text style={styles.time}&gt;{time}&lt;/Text&gt;
            &lt;View style={styles.tournamentRow}&gt;
              {iconFor(item.sport)}
              &lt;Text style={styles.tournament} numberOfLines={1}&gt; {item.tournament}&lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;
          {item.subgroup ? &lt;Text style={styles.subgroup}&gt;{item.subgroup}&lt;/Text&gt; : null}
          &lt;View style={styles.teamsRow}&gt;
            &lt;Text style={styles.team}&gt;{item.homeTeam.name}&lt;/Text&gt;
            &lt;Text style={styles.vs}&gt; — &lt;/Text&gt;
            &lt;Text style={styles.team}&gt;{item.awayTeam.name}&lt;/Text&gt;
          &lt;/View&gt;
          &lt;Text style={styles.channels} numberOfLines={1}&gt;
            Channels ({DEFAULT_COUNTRY}): {item.channelsForCountry?.join(", ") || "TBD"}
          &lt;/Text&gt;
        &lt;/GlassCard&gt;
      &lt;/TouchableOpacity&gt;
    );
  };

  const renderSectionHeader = ({ section }: any) =&gt; (
    &lt;Text style={styles.sectionHeader}&gt;{section.title}&lt;/Text&gt;
  );

  return (
    &lt;View style={styles.container}&gt;
      &lt;View style={styles.headerRow}&gt;
        &lt;Text style={styles.title}&gt;MVP&lt;/Text&gt;
        &lt;TouchableOpacity onPress={onImport} style={styles.importBtn}&gt;
          &lt;Ionicons name="cloud-download-outline" color="#fff" size={18} /&gt;
          &lt;Text style={styles.importTxt}&gt;Import&lt;/Text&gt;
        &lt;/TouchableOpacity&gt;
      &lt;/View&gt;
      &lt;SectionList
        sections={sections}
        keyExtractor={(item) =&gt; item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        refreshControl={&lt;RefreshControl refreshing={loading} onRefresh={load} /&gt;}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      /&gt;
    &lt;/View&gt;
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  importBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1f1b3a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  importTxt: { color: "#fff", fontWeight: "600" },
  sectionHeader: { color: "#b8b8d4", fontSize: 14, marginTop: 8, marginBottom: 8, paddingHorizontal: 16 },
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