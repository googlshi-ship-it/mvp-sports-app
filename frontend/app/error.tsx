import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function GlobalError({ error }: { error?: Error }) {
  const router = useRouter();
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Something went wrong</Text>
      {!!error && <Text style={s.msg}>{String(error?.message || 'Unknown error')}</Text>}
      <TouchableOpacity style={s.btn} onPress={() => router.replace('/')}> 
        <Text style={s.btnText}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  msg: { color: '#9AA3B2', textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: '#1e90ff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});