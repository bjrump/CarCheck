'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Insurance } from '@/app/lib/types';

interface CarFormProps {
  car?: Car;
  onCreated?: () => void;
  onUpdated?: (updatedCar: Car) => void;
  onCancel?: () => void;
}

export default function CarForm({ car, onCreated, onUpdated, onCancel }: CarFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    make: car?.make || '',
    model: car?.model || '',
    year: car?.year || new Date().getFullYear(),
    vin: car?.vin || '',
    licensePlate: car?.licensePlate || '',
    mileage: car?.mileage || 0,
    insuranceProvider: car?.insurance?.provider || '',
    insurancePolicyNumber: car?.insurance?.policyNumber || '',
    insuranceExpiryDate: car?.insurance?.expiryDate || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const insurance: Insurance | null = formData.insuranceProvider && formData.insurancePolicyNumber && formData.insuranceExpiryDate
        ? {
            provider: formData.insuranceProvider,
            policyNumber: formData.insurancePolicyNumber,
            expiryDate: formData.insuranceExpiryDate,
          }
        : null;

      const carData = {
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year.toString()),
        vin: formData.vin || undefined,
        licensePlate: formData.licensePlate || undefined,
        mileage: parseInt(formData.mileage.toString()),
        insurance,
      };

      const url = car ? `/api/cars/${car.id}` : '/api/cars';
      const method = car ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }

      const savedCar = await response.json();

      if (car && onUpdated) {
        onUpdated(savedCar);
      } else if (onCreated) {
        onCreated();
      } else if (!car && savedCar.id) {
        // If no callback provided and we're creating a new car, refresh the page
        router.refresh();
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
      alert(`Fehler beim Speichern des Fahrzeugs: ${error.message || 'Unbekannter Fehler'}`);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Fahrzeug
          </p>
          <h2 className="text-2xl font-bold">
        {car ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug hinzufügen'}
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          Pflichtfelder mit *
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Marke <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              required
              placeholder="z.B. BMW"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Modell <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              required
              placeholder="z.B. 320d"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Baujahr <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              required
              min="1900"
              max={new Date().getFullYear() + 1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Kilometerstand <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Fahrgestellnummer (VIN)
            </label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Kennzeichen
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Versicherung (optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Versicherer
              </label>
              <input
                type="text"
                value={formData.insuranceProvider}
                onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
                placeholder="z.B. Allianz"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Versicherungsnummer
              </label>
              <input
                type="text"
                value={formData.insurancePolicyNumber}
                onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Ablaufdatum
              </label>
              <input
                type="date"
                value={formData.insuranceExpiryDate}
                onChange={(e) => setFormData({ ...formData, insuranceExpiryDate: e.target.value })}
                className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-accent px-6 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Speichern...' : 'Speichern'}
          </button>
          {(car || onCancel) && (
            <button
              type="button"
              onClick={() => {
                if (onCancel) {
                  onCancel();
                } else if (car && onUpdated) {
                  // Fallback: if no onCancel, we can't cancel properly
                }
              }}
              className="rounded-xl border border-border px-6 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Abbrechen
            </button>
          )}
          {!car && onCreated && !onCancel && (
            <button
              type="button"
              onClick={onCreated}
              className="rounded-xl border border-border px-6 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

