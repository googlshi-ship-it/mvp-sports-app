import { LEAGUE_ORDER } from '../leagueOrder';

const FD_BASE = 'https://api.football-data.org/v4';
const API_KEY = process.env.EXPO_PUBLIC_FD_API_KEY as string | undefined;

if (!API_KEY) {
  console.warn('EXPO_PUBLIC_FD_API_KEY is missing. Add it to frontend/.env to enable live matches.');
}

type FDTeam = { id: number; name: string; shortName?: string; tla?: string; crest?: string };
type FDMatch = {
  id: number;
  utcDate: string;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  competition: { code: string; name: string; area: { name: string } };
};

export type Match = {
  id: string;
  utcDate: string;
  home: { id: string; name: string; logo?: string };
  away: { id: string; name: string; logo?: string };
  leagueId: string; // PL/BL1/PD/SA/FL1/CL
};

export type LeagueSection = {
  leagueId: string;
  leagueName: string;
  country: string;
  data: Match[];
};

export async function fetchMatchesFD(dateISO: string): Promise<LeagueSection[]> {
  if (!API_KEY) return [];

  const headers = { 'X-Auth-Token': API_KEY } as const;
  const from = dateISO;
  const to = dateISO;

  const sections = await Promise.all(
    LEAGUE_ORDER.map(async (lg) => {
      const url = `${FD_BASE}/competitions/${lg.id}/matches?dateFrom=${from}&dateTo=${to}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn('FD error', lg.id, res.status, await res.text());
        return { leagueId: lg.id, leagueName: lg.name, country: lg.country, data: [] } as LeagueSection;
      }
      const json: { matches: FDMatch[] } = await res.json();
      const data: Match[] = json.matches.map((m) => ({
        id: String(m.id),
        utcDate: m.utcDate,
        home: { id: String(m.homeTeam.id), name: m.homeTeam.name, logo: m.homeTeam.crest },
        away: { id: String(m.awayTeam.id), name: m.awayTeam.name, logo: m.awayTeam.crest },
        leagueId: lg.id,
      }));
      return { leagueId: lg.id, leagueName: lg.name, country: lg.country, data } as LeagueSection;
    })
  );
  return sections.filter((s) => s.data.length > 0);
}