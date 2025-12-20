import { NextRequest, NextResponse } from 'next/server';
import { getCarById, updateCar } from '@/app/lib/data';
import { Tire } from '@/app/lib/types';

// GET /api/cars/[id]/tires - Get all tires for a car
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

    return NextResponse.json(car.tires || []);
  } catch (error) {
    console.error('Fehler beim Laden der Reifen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Reifen' },
      { status: 500 }
    );
  }
}

// POST /api/cars/[id]/tires - Add a new tire set
export async function POST(
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

    const body = await request.json();

    if (!body.type || body.currentMileage === undefined) {
      return NextResponse.json(
        { error: 'Typ und gefahrene Kilometer sind erforderlich' },
        { status: 400 }
      );
    }

    // Validierung: Nur 1 aktiver Satz pro Typ
    const activeTires = (car.tires || []).filter(t => !t.archived);
    const existingActiveType = activeTires.find(t => t.type === body.type);
    if (existingActiveType) {
      return NextResponse.json(
        { error: `Es existiert bereits ein aktiver Satz ${body.type === 'summer' ? 'Sommerreifen' : body.type === 'winter' ? 'Winterreifen' : 'Allwetterreifen'}. Bitte archivieren Sie den bestehenden Satz zuerst.` },
        { status: 400 }
      );
    }

    const newTire: Tire = {
      id: crypto.randomUUID(),
      type: body.type,
      brand: body.brand || undefined,
      model: body.model || undefined,
      currentMileage: parseInt(body.currentMileage),
      archived: false,
    };

    const updatedTires = [...(car.tires || []), newTire];
    const updatedCar = await updateCar(resolvedParams.id, { tires: updatedTires });

    return NextResponse.json(updatedCar, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Reifen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hinzufügen der Reifen' },
      { status: 500 }
    );
  }
}

// PUT /api/cars/[id]/tires - Update tires array
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
        { error: 'Fahrzeug nicht gefunden' },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!Array.isArray(body.tires)) {
      return NextResponse.json(
        { error: 'Reifen müssen als Array übergeben werden' },
        { status: 400 }
      );
    }

    // Validierung: Nur 1 aktiver Satz pro Typ
    const activeTires = body.tires.filter((t: Tire) => !t.archived);
    const typeCounts: Record<string, number> = {};
    activeTires.forEach((tire: Tire) => {
      typeCounts[tire.type] = (typeCounts[tire.type] || 0) + 1;
    });

    const duplicateTypes = Object.entries(typeCounts).filter(([_, count]) => count > 1);
    if (duplicateTypes.length > 0) {
      return NextResponse.json(
        { error: `Es kann nur ein aktiver Satz pro Typ geben. Mehrfach vorhanden: ${duplicateTypes.map(([type]) => type).join(', ')}` },
        { status: 400 }
      );
    }

    // Validierung: Archivierte Reifen können nicht montiert sein
    const archivedButMounted = body.tires.filter((t: Tire) => t.archived && car.currentTireId === t.id);
    if (archivedButMounted.length > 0) {
      return NextResponse.json(
        { error: 'Archivierte Reifen können nicht montiert sein' },
        { status: 400 }
      );
    }

    const updatedCar = await updateCar(resolvedParams.id, { tires: body.tires });

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Reifen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Reifen' },
      { status: 500 }
    );
  }
}

