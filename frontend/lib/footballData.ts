import { Platform } from 'react-native';

const BASE = 'https://api.football-data.org/v4';
const TOKEN = process.env.EXPO_PUBLIC_FD_API_TOKEN; // положим токен в .env

type Area = { name: string; code?: string };
export type Competition = { id: number; name: string; area: Area };
export type Match = {
  id: number;
  utcDate: string; // ISO
  status: string;
  competition: Competition;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: { fullTime: { home: number | null; away: number | null } };
};

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function todayRange() {
  const from = new Date(); from.setHours(0,0,0,0);
  const to   = new Date(); to.setHours(23,59,59,999);
  return { dateFrom: fmtDate(from), dateTo: fmtDate(to) };
}

async function fd<T>(path: string, params?: Record<string, string>) {
  const url = new URL(BASE + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: TOKEN ? { 'X-Auth-Token': TOKEN } : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Football-Data ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Лиги бесплатного плана часто помечены как TIER_ONE.
// Если токена нет или ошибка — вернём демо-данные (чтобы альфа работала).
export async function listCompetitions(): Promise<Competition[]> {
  try {
    const data = await fd<{ competitions: Competition[] }>('/competitions', { plan: 'TIER_ONE' });
    return data.competitions;
  } catch (e) {
    console.warn('FD competitions fallback:', e);
    return DEMO_COMPETITIONS;
  }
}

export async function listMatches(opts: { competitionId?: number; dateFrom?: string; dateTo?: string }): Promise<Match[]> {
  const params: Record<string, string> = {};
  if (opts.competitionId) params.competitions = String(opts.competitionId);
  if (opts.dateFrom) params.dateFrom = opts.dateFrom;
  if (opts.dateTo) params.dateTo = opts.dateTo;
  try {
    const data = await fd<{ matches: Match[] }>('/matches', params);
    return data.matches;
  } catch (e) {
    console.warn('FD matches fallback:', e);
    return DEMO_MATCHES;
  }
}

// ---- DEMO (на случай отсутствия токена) ----
const DEMO_COMPETITIONS: Competition[] = [
  { id: 2001, name: 'UEFA Champions League', area: { name: 'Europe', code: 'EUR' } },
  { id: 2014, name: 'La Liga', area: { name: 'Spain', code: 'ESP' } },
];

const DEMO_MATCHES: Match[] = [
  {
    id: 1,
    utcDate: new Date().toISOString(),
    status: 'SCHEDULED',
    competition: DEMO_COMPETITIONS[0],
    homeTeam: { name: 'Team A' },
    awayTeam: { name: 'Team B' },
    score: { fullTime: { home: null, away: null } },
  },
  {
    id: 2,
    utcDate: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    status: 'SCHEDULED',
    competition: DEMO_COMPETITIONS[1],
    homeTeam: { name: 'Team C' },
    awayTeam: { name: 'Team D' },
    score: { fullTime: { home: null, away: null } },
  },
];