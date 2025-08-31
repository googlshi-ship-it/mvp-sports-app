import Constants from "expo-constants";
import { useAuth } from "../store/auth";
import { useUIStore } from "../store/ui";
import { useDemoStore } from "../store/demo";

const base = (process.env.EXPO_PUBLIC_BACKEND_URL || (Constants.expoConfig as any)?.extra?.backend) as string | undefined;
export const RIVALRY_UI = (process.env.EXPO_PUBLIC_RIVALRY_UI ?? "1") !== "0";

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const token = useAuth.getState().token;
  const headers: any = { "Content-Type": "application/json", ...(init?.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return { ...init, headers };
}

function parseMatchId(path: string): string | null {
  const m = path.match(/\/api\/matches\/(.*?)\b/);
  return m ? m[1] : null;
}

function parseCompetitionId(path: string): string | null {
  const m = path.match(/\/api\/competitions\/(.*?)\b/);
  return m ? m[1] : null;
}

async function fallbackGet(path: string): Promise<any> {
  const demo = useDemoStore.getState();
  if (path.startsWith("/api/competitions/") && path.endsWith("/matches") || path.includes("/matches?")) {
    const id = parseCompetitionId(path);
    if (id) return demo.getMatchesForCompetition(id);
  }
  if (path === "/api/competitions") {
    return demo.getCompetitions();
  }
  if (path.startsWith("/api/matches/") && path.includes("include=lineups")) {
    const id = parseMatchId(path);
    if (id) {
      const m = demo.getMatch(id);
      if (!m) throw new Error("demo_match_not_found");
      // attach a lineups payload similar to backend's include
      const lineups = {
        lineups_status: m.lineups_status || "none",
        formation_home: m.formation_home,
        formation_away: m.formation_away,
        home: { starters: (m.lineup_home || []).filter((p: any) => p.role === "starter"), bench: m.bench_home || [], unavailable: m.unavailable_home || [] },
        away: { starters: (m.lineup_away || []).filter((p: any) => p.role === "starter"), bench: m.bench_away || [], unavailable: m.unavailable_away || [] },
        lineups_updated_at: m.lineups_updated_at,
        injuries_updated_at: m.injuries_updated_at,
      };
      return { ...m, lineups };
    }
  }
  if (path.endsWith("/rating")) {
    const id = parseMatchId(path);
    if (id) return demo.getRating(id);
  }
  if (path.endsWith("/votes")) {
    const id = parseMatchId(path);
    if (id) return demo.getVotes(id);
  }
  // matches list/grouped fallback is not critical for demo mode; return empty
  return {};
}

async function fallbackPost(path: string, body?: any): Promise<any> {
  const demo = useDemoStore.getState();
  if (path === "/api/auth/login") {
    if (body?.email?.toLowerCase() === "demo@demo.com" && body?.password === "Demo123!") {
      return { token: "demo-token", user: { id: "demo", email: "demo@demo.com", score: 0 } };
    }
    throw new Error("demo_login_only");
  }
  if (path.endsWith("/rate")) {
    const id = parseMatchId(path);
    if (id) return demo.rate(id, !!body?.like);
  }
  if (path.endsWith("/vote")) {
    const id = parseMatchId(path);
    if (id) return demo.vote(id, body?.category, body?.player);
  }
  if (path.endsWith("/player_ratings")) {
    return { count: 1, averages: { attack: body?.attack || 0, defense: body?.defense || 0, passing: body?.passing || 0, dribbling: body?.dribbling || 0 }, overall: 0, delta: 0 };
  }
  return { ok: true };
}

export async function apiGet(path: string) {
  const url = `${base || ""}${path}`;
  const demoMode = useUIStore.getState().demoMode;
  try {
    const res = await fetch(url, await withAuthHeaders());
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  } catch (e) {
    if (demoMode) {
      try { return await fallbackGet(path); } catch {}
    }
    throw e;
  }
}

export async function apiPost(path: string, body?: any) {
  const url = `${base || ""}${path}`;
  const demoMode = useUIStore.getState().demoMode;
  try {
    const res = await fetch(url, await withAuthHeaders({ method: "POST", body: JSON.stringify(body || {}) }));
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json();
  } catch (e) {
    if (demoMode) {
      try { return await fallbackPost(path, body); } catch {}
    }
    throw e;
  }
}

export async function apiPostAdmin(path: string, body: any, adminToken: string) {
  const url = `${base || ""}${path}`;
  const headers: any = { "Content-Type": "application/json", "X-Admin-Token": adminToken };
  const token = useAuth.getState().token;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body || {}) });
    if (!res.ok) throw new Error(`POST_ADMIN ${path} failed: ${res.status}`);
    return res.json();
  } catch (e) {
    if (useUIStore.getState().demoMode) {
      return await fallbackPost(path, body);
    }
    throw e;
  }
}