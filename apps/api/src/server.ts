import { config } from "./config";
import { buildApp } from "./app";
import { openDb } from "./db";
import { scrapeAnd8 } from "./scrapers/run";

const db = openDb();
const app = await buildApp(db);

let running = false;
async function runScrape() {
  if (running) return;
  running = true;
  try {
    await scrapeAnd8(db, (m) => app.log.info(m));
  } catch (err) {
    app.log.error(err, "scrape failed");
  } finally {
    running = false;
  }
}

await app.listen({ port: config.port, host: "0.0.0.0" });

if (config.scraperEnabled) {
  void runScrape();
  setInterval(runScrape, config.scrapeIntervalHours * 3600 * 1000).unref();
} else {
  app.log.info("Scraper disabled (SCRAPER_ENABLED=false)");
}
