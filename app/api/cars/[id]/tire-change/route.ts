import { NextRequest, NextResponse } from 'next/server';
import { getCarById, updateCar, addCarEvent } from '@/app/lib/data';
import { TireChangeEvent } from '@/app/lib/types';
import { formatDate, formatNumber } from '@/app/lib/utils';

// POST /api/cars/[id]/tire-change - Perform tire change
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
    const { carMileage, tireId, changeDate } = body;

    if (!carMileage || !tireId) {
      return NextResponse.json(
        { error: 'Kilometerstand und Reifen-ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Use provided date or current date
    const eventDate = changeDate ? new Date(changeDate).toISOString() : new Date().toISOString();

    const newTire = car.tires?.find(t => t.id === tireId && !t.archived);
    if (!newTire) {
      return NextResponse.json(
        { error: 'Reifen nicht gefunden oder archiviert' },
        { status: 404 }
      );
    }

    // Validierung: Archivierte Reifen können nicht montiert werden
    if (newTire.archived) {
      return NextResponse.json(
        { error: 'Archivierte Reifen können nicht montiert werden' },
        { status: 400 }
      );
    }

    const currentTire = car.currentTireId ? car.tires?.find(t => t.id === car.currentTireId) : null;
    const updatedTires = [...(car.tires || [])];
    const updatedEvents = [...(car.tireChangeEvents || [])];
    const currentMileage = parseInt(carMileage);

    // Update current tire (unmount) - nur dieser Reifen bekommt KM hochgerechnet
    if (currentTire) {
      const currentTireIndex = updatedTires.findIndex(t => t.id === currentTire.id);
      if (currentTireIndex !== -1) {
        // Find last mount event for current tire
        const currentTireLastMount = updatedEvents
          .filter(e => e.tireId === currentTire.id && e.changeType === 'mount')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (currentTireLastMount) {
          // Berechne gefahrene KM seit letztem Mount
          const kmDrivenOnCurrentTire = currentMileage - currentTireLastMount.carMileage;
          updatedTires[currentTireIndex].currentMileage = currentTireLastMount.tireMileage + kmDrivenOnCurrentTire;
        }

        // Create unmount event
        const unmountEvent: TireChangeEvent = {
          id: crypto.randomUUID(),
          date: eventDate,
          carMileage: currentMileage,
          tireId: currentTire.id,
          tireMileage: updatedTires[currentTireIndex].currentMileage,
          changeType: 'unmount',
        };
        updatedEvents.push(unmountEvent);
      }
    }

    // Update new tire (mount) - dieser Reifen behält seine aktuellen KM
    const newTireIndex = updatedTires.findIndex(t => t.id === tireId);
    if (newTireIndex !== -1) {
      // Der neu montierte Reifen behält seine currentMileage (wird nicht geändert)
      const mountTireMileage = newTire.currentMileage;

      // Create mount event
      const mountEvent: TireChangeEvent = {
        id: crypto.randomUUID(),
        date: eventDate,
        carMileage: currentMileage,
        tireId: tireId,
        tireMileage: mountTireMileage,
        changeType: 'mount',
      };
      updatedEvents.push(mountEvent);
    }

    // Add event log entry
    const tireInfo = newTire ? `${newTire.brand || ''} ${newTire.model || ''} ${newTire.type || ''}`.trim() : 'Unbekannt';
    const carWithEvent = addCarEvent(
      car,
      'tire_change',
      `Reifenwechsel: ${tireInfo} montiert bei ${formatNumber(currentMileage)} km`,
      {
        tireId: tireId,
        tireBrand: newTire.brand,
        tireModel: newTire.model,
        tireType: newTire.type,
        carMileage: currentMileage,
        previousTireId: car.currentTireId,
      }
    );

    // Update car
    const updatedCar = await updateCar(resolvedParams.id, {
      tires: updatedTires,
      tireChangeEvents: updatedEvents,
      currentTireId: tireId,
      mileage: currentMileage, // Update car mileage too
      eventLog: carWithEvent.eventLog,
    });

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error('Fehler beim Reifenwechsel:', error);
    return NextResponse.json(
      { error: 'Fehler beim Reifenwechsel' },
      { status: 500 }
    );
  }
}

