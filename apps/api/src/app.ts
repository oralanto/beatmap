import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { z } from "zod";
import { GENRES, STYLES, isGenre, isStyle, toISODate, type EventsQuery } from "@beatmap/shared";
import type { DB } from "./db";
import { toICS } from "./ics";
import { EventsRepo } from "./repo";

const csv = <T extends string>(guard: (v: string) => v is T) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(guard) : undefined));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const querySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  genre: csv<(typeof GENRES)[number]>(isGenre),
  style: csv<(typeof STYLES)[number]>(isStyle),
  q: z.string().trim().max(100).optional(),
  country: z.string().length(2).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(20000).optional(),
  hasCoords: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function buildApp(db: DB) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const repo = new EventsRepo(db);

  await app.register(cors, { origin: true, methods: ["GET"] });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.get("/health", async () => ({ ok: true }));

  app.get("/api/events", async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid query", issues: parsed.error.issues });
    const p = parsed.data;
    if ((p.lat === undefined) !== (p.lng === undefined))
      return reply.code(400).send({ error: "lat and lng must be provided together" });

    const query: EventsQuery = {
      from: p.from ?? toISODate(new Date()),
      to: p.to,
      genres: p.genre,
      styles: p.style,
      q: p.q || undefined,
      country: p.country,
      lat: p.lat,
      lng: p.lng,
      radiusKm: p.radiusKm,
      hasCoords: p.hasCoords === "true",
      limit: p.limit,
      offset: p.offset,
    };
    reply.header("Cache-Control", "public, max-age=60");
    return repo.list(query);
  });

  app.get<{ Params: { id: string } }>("/api/events/:id", async (req, reply) => {
    const ev = repo.get(req.params.id);
    if (!ev) return reply.code(404).send({ error: "Not found" });
    return ev;
  });

  app.get<{ Params: { id: string } }>("/api/events/:id/calendar.ics", async (req, reply) => {
    const ev = repo.get(req.params.id);
    if (!ev) return reply.code(404).send({ error: "Not found" });
    reply
      .header("Content-Type", "text/calendar; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${ev.id}.ics"`);
    return toICS(ev);
  });

  app.get("/api/meta", async (_req, reply) => {
    reply.header("Cache-Control", "public, max-age=300");
    return repo.meta(toISODate(new Date()));
  });

  return app;
}
