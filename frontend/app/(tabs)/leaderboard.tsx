import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { apiGet } from "../../src/api/client";

export default function LeaderboardScreen() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try { const data = await apiGet("/api/leaderboard"); setItems(data || []); } catch {}
    };
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top Fans</Text>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.score}>{item.score}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", padding: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#242436" },
  rank: { color: "#a5a8b8", width: 24 },
  email: { color: "#fff", flex: 1 },
  score: { color: "#9b8cff", fontWeight: "800", width: 60, textAlign: "right" },
});