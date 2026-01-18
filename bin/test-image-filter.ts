import { db } from "../db/db-config";
import { imageFilterStage } from "../src/pipeline/stage_5_image_filter";
import { promises as fs } from "fs";
import { PipelineCtx } from "../src/types";

/**
 * Stage 5 Standalone Test Runner
 * Focus: High-fidelity image cleanup by discarding logos and watermarks.
 */
async function runStage5Test() {
  console.log("🚀 Initializing Stage 5: Image Filter (Anti-Logo) Test...");

  const ctx: Partial<PipelineCtx> = {
    db,
    startTime: new Date(),
    isTestRun: true,
    // Configuration for Phase 4 specifics
    filterConfig: {
      logoThreshold: 0.85,
      parallelLimit: 5 
    }
  };

  try {
    console.log("--- Executing Logistical Truth Verification ---");
    
    // 1. Ensure the error log exists for async append operations
    const errorLogPath = 'filter_errors.log';
    try {
      await fs.access(errorLogPath);
    } catch {
      await fs.writeFile(errorLogPath, `Filter Log Started: ${new Date().toISOString()}\n`);
    }

    // 2. Trigger the LogoFilter-powered stage logic
    const result = await imageFilterStage.run(ctx as PipelineCtx);

    if (result.success) {
      console.log("✅ Stage 5 finished successfully.");
      
      // Post-Test Audit: Query how many venues were cleaned
      const audit = await db('venues')
        .whereNotNull('image_data')
        .whereRaw("(image_data->>'clip_logo_verified')::boolean = TRUE")
        .count('venue_id as count')
        .first();

      console.log(`📊 Audit: ${audit?.count || 'OOPS'} venues verified as Logo-Free.`);
    } else {
      console.warn("⚠️ Stage 5 completed with warnings. Review filter_errors.log.");
    }

  } catch (error) {
    console.error("❌ Critical Failure in Stage 5 Test:");
    console.error(error);
  } finally {
    console.log("🔌 Closing database connection...");
    // Always destroy the pool to prevent hangs
    await db.destroy();
    process.exit(0);
  }
}

runStage5Test();
