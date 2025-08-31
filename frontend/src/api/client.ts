import Constants from "expo-constants";
import { useAuth } from "../store/auth";

const base = (process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.backend) as string | undefined;

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const token = useAuth.getState().token;
  const headers: any = { "Content-Type": "application/json", ...(init?.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return { ...init, headers };
}

export async function apiGet(path: string) {
  const url = `${base || ""}${path}`;
  const res = await fetch(url, await withAuthHeaders());
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body?: any) {
  const url = `${base || ""}${path}`;
  const res = await fetch(url, await withAuthHeaders({ method: "POST", body: JSON.stringify(body || {}) }));
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}