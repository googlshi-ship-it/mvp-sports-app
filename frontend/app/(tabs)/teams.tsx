import { View, Text, StyleSheet } from "react-native";

export default function TeamsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>My Teams — Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff" },
});