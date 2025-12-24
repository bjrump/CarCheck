import { NextRequest, NextResponse } from 'next/server';
import { getCarById, updateCar, deleteCar, addCarEvent } from '@/app/lib/data';
import { formatNumber } from '@/app/lib/utils';

// GET /api/cars/[id] - Get a single car
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 15+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const car = await getCarById(resolvedParams.id);

    if (!car) {
      return NextResponse.json(
        { error: 'Fahrzeug nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json(car);
  } catch (error) {
    console.error('Fehler beim Laden des Fahrzeugs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Fahrzeugs' },
      { status: 500 }
    );
  }
}

// PUT /api/cars/[id] - Update a car
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 15+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const body = await request.json();
    const car = await getCarById(resolvedParams.id);

    if (!car) {
      return NextResponse.json(
        { error: 'Fahrzeug nicht gefunden' },
        { status: 404 }
      );
    }

    // Track what changed for event log
    const changes: string[] = [];
    if (body.make && body.make !== car.make) changes.push(`Marke: ${car.make} → ${body.make}`);
    if (body.model && body.model !== car.model) changes.push(`Modell: ${car.model} → ${body.model}`);
    if (body.year && body.year !== car.year) changes.push(`Jahr: ${car.year} → ${body.year}`);
    if (body.licensePlate !== undefined && body.licensePlate !== car.licensePlate) {
      changes.push(`Kennzeichen: ${car.licensePlate || 'keines'} → ${body.licensePlate || 'keines'}`);
    }
    if (body.vin !== undefined && body.vin !== car.vin) {
      changes.push(`VIN: ${car.vin || 'keine'} → ${body.vin || 'keine'}`);
    }
    if (body.insurance && JSON.stringify(body.insurance) !== JSON.stringify(car.insurance)) {
      changes.push('Versicherung aktualisiert');
    }

    // Add event log entry if there are changes
    let eventLog = car.eventLog || [];
    if (changes.length > 0) {
      const carWithEvent = addCarEvent(
        car,
        'car_updated',
        `Fahrzeug aktualisiert: ${changes.join(', ')}`,
        { changes }
      );
      eventLog = carWithEvent.eventLog;
    }

    // If insurance was updated, also add insurance_update event
    if (body.insurance && JSON.stringify(body.insurance) !== JSON.stringify(car.insurance)) {
      const carWithInsuranceEvent = addCarEvent(
        { ...car, eventLog },
        'insurance_update',
        `Versicherung aktualisiert: ${body.insurance.provider || 'Unbekannt'}`,
        {
          provider: body.insurance.provider,
          policyNumber: body.insurance.policyNumber,
          expiryDate: body.insurance.expiryDate,
        }
      );
      eventLog = carWithInsuranceEvent.eventLog;
    }

    const updatedCar = await updateCar(resolvedParams.id, { ...body, eventLog });

    if (!updatedCar) {
      return NextResponse.json(
        { error: 'Fahrzeug nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Fahrzeugs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Fahrzeugs' },
      { status: 500 }
    );
  }
}

// DELETE /api/cars/[id] - Delete a car
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 15+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const deleted = await deleteCar(resolvedParams.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Fahrzeug nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Fahrzeugs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Fahrzeugs' },
      { status: 500 }
    );
  }
}

