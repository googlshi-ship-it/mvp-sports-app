import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import type { LeagueSection } from '../lib/api';

type Match = LeagueSection['data'][number];

function timeHHMM(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MatchCard({ match }: { match: Match }) {
  const HomeLogo = match.home.logo ? (
    <Image source={{ uri: match.home.logo }} style={s.logo} />
  ) : (
    <View style={[s.logo, s.logoPh]} />
  );
  const AwayLogo = match.away.logo ? (
    <Image source={{ uri: match.away.logo }} style={s.logo} />
  ) : (
    <View style={[s.logo, s.logoPh]} />
  );

  return (
    <View style={s.card}>
      <Text style={s.time}>{timeHHMM(match.utcDate)}</Text>
      <View style={s.teams}>
        <View style={s.row}>
          {HomeLogo}
          <Text style={s.team} numberOfLines={1}>{match.home.name}</Text>
        </View>
        <View style={s.row}>
          {AwayLogo}
          <Text style={s.teamMuted} numberOfLines={1}>{match.away.name}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.divider },
  time: { width: 56, color: colors.text, fontWeight: '600' },
  teams: { flex: 1, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#222' },
  logoPh: { backgroundColor: '#222' },
  team: { color: colors.text, fontSize: 16, fontWeight: '600' },
  teamMuted: { color: colors.muted, fontSize: 14 },
});