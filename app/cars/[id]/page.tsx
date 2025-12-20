'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Car } from '@/app/lib/types';
import TUVSection from '@/app/components/TUVSection';
import InspectionSection from '@/app/components/InspectionSection';
import CarForm from '@/app/components/CarForm';
import { formatDate, formatNumber } from '@/app/lib/utils';

export default function CarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [car, setCar] = useState<Car | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchCar() {
      try {
        const response = await fetch(`/api/cars/${params.id}`);
        if (!response.ok) {
          throw new Error('Fahrzeug nicht gefunden');
        }
        const data = await response.json();
        setCar(data);
      } catch (error) {
        alert('Fehler beim Laden des Fahrzeugs');
        router.push('/cars');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCar();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm('Möchten Sie dieses Fahrzeug wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cars/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Fehler beim Löschen');
      }

      router.push('/cars');
      router.refresh();
    } catch (error) {
      alert('Fehler beim Löschen des Fahrzeugs');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Fahrzeug nicht gefunden</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto">
        <CarForm car={car} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">
              {car.make} {car.model}
            </h1>
            <p className="text-muted-foreground mt-2">
              Baujahr: {car.year} | Kilometerstand: {formatNumber(car.mileage)} km
            </p>
            {car.licensePlate && (
              <p className="text-muted-foreground">Kennzeichen: {car.licensePlate}</p>
            )}
            {car.vin && (
              <p className="text-muted-foreground">VIN: {car.vin}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
            >
              Bearbeiten
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 px-4 py-2 text-white font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50"
            >
              {isDeleting ? 'Löschen...' : 'Löschen'}
            </button>
          </div>
        </div>

        {car.insurance && (
          <div className="mt-4 pt-4 border-t border-border">
            <h2 className="text-lg font-semibold mb-2 text-foreground">Versicherung</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Versicherer:</span>
                <span className="ml-2 font-medium">{car.insurance.provider}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Versicherungsnummer:</span>
                <span className="ml-2 font-medium">{car.insurance.policyNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ablaufdatum:</span>
                <span className="ml-2 font-medium">{formatDate(car.insurance.expiryDate)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TUVSection car={car} onUpdate={setCar} />
        <InspectionSection car={car} onUpdate={setCar} />
      </div>
    </div>
  );
}

