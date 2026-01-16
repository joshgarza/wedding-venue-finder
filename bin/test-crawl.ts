import { db } from "../db/db-config";
import { crawlStage } from "../src/pipeline/stage_2_crawl";

async function runStandaloneCrawl() {
  console.log("🚀 Initializing Standalone Crawl Stage Test...");

  // 1. Construct the Context (ctx)
  // This satisfies the 'Stage' interface requirements
  const ctx = {
    db,
    // Add any other config variables your stages might look for
    startTime: new Date(),
    isTestRun: true 
  };

  try {
    console.log("--- Starting Crawl Stage ---");
    
    // 2. Manually trigger the stage
    const result = await crawlStage.run(ctx);

    if (result.success) {
      console.log("✅ Crawl Stage execution finished successfully.");
    } else {
      console.error("⚠️ Crawl Stage reported a non-critical failure.");
    }

  } catch (error) {
    console.error("❌ Critical Error during Crawl Stage test:");
    console.error(error);
  } finally {
    // 3. Cleanup
    console.log("🔌 Closing database connection...");
    await db.destroy();
    process.exit(0);
  }
}

runStandaloneCrawl();
