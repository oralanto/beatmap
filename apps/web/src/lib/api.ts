import type { EventDTO, EventsResponse } from "@beatmap/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export interface Meta {
  total: number;
  genres: Record<string, number>;
  styles: Record<string, number>;
  countries: { code: string; count: number }[];
  years: number[];
  updatedAt: string | null;
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchEvents = (qs: string) => get<EventsResponse>(`/api/events?${qs}`);
export const fetchEvent = (id: string) => get<EventDTO>(`/api/events/${encodeURIComponent(id)}`);
export const fetchMeta = () => get<Meta>("/api/meta");
