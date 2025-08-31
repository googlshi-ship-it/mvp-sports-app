import React, { useState } from "react";
import { View, TouchableOpacity, Image, StyleSheet, Modal, Text } from "react-native";
import { useAuth } from "../store/auth";

export default function HeaderAvatar() {
  const [open, setOpen] = useState(false);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.hit}>
        <View style={styles.avatar} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.text}>{user?.email || "Guest"}</Text>
            <Text style={styles.text}>Score: {user?.score ?? 0}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.btn}><Text style={styles.btnTxt}>Settings</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { logout(); setOpen(false); }} style={styles.btn}><Text style={styles.btnTxt}>Logout</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setOpen(false)} style={[styles.btn, { backgroundColor: "#333" }]}><Text style={styles.btnTxt}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hit: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#8a7cff" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  sheet: { width: "80%", borderRadius: 18, backgroundColor: "#111521", padding: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  text: { color: "#c7d1df", marginBottom: 6 },
  btn: { backgroundColor: "#4a56e2", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 10 },
  btnTxt: { color: "#fff", fontWeight: "700" },
});