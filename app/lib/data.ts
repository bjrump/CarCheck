import { promises as fs } from 'fs';
import path from 'path';
import { Car, Inspection, CarEvent, EventType } from './types';
import { calculateNextInspectionDateByYear, calculateNextInspectionDateByKm, getEarliestDate } from './utils';

const dataDirectory = path.join(process.cwd(), 'data');
const dataFilePath = path.join(dataDirectory, 'cars.json');
const CARS_KEY = 'cars';

// Check which Redis is configured
type RedisType = 'upstash' | 'standard' | null;

function getRedisType(): RedisType {
  // Check for Upstash Redis (REST API)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return 'upstash';
  }
  // Check for standard Redis (TCP connection)
  if (process.env.REDIS_URL) {
    return 'standard';
  }
  return null;
}

function isRedisAvailable(): boolean {
  return getRedisType() !== null;
}

// Ensure data directory exists (for file fallback)
async function ensureDataDirectory() {
  try {
    await fs.access(dataDirectory);
  } catch {
    await fs.mkdir(dataDirectory, { recursive: true });
  }
}

// Migrate old data format (oilChange -> inspection, TÜV cleanup)
function migrateCar(car: any): Car {
  let migratedCar: any = { ...car };

  // Migrate TÜV: remove intervalType and intervalValue, keep only dates
  if (migratedCar.tuv && (migratedCar.tuv.intervalType || migratedCar.tuv.intervalValue)) {
    const { intervalType, intervalValue, ...tuvRest } = migratedCar.tuv;
    migratedCar.tuv = {
      ...tuvRest,
    };
  }

  // Migrate tires: ensure tires array exists and has correct structure
  if (!migratedCar.tires) {
    migratedCar.tires = [];
  } else {
    // Migrate tires: remove initialMileage if it exists
    migratedCar.tires = migratedCar.tires.map((tire: any) => {
      // If initialMileage exists, migrate it to currentMileage
      if (tire.initialMileage !== undefined) {
        const { initialMileage, ...rest } = tire;
        // Use initialMileage as currentMileage if currentMileage doesn't exist or is the same
        return {
          ...rest,
          currentMileage: tire.currentMileage !== undefined ? tire.currentMileage : initialMileage,
        };
      }
      return tire;
    });
  }
  if (!migratedCar.tireChangeEvents) {
    migratedCar.tireChangeEvents = [];
  }
  if (migratedCar.currentTireId === undefined) {
    migratedCar.currentTireId = null;
  }
  if (!migratedCar.eventLog) {
    migratedCar.eventLog = [];
  }
  if (!migratedCar.fuelEntries) {
    migratedCar.fuelEntries = [];
  }

  // Migrate from old oilChange format to inspection
  if (!migratedCar.inspection && migratedCar.oilChange) {
    const oldOilChange = migratedCar.oilChange;
    const inspection: Inspection = {
      lastInspectionDate: oldOilChange.lastChangeDate || null,
      lastInspectionMileage: oldOilChange.lastChangeMileage || null,
      nextInspectionDateByYear: null,
      nextInspectionDateByKm: null,
      nextInspectionDate: oldOilChange.nextChangeDate || null,
      intervalYears: oldOilChange.intervalType === 'years' ? oldOilChange.intervalValue : 1,
      intervalKm: oldOilChange.intervalType === 'km' ? oldOilChange.intervalValue : 15000,
      completed: oldOilChange.completed || false,
    };

    // Calculate dates if we have the data
    if (inspection.lastInspectionDate) {
      inspection.nextInspectionDateByYear = calculateNextInspectionDateByYear(
        inspection.lastInspectionDate,
        inspection.intervalYears
      );
    }

    if (inspection.lastInspectionDate && inspection.lastInspectionMileage !== null && migratedCar.mileage) {
      inspection.nextInspectionDateByKm = calculateNextInspectionDateByKm(
        inspection.lastInspectionDate,
        inspection.lastInspectionMileage,
        migratedCar.mileage,
        inspection.intervalKm
      );
    }

    inspection.nextInspectionDate = getEarliestDate(
      inspection.nextInspectionDateByYear,
      inspection.nextInspectionDateByKm
    ) || inspection.nextInspectionDate;

    // Remove old oilChange and add inspection
    const { oilChange, ...rest } = migratedCar;
    migratedCar = {
      ...rest,
      inspection,
    };
  } else if (!migratedCar.inspection) {
    // Default inspection if neither exists
    migratedCar.inspection = {
      lastInspectionDate: null,
      lastInspectionMileage: null,
      nextInspectionDateByYear: null,
      nextInspectionDateByKm: null,
      nextInspectionDate: null,
      intervalYears: 1,
      intervalKm: 15000,
      completed: false,
    };
  }

  return migratedCar as Car;
}

