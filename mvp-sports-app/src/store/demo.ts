import { create } from "zustand";
import { demoCompetitions, demoMatches, demoMatchById, demoMatchesByCompetition } from "../demo/data";

type Votes = Record<string, number>;

type DemoState = {
  competitions: any[];
  matches: any[];
  ratings: Record<string, { likes: number; dislikes: number }>;
  votes: Record<string, { [cat: string]: Votes }>; // matchId -> category -> player -> count
  getCompetitions: () => any[];
  getMatchesForCompetition: (id: string) => any[];
  getMatch: (id: string) => any | null;
  getRating: (id: string) => { likes: number; dislikes: number; likePct: number };
  rate: (id: string, like: boolean) => { likes: number; dislikes: number; likePct: number };
  getVotes: (id: string, allowedCats?: string[]) => { percentages: any; totals: any };
  vote: (id: string, category: string, player: string) => { percentages: any; totals: any };
};

export const useDemoStore = create<DemoState>((set, get) => ({
  competitions: demoCompetitions,
  matches: demoMatches,
  ratings: {},
  votes: {},
  getCompetitions: () => get().competitions,
  getMatchesForCompetition: (id) => demoMatchesByCompetition(id),
  getMatch: (id) => demoMatchById(id) || null,
  getRating: (id) => {
    const r = get().ratings[id] || { likes: 0, dislikes: 0 };
    const total = Math.max(r.likes + r.dislikes, 1);
    return { ...r, likePct: Math.round((r.likes * 100) / total) };
    },
  rate: (id, like) => {
    const r = { ...(get().ratings[id] || { likes: 0, dislikes: 0 }) };
    if (like) r.likes += 1; else r.dislikes += 1;
    set({ ratings: { ...get().ratings, [id]: r } });
    const total = Math.max(r.likes + r.dislikes, 1);
    return { ...r, likePct: Math.round((r.likes * 100) / total) };
  },
  getVotes: (id, allowedCats) => {
    const v = get().votes[id] || {};
    const out: any = {}; const totals: any = {};
    const cats = allowedCats && allowedCats.length ? allowedCats : Object.keys(v);
    cats.forEach((cat) => {
      const counter: Votes = v[cat] || {};
      const total = Object.values(counter).reduce((a, b) => a + b, 0) || 1;
      totals[cat] = total;
      const pct: any = {};
      Object.keys(counter).forEach((player) => (pct[player] = Math.round((counter[player] * 100) / total)));
      out[cat] = pct;
    });
    return { percentages: out, totals };
  },
  vote: (id, category, player) => {
    const v = { ...(get().votes[id] || {}) };
    const counter: Votes = { ...(v[category] || {}) };
    counter[player] = (counter[player] || 0) + 1;
    v[category] = counter;
    set({ votes: { ...get().votes, [id]: v } });
    const total = Object.values(counter).reduce((a, b) => a + b, 0) || 1;
    const pct: any = {}; Object.keys(counter).forEach((p) => (pct[p] = Math.round((counter[p] * 100) / total)));
    return { percentages: { [category]: pct }, totals: { [category]: total } };
  },
}));