import React from 'react';
import { View, Text, ScrollView } from 'react-native';
export default function Competitions() {
  const leagues = ['Premier League','Bundesliga','LaLiga','Serie A','Ligue 1','UEFA CL'];
  return (
    <ScrollView style={{ flex:1, backgroundColor:'#000' }} contentContainerStyle={{ padding:16 }}>
      <Text style={{ color:'#fff', fontSize:20, marginBottom:12 }}>Top competitions</Text>
      {leagues.map((name) => (
        <View key={name} style={{ backgroundColor:'#111', borderRadius:12, padding:16, marginBottom:12 }}>
          <Text style={{ color:'#fff', fontSize:16 }}>{name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}