// ===== REDIS STORAGE (Upstash oder Standard) =====
// Initialize Redis clients (singleton pattern)
let upstashRedisClient: any = null;
let standardRedisClient: any = null;

async function getUpstashRedisClient() {
  if (!upstashRedisClient) {
    const { Redis } = await import('@upstash/redis');
    upstashRedisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return upstashRedisClient;
}

async function getStandardRedisClient() {
  if (!standardRedisClient) {
    const { createClient } = await import('redis');
    standardRedisClient = createClient({
      url: process.env.REDIS_URL,
    });
    await standardRedisClient.connect();
  }
  return standardRedisClient;
}

async function getCarsFromRedis(): Promise<Car[]> {
  try {
    const redisType = getRedisType();
    let data: string | null = null;

    if (redisType === 'upstash') {
      const redis = await getUpstashRedisClient();
      data = await redis.get(CARS_KEY);
    } else if (redisType === 'standard') {
      const redis = await getStandardRedisClient();
      data = await redis.get(CARS_KEY);
    }

    if (!data) {
      return [];
    }

    // Parse JSON string to array
    const cars = typeof data === 'string' ? JSON.parse(data) : data;

    if (!Array.isArray(cars)) {
      return [];
    }

    const migratedCars = cars.map(migrateCar);
    
    // Check if migration is needed and save back to Redis
    const needsMigration = cars.some(c =>
      (c.oilChange && !c.inspection) ||
      (c.tuv && (c.tuv.intervalType || c.tuv.intervalValue)) ||
      c.tires === undefined ||
      c.tireChangeEvents === undefined ||
      c.currentTireId === undefined ||
      c.eventLog === undefined ||
      c.fuelEntries === undefined ||
      (c.tires && Array.isArray(c.tires) && c.tires.some((t: any) => t.initialMileage !== undefined))
    );
    
    const needsEventLogMigration = migratedCars.some(c => !c.eventLog || c.eventLog.length === 0);
    
    if (needsMigration || needsEventLogMigration) {
      await saveCarsToRedis(migratedCars);
    }
    
    return migratedCars;
  } catch (error) {
    console.error('Error reading from Redis:', error);
    throw error;
  }
}

async function saveCarsToRedis(cars: Car[]): Promise<void> {
  try {
    const redisType = getRedisType();
    const jsonData = JSON.stringify(cars);

    if (redisType === 'upstash') {
      const redis = await getUpstashRedisClient();
      await redis.set(CARS_KEY, jsonData);
    } else if (redisType === 'standard') {
      const redis = await getStandardRedisClient();
      await redis.set(CARS_KEY, jsonData);
    }
  } catch (error) {
    console.error('Error saving to Redis:', error);
    throw error;
  }
}

// ===== FILE SYSTEM STORAGE (FALLBACK) =====
async function getCarsFromFile(): Promise<Car[]> {
  try {
    await ensureDataDirectory();
    const fileContents = await fs.readFile(dataFilePath, 'utf8');

    // Handle empty file
    if (!fileContents || fileContents.trim() === '') {
      return [];
    }

    const cars = JSON.parse(fileContents) as any[];

    // Handle empty array
    if (!Array.isArray(cars)) {
      return [];
    }

    // Migrate old data format
    const migratedCars = cars.map(migrateCar);

    // Save migrated data if migration occurred
    const needsMigration = cars.some(c =>
      (c.oilChange && !c.inspection) ||
      (c.tuv && (c.tuv.intervalType || c.tuv.intervalValue)) ||
      c.tires === undefined ||
      c.tireChangeEvents === undefined ||
      c.currentTireId === undefined ||
      c.eventLog === undefined ||
      c.fuelEntries === undefined ||
      (c.tires && Array.isArray(c.tires) && c.tires.some((t: any) => t.initialMileage !== undefined))
    );
    
    // Always save if eventLog is missing (even if no other migration needed)
    const needsEventLogMigration = migratedCars.some(c => !c.eventLog || c.eventLog.length === 0);
    
    if (needsMigration || needsEventLogMigration) {
      await saveCars(migratedCars);
    }

    return migratedCars;
  } catch (error: any) {
    // If file doesn't exist or is invalid, return empty array
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      return [];
    }
    console.error('Error reading cars from file:', error);
    throw error;
  }
}

