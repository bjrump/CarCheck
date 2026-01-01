import { NextRequest, NextResponse } from "next/server";
import { getCarById, updateCar, addCarEvent } from "@/app/lib/data";
import {
  calculateNextInspectionDateByKm,
  calculateNextInspectionDateByYear,
  getEarliestDate,
} from "@/app/lib/utils";
import { formatNumber } from "@/app/lib/utils";

// PUT /api/cars/[id]/mileage - Update car mileage and recalculate inspections
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
    const newMileage = parseInt(body.mileage, 10);

    if (isNaN(newMileage) || newMileage < 0) {
      return NextResponse.json(
        { error: "Ungültiger Kilometerstand" },
        { status: 400 }
      );
    }

    // Validate that new mileage is not less than current mileage
    if (newMileage < car.mileage) {
      return NextResponse.json(
        { error: `Der neue Kilometerstand (${formatNumber(newMileage)} km) kann nicht niedriger sein als der aktuelle Kilometerstand (${formatNumber(car.mileage)} km)` },
        { status: 400 }
      );
    }

    // Validate against fuel entries - mileage should not be lower than any existing fuel entry
    if (car.fuelEntries && car.fuelEntries.length > 0) {
      const maxFuelMileage = Math.max(...car.fuelEntries.map(e => e.mileage));
      if (newMileage < maxFuelMileage) {
        return NextResponse.json(
          { error: `Der neue Kilometerstand (${formatNumber(newMileage)} km) kann nicht niedriger sein als der höchste Tankeintrag (${formatNumber(maxFuelMileage)} km)` },
          { status: 400 }
        );
      }
    }

    // Update mileage
    const updates: any = {
      mileage: newMileage,
    };

    // Recalculate inspection dates based on new mileage
    if (car.inspection.lastInspectionDate && car.inspection.lastInspectionMileage !== null) {
      const nextInspectionDateByKm = calculateNextInspectionDateByKm(
        car.inspection.lastInspectionDate,
        car.inspection.lastInspectionMileage,
        newMileage,
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
    const carWithEvent = addCarEvent(
      car,
      'mileage_update',
      `Kilometerstand von ${formatNumber(car.mileage)} km auf ${formatNumber(newMileage)} km aktualisiert`,
      {
        oldMileage: car.mileage,
        newMileage: newMileage,
      }
    );
    updates.eventLog = carWithEvent.eventLog;

    const updatedCar = await updateCar(resolvedParams.id, updates);

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Kilometerstands:", error);
    return NextResponse.json(
      {
        error: "Fehler beim Aktualisieren des Kilometerstands",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

