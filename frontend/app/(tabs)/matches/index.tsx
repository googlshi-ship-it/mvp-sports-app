import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { listMatches, Match, todayRange } from '../../../lib/footballData';
import { getPreferredCompetitionId } from '../../../lib/competitionPref';

function timeHM(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [compId, setCompId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const id = await getPreferredCompetitionId();
      setCompId(id);
      const range = todayRange();
      const data = await listMatches({ competitionId: id ?? undefined, ...range });
      setMatches(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!compId && matches.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#fff', marginBottom: 12, textAlign: 'center' }}>
          Выберите соревнование на вкладке “Competitions”
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/competitions')} style={{ padding: 12, backgroundColor: '#4c4cff', borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Открыть Competitions</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 12 }}>
      <FlatList
        data={matches}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#111', padding: 16, borderRadius: 12, marginBottom: 10 }}>
            <Text style={{ color: '#aaa', marginBottom: 6 }}>{timeHM(item.utcDate)} • {item.competition?.name}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {item.homeTeam.name} — {item.awayTeam.name}
            </Text>
            {item.score?.fullTime && (item.score.fullTime.home != null || item.score.fullTime.away != null) ? (
              <Text style={{ color: '#fff', marginTop: 4 }}>
                Счёт: {item.score.fullTime.home ?? '-'} : {item.score.fullTime.away ?? '-'}
              </Text>
            ) : (
              <Text style={{ color: '#888', marginTop: 4 }}>Ещё не начался</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}