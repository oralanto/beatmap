import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/scrape.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  noExternal: ["@beatmap/shared"],
  external: ["better-sqlite3"],
});
