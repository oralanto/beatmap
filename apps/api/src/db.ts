import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "./config";

export type DB = Database.Database;

export function openDb(file: string = config.databasePath): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      start_time TEXT,
      venue TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      country_code TEXT,
      lat REAL,
      lng REAL,
      image_url TEXT,
      source_url TEXT NOT NULL,
      detail_fetched_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (source, external_id)
    );
    CREATE INDEX IF NOT EXISTS idx_events_dates ON events (start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_events_genre ON events (genre);
    CREATE INDEX IF NOT EXISTS idx_events_country ON events (country_code);
    CREATE TABLE IF NOT EXISTS event_styles (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      style TEXT NOT NULL,
      PRIMARY KEY (event_id, style)
    );
    CREATE INDEX IF NOT EXISTS idx_event_styles_style ON event_styles (style);
    CREATE TABLE IF NOT EXISTS geocode_cache (
      query_key TEXT PRIMARY KEY,
      lat REAL,
      lng REAL,
      city TEXT,
      country_code TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}
