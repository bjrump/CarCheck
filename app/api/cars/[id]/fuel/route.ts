import { NextRequest, NextResponse } from 'next/server';
import { getCarById, updateCar, addCarEvent } from '@/app/lib/data';
import { FuelEntry } from '@/app/lib/types';
import { formatNumber } from '@/app/lib/utils';

// POST /api/cars/[id]/fuel - Add fuel entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const car = await getCarById(resolvedParams.id);

    if (!car) {
      return NextResponse.json(
        { error: 'Fahrzeug nicht gefunden' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.date || body.mileage === undefined) {
      return NextResponse.json(
        { error: 'Datum und Kilometerstand sind erforderlich' },
        { status: 400 }
      );
    }

    const mileage = parseInt(body.mileage, 10);
    
    if (isNaN(mileage) || mileage < 0) {
      return NextResponse.json(
        { error: 'Ungültiger Kilometerstand' },
        { status: 400 }
      );
    }

    // Chronological validation
    const newEntryDate = new Date(body.date);
    const newEntryTime = newEntryDate.getTime();
    
    // Parse dates once and sort
    const entriesWithParsedDates = (car.fuelEntries || []).map(e => ({
      entry: e,
      dateTime: new Date(e.date).getTime()
    })).sort((a, b) => a.dateTime - b.dateTime);

    const prevEntry = entriesWithParsedDates.filter(e => e.dateTime < newEntryTime).pop();
    if (prevEntry && mileage < prevEntry.entry.mileage) {
      return NextResponse.json(
        { error: 'Der Kilometerstand kann nicht geringer sein als der eines früheren Eintrags.' },
        { status: 400 }
      );
    }

    const nextEntry = entriesWithParsedDates.find(e => e.dateTime > newEntryTime);
    if (nextEntry && mileage > nextEntry.entry.mileage) {
      return NextResponse.json(
        { error: 'Der Kilometerstand kann nicht höher sein als der eines späteren Eintrags.' },
        { status: 400 }
      );
    }

    // Helper to parse optional numeric field
    const parseOptionalNumber = (value: any): number | undefined => {
      return value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined;
    };

    // Create new fuel entry
    const newEntry: FuelEntry = {
      id: crypto.randomUUID(),
      date: new Date(body.date).toISOString(),
      mileage: mileage,
      liters: parseOptionalNumber(body.liters),
      pricePerLiter: parseOptionalNumber(body.pricePerLiter),
      totalCost: parseOptionalNumber(body.totalCost),
      fuelType: body.fuelType ?? undefined,
      notes: body.notes ?? undefined,
    };

    const updatedFuelEntries = [...(car.fuelEntries || []), newEntry];

    // Add event log entry
    let description = `Tankeintrag hinzugefügt bei ${formatNumber(mileage)} km`;
    if (newEntry.liters !== undefined) {
      description += `, ${newEntry.liters.toFixed(2)} Liter`;
    }
    if (newEntry.totalCost !== undefined) {
      description += `, ${newEntry.totalCost.toFixed(2)} €`;
    }

    const carWithEvent = addCarEvent(
      car,
      'fuel_entry',
      description,
      {
        fuelEntryId: newEntry.id,
        mileage: mileage,
        liters: newEntry.liters,
        totalCost: newEntry.totalCost,
      }
    );

    // Update car with new fuel entry
    const updatedCar = await updateCar(resolvedParams.id, {
      fuelEntries: updatedFuelEntries,
      eventLog: carWithEvent.eventLog,
    });

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Tankeintrags:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hinzufügen des Tankeintrags' },
      { status: 500 }
    );
  }
}
