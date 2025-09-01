import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';

export default function HeaderAvatar() {
  return (
    <Link href="/profile" asChild>
      <TouchableOpacity>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#3A3A3A',
          }}
        />
      </TouchableOpacity>
    </Link>
  );
}