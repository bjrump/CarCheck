import { NextRequest, NextResponse } from "next/server";
import { getCarById, updateCar, addCarEvent } from "@/app/lib/data";
import { FuelEntry } from "@/app/lib/types";
import { formatNumber } from "@/app/lib/utils";
import {
  calculateNextInspectionDateByKm,
  getEarliestDate,
} from "@/app/lib/utils";

// GET /api/cars/[id]/fuel - Get all fuel entries for a car
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const car = await getCarById(resolvedParams.id);

    if (!car) {
      return NextResponse.json(
        { error: "Fahrzeug nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(car.fuelEntries || []);
  } catch (error) {
    console.error("Fehler beim Laden der Tankeinträge:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Tankeinträge" },
      { status: 500 }
    );
  }
}

// POST /api/cars/[id]/fuel - Create a new fuel entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const car = await getCarById(resolvedParams.id);

    if (!car) {
      return NextResponse.json(
        { error: "Fahrzeug nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.date || body.mileage === undefined || body.liters === undefined) {
      return NextResponse.json(
        { error: "Datum, Kilometerstand und Liter sind erforderlich" },
        { status: 400 }
      );
    }

    const mileage = parseInt(body.mileage, 10);
    const liters = parseFloat(body.liters);

    if (isNaN(mileage) || mileage < 0 || isNaN(liters) || liters <= 0) {
      return NextResponse.json(
        { error: "Ungültiger Kilometerstand oder Liter" },
        { status: 400 }
      );
    }

    // Chronological validation - ensure mileage consistency with date order
    const newEntryDate = new Date(body.date);
    const newEntryTime = newEntryDate.getTime();
    
    // Parse dates once and sort
    const entriesWithParsedDates = (car.fuelEntries || []).map(e => ({
      entry: e,
      dateTime: new Date(e.date).getTime()
    })).sort((a, b) => a.dateTime - b.dateTime);

    // Check against chronologically previous entry
    const prevEntry = entriesWithParsedDates.filter(e => e.dateTime < newEntryTime).pop();
    if (prevEntry && mileage < prevEntry.entry.mileage) {
      return NextResponse.json(
        { error: 'Der Kilometerstand kann nicht geringer sein als der eines früheren Eintrags.' },
        { status: 400 }
      );
    }

    // Check against chronologically next entry
    const nextEntry = entriesWithParsedDates.find(e => e.dateTime > newEntryTime);
    if (nextEntry && mileage > nextEntry.entry.mileage) {
      return NextResponse.json(
        { error: 'Der Kilometerstand kann nicht höher sein als der eines späteren Eintrags.' },
        { status: 400 }
      );
    }

    // Calculate kmDriven and consumption based on chronologically previous entry
    let kmDriven: number | undefined;
    let consumption: number | undefined;

    if (prevEntry) {
      kmDriven = mileage - prevEntry.entry.mileage;
      if (kmDriven > 0 && liters > 0) {
        consumption = (liters / kmDriven) * 100; // L/100km
      }
    }

    // Create new fuel entry
    const newFuelEntry: FuelEntry = {
      id: crypto.randomUUID(),
      date: body.date,
      mileage,
      liters,
      kmDriven,
      consumption,
      pricePerLiter: body.pricePerLiter ? parseFloat(body.pricePerLiter) : undefined,
      totalCost: body.totalCost ? parseFloat(body.totalCost) : undefined,
      notes: body.notes || undefined,
    };

    // Update car with new fuel entry and mileage
    const updatedFuelEntries = [...(car.fuelEntries || []), newFuelEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Update nextEntry's kmDriven and consumption if it exists
    if (nextEntry) {
      const nextEntryToUpdate = updatedFuelEntries.find(e => e.id === nextEntry.entry.id);
      if (nextEntryToUpdate) {
        nextEntryToUpdate.kmDriven = nextEntryToUpdate.mileage - newFuelEntry.mileage;
        if (nextEntryToUpdate.kmDriven > 0 && nextEntryToUpdate.liters > 0) {
          nextEntryToUpdate.consumption = (nextEntryToUpdate.liters / nextEntryToUpdate.kmDriven) * 100;
        } else {
          nextEntryToUpdate.consumption = undefined;
        }
      }
    }
    
    const updates: any = {
      fuelEntries: updatedFuelEntries,
      mileage: Math.max(mileage, car.mileage), // Update car mileage to the highest value
    };

    // Recalculate inspection dates based on new mileage
    if (car.inspection.lastInspectionDate && car.inspection.lastInspectionMileage !== null) {
      const nextInspectionDateByKm = calculateNextInspectionDateByKm(
        car.inspection.lastInspectionDate,
        car.inspection.lastInspectionMileage,
        updates.mileage,
        car.inspection.intervalKm
      );

      updates.inspection = {
        ...car.inspection,
        nextInspectionDateByKm,
        nextInspectionDate: getEarliestDate(
          car.inspection.nextInspectionDateByYear,
          nextInspectionDateByKm
        ),
      };
    }

    // Add event log entry
    let description = `Tankeintrag: ${formatNumber(liters)} Liter getankt bei ${formatNumber(mileage)} km`;
    if (kmDriven !== undefined) {
      description += ` (${formatNumber(kmDriven)} km gefahren)`;
    }
    if (consumption !== undefined) {
      description += `, Verbrauch: ${consumption.toFixed(2)} L/100km`;
    }

    const carWithEvent = addCarEvent(
      car,
      'fuel_entry',
      description,
      {
        fuelEntryId: newFuelEntry.id,
        mileage: mileage,
        liters: liters,
        kmDriven: kmDriven,
        consumption: consumption,
      }
    );
    updates.eventLog = carWithEvent.eventLog;

    const updatedCar = await updateCar(resolvedParams.id, updates);

    return NextResponse.json(updatedCar, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen des Tankeintrags:", error);
    return NextResponse.json(
      {
        error: "Fehler beim Erstellen des Tankeintrags",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT /api/cars/[id]/fuel - Update an existing fuel entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const car = await getCarById(resolvedParams.id);

    if (!car) {
      return NextResponse.json(
        { error: "Fahrzeug nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.id || !body.date || body.mileage === undefined || body.liters === undefined) {
      return NextResponse.json(
        { error: "ID, Datum, Kilometerstand und Liter sind erforderlich" },
        { status: 400 }
      );
    }

    const entryIndex = car.fuelEntries?.findIndex(e => e.id === body.id);
    if (entryIndex === undefined || entryIndex === -1) {
      return NextResponse.json(
        { error: "Tankeintrag nicht gefunden" },
        { status: 404 }
      );
    }

    const mileage = parseInt(body.mileage, 10);
    const liters = parseFloat(body.liters);

    if (isNaN(mileage) || mileage < 0 || isNaN(liters) || liters <= 0) {
      return NextResponse.json(
        { error: "Ungültiger Kilometerstand oder Liter" },
        { status: 400 }
      );
    }

    // Build updated entries list excluding the current one for validation
    const otherEntries = (car.fuelEntries || []).filter(e => e.id !== body.id);
    const newEntryDate = new Date(body.date);
    const newEntryTime = newEntryDate.getTime();

    // Parse dates and sort other entries
    const otherEntriesWithParsedDates = otherEntries.map(e => ({
      entry: e,
      dateTime: new Date(e.date).getTime()
    })).sort((a, b) => a.dateTime - b.dateTime);

    // Check against chronologically previous entry
    const prevEntry = otherEntriesWithParsedDates.filter(e => e.dateTime < newEntryTime).pop();
    if (prevEntry && mileage < prevEntry.entry.mileage) {
      return NextResponse.json(
        { error: 'Der Kilometerstand kann nicht geringer sein als der eines früheren Eintrags.' },
        { status: 400 }
      );
    }

    // Check against chronologically next entry
    const nextEntry = otherEntriesWithParsedDates.find(e => e.dateTime > newEntryTime);
    if (nextEntry && mileage > nextEntry.entry.mileage) {
      return NextResponse.json(
        { error: 'Der Kilometerstand kann nicht höher sein als der eines späteren Eintrags.' },
        { status: 400 }
      );
    }

    // Calculate kmDriven and consumption based on chronologically previous entry
    let kmDriven: number | undefined;
    let consumption: number | undefined;

    if (prevEntry) {
      kmDriven = mileage - prevEntry.entry.mileage;
      if (kmDriven > 0 && liters > 0) {
        consumption = (liters / kmDriven) * 100; // L/100km
      }
    }

    // Update the fuel entry
    const updatedFuelEntry: FuelEntry = {
      id: body.id,
      date: body.date,
      mileage,
      liters,
      kmDriven,
      consumption,
      pricePerLiter: body.pricePerLiter ? parseFloat(body.pricePerLiter) : undefined,
      totalCost: body.totalCost ? parseFloat(body.totalCost) : undefined,
      notes: body.notes || undefined,
    };

    // Build updated entries list with the modified entry
    const updatedFuelEntries = [...otherEntries, updatedFuelEntry].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Recalculate next entry's kmDriven and consumption if it exists
    if (nextEntry) {
      const nextEntryToUpdate = updatedFuelEntries.find(e => e.id === nextEntry.entry.id);
      if (nextEntryToUpdate) {
        nextEntryToUpdate.kmDriven = nextEntryToUpdate.mileage - updatedFuelEntry.mileage;
        if (nextEntryToUpdate.kmDriven > 0 && nextEntryToUpdate.liters > 0) {
          nextEntryToUpdate.consumption = (nextEntryToUpdate.liters / nextEntryToUpdate.kmDriven) * 100;
        } else {
          nextEntryToUpdate.consumption = undefined;
        }
      }
    }

    // Find the highest mileage across all fuel entries
    const maxFuelMileage = Math.max(...updatedFuelEntries.map(e => e.mileage));
    const newCarMileage = Math.max(maxFuelMileage, car.mileage);

    const updates: any = {
      fuelEntries: updatedFuelEntries,
      mileage: newCarMileage,
    };

    // Recalculate inspection dates based on new mileage
    if (car.inspection.lastInspectionDate && car.inspection.lastInspectionMileage !== null) {
      const nextInspectionDateByKm = calculateNextInspectionDateByKm(
        car.inspection.lastInspectionDate,
        car.inspection.lastInspectionMileage,
        updates.mileage,
        car.inspection.intervalKm
      );

      updates.inspection = {
        ...car.inspection,
        nextInspectionDateByKm,
        nextInspectionDate: getEarliestDate(
          car.inspection.nextInspectionDateByYear,
          nextInspectionDateByKm
        ),
      };
    }

    // Add event log entry
    let description = `Tankeintrag bearbeitet: ${formatNumber(liters)} Liter bei ${formatNumber(mileage)} km`;
    if (kmDriven !== undefined) {
      description += ` (${formatNumber(kmDriven)} km gefahren)`;
    }
    if (consumption !== undefined) {
      description += `, Verbrauch: ${consumption.toFixed(2)} L/100km`;
    }

    const carWithEvent = addCarEvent(
      car,
      'fuel_entry',
      description,
      {
        fuelEntryId: updatedFuelEntry.id,
        mileage: mileage,
        liters: liters,
        kmDriven: kmDriven,
        consumption: consumption,
        edited: true,
      }
    );
    updates.eventLog = carWithEvent.eventLog;

    const updatedCar = await updateCar(resolvedParams.id, updates);

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error("Fehler beim Bearbeiten des Tankeintrags:", error);
    return NextResponse.json(
      {
        error: "Fehler beim Bearbeiten des Tankeintrags",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
