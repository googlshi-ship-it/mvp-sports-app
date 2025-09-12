import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, SectionList, Platform, ToastAndroid, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchMatches, formatISODate, type LeagueSection } from '../../../lib/api';
import MatchCard from '../../../components/MatchCard';

function todayISO() {
  return formatISODate(new Date());
}

export default function MatchesScreen() {
  const [sections, setSections] = useState<LeagueSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const key = process.env.EXPO_PUBLIC_FD_API_KEY;
        const data = await fetchMatches({ dateISO: todayISO(), sport: 'football' });
        setSections(data);
        if (!key) {
          setHint('Добавьте ключ EXPO_PUBLIC_FD_API_KEY в frontend/.env');
        } else if (data.length === 0) {
          setHint('No matches for this date or API rate limit.');
        } else {
          setHint(null);
        }
      } catch (e: any) {
        const msg = (e?.message || 'Failed to load').toString();
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert(msg);
        setHint('Temporary issue fetching matches.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex:1, backgroundColor:'#000' }} edges={['top','bottom']}>
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (sections.length === 0) {
    return (
      <SafeAreaView style={{ flex:1, backgroundColor:'#000' }} edges={['top','bottom']}>
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:24 }}>
          <Text style={{ color:'#fff', fontSize:16, textAlign:'center' }}>{hint || 'No matches for this date.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#000' }} edges={['top','bottom']}>
      <View style={{ flex:1 }}>
        <SectionList
          sections={sections.map(s => ({ title: `${s.leagueName} • ${s.country}`, data: s.data }))}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal:16, paddingTop:16 }}>
              <Text style={{ color:'#c7cbd6', fontWeight:'700' }}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal:16, paddingTop:10 }}>
              <MatchCard match={item} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}