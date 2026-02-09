#!/usr/bin/env ts-node
/**
 * Test script for Stage 1.5 (pre-vetting)
 *
 * Usage: npm run test:preVetting
 *
 * This script tests the pre-vetting stage on existing venues.
 * It will:
 * 1. Run pre-vetting on venues that haven't been pre-vetted
 * 2. Display statistics on status distribution
 * 3. Show sample venues from each bucket
 */

import { getDb } from '../db/db-config';
import { preVettingStage } from '../src/pipeline/stage_1_5_pre_vetting';

async function main() {
  const db = getDb();

  console.log('='.repeat(60));
  console.log('Stage 1.5 Pre-Vetting Test');
  console.log('='.repeat(60));

  // Check current state
  const totalVenues = await db('venues').count('* as count').first();
  const withWebsite = await db('venues')
    .whereNotNull('website_url')
    .where('website_url', '!=', '')
    .count('* as count')
    .first();

  console.log(`\nCurrent State:`);
  console.log(`  Total venues: ${totalVenues?.count || 0}`);
  console.log(`  Venues with website: ${withWebsite?.count || 0}`);

  // Run pre-vetting stage
  console.log('\nRunning pre-vetting stage...\n');
  const result = await preVettingStage.run({ db });

  if (!result.success) {
    console.error('Pre-vetting stage failed');
    await db.destroy();
    process.exit(1);
  }

  // Display statistics
  console.log('\n' + '='.repeat(60));
  console.log('Pre-Vetting Results');
  console.log('='.repeat(60));

  const statusDistribution = await db('venues')
    .select('pre_vetting_status')
    .count('* as count')
    .groupBy('pre_vetting_status');

  console.log('\nStatus Distribution:');
  statusDistribution.forEach((row: any) => {
    const emoji =
      row.pre_vetting_status === 'yes'
        ? '✅'
        : row.pre_vetting_status === 'no'
        ? '❌'
        : row.pre_vetting_status === 'needs_confirmation'
        ? '⚠️'
        : '⏳';
    console.log(`  ${emoji} ${row.pre_vetting_status}: ${row.count}`);
  });

  // Show sample venues from each bucket
  console.log('\nSample Venues:');

  const yesSample = await db('venues')
    .where('pre_vetting_status', 'yes')
    .select('name', 'website_url', 'pre_vetting_keywords')
    .limit(3);

  console.log('\n✅ YES (will be crawled):');
  yesSample.forEach((v: any) => {
    console.log(
      `  - ${v.name} (keywords: ${v.pre_vetting_keywords?.join(', ') || 'none'})`
    );
  });

  const noSample = await db('venues')
    .where('pre_vetting_status', 'no')
    .select('name', 'website_url')
    .limit(3);

  console.log('\n❌ NO (will be skipped):');
  noSample.forEach((v: any) => {
    console.log(`  - ${v.name}`);
  });

  const confirmSample = await db('venues')
    .where('pre_vetting_status', 'needs_confirmation')
    .select('name', 'website_url', 'pre_vetting_keywords')
    .limit(3);

  console.log('\n⚠️ NEEDS CONFIRMATION:');
  confirmSample.forEach((v: any) => {
    console.log(
      `  - ${v.name} (keywords: ${v.pre_vetting_keywords?.join(', ') || 'error'})`
    );
  });

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));

  await db.destroy();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
