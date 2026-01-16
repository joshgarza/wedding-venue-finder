import { db } from "../db/db-config";
import { processCrawlQueue } from "../src/pipeline/stage_2_crawl";

async function runTest() {
  console.log("🚀 Starting standalone crawl test...");
  try {
    await processCrawlQueue();
    console.log("✅ Crawl queue processing complete.");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await db.destroy();
    process.exit();
  }
}

runTest();
