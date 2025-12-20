/**
 * Script to view data stored in Redis
 *
 * Usage: npx tsx scripts/view-redis-data.ts
 */

import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), ".env.local") });

const CARS_KEY = "cars";

async function viewData() {
  // Check which Redis is configured
  const hasUpstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasStandard = process.env.REDIS_URL;

  if (!hasUpstash && !hasStandard) {
    console.error("❌ Redis is not configured!");
    process.exit(1);
  }

  const redisType = hasUpstash ? "upstash" : "standard";
  console.log(
    `📊 Connecting to ${
      redisType === "upstash" ? "Upstash" : "Standard"
    } Redis...\n`
  );

  try {
    // Initialize Redis client
    let redis: any;
    if (redisType === "upstash") {
      const { Redis } = await import("@upstash/redis");
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    } else {
      const { createClient } = await import("redis");
      redis = createClient({
        url: process.env.REDIS_URL,
      });
      await redis.connect();
    }

    // Get all keys
    console.log("🔑 All keys in Redis:");
    let keys: string[] = [];

    if (redisType === "upstash") {
      // Upstash doesn't support KEYS command directly, so we'll just check for our key
      const data = await redis.get(CARS_KEY);
      if (data) {
        keys = [CARS_KEY];
      }
    } else {
      // Standard Redis
      keys = await redis.keys("*");
    }

    if (keys.length === 0) {
      console.log("   (no keys found)");
    } else {
      keys.forEach((key: string) => console.log(`   - ${key}`));
    }

    console.log('\n📦 Data for key "cars":');
    const data = await redis.get(CARS_KEY);

    if (!data) {
      console.log("   (no data found)");
    } else {
      const cars = typeof data === "string" ? JSON.parse(data) : data;

      if (Array.isArray(cars)) {
        console.log(`   Found ${cars.length} car(s):\n`);
        cars.forEach((car: any, index: number) => {
          console.log(
            `   ${index + 1}. ${car.make} ${car.model} (${car.year})`
          );
          console.log(`      ID: ${car.id}`);
          console.log(`      Mileage: ${car.mileage?.toLocaleString()} km`);
          console.log(`      Created: ${car.createdAt}`);
          console.log(`      Updated: ${car.updatedAt}`);
          console.log("");
        });

        // Show full JSON
        console.log("📄 Full JSON data:");
        console.log(JSON.stringify(cars, null, 2));
      } else {
        console.log("   (invalid data format)");
        console.log(data);
      }
    }

    // Disconnect standard Redis client
    if (redisType === "standard") {
      await redis.disconnect();
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

viewData();
