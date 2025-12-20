import { NextRequest, NextResponse } from "next/server";
import { getCarById, updateCar } from "@/app/lib/data";
import {
  calculateNextInspectionDateByKm,
  calculateNextInspectionDateByYear,
  getEarliestDate,
} from "@/app/lib/utils";

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

