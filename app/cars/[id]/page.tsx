'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Car } from '@/app/lib/types';
import TUVSection from '@/app/components/TUVSection';
import InspectionSection from '@/app/components/InspectionSection';
import CarForm from '@/app/components/CarForm';
import EventLogSection from '@/app/components/EventLogSection';
import { formatDate, formatNumber } from '@/app/lib/utils';

export default function CarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [car, setCar] = useState<Car | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingMileage, setIsUpdatingMileage] = useState(false);
  const [showMileageInput, setShowMileageInput] = useState(false);
  const [newMileage, setNewMileage] = useState('');
  const [showEventLog, setShowEventLog] = useState(false);

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

  const handleMileageUpdate = async () => {
    if (!newMileage || isNaN(parseInt(newMileage, 10))) {
      alert('Bitte geben Sie einen gültigen Kilometerstand ein');
      return;
    }

    setIsUpdatingMileage(true);
    try {
      const response = await fetch(`/api/cars/${params.id}/mileage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mileage: parseInt(newMileage, 10) }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren');
      }

      const updatedCar = await response.json();
      setCar(updatedCar);
      setShowMileageInput(false);
      setNewMileage('');
    } catch (error) {
      alert('Fehler beim Aktualisieren des Kilometerstands');
    } finally {
      setIsUpdatingMileage(false);
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
            <div className="flex items-center gap-3 mt-2">
              <p className="text-muted-foreground">
                Baujahr: {car.year} | Kilometerstand: {formatNumber(car.mileage)} km
              </p>
              {!showMileageInput ? (
                <button
                  onClick={() => {
                    setNewMileage(car.mileage.toString());
                    setShowMileageInput(true);
                  }}
                  className="text-xs rounded-lg bg-accent/20 px-2 py-1 text-accent font-medium hover:bg-accent/30 transition"
                >
                  Aktualisieren
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newMileage}
                    onChange={(e) => setNewMileage(e.target.value)}
                    className="w-28 rounded-lg border border-border bg-input/60 px-2 py-1 text-sm text-foreground"
                    placeholder="km"
                    min="0"
                  />
                  <button
                    onClick={handleMileageUpdate}
                    disabled={isUpdatingMileage}
                    className="text-xs rounded-lg bg-green-600 px-2 py-1 text-white font-medium hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {isUpdatingMileage ? '...' : '✓'}
                  </button>
                  <button
                    onClick={() => {
                      setShowMileageInput(false);
                      setNewMileage('');
                    }}
                    className="text-xs rounded-lg bg-gray-500 px-2 py-1 text-white font-medium hover:bg-gray-600 transition"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
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
              onClick={() => setShowEventLog(!showEventLog)}
              className={`rounded-xl px-4 py-2 font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg ${
                showEventLog
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
              }`}
            >
              {showEventLog ? 'Event-Log ausblenden' : 'Event-Log anzeigen'}
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

      {showEventLog && <EventLogSection car={car} />}
    </div>
  );
}

