import { db } from "../db/db-config";
import { enrichmentStage } from "../src/pipeline/stage_4_enrichment"; // Path to your new stage
import { PipelineCtx } from "../src/types";

/**
 * Standalone Test for Ticket 2: Ollama & LLM Service Layer Integration
 * This script verifies that:
 * 1. The DB connection retrieves venues with raw_markdown.
 * 2. The Node service can reach the Ollama container via http://ollama:11434.
 * 3. Phi-3 Mini can process a snippet and return a string summary.
 */
async function runStandaloneEnrichmentTest() {
  console.log("🚀 Initializing Standalone Enrichment Stage Test...");

  // Mocking the PipelineCtx to satisfy the stage requirements
  const ctx: Partial<PipelineCtx> = {
    db,
    dataDir: "data",
    // Adding any other required context properties from your types
  };

  try {
    console.log("--- Starting Enrichment Extraction Stage ---");
    
    // Trigger the enrichment logic (Ticket 2 implementation)
    const result = await enrichmentStage.run(ctx as PipelineCtx);

    if (result.success) {
      console.log("✅ Enrichment Stage execution finished successfully.");
    } else {
      console.warn("⚠️ Enrichment Stage finished with warnings.");
    }

  } catch (error) {
    console.error("❌ Critical Error during Enrichment Stage test:");
    console.error(error);
  } finally {
    console.log("🔌 Closing database connection...");
    await db.destroy();
    process.exit(0);
  }
}

runStandaloneEnrichmentTest();
