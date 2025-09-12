import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function Index() {
  return (
    <View style={s.container}>
      <Text style={s.title}>MVP Arena</Text>
      <Text style={s.subtitle}>SDK 54 • Preview Channel</Text>
      <Link href="/(tabs)/competitions" asChild>
        <TouchableOpacity style={s.btn}>
          <Text style={s.btnText}>Enter app</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9AA3B2', marginBottom: 20 },
  btn: { backgroundColor: '#1e90ff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, minWidth: 160, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});