/**
 * Migration Script: Migrate data from cars.json to Redis
 *
 * Supports both Upstash Redis (REST API) and Standard Redis (TCP)
 *
 * Usage:
 * 1. Set environment variables (choose one):
 *    For Upstash:
 *      export UPSTASH_REDIS_REST_URL="your-redis-url"
 *      export UPSTASH_REDIS_REST_TOKEN="your-redis-token"
 *    For Standard Redis/Redis Labs:
 *      export REDIS_URL="redis://..."
 *
 * 2. Run: npx tsx scripts/migrate-to-redis.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const CARS_KEY = 'cars';
const dataFilePath = path.join(process.cwd(), 'data', 'cars.json');

async function migrate() {
  // Check which Redis is configured
  const hasUpstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasStandard = process.env.REDIS_URL;

  if (!hasUpstash && !hasStandard) {
    console.error('❌ Redis is not configured!');
    console.error('Please set one of the following:');
    console.error('  - UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (for Upstash)');
    console.error('  - REDIS_URL (for standard Redis/Redis Labs)');
    process.exit(1);
  }

  const redisType = hasUpstash ? 'upstash' : 'standard';
  console.log(`✅ Using ${redisType === 'upstash' ? 'Upstash' : 'Standard'} Redis`);

  try {
    // Read existing data from file
    console.log('📖 Reading data from cars.json...');
    const fileContents = await fs.readFile(dataFilePath, 'utf8');

    if (!fileContents || fileContents.trim() === '') {
      console.log('⚠️  cars.json is empty, nothing to migrate.');
      return;
    }

    const cars = JSON.parse(fileContents);

    if (!Array.isArray(cars)) {
      console.error('❌ Invalid data format in cars.json');
      process.exit(1);
    }

    console.log(`✅ Found ${cars.length} car(s) in cars.json`);

    // Initialize Redis client based on type
    let redis: any;
    if (redisType === 'upstash') {
      const { Redis } = await import('@upstash/redis');
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    } else {
      const { createClient } = await import('redis');
      redis = createClient({
        url: process.env.REDIS_URL,
      });
      await redis.connect();
    }

    // Check if Redis already has data
    const existingData = await redis.get(CARS_KEY);
    if (existingData) {
      console.log(`⚠️  Warning: Redis already contains data!`);
      console.log('   This migration will overwrite existing data.');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Write to Redis
    console.log(`💾 Writing data to ${redisType === 'upstash' ? 'Upstash' : 'Standard'} Redis...`);
    await redis.set(CARS_KEY, JSON.stringify(cars));

    // Disconnect standard Redis client
    if (redisType === 'standard') {
      await redis.disconnect();
    }

    console.log('✅ Migration completed successfully!');
    console.log(`   Migrated ${cars.length} car(s) to ${redisType === 'upstash' ? 'Upstash' : 'Standard'} Redis`);
    console.log('\n📝 Next steps:');
    console.log(`   1. Verify the data in your ${redisType === 'upstash' ? 'Upstash' : 'Redis'} dashboard`);
    console.log('   2. Test your application');
    console.log('   3. Once confirmed, you can optionally delete data/cars.json');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ENOENT') {
      console.error('   cars.json file not found. Nothing to migrate.');
    }
    process.exit(1);
  }
}

migrate();

