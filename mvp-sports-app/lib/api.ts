import { LEAGUE_ORDER } from './leagueOrder';
import { fetchMatchesFD, type LeagueSection as FDSection } from './feeds/footballData';

export type Sport = 'football' | 'basketball' | 'tennis';
export type LeagueSection = FDSection;

export function formatISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function fetchMatches(params: { dateISO: string; sport: Sport }): Promise<LeagueSection[]> {
  if (params.sport !== 'football') return [];
  const sections = await fetchMatchesFD(params.dateISO);
  const order = new Map(LEAGUE_ORDER.map((l, i) => [l.id, i]));
  return [...sections].sort((a, b) => (order.get(a.leagueId) ?? 999) - (order.get(b.leagueId) ?? 999));
}