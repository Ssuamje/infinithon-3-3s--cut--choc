export interface BlinkSession {
  id: string;
  events: string[];
  startedAt: string;
  endedAt: string;
}

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function postBlinkData(session: BlinkSession, base = BASE) {
  const res = await fetch(`${base}/blink-data/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) {
    throw new Error(`POST /blink-data/ failed: ${res.status}`);
  }
  return res.json() as Promise<{ message: string; id: string; timestamp: number }>;
}

export async function getProcessedData(id: string, base = BASE) {
  const res = await fetch(`${base}/processed-data/${id}`);
  if (!res.ok) {
    throw new Error(`GET /processed-data/${id} failed: ${res.status}`);
  }
  return res.json();
}