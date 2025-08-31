import Constants from "expo-constants";
import { useAuth } from "../store/auth";

const base = (process.env.EXPO_PUBLIC_BACKEND_URL || (Constants.expoConfig as any)?.extra?.backend) as string | undefined;

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const token = useAuth.getState().token;
  const headers: any = { "Content-Type": "application/json", ...(init?.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return { ...init, headers };
}

export async function apiGet(path: string) {
  const url = `${base || ""}${path}`;
  const res = await fetch(url, await withAuthHeaders());
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`GET ${path} failed: ${res.status} ${txt}`);
    // @ts-ignore
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function apiPost(path: string, body?: any) {
  const url = `${base || ""}${path}`;
  const res = await fetch(url, await withAuthHeaders({ method: "POST", body: JSON.stringify(body || {}) }));
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`POST ${path} failed: ${res.status} ${txt}`);
    // @ts-ignore
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function apiPostAdmin(path: string, body: any, adminToken: string) {
  const url = `${base || ""}${path}`;
  const headers: any = { "Content-Type": "application/json", "X-Admin-Token": adminToken };
  const token = useAuth.getState().token;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body || {}) });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`POST_ADMIN ${path} failed: ${res.status} ${txt}`);
    // @ts-ignore
    err.status = res.status;
    throw err;
  }
  return res.json();
}