import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiGet, apiPost } from "../../src/api/client";

function sportIcon(sport?: string) {
  if (sport === "football") return <Ionicons name="football-outline" size={18} color="#8a7cff" />;
  if (sport === "basketball") return <MaterialCommunityIcons name="basketball" size={18} color="#ff7c49" />;
  return <MaterialCommunityIcons name="boxing-glove" size={18} color="#ff4d6d" />;
}

export default function MatchDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [match, setMatch] = useState<any | null>(null);
  const [votes, setVotes] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const m = await apiGet(`/api/matches/${id}`);
        setMatch(m);
        const v = await apiGet(`/api/matches/${id}/votes`);
        setVotes(v);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const rate = async (like: boolean) => {
    try {
      await apiPost(`/api/matches/${id}/rate`, { like });
    } catch (e) {
      console.warn(e);
    }
  };

  if (loading) return (
    <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator color="#9b8cff" />
    </View>
  );

  if (!match) return (
    <View style={styles.container}>
      <Text style={{ color: "#fff", padding: 16 }}>Not found</Text>
    </View>
  );

  const kickoff = new Date(match.startTime).toLocaleString();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        {sportIcon(match.sport)}
        <Text style={styles.headerTxt}>{match.tournament}</Text>
        {match.subgroup ? <Text style={styles.subgroup}> · {match.subgroup}</Text> : null}
      </View>

      <BlurView intensity={40} tint="dark" style={styles.card}>
        <Text style={styles.time}>{kickoff}</Text>
        <View style={styles.teamsRow}>
          <Text style={styles.team}>{match.homeTeam?.name}</Text>
          <Text style={styles.vs}> — </Text>
          <Text style={styles.team}>{match.awayTeam?.name}</Text>
        </View>
      </BlurView>

      <BlurView intensity={30} tint="dark" style={styles.card}>
        <Text style={styles.blockTitle}>Channels</Text>
        <Text style={styles.channels}>Switzerland (CH): {(match.channels?.CH || []).join(", ")}</Text>
      </BlurView>

      <BlurView intensity={30} tint="dark" style={styles.card}>
        <Text style={styles.blockTitle}>Rate the match</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => rate(true)} style={[styles.btn, { backgroundColor: "#1a2" }]}> 
            <Ionicons name="thumbs-up-outline" size={18} color="#fff" />
            <Text style={styles.btnTxt}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => rate(false)} style={[styles.btn, { backgroundColor: "#a21" }]}> 
            <Ionicons name="thumbs-down-outline" size={18} color="#fff" />
            <Text style={styles.btnTxt}>Dislike</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <BlurView intensity={30} tint="dark" style={styles.card}>
        <Text style={styles.blockTitle}>Fan voting (results)</Text>
        <Text style={styles.voteLine}>MVP: {JSON.stringify(votes?.mvp || {})}</Text>
        <Text style={styles.voteLine}>Best Scorer: {JSON.stringify(votes?.scorer || {})}</Text>
        <Text style={styles.voteLine}>Best Assist: {JSON.stringify(votes?.assist || {})}</Text>
        <Text style={styles.voteLine}>Best Defender: {JSON.stringify(votes?.defender || {})}</Text>
      </BlurView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 8 },
  headerTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },
  subgroup: { color: "#9aa3b2", fontSize: 14 },
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  time: { color: "#fff", fontSize: 16, fontWeight: "700" },
  teamsRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  team: { color: "#fff", fontSize: 22, fontWeight: "800" },
  vs: { color: "#a0a0a0", marginHorizontal: 8 },
  channels: { color: "#a6b1be", marginTop: 8 },
  blockTitle: { color: "#fff", fontWeight: "800", marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  btnTxt: { color: "#fff", fontWeight: "700" },
  voteLine: { color: "#c7d1df", marginTop: 6 },
});