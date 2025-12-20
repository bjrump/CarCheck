import { NextRequest, NextResponse } from 'next/server';
import { getCarById, updateCar } from '@/app/lib/data';
import { TUV } from '@/app/lib/types';
import { calculateNextTUVDate } from '@/app/lib/utils';

// PUT /api/cars/[id]/tuv - Update TÜV information
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

    // Convert date string from HTML input (YYYY-MM-DD) to ISO string if needed
    let lastAppointmentDate = body.lastAppointmentDate;
    if (lastAppointmentDate && typeof lastAppointmentDate === 'string') {
      if (lastAppointmentDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Convert YYYY-MM-DD to ISO string (preserve local date)
        const dateParts = lastAppointmentDate.split('-');
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2], 10);
        const localDate = new Date(year, month, day, 0, 0, 0, 0);
        lastAppointmentDate = localDate.toISOString();
      } else if (!lastAppointmentDate.match(/^\d{4}-\d{2}-\d{2}T/)) {
        // If it's not already an ISO string, try to parse it
        const parsed = new Date(lastAppointmentDate);
        if (!isNaN(parsed.getTime())) {
          lastAppointmentDate = parsed.toISOString();
        }
      }
    } else if (lastAppointmentDate === '') {
      // Empty string should be null
      lastAppointmentDate = null;
    }

    const updatedTUV: TUV = {
      ...car.tuv,
      ...body,
      lastAppointmentDate: lastAppointmentDate !== undefined ? lastAppointmentDate : car.tuv.lastAppointmentDate,
    };

    // Automatically calculate next appointment (always 2 years after last)
    if (updatedTUV.lastAppointmentDate) {
      updatedTUV.nextAppointmentDate = calculateNextTUVDate(updatedTUV.lastAppointmentDate);
    } else {
      updatedTUV.nextAppointmentDate = null;
    }

    const updatedCar = await updateCar(resolvedParams.id, { tuv: updatedTUV });

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der TÜV-Informationen:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren der TÜV-Informationen',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
