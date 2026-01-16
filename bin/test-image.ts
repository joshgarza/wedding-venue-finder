import { db } from "../db/db-config";
import { imageStage } from "../src/pipeline/stage_3_images";

async function runStandaloneImageTest() {
  console.log("🚀 Initializing Standalone Image Stage Test...");

  const ctx = {
    db,
    startTime: new Date(),
    isTestRun: true
  };

  try {
    console.log("--- Starting Image Extraction Stage ---");
    
    // Trigger the stage logic
    const result = await imageStage.run(ctx);

    if (result.success) {
      console.log("✅ Image Stage execution finished successfully.");
    } else {
      console.warn("⚠️ Image Stage finished with warnings.");
    }

  } catch (error) {
    console.error("❌ Critical Error during Image Stage test:");
    console.error(error);
  } finally {
    console.log("🔌 Closing database connection...");
    await db.destroy();
    process.exit(0);
  }
}

runStandaloneImageTest();
