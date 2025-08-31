import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, RefreshControl, Image, Platform, ToastAndroid, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiGet } from "../../src/api/client";

function TypeBadge({ type }: { type?: string }) {
  const label = (type || "").toUpperCase();
  const bg = type === "league" ? "#1f2940" : "#3a1f2a";
  const color = type === "league" ? "#7ea8ff" : "#ff9bb2";
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeTxt, { color }]}>{label || "UNKNOWN"}</Text></View>;
}

export default function Competitions() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toast = (m: string) => { if (Platform.OS === "android") ToastAndroid.show(m, ToastAndroid.SHORT); else Alert.alert(m); };

  const load = async () => {
    try {
      setError(null);
      const res = await apiGet(`/api/competitions`);
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.warn(e);
      setError("Failed to load competitions");
      toast("Failed to load competitions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return (<View style={styles.center}><ActivityIndicator color="#9b8cff" /></View>);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.row} onPress={() => router.push(`/competition/${item?._id}`)}>
      {item?.logoUrl ? (
        <Image source={{ uri: item.logoUrl }} style={styles.logo} resizeMode="contain" />
      ) : (
        <View style={[styles.logo, { backgroundColor: "#101526", alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: "#5f6a86", fontSize: 10 }}>Logo</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item?.name || "—"}</Text>
        <Text style={styles.meta}>Season {item?.season || "—"} • {item?.countryCode || item?.country || "—"}</Text>
      </View>
      <TypeBadge type={item?.type} />
    </TouchableOpacity>
  );

  const Retry = () => (
    <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryTxt}>Retry</Text></TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {error ? (
        <View style={{ padding: 16 }}>
          <Text style={[styles.meta, { textAlign: "center", marginBottom: 8 }]}>{error}</Text>
          <Retry />
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(it) => it?._id || `${it?.name}-${it?.season}`}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9b8cff" />}
        ListEmptyComponent={<View><Text style={styles.empty}>No competitions</Text><Retry /></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  center: { flex: 1, backgroundColor: "#0a0a0f", alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  logo: { width: 40, height: 40, borderRadius: 8, marginRight: 8 },
  name: { color: "#fff", fontWeight: "800" },
  meta: { color: "#9aa3b2", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeTxt: { fontWeight: "800", fontSize: 12 },
  empty: { color: "#9aa3b2", textAlign: "center", padding: 16 },
  retryBtn: { alignSelf: "center", marginTop: 8, backgroundColor: "#1f1b3a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  retryTxt: { color: "#fff", fontWeight: "700" },
});