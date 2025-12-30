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

    // Validate that the new mileage is not less than the current car mileage
    if (mileage < car.mileage) {
      return NextResponse.json(
        { error: "Der Kilometerstand kann nicht geringer sein als der aktuelle Kilometerstand des Fahrzeugs" },
        { status: 400 }
      );
    }

    // Calculate kmDriven and consumption based on previous entry
    const sortedEntries = [...(car.fuelEntries || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const lastEntry = sortedEntries[sortedEntries.length - 1];

    let kmDriven: number | undefined;
    let consumption: number | undefined;

    if (lastEntry) {
      kmDriven = mileage - lastEntry.mileage;
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
    const updatedFuelEntries = [...(car.fuelEntries || []), newFuelEntry];
    
    const updates: any = {
      fuelEntries: updatedFuelEntries,
      mileage: mileage, // Update car mileage to the fuel entry mileage
    };

    // Recalculate inspection dates based on new mileage
    if (car.inspection.lastInspectionDate && car.inspection.lastInspectionMileage !== null) {
      const nextInspectionDateByKm = calculateNextInspectionDateByKm(
        car.inspection.lastInspectionDate,
        car.inspection.lastInspectionMileage,
        mileage,
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
