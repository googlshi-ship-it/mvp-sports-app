import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
export default function Index() {
  const router = useRouter();
  return (
    <View style={{ flex:1, backgroundColor:'#000', alignItems:'center', justifyContent:'center' }}>
      <Text style={{ color:'#fff', fontSize:28, marginBottom:24 }}>MVP Arena</Text>
      <Pressable
        onPress={() => router.replace('/(tabs)/competitions')}
        style={{ backgroundColor:'#4F46E5', paddingHorizontal:20, paddingVertical:12, borderRadius:12 }}>
        <Text style={{ color:'#fff', fontSize:16 }}>Enter app</Text>
      </Pressable>
    </View>
  );
}