import "dotenv/config";
import { app } from "./src/app.js";
import { connectDb } from "./src/db.js";
import { startScrapeScheduler } from "./src/jobs/scheduler.js";

const port = Number(process.env.PORT) || 8000;

async function main() {
  await connectDb();
  startScrapeScheduler();

  app.listen(port, () => {
    console.log(`TLDR API listening at http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
