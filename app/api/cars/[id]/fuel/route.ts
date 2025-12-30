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
    const sortedEntriesForValidation = [...(car.fuelEntries || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const prevEntry = sortedEntriesForValidation.filter(e => new Date(e.date) < newEntryDate).pop();
    if (prevEntry && mileage < prevEntry.mileage) {
      return NextResponse.json(
        { error: 'Der Kilometerstand kann nicht geringer sein als der eines früheren Eintrags.' },
        { status: 400 }
      );
    }

    const nextEntry = sortedEntriesForValidation.find(e => new Date(e.date) > newEntryDate);
    if (nextEntry && mileage > nextEntry.mileage) {
      return NextResponse.json(
        { error: 'Der Kilometerstand kann nicht höher sein als der eines späteren Eintrags.' },
        { status: 400 }
      );
    }

    // Create new fuel entry
    const newEntry: FuelEntry = {
      id: crypto.randomUUID(),
      date: new Date(body.date).toISOString(),
      mileage: mileage,
      liters: body.liters ? parseFloat(body.liters) : undefined,
      pricePerLiter: body.pricePerLiter ? parseFloat(body.pricePerLiter) : undefined,
      totalCost: body.totalCost ? parseFloat(body.totalCost) : undefined,
      fuelType: body.fuelType || undefined,
      notes: body.notes || undefined,
    };

    const updatedFuelEntries = [...(car.fuelEntries || []), newEntry];

    // Add event log entry
    let description = `Tankeintrag hinzugefügt bei ${formatNumber(mileage)} km`;
    if (newEntry.liters) {
      description += `, ${newEntry.liters.toFixed(2)} Liter`;
    }
    if (newEntry.totalCost) {
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
