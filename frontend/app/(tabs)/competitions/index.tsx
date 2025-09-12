import React, { useEffect, useState } from 'react';
import { View, FlatList, Pressable, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { listCompetitions, Competition, sortCompetitionsByStrength } from '../../../lib/footballData';
import { savePreferredCompetitionId } from '../../../lib/competitionPref';

export default function CompetitionsScreen() {
  const [data, setData] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const comps = await listCompetitions();
      setData(sortCompetitionsByStrength(comps));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top','bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top','bottom']}>
      <View style={{ flex: 1, padding: 16 }}>
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable
              onPress={async () => {
                await savePreferredCompetitionId(item.id);
                router.push('/(tabs)/matches');
              }}
              style={{ padding: 16, borderRadius: 12, backgroundColor: '#111', marginBottom: 12 }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: '#aaa', marginTop: 4 }}>{item.area?.name}</Text>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}