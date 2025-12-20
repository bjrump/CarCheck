import { getCarById, updateCar } from "@/app/lib/data";
import { Inspection } from "@/app/lib/types";
import {
  calculateNextInspectionDateByKm,
  calculateNextInspectionDateByYear,
  getEarliestDate,
} from "@/app/lib/utils";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/cars/[id]/inspection - Update inspection information
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 15+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const car = await getCarById(resolvedParams.id);

    if (!car) {
      return NextResponse.json(
        { error: "Fahrzeug nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Convert date string from HTML input (YYYY-MM-DD) to ISO string if needed
    // HTML date inputs return YYYY-MM-DD format, which needs to be converted to ISO
    // Also normalize existing dates that might be in YYYY-MM-DD format
    let lastInspectionDate =
      body.lastInspectionDate !== undefined
        ? body.lastInspectionDate
        : car.inspection.lastInspectionDate;

    if (lastInspectionDate && typeof lastInspectionDate === "string") {
      if (lastInspectionDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Convert YYYY-MM-DD to ISO string (preserve local date, use midnight local time)
        // Use local timezone to avoid date shifts
        const dateParts = lastInspectionDate.split("-");
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2], 10);
        const localDate = new Date(year, month, day, 0, 0, 0, 0);
        lastInspectionDate = localDate.toISOString();
      } else if (!lastInspectionDate.match(/^\d{4}-\d{2}-\d{2}T/)) {
        // If it's not already an ISO string, try to parse it
        const parsed = new Date(lastInspectionDate);
        if (!isNaN(parsed.getTime())) {
          lastInspectionDate = parsed.toISOString();
        }
      }
    } else if (lastInspectionDate === "") {
      // Empty string should be null
      lastInspectionDate = null;
    }

    // Validate and sanitize numeric values
    let intervalYears: number;
    if (body.intervalYears !== undefined) {
      if (
        typeof body.intervalYears === "number" &&
        !isNaN(body.intervalYears) &&
        body.intervalYears > 0
      ) {
        intervalYears = body.intervalYears;
      } else if (
        typeof body.intervalYears === "string" &&
        body.intervalYears.trim() !== ""
      ) {
        const parsed = parseInt(body.intervalYears, 10);
        intervalYears =
          !isNaN(parsed) && parsed > 0 ? parsed : car.inspection.intervalYears;
      } else {
        intervalYears = car.inspection.intervalYears;
      }
    } else {
      intervalYears = car.inspection.intervalYears;
    }

    let intervalKm: number;
    if (body.intervalKm !== undefined) {
      if (
        typeof body.intervalKm === "number" &&
        !isNaN(body.intervalKm) &&
        body.intervalKm > 0
      ) {
        intervalKm = body.intervalKm;
      } else if (
        typeof body.intervalKm === "string" &&
        body.intervalKm.trim() !== ""
      ) {
        const parsed = parseInt(body.intervalKm, 10);
        intervalKm =
          !isNaN(parsed) && parsed > 0 ? parsed : car.inspection.intervalKm;
      } else {
        intervalKm = car.inspection.intervalKm;
      }
    } else {
      intervalKm = car.inspection.intervalKm;
    }

    const lastInspectionMileage =
      body.lastInspectionMileage !== undefined
        ? body.lastInspectionMileage === null ||
          body.lastInspectionMileage === ""
          ? null
          : typeof body.lastInspectionMileage === "number"
          ? body.lastInspectionMileage
          : typeof body.lastInspectionMileage === "string" &&
            body.lastInspectionMileage.trim() !== ""
          ? parseInt(body.lastInspectionMileage, 10)
          : null
        : car.inspection.lastInspectionMileage;

    const updatedInspection: Inspection = {
      ...car.inspection,
      ...body,
      lastInspectionDate:
        lastInspectionDate !== undefined
          ? lastInspectionDate
          : car.inspection.lastInspectionDate,
      intervalYears,
      intervalKm,
      lastInspectionMileage:
        lastInspectionMileage !== undefined
          ? lastInspectionMileage
          : car.inspection.lastInspectionMileage,
    };

    // Calculate next inspection dates based on intervals
    if (updatedInspection.lastInspectionDate) {
      // Ensure intervalYears is a number
      const yearsInterval =
        typeof updatedInspection.intervalYears === "number"
          ? updatedInspection.intervalYears
          : parseInt(String(updatedInspection.intervalYears || 1), 10);
      updatedInspection.nextInspectionDateByYear =
        calculateNextInspectionDateByYear(
          updatedInspection.lastInspectionDate,
          yearsInterval
        );
    } else {
      updatedInspection.nextInspectionDateByYear = null;
    }

    if (
      updatedInspection.lastInspectionDate &&
      updatedInspection.lastInspectionMileage !== null
    ) {
      updatedInspection.nextInspectionDateByKm =
        calculateNextInspectionDateByKm(
          updatedInspection.lastInspectionDate,
          updatedInspection.lastInspectionMileage,
          car.mileage,
          updatedInspection.intervalKm
        );
    } else {
      updatedInspection.nextInspectionDateByKm = null;
    }

    // Set next inspection date to the earlier of the two
    // Uses actual driving behavior for km-based calculation
    updatedInspection.nextInspectionDate = getEarliestDate(
      updatedInspection.nextInspectionDateByYear,
      updatedInspection.nextInspectionDateByKm
    );

    const updatedCar = await updateCar(resolvedParams.id, {
      inspection: updatedInspection,
    });

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error(
      "Fehler beim Aktualisieren der Inspektions-Informationen:",
      error
    );
    return NextResponse.json(
      {
        error: "Fehler beim Aktualisieren der Inspektions-Informationen",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
