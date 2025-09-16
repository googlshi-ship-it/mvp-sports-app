import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, Link } from "expo-router";
import { apiPost } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onLogin = async () => {
    setLoading(true);
    try {
      const res = await apiPost("/api/auth/login", { email, password });
      useAuth.getState().setAuth(res.token, res.user);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Login failed", e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#8a90a4" />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.input} placeholderTextColor="#8a90a4" />
        <TouchableOpacity onPress={onLogin} disabled={loading} style={styles.button}><Text style={styles.buttonTxt}>{loading ? "Loading..." : "Login"}</Text></TouchableOpacity>
        <Link href="/auth/register" style={styles.link}>Create account</Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", padding: 16, justifyContent: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  input: { backgroundColor: "#0f1220", color: "#fff", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#25273a", marginBottom: 10 },
  button: { backgroundColor: "#4a56e2", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonTxt: { color: "#fff", fontWeight: "700" },
  link: { color: "#9b8cff", textAlign: "center", marginTop: 12 },
});