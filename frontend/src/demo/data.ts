export const demoCompetitions = [
  {
    _id: "comp_la_liga",
    name: "La Liga",
    country: "Spain",
    countryCode: "ES",
    season: "2025",
    type: "league",
    slug: "la-liga-2025",
  },
  {
    _id: "comp_ucl",
    name: "UEFA Champions League",
    country: "Europe",
    countryCode: "EU",
    season: "2025",
    type: "cup",
    slug: "uefa-champions-league-2025",
  },
];

const now = Date.now();

export const demoMatches = [
  // Football
  {
    _id: "m1",
    sport: "football",
    tournament: "La Liga",
    subgroup: "Matchday",
    homeTeam: { type: "club", name: "Team A", countryCode: "ES" },
    awayTeam: { type: "club", name: "Team B", countryCode: "ES" },
    startTime: new Date(now + 6 * 3600 * 1000).toISOString(),
    status: "scheduled",
    channels: { ES: ["Movistar"], CH: ["blue Sport"] },
    stadium: "Demo Stadium",
    venue: "Madrid",
    competition_id: "comp_la_liga",
    formation_home: "4-3-3",
    formation_away: "4-2-3-1",
    lineup_home: [
      { number: "1", name: "GK Home", pos: "GK", role: "starter", playerId: "home_gk", nationalityCode: "ES" },
      { number: "9", name: "CF Home", pos: "FW", role: "starter", playerId: "home_cf", nationalityCode: "ES" },
    ],
    lineup_away: [
      { number: "1", name: "GK Away", pos: "GK", role: "starter", playerId: "away_gk", nationalityCode: "ES" },
      { number: "10", name: "CF Away", pos: "FW", role: "starter", playerId: "away_cf", nationalityCode: "ES" },
    ],
    bench_home: [{ number: "12", name: "Sub H1", pos: "MF", role: "sub" }],
    bench_away: [{ number: "12", name: "Sub A1", pos: "MF", role: "sub" }],
    unavailable_home: [
      { name: "Injured H1", reason: "Hamstring", type: "injury", status: "out" },
      { name: "Doubt H2", reason: "Knock", type: "injury", status: "doubtful" },
    ],
    unavailable_away: [{ name: "Susp A1", reason: "Red card", type: "suspension", status: "out" }],
    lineups_status: "probable",
    lineups_updated_at: new Date().toISOString(),
    injuries_updated_at: new Date().toISOString(),
  },
  // Basketball
  {
    _id: "m2",
    sport: "basketball",
    tournament: "EuroLeague",
    subgroup: "Round",
    homeTeam: { type: "club", name: "Madrid Hoops", countryCode: "ES" },
    awayTeam: { type: "club", name: "Barcelona Dunks", countryCode: "ES" },
    startTime: new Date(now + 12 * 3600 * 1000).toISOString(),
    status: "scheduled",
    channels: { ES: ["DAZN"] },
    stadium: "WiZink Center",
    venue: "Madrid",
    competition_id: "comp_ucl",
    lineup_home: [
      { number: "7", name: "PG Home", pos: "PG", role: "starter" },
      { number: "23", name: "SF Home", pos: "SF", role: "starter" },
    ],
    lineup_away: [
      { number: "3", name: "PG Away", pos: "PG", role: "starter" },
      { number: "33", name: "SF Away", pos: "SF", role: "starter" },
    ],
    bench_home: [{ number: "12", name: "G Bench", pos: "G", role: "sub" }],
    bench_away: [{ number: "15", name: "F Bench", pos: "F", role: "sub" }],
    unavailable_home: [{ name: "Home G Injury", reason: "Ankle", type: "injury", status: "out" }],
    unavailable_away: [],
    lineups_status: "probable",
    lineups_updated_at: new Date().toISOString(),
    injuries_updated_at: new Date().toISOString(),
  },
  // UFC
  {
    _id: "m3",
    sport: "ufc",
    tournament: "UFC Fight Night",
    subgroup: "Main Card",
    homeTeam: { type: "club", name: "Fighter A", countryCode: "US" },
    awayTeam: { type: "club", name: "Fighter B", countryCode: "BR" },
    startTime: new Date(now + 20 * 3600 * 1000).toISOString(),
    status: "scheduled",
    channels: { US: ["ESPN+"] },
    stadium: "T-Mobile Arena",
    venue: "Las Vegas",
    competition_id: "comp_ucl",
    lineup_home: [{ number: "—", name: "Fighter A", role: "starter" }],
    lineup_away: [{ number: "—", name: "Fighter B", role: "starter" }],
    bench_home: [],
    bench_away: [],
    unavailable_home: [],
    unavailable_away: [],
    lineups_status: "confirmed",
    lineups_updated_at: new Date().toISOString(),
    injuries_updated_at: new Date().toISOString(),
  },
];

export function demoMatchesByCompetition(compId: string) {
  return demoMatches.filter((m) => m.competition_id === compId);
}

export function demoMatchById(id: string) {
  return demoMatches.find((m) => m._id === id);
}