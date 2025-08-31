import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiGet, apiPost } from "../../src/api/client";
import { getRegisteredPushToken } from "../../src/notifications";

function sportIcon(sport?: string) {
  if (sport === "football") return <Ionicons name="football-outline" size={18} color="#8a7cff" />;
  if (sport === "basketball") return <MaterialCommunityIcons name="basketball" size={18} color="#ff7c49" />;
  return <MaterialCommunityIcons name="boxing-glove" size={18} color="#ff4d6d" />;
}

const categoriesBySport: Record<string, { key: string; label: string }[]> = {
  football: [
    { key: "mvp", label: "MVP" },
    { key: "scorer", label: "Best Scorer" },
    { key: "assist", label: "Best Assist" },
    { key: "defender", label: "Best Defender" },
    { key: "goalkeeper", label: "Best Goalkeeper" },
  ],
  basketball: [
    { key: "mvp", label: "MVP" },
    { key: "scorer", label: "Best Scorer" },
    { key: "assist", label: "Best Assist" },
    { key: "defender", label: "Best Defender" },
  ],
  ufc: [
    { key: "fight_of_the_night", label: "Fight of the Night" },
    { key: "performance_of_the_night", label: "Performance of the Night" },
  ],
};

const COUNTRIES = ["CH", "DE", "AT", "FR", "IT", "GB", "US"] as const;

type CountryCode = typeof COUNTRIES[number];

export default function MatchDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [match, setMatch] = useState<any | null>(null);
  const [votes, setVotes] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [country, setCountry] = useState<CountryCode>("CH");
  const [scheduled, setScheduled] = useState(false);

  const cats = useMemo(() => {
    if (!match?.sport) return [];
    return categoriesBySport[match.sport] || [];
  }, [match?.sport]);

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

  useEffect(() => {
    if (cats.length && !selectedCat) setSelectedCat(cats[0].key);
  }, [cats, selectedCat]);

  const rate = async (like: boolean) => {
    try {
      await apiPost(`/api/matches/${id}/rate`, { like });
    } catch (e) {
      console.warn(e);
    }
  };

  const submitVote = async () => {
    if (!selectedCat || !name.trim()) return;
    setSubmitting(true);
    try {
      const token = getRegisteredPushToken();
      await apiPost(`/api/matches/${id}/vote`, { category: selectedCat, player: name.trim(), token });
      const v = await apiGet(`/api/matches/${id}/votes`);
      setVotes(v);
      setName("");
    } catch (e) {
      console.warn(e);
    } finally {
      setSubmitting(false);
    }
  };

  const scheduleVoteReminders = async () => {
    try {
      await apiPost(`/api/notifications/schedule_for_match`, { matchId: id });
      setScheduled(true);
    } catch (e) {
      console.warn(e);
    }
  };

  if (loading)
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#9b8cff" />
      </View>
    );

  if (!match)
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff", padding: 16 }}>Not found</Text>
      </View>
    );

  const kickoff = new Date(match.startTime).toLocaleString();
  const channels = (match.channels?.[country] as string[] | undefined) || [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 170 }}>
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.blockTitle}>Channels</Text>
            <TouchableOpacity onPress={() => setCountryOpen((s) => !s)} style={styles.countryBtn}>
              <Ionicons name="flag-outline" color="#fff" size={14} />
              <Text style={styles.countryTxt}>{country}</Text>
              <Ionicons name={countryOpen ? "chevron-up" : "chevron-down"} color="#fff" size={16} />
            </TouchableOpacity>
          </View>
          {countryOpen && (
            <View style={styles.countryList}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity key={c} style={styles.countryItem} onPress={() => { setCountry(c); setCountryOpen(false); }}>
                  <Ionicons name="flag-outline" color="#c7d1df" size={14} />
                  <Text style={styles.countryItemTxt}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.channels}>{country}: {channels.length ? channels.join(", ") : "TBD"}</Text>
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.blockTitle}>Cast your vote</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {scheduled && <Text style={styles.subtle}>Reminders scheduled</Text>}
              <TouchableOpacity onPress={scheduleVoteReminders} style={styles.smallBtn}>
                <Ionicons name="notifications-outline" size={16} color="#fff" />
                <Text style={styles.smallBtnTxt}>Schedule Vote Reminders</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
            {cats.map((c) => (
              <TouchableOpacity key={c.key} onPress={() => setSelectedCat(c.key)} style={[styles.chip, selectedCat === c.key && styles.chipActive]}>
                <Text style={[styles.chipTxt, selectedCat === c.key && styles.chipTxtActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ height: 8 }} />
          <TextInput
            placeholder="Enter player/fighter name"
            placeholderTextColor="#8a90a4"
            value={name}
            onChangeText={setName}
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={submitVote}
          />
          <TouchableOpacity disabled={submitting || !name.trim()} onPress={submitVote} style={[styles.submit, (!name.trim() || submitting) && { opacity: 0.6 }]}> 
            <Ionicons name="send-outline" size={18} color="#fff" />
            <Text style={styles.btnTxt}>{submitting ? "Submitting..." : "Submit Vote"}</Text>
          </TouchableOpacity>
        </BlurView>

        <BlurView intensity={30} tint="dark" style={styles.card}>
          <Text style={styles.blockTitle}>Fan voting (results)</Text>
          {Object.keys(votes || {}).length === 0 ? (
            <Text style={styles.voteLine}>No votes yet</Text>
          ) : (
            Object.entries(votes || {}).map(([cat, entries]: any) => (
              <View key={cat} style={{ marginTop: 10 }}>
                <Text style={[styles.voteLine, { marginBottom: 6 }]}>{cat.replaceAll("_", " ")}</Text>
                {Object.entries(entries as any).map(([player, pct]: any) => (
                  <View key={player} style={styles.barRow}>
                    <View style={styles.barBg}>
                      <View style={[styles.bar, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.barTxt}>{player} — {pct}%</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </BlurView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 8 },
  headerTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },
  subtle: { color: "#9aa3b2", fontSize: 12 },
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
  chip: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderRadius: 20, borderWidth: 1, borderColor: "#2a2a3c" },
  chipActive: { backgroundColor: "#1f1b3a", borderColor: "#4a56e2" },
  chipTxt: { color: "#c7d1df", fontSize: 13 },
  chipTxtActive: { color: "#fff", fontWeight: "700" },
  input: { backgroundColor: "#0f1220", color: "#fff", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#25273a" },
  submit: { marginTop: 10, backgroundColor: "#4a56e2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  barRow: { marginBottom: 8 },
  barBg: { height: 8, backgroundColor: "#1b1f33", borderRadius: 6, overflow: "hidden" },
  bar: { height: 8, backgroundColor: "#9b8cff" },
  barTxt: { color: "#b9c4d6", fontSize: 12, marginTop: 4 },
  countryBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1f1b3a", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  countryTxt: { color: "#fff", fontWeight: "700" },
  countryList: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: "#2a2a3c", overflow: "hidden" },
  countryItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#0f1220", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#242436" },
  countryItemTxt: { color: "#c7d1df" },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1f1b3a", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  smallBtnTxt: { color: "#fff", fontWeight: "700" },
});