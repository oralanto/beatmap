import { openDb } from "./db";
import { scrapeAnd8 } from "./scrapers/run";

const db = openDb();
scrapeAnd8(db)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
