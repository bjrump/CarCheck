import { promises as fs } from 'fs';
import path from 'path';
import { Car, Inspection } from './types';
import { calculateNextInspectionDateByYear, calculateNextInspectionDateByKm, getEarliestDate } from './utils';

const dataDirectory = path.join(process.cwd(), 'data');
const dataFilePath = path.join(dataDirectory, 'cars.json');

// Ensure data directory exists
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

// Read all cars from JSON file
export async function getCars(): Promise<Car[]> {
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
      (c.tires && Array.isArray(c.tires) && c.tires.some((t: any) => t.initialMileage !== undefined))
    );
    if (needsMigration) {
      await saveCars(migratedCars);
    }

    return migratedCars;
  } catch (error: any) {
    // If file doesn't exist or is invalid, return empty array
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      return [];
    }
    console.error('Error reading cars:', error);
    throw error;
  }
}

// Write cars to JSON file (atomic write)
export async function saveCars(cars: Car[]): Promise<void> {
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

// Get a single car by ID
export async function getCarById(id: string): Promise<Car | null> {
  const cars = await getCars();
  return cars.find(car => car.id === id) || null;
}

// Create a new car
export async function createCar(car: Omit<Car, 'id' | 'createdAt' | 'updatedAt'>): Promise<Car> {
  const cars = await getCars();
  const newCar: Car = {
    ...car,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cars.push(newCar);
  await saveCars(cars);
  return newCar;
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

