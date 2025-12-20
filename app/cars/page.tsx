import { Car } from '@/app/lib/types';
import CarCard from '@/app/components/CarCard';
import Link from 'next/link';
import { getCars } from '@/app/lib/data';

export default async function CarsPage() {
  let cars: Car[] = [];
  try {
    cars = await getCars();
  } catch (error) {
    console.error('Fehler beim Laden der Fahrzeuge:', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Übersicht</p>
          <h1 className="text-3xl font-bold">Fahrzeuge</h1>
        </div>
        <Link
          href="/cars/new"
          className="rounded-xl bg-accent px-6 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
        >
          Neues Fahrzeug hinzufügen
        </Link>
      </div>

      {cars.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl">
          <p className="text-lg mb-4 text-muted-foreground">Keine Fahrzeuge vorhanden</p>
          <Link
            href="/cars/new"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
          >
            Erstes Fahrzeug hinzufügen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}

