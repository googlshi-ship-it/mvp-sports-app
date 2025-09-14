import React from 'react';
import { View, Text } from 'react-native';

export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 24 }}>MVP App is running</Text>
    </View>
  );
}