async function saveCarsToFile(cars: Car[]): Promise<void> {
  await ensureDataDirectory();
  const tempFilePath = `${dataFilePath}.tmp`;

  try {
    // Write to temporary file first
    await fs.writeFile(tempFilePath, JSON.stringify(cars, null, 2), 'utf8');
    // Atomic rename
    await fs.rename(tempFilePath, dataFilePath);
  } catch (error) {
    // Clean up temp file if rename fails
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

// ===== UNIFIED API =====
// Read all cars (automatically uses Redis if available, otherwise file system)
// WARNING: Fallback strategy can lead to data inconsistency if Redis intermittently fails.
// In production, consider using ONLY Redis OR ONLY File storage, not both with fallback.
export async function getCars(): Promise<Car[]> {
  if (isRedisAvailable()) {
    try {
      return await getCarsFromRedis();
    } catch (error) {
      // Fallback to file system if Redis fails
      // NOTE: This can cause inconsistency - file data may be stale if Redis was working before
      console.warn('Failed to read from Redis, falling back to file system:', error);
      return await getCarsFromFile();
    }
  }

  return await getCarsFromFile();
}

// Write cars (automatically uses Redis if available, otherwise file system)
// WARNING: Fallback strategy can lead to data inconsistency if Redis intermittently fails.
// In production, consider using ONLY Redis OR ONLY File storage, not both with fallback.
export async function saveCars(cars: Car[]): Promise<void> {
  if (isRedisAvailable()) {
    try {
      return await saveCarsToRedis(cars);
    } catch (error) {
      // Fallback to file system if Redis fails
      // NOTE: This creates divergence - Redis and File will have different data
      console.warn('Failed to save to Redis, falling back to file system:', error);
      return await saveCarsToFile(cars);
    }
  }

  return await saveCarsToFile(cars);
}

// Get a single car by ID
export async function getCarById(id: string): Promise<Car | null> {
  const cars = await getCars();
  return cars.find(car => car.id === id) || null;
}

// Create a new car
export async function createCar(car: Omit<Car, 'id' | 'createdAt' | 'updatedAt' | 'eventLog'> & { eventLog?: CarEvent[] }): Promise<Car> {
  const cars = await getCars();
  const now = new Date().toISOString();
  const newCar: Car = {
    ...car,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    eventLog: car.eventLog || [],
  };
  
  // Add car_created event
  newCar.eventLog.push({
    id: crypto.randomUUID(),
    type: 'car_created',
    date: now,
    description: `Fahrzeug ${car.make} ${car.model} wurde erstellt`,
  });
  
  cars.push(newCar);
  await saveCars(cars);
  return newCar;
}

// Helper function to add an event to a car
export function addCarEvent(car: Car, type: EventType, description: string, metadata?: Record<string, any>): Car {
  const event: CarEvent = {
    id: crypto.randomUUID(),
    type,
    date: new Date().toISOString(),
    description,
    metadata,
  };
  
  return {
    ...car,
    eventLog: [...(car.eventLog || []), event],
  };
}

// Update an existing car
export async function updateCar(id: string, updates: Partial<Car>): Promise<Car | null> {
  const cars = await getCars();
  const index = cars.findIndex(car => car.id === id);

  if (index === -1) {
    return null;
  }

  cars[index] = {
    ...cars[index],
    ...updates,
    id, // Ensure ID doesn't change
    updatedAt: new Date().toISOString(),
  };

  await saveCars(cars);
  return cars[index];
}

// Delete a car
export async function deleteCar(id: string): Promise<boolean> {
  const cars = await getCars();
  const filteredCars = cars.filter(car => car.id !== id);

  if (filteredCars.length === cars.length) {
    return false; // Car not found
  }

  await saveCars(filteredCars);
  return true;
}
