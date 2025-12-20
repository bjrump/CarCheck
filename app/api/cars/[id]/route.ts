import { NextRequest, NextResponse } from 'next/server';
import { getCarById, updateCar, deleteCar } from '@/app/lib/data';

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
    const updatedCar = await updateCar(resolvedParams.id, body);

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

