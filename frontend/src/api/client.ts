import Constants from "expo-constants";

const base = (process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.backend) as string | undefined;

if (!base) {
  console.warn("EXPO_PUBLIC_BACKEND_URL is not set. Backend calls will fail.");
}

export async function apiGet(path: string) {
  const url = `${base || ""}${path}`;
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body?: any) {
  const url = `${base || ""}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}