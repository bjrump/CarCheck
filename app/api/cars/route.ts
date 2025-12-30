import { NextRequest, NextResponse } from 'next/server';
import { getCars, createCar } from '@/app/lib/data';
import { Car } from '@/app/lib/types';

// GET /api/cars - Get all cars
export async function GET() {
  try {
    const cars = await getCars();
    return NextResponse.json(cars);
  } catch (error) {
    console.error('Fehler beim Laden der Fahrzeuge:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Fahrzeuge' },
      { status: 500 }
    );
  }
}

// POST /api/cars - Create a new car
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.make || !body.model || !body.year || body.mileage === undefined) {
      return NextResponse.json(
        { error: 'Marke, Modell, Jahr und Kilometerstand sind erforderlich' },
        { status: 400 }
      );
    }

    // Create default TÜV (always 2 years)
    const defaultTUV = {
      lastAppointmentDate: null,
      nextAppointmentDate: null,
      completed: false,
    };

    // Create default inspection (both years and km)
    const defaultInspection = {
      lastInspectionDate: null,
      lastInspectionMileage: null,
      nextInspectionDateByYear: null,
      nextInspectionDateByKm: null,
      nextInspectionDate: null,
      intervalYears: 1,
      intervalKm: 15000,
      completed: false,
    };

    const newCar = await createCar({
      make: body.make,
      model: body.model,
      year: parseInt(body.year),
      vin: body.vin || undefined,
      licensePlate: body.licensePlate || undefined,
      mileage: parseInt(body.mileage),
      insurance: body.insurance || null,
      tuv: body.tuv || defaultTUV,
      inspection: body.inspection || defaultInspection,
      tires: [],
      tireChangeEvents: [],
      currentTireId: null,
      fuelEntries: [],
    });

    return NextResponse.json(newCar, { status: 201 });
  } catch (error: any) {
    console.error('Fehler beim Erstellen des Fahrzeugs:', error);
    return NextResponse.json(
      { error: `Fehler beim Erstellen des Fahrzeugs: ${error.message || 'Unbekannter Fehler'}` },
      { status: 500 }
    );
  }
}

