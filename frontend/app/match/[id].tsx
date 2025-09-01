import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ToastAndroid, Alert, RefreshControl, Modal, Share } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiGet, apiPost, apiPostAdmin, RIVALRY_UI } from "../../src/api/client";
import { getRegisteredPushToken } from "../../src/notifications";
import { useUIStore } from "../../src/store/ui";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/store/auth";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";

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

const COUNTRIES = ["CH", "DE", "AT", "FR", "IT", "GB", "US", "GE", "ES", "GR"] as const;

type CountryCode = typeof COUNTRIES[number];

const ADMIN_ENABLED = (typeof __DEV__ !== "undefined" && __DEV__) || (process.env.EXPO_PUBLIC_ADMIN_DEBUG === "1");

export default function MatchDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [match, setMatch] = useState<any | null>(null);
  const [votesData, setVotesData] = useState<any | null>(null);
  const [rating, setRating] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [country, setCountry] = useState<CountryCode>("CH");
  const [scheduled, setScheduled] = useState(false);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [playerRatings, setPlayerRatings] = useState({ attack: 0, defense: 0, passing: 0, dribbling: 0 });
  const [playerAvg, setPlayerAvg] = useState<any | null>(null);
  const [adminModal, setAdminModal] = useState<{ open: boolean; kind: "lineups" | "injuries" | null; json: string; token: string }>({ open: false, kind: null, json: "{}", token: "CHANGEME" });
  const reduceEffects = useUIStore((s) => s.reduceEffects);
  const token = useAuth((s) => s.token);

  const toast = (m: string) => { if (Platform.OS === "android") ToastAndroid.show(m, ToastAndroid.SHORT); else Alert.alert(m); };

  const cats = useMemo(() => { if (!match?.sport) return []; return categoriesBySport[match.sport] || []; }, [match?.sport]);

  const tz = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const m = await apiGet(`/api/matches/${id}?include=lineups&tz=${encodeURIComponent(tz)}`);
      setMatch(m);
      const v = await apiGet(`/api/matches/${id}/votes`);
      setVotesData(v);
      const r = await apiGet(`/api/matches/${id}/rating`);
      setRating(r);
      const qc = await apiGet(`/api/notifications/queue_count?matchId=${id}`);
      setQueueCount(qc?.pending ?? 0);
    } catch (e: any) {
      console.warn(e);
      const msg = (e?.message || "").toString();
      if (msg.includes("401")) toast("Login required");
      else if (msg.includes("403")) toast("Not allowed at this time");
      else toast("Failed to load match");
    } finally { setLoading(false); setRefreshing(false); }
  }, [id, tz]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { const c = cats; if (c.length && !selectedCat) setSelectedCat(c[0].key); }, [cats, selectedCat]);

  const requireAuth = () => {
    if (!token) {
      Alert.alert("Login required", "Please login to vote.");
      router.push("/auth/login");
      return false;
    }
    return true;
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  const rate = async (like: boolean) => { if (!requireAuth()) return; try { const res = await apiPost(`/api/matches/${id}/rate`, { like }); setRating(res); } catch (e: any) { const msg = (e?.message || "").toString(); if (msg.includes("403")) toast("Voting closed or not open yet"); else toast("Failed"); } };

  const submitVote = async () => {
    if (!requireAuth()) return;
    if (!selectedCat || !name.trim()) return;
    setSubmitting(true);
    try { const tokenPush = getRegisteredPushToken(); const res = await apiPost(`/api/matches/${id}/vote`, { category: selectedCat, player: name.trim(), token: tokenPush }); setVotesData(res); setName(""); }
    catch (e: any) { const msg = (e?.message || "").toString(); if (msg.includes("403")) toast("Voting closed or not open yet"); else toast("Failed"); }
    finally { setSubmitting(false); }
  };

  const scheduleVoteReminders = async () => { try { await apiPost(`/api/notifications/schedule_for_match`, { matchId: id }); setScheduled(true); const qc = await apiGet(`/api/notifications/queue_count?matchId=${id}`); setQueueCount(qc?.pending ?? 0); toast("Scheduled"); } catch (e) { console.warn(e); } };
  const rescheduleReminders = async () => { try { await apiPost(`/api/notifications/reschedule_match`, { matchId: id }); const qc = await apiGet(`/api/notifications/queue_count?matchId=${id}`); setQueueCount(qc?.pending ?? 0); toast("Rescheduled"); } catch (e) { console.warn(e); } };
  const cancelReminders = async () => { try { await apiPost(`/api/notifications/cancel_match`, { matchId: id }); const qc = await apiGet(`/api/notifications/queue_count?matchId=${id}`); setQueueCount(qc?.pending ?? 0); toast("Canceled"); } catch (e) { console.warn(e); } };
  const simulateFinish = async () => { try { await apiPost(`/api/notifications/simulate_finish_now`, { matchId: id }); toast("Simulated finish; dispatch will send now"); } catch (e) { console.warn(e); } };
  const notifyTestAudience = async () => { try { const res = await apiPost(`/api/notifications/notify_test_audience`, { matchId: id }); toast(`Sent: ${res.sent}`); } catch (e) { console.warn(e); } };

  const submitPlayerRatings = async () => {
    if (!requireAuth()) return;
    if (!name.trim()) return toast("Enter player name");
    try { const tokenPush = getRegisteredPushToken(); const res = await apiPost(`/api/matches/${id}/player_ratings`, { token: tokenPush, player: name.trim(), ...playerRatings }); setPlayerAvg(res); toast("Submitted"); } catch (e) { console.warn(e); }
  };

  const Card: any = reduceEffects ? View : BlurView;
  const cardProps: any = reduceEffects ? {} : { intensity: 30, tint: "dark" };

  if (loading) return (<View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color="#9b8cff" /></View>);
  if (!match) return (<View style={styles.container}><Text style={{ color: "#fff", padding: 16 }}>Not found</Text></View>);

  const kickoff = match?.start_time_local ? new Date(match.start_time_local).toLocaleString() : (match?.startTime ? new Date(match.startTime).toLocaleString() : "—");
  const channels = (match?.channels?.[country] as string[] | undefined) || [];

  const lineups = match?.lineups;
  const updatedLineups = lineups?.lineups_updated_at ? new Date(lineups.lineups_updated_at) : null;
  const updatedInjuries = lineups?.injuries_updated_at ? new Date(lineups.injuries_updated_at) : null;

  const openAdmin = (kind: "lineups" | "injuries") => {
    const current = kind === "lineups"
      ? {
          formation_home: match?.formation_home || "",
          formation_away: match?.formation_away || "",
          lineup_home: match?.lineup_home || [],
          lineup_away: match?.lineup_away || [],
          bench_home: match?.bench_home || [],
          bench_away: match?.bench_away || [],
          lineups_status: match?.lineups_status || "none",
        }
      : {
          unavailable_home: match?.unavailable_home || [],
          unavailable_away: match?.unavailable_away || [],
        };
    setAdminModal({ open: true, kind, json: JSON.stringify(current, null, 2), token: "CHANGEME" });
  };

  const saveAdmin = async () => {
    try {
      const body = JSON.parse(adminModal.json || "{}");
      if (!adminModal.kind) return;
      if (adminModal.kind === "lineups") await apiPostAdmin(`/api/matches/${id}/lineups`, body, adminModal.token);
      else await apiPostAdmin(`/api/matches/${id}/injuries`, body, adminModal.token);
      setAdminModal({ ...adminModal, open: false });
      await load();
      toast("Updated");
    } catch (e: any) {
      const msg = (e?.message || "").toString();
      if (msg.includes("401")) toast("Admin token required");
      else toast("Invalid JSON or request failed");
    }
  };

  const renderPerson = (p: any, idx: number) => (
    <Text style={styles.person} key={p?.playerId || `${p?.number}-${p?.name}-${p?.pos}-${idx}`}>
      {p?.number ? `${p.number} · ` : ""}{p?.name || "—"}{p?.pos ? ` · ${p.pos}` : ""}
    </Text>
  );

  const derbyChip = () => {
    if (!RIVALRY_UI || !match?.rivalry?.enabled) return null;
    const label = match?.rivalry?.tag ? String(match.rivalry.tag) : "Derby";
    return (
      <View style={styles.derbyChip} accessibilityLabel="Rivalry match">
        <Text style={styles.derbyTxt}>🔥 {label}</Text>
      </View>
    );
  };

  const statusBadge = (s?: string) => {
    if (!s || s === "none") return null;
    const isConf = s === "confirmed";
    return (
      <View style={[styles.badge, { backgroundColor: isConf ? "#1f3a2b" : "#2f2a40" }]}>
        <Text style={[styles.badgeTxt, { color: isConf ? "#95ffbf" : "#c7a2ff" }]}>{isConf ? "CONFIRMED" : "PROBABLE"}</Text>
      </View>
    );
  };

  const onShare = async () => {
    try {
      const home = match?.homeTeam?.name || "Home";
      const away = match?.awayTeam?.name || "Away";
      const time = match?.start_time_local ? new Date(match.start_time_local).toLocaleString() : (match?.startTime ? new Date(match.startTime).toLocaleString() : "");
      const url = typeof window !== "undefined" ? window.location.origin + `/match/${id}` : `https://example.com/match/${id}`;
      const message = `${home} vs ${away} — ${time}. Join the vote: ${url}`;
      if (Platform.OS === "web") {
        // Web share
        // @ts-ignore
        if (navigator &amp;&amp; navigator.share) {
          // @ts-ignore
          await navigator.share({ title: `${home} vs ${away}`, url, text: message });
          return;
        }
        await Clipboard.setStringAsync(url);
        toast("Link copied to clipboard");
        return;
      }
      await Share.share({ message });
    } catch (e) {
      toast("Could not share");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0f" }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: `Match ${id ?? ""}`,
          headerBackTitle: "Back",
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 260 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9b8cff" />}>
          <View style={styles.header}>
            {sportIcon(match?.sport)}
            <Text style={styles.headerTxt}>{match?.tournament || "—"}</Text>
            {RIVALRY_UI &amp;&amp; match?.rivalry?.enabled ? (
              <View style={styles.derbyChip}><Text style={styles.derbyTxt}>🔥 {match?.rivalry?.tag || "Derby"}</Text></View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: "auto" }}>
              {queueCount !== null &amp;&amp; <Text style={styles.queueChip}>Queue {queueCount}</Text>}
              <TouchableOpacity onPress={onShare} style={[styles.smallBtn, { paddingVertical: 6, paddingHorizontal: 8 }]}>
                <Ionicons name="share-outline" size={16} color="#fff" />
                <Text style={styles.smallBtnTxt}>Share</Text>
              </TouchableOpacity>
            </View>
            {match?.subgroup ? <Text style={styles.subgroup}> · {match.subgroup}</Text> : null}
          </View>

          <Card {...cardProps} style={styles.card}>
            {RIVALRY_UI &amp;&amp; match?.rivalry?.enabled ? (<View pointerEvents="none" style={styles.topGlow} />) : null}
            <Text style={styles.time}>{kickoff}</Text>
            <View style={styles.teamsRow}>
              <Text style={styles.team}>{match?.homeTeam?.name || "—"}</Text>
              <Text style={styles.vs}> — </Text>
              <Text style={styles.team}>{match?.awayTeam?.name || "—"}</Text>
            </View>
            {(match?.stadium || match?.venue) ? <Text style={styles.channels}>{match.stadium || match.venue}</Text> : null}
          </Card>

          {/* Lineups card */}
          <Card {...cardProps} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.blockTitle}>Lineups</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {statusBadge(lineups?.lineups_status)}
                {updatedLineups &amp;&amp; <Text style={styles.subtle}>Updated {updatedLineups.toLocaleTimeString()}</Text>}
                {ADMIN_ENABLED &amp;&amp; <TouchableOpacity onPress={() => openAdmin("lineups")} style={styles.smallBtn}><Ionicons name="create-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Edit JSON</Text></TouchableOpacity>}
              </View>
            </View>
            {!!lineups?.formation_home || !!lineups?.formation_away ? (
              <Text style={[styles.subtle, { marginTop: 4 }]}>{lineups?.formation_home || "—"} vs {lineups?.formation_away || "—"}</Text>
            ) : null}
            {!lineups || (!lineups.home?.starters?.length &amp;&amp; !lineups.away?.starters?.length &amp;&amp; !lineups.home?.bench?.length &amp;&amp; !lineups.away?.bench?.length) ? (
              <View>
                <Text style={styles.voteLine}>No lineups yet</Text>
                <TouchableOpacity onPress={load} style={[styles.smallBtn, { marginTop: 8, alignSelf: "flex-start" }]}><Ionicons name="refresh-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Try again</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Home — Starters</Text>
                  {(lineups.home?.starters || []).map(renderPerson)}
                  <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Bench</Text>
                  {(lineups.home?.bench || []).map(renderPerson)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Away — Starters</Text>
                  {(lineups.away?.starters || []).map(renderPerson)}
                  <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Bench</Text>
                  {(lineups.away?.bench || []).map(renderPerson)}
                </View>
              </View>
            )}
          </Card>

          {/* Unavailable card */}
          <Card {...cardProps} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.blockTitle}>Unavailable</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {updatedInjuries &amp;&amp; <Text style={styles.subtle}>Updated {updatedInjuries.toLocaleTimeString()}</Text>}
                {ADMIN_ENABLED &amp;&amp; <TouchableOpacity onPress={() => openAdmin("injuries")} style={styles.smallBtn}><Ionicons name="create-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Edit JSON</Text></TouchableOpacity>}
              </View>
            </View>
            {!lineups || ((!lineups.home?.unavailable || lineups.home.unavailable.length === 0) &amp;&amp; (!lineups.away?.unavailable || lineups.away.unavailable.length === 0)) ? (
              <View>
                <Text style={styles.voteLine}>No injuries/suspensions reported</Text>
                <TouchableOpacity onPress={load} style={[styles.smallBtn, { marginTop: 8, alignSelf: "flex-start" }]}><Ionicons name="refresh-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Try again</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Home</Text>
                  {(lineups.home?.unavailable || []).map((p: any, idx: number) => (
                    <View key={p?.playerId || `${p?.name}-home-${idx}`} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <StatusChip status={p?.status} />
                      <Text style={styles.person}>{p?.name || "—"}{p?.reason ? ` — ${p.reason}` : ""}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Away</Text>
                  {(lineups.away?.unavailable || []).map((p: any, idx: number) => (
                    <View key={p?.playerId || `${p?.name}-away-${idx}`} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <StatusChip status={p?.status} />
                      <Text style={styles.person}>{p?.name || "—"}{p?.reason ? ` — ${p.reason}` : ""}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>

          <Card {...cardProps} style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.blockTitle}>Channels</Text>
              <TouchableOpacity onPress={() => setCountryOpen((s) => !s)} style={styles.countryBtn}>
                <Ionicons name="flag-outline" color="#fff" size={14} />
                <Text style={styles.countryTxt}>{country}</Text>
                <Ionicons name={countryOpen ? "chevron-up" : "chevron-down"} color="#fff" size={16} />
              </TouchableOpacity>
            </View>
            {countryOpen &amp;&amp; (
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
          </Card>

          <Card {...cardProps} style={styles.card}>
            <Text style={styles.blockTitle}>Rate the match</Text>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => rate(true)} style={[styles.btn, { backgroundColor: "#1a2" }]}><Ionicons name="thumbs-up-outline" size={18} color="#fff" /><Text style={styles.btnTxt}>Like</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => rate(false)} style={[styles.btn, { backgroundColor: "#a21" }]}><Ionicons name="thumbs-down-outline" size={18} color="#fff" /><Text style={styles.btnTxt}>Dislike</Text></TouchableOpacity>
            </View>
            {!!rating &amp;&amp; <Text style={styles.voteLine}>Likes: {rating.likes} • Dislikes: {rating.dislikes} • {rating.likePct}% 👍</Text>}
          </Card>

          <Card {...cardProps} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.blockTitle}>Cast your vote</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {scheduled &amp;&amp; <Text style={styles.subtle}>Reminders scheduled</Text>}
                <TouchableOpacity onPress={scheduleVoteReminders} style={styles.smallBtn}><Ionicons name="notifications-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Schedule</Text></TouchableOpacity>
                <TouchableOpacity onPress={rescheduleReminders} style={styles.smallBtn}><Ionicons name="refresh-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Reschedule</Text></TouchableOpacity>
                <TouchableOpacity onPress={cancelReminders} style={styles.smallBtn}><Ionicons name="close-circle-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={simulateFinish} style={styles.smallBtn}><Ionicons name="fast-forward-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Simulate finish</Text></TouchableOpacity>
                <TouchableOpacity onPress={notifyTestAudience} style={styles.smallBtn}><Ionicons name="megaphone-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Notify test audience</Text></TouchableOpacity>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
              {cats.map((c) => (
                <TouchableOpacity key={c.key} onPress={() => setSelectedCat(c.key)} style={[styles.chip, selectedCat === c.key &amp;&amp; styles.chipActive]}>
                  <Text style={[styles.chipTxt, selectedCat === c.key &amp;&amp; styles.chipTxtActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ height: 8 }} />
            <TextInput placeholder="Player/fighter name" placeholderTextColor="#8a90a4" value={name} onChangeText={setName} style={styles.input} returnKeyType="send" onSubmitEditing={submitVote} />
            <TouchableOpacity disabled={submitting || !name.trim()} onPress={submitVote} style={[styles.submit, (!name.trim() || submitting) &amp;&amp; { opacity: 0.6 }]}><Ionicons name="send-outline" size={18} color="#fff" /><Text style={styles.btnTxt}>{submitting ? "Submitting..." : "Submit Vote"}</Text></TouchableOpacity>
          </Card>

          {match?.sport === "football" &amp;&amp; (
            <Card {...cardProps} style={styles.card}>
              <Text style={styles.blockTitle}>Player star ratings (10⭐ each)</Text>
              <Text style={styles.voteLine}>Rate: {name || "(enter player name above)"}</Text>
              <View style={styles.ratingRow}><Text style={styles.ratingLabel}>Attack</Text><StarRow value={playerRatings.attack} onChange={(v) => setPlayerRatings((s) => ({ ...s, attack: v }))} /></View>
              <View style={styles.ratingRow}><Text style={styles.ratingLabel}>Defense</Text><StarRow value={playerRatings.defense} onChange={(v) => setPlayerRatings((s) => ({ ...s, defense: v }))} /></View>
              <View style={styles.ratingRow}><Text style={styles.ratingLabel}>Passing</Text><StarRow value={playerRatings.passing} onChange={(v) => setPlayerRatings((s) => ({ ...s, passing: v }))} /></View>
              <View style={styles.ratingRow}><Text style={styles.ratingLabel}>Dribbling</Text><StarRow value={playerRatings.dribbling} onChange={(v) => setPlayerRatings((s) => ({ ...s, dribbling: v }))} /></View>
              <TouchableOpacity onPress={submitPlayerRatings} style={styles.submit}><Ionicons name="save-outline" size={18} color="#fff" /><Text style={styles.smallBtnTxt}>Submit Ratings</Text></TouchableOpacity>
              {playerAvg &amp;&amp; (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.voteLine}>Community averages (n={playerAvg.count}): A {playerAvg.averages.attack} • D {playerAvg.averages.defense} • P {playerAvg.averages.passing} • Dr {playerAvg.averages.dribbling} • Overall {playerAvg.overall}</Text>
                </View>
              )}
            </Card>
          )}

          <Card {...cardProps} style={styles.card}>
            <Text style={styles.blockTitle}>Fan voting (results)</Text>
            {!votesData || Object.keys(votesData?.percentages || {}).length === 0 ? (
              <Text style={styles.voteLine}>No votes yet</Text>
            ) : (
              Object.entries(votesData.percentages || {}).map(([cat, entries]: any) => (
                <View key={cat} style={{ marginTop: 10 }}>
                  <Text style={[styles.voteLine, { marginBottom: 6 }]}>{cat.replaceAll("_", " ")} • total {votesData.totals?.[cat] ?? 0}</Text>
                  {Object.entries(entries as any).map(([player, pct]: any) => (
                    <View key={player} style={styles.barRow}>
                      <View style={styles.barBg}><View style={[styles.bar, { width: `${pct}%` }]} /></View>
                      <Text style={styles.barTxt}>{player} — {pct}%</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </Card>
        </ScrollView>

        {/* Admin JSON Modal */}
        <Modal visible={adminModal.open} animationType="slide" onRequestClose={() => setAdminModal({ ...adminModal, open: false })}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1, backgroundColor: "#0a0a0f" }} contentContainerStyle={{ padding: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 12 }}>Edit {adminModal.kind} JSON</Text>
              <Text style={{ color: "c7d1df", marginBottom: 8 }}>X-Admin-Token</Text>
              <TextInput value={adminModal.token} onChangeText={(t) => setAdminModal({ ...adminModal, token: t })} style={[styles.input, { marginBottom: 10 }]} placeholder="CHANGEME" placeholderTextColor="#8a90a4" />
              <TextInput value={adminModal.json} onChangeText={(t) => setAdminModal({ ...adminModal, json: t })} style={[styles.input, { minHeight: 240, textAlignVertical: "top" }]} multiline placeholder="{}" placeholderTextColor="#8a90a4" />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={() => setAdminModal({ ...adminModal, open: false })} style={[styles.smallBtn, { backgroundColor: "#333" }]}><Text style={styles.smallBtnTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveAdmin} style={styles.smallBtn}><Ionicons name="save-outline" size={16} color="#fff" /><Text style={styles.smallBtnTxt}>Save</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const StarRow = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <View style={{ flexDirection: "row" }}>
    {Array.from({ length: 10 }).map((_, i) => (
      <TouchableOpacity key={i} onPress={() => onChange(i + 1)} style={{ padding: 4 }}>
        <Ionicons name={i < value ? "star" : "star-outline"} size={18} color="#f5c242" />
      </TouchableOpacity>
    ))}
  </View>
);

function StatusChip({ status }: { status?: string }) {
  const map: any = {
    out: { bg: "#3a1f1f", color: "#ff9b9b", label: "Out" },
    doubtful: { bg: "#3a331f", color: "#ffd59b", label: "Doubtful" },
    recovery: { bg: "#1f3a2b", color: "#95ffbf", label: "Recovery" },
  };
  const st = status &amp;&amp; map[status] ? map[status] : { bg: "#262b3a", color: "#c7d1df", label: status || "Status" };
  return (<View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeTxt, { color: st.color }]}>{st.label}</Text></View>);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 8, flexWrap: "wrap" },
  headerTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },
  queueChip: { color: "#fff", backgroundColor: "#1f1b3a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: "hidden", fontSize: 12 },
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
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  ratingLabel: { color: "#c7d1df", width: 120 },
  person: { color: "#d6deea", marginBottom: 4 },
  sectionTitle: { color: "#9aa3b2", fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontWeight: "800", fontSize: 12 },
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 40, backgroundColor: "rgba(255, 77, 109, 0.10)", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  derbyChip: { backgroundColor: "rgba(255, 77, 109, 0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  derbyTxt: { color: "#ff4d6d", fontSize: 10, fontWeight: "600" },
});