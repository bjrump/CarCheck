'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/app/lib/types';
import CarCard from '@/app/components/CarCard';
import MaintenanceCard from '@/app/components/MaintenanceCard';
import CarForm from '@/app/components/CarForm';
import TUVSection from '@/app/components/TUVSection';
import InspectionSection from '@/app/components/InspectionSection';
import TireSection from '@/app/components/TireSection';
import { formatDate, formatNumber, getMaintenanceStatus, calculateNextTireChangeDate } from '@/app/lib/utils';

export default function Home() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCars();

    // Listen for addCar event from header button
    const handleAddCarEvent = () => {
      setIsAddingCar(true);
    };
    window.addEventListener('addCar', handleAddCarEvent);

    return () => {
      window.removeEventListener('addCar', handleAddCarEvent);
    };
  }, []);

  const fetchCars = async () => {
    try {
      const response = await fetch('/api/cars');
      if (response.ok) {
        const data = await response.json();
        setCars(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Fahrzeuge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCarUpdate = (updatedCar: Car) => {
    setCars(cars.map(c => c.id === updatedCar.id ? updatedCar : c));
    setSelectedCar(updatedCar);
  };

  const handleCarDelete = async (carId: string) => {
    if (!confirm('Möchten Sie dieses Fahrzeug wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCars(cars.filter(c => c.id !== carId));
        if (selectedCar?.id === carId) {
          setSelectedCar(null);
        }
      }
    } catch (error) {
      alert('Fehler beim Löschen des Fahrzeugs');
    }
  };

  const handleCarCreated = () => {
    setIsAddingCar(false);
    fetchCars();
  };

  // Get upcoming maintenance items
  const upcomingTUV = cars
    .filter(car => car.tuv.nextAppointmentDate)
    .sort((a, b) => {
      if (!a.tuv.nextAppointmentDate || !b.tuv.nextAppointmentDate) return 0;
      return new Date(a.tuv.nextAppointmentDate).getTime() - new Date(b.tuv.nextAppointmentDate).getTime();
    })
    .slice(0, 5);

  const upcomingInspections = cars
    .filter(car => car.inspection.nextInspectionDate)
    .sort((a, b) => {
      if (!a.inspection.nextInspectionDate || !b.inspection.nextInspectionDate) return 0;
      return new Date(a.inspection.nextInspectionDate).getTime() - new Date(b.inspection.nextInspectionDate).getTime();
    })
    .slice(0, 5);

  // Get upcoming tire changes
  const upcomingTireChanges = cars
    .map(car => {
      const currentTire = car.currentTireId ? car.tires?.find(t => t.id === car.currentTireId) : null;
      const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
      if (!tireChange) return null;

      // Find last tire change date - use the most recent mount event for the current tire
      let lastChangeDate: string | null = null;

      if (car.currentTireId && car.tireChangeEvents) {
        const lastMountEvent = car.tireChangeEvents
          .filter(e => e.tireId === car.currentTireId && e.changeType === 'mount')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (lastMountEvent) {
          lastChangeDate = lastMountEvent.date;
        } else {
          // Fallback: use the most recent mount event of any tire
          const anyMountEvent = car.tireChangeEvents
            .filter(e => e.changeType === 'mount')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          lastChangeDate = anyMountEvent?.date || null;
        }
      }

      return {
        car,
        date: tireChange.date,
        type: tireChange.type,
        lastChangeDate,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      const dateA = a.date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(a.date + 'T00:00:00').getTime()
        : new Date(a.date).getTime();
      const dateB = b.date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(b.date + 'T00:00:00').getTime()
        : new Date(b.date).getTime();
      return dateA - dateB;
    })
    .slice(0, 5);

  // Find the next appointment (earliest of TÜV, Inspection, or Tire Change across all cars)
  const allAppointments = cars.flatMap(car => {
    const appointments: Array<{ car: Car; date: string; type: 'tuv' | 'inspection' | 'tire-change' }> = [];
    if (car.tuv.nextAppointmentDate) {
      appointments.push({ car, date: car.tuv.nextAppointmentDate, type: 'tuv' });
    }
    if (car.inspection.nextInspectionDate) {
      appointments.push({ car, date: car.inspection.nextInspectionDate, type: 'inspection' });
    }
    const currentTire = car.currentTireId ? car.tires?.find(t => t.id === car.currentTireId) : null;
    const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
    if (tireChange) {
      appointments.push({ car, date: tireChange.date, type: 'tire-change' });
    }
    return appointments;
  }).sort((a, b) => {
    // Handle date parsing - support both YYYY-MM-DD and ISO formats
    const dateA = a.date.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(a.date + 'T00:00:00').getTime()
      : new Date(a.date).getTime();
    const dateB = b.date.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(b.date + 'T00:00:00').getTime()
      : new Date(b.date).getTime();
    return dateA - dateB;
  });

  const nextAppointment = allAppointments[0];

  // Get appointments in next 30 days
  const appointmentsIn30Days = allAppointments.filter(apt => {
    if (!apt.date) return false;
    const aptDate = apt.date.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(apt.date + 'T00:00:00')
      : new Date(apt.date);
    const today = new Date();
    const daysUntil = Math.ceil((aptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 30;
  }).slice(0, 5);

  const overdue = cars.filter((car) => {
    const tuv = getMaintenanceStatus(car.tuv.nextAppointmentDate);
    const insp = getMaintenanceStatus(car.inspection.nextInspectionDate);
    const currentTire = car.currentTireId ? car.tires?.find(t => t.id === car.currentTireId) : null;
    const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
    const tireChangeStatus = tireChange ? getMaintenanceStatus(tireChange.date) : 'none';
    return tuv === 'overdue' || insp === 'overdue' || tireChangeStatus === 'overdue';
  }).length;

  const upcomingSoon = cars.filter((car) => {
    const tuv = getMaintenanceStatus(car.tuv.nextAppointmentDate);
    const insp = getMaintenanceStatus(car.inspection.nextInspectionDate);
    const currentTire = car.currentTireId ? car.tires?.find(t => t.id === car.currentTireId) : null;
    const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
    const tireChangeStatus = tireChange ? getMaintenanceStatus(tireChange.date) : 'none';
    return tuv === 'upcoming' || insp === 'upcoming' || tireChangeStatus === 'upcoming';
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="glass rounded-2xl px-6 py-4 text-sm text-muted-foreground">
          Laden...
        </div>
      </div>
    );
  }

  if (isAddingCar) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddingCar(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
          >
            ← Zurück zum Dashboard
          </button>
          <h1 className="text-2xl font-bold">Neues Fahrzeug</h1>
        </div>
        <CarForm onCreated={handleCarCreated} />
      </div>
    );
  }

  if (selectedCar) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setSelectedCar(null)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
          >
            ← Zurück zum Dashboard
          </button>
          <button
            onClick={() => handleCarDelete(selectedCar.id)}
            className="rounded-xl bg-red-600 px-4 py-2 text-white font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
          >
            Fahrzeug löschen
          </button>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fahrzeug</p>
              <h1 className="text-3xl font-bold">
                {selectedCar.make} {selectedCar.model}
              </h1>
              <p className="text-muted-foreground mt-2">
                Baujahr: {selectedCar.year} | Kilometerstand: {formatNumber(selectedCar.mileage)} km
              </p>
              {selectedCar.licensePlate && (
                <p className="text-muted-foreground">Kennzeichen: {selectedCar.licensePlate}</p>
              )}
              {selectedCar.vin && (
                <p className="text-muted-foreground">VIN: {selectedCar.vin}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedCar(null);
                  setIsAddingCar(false);
                }}
                className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
              >
                Schließen
              </button>
              <button
                onClick={() => handleCarDelete(selectedCar.id)}
                className="rounded-xl bg-red-600 px-4 py-2 text-white font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
              >
                Löschen
              </button>
            </div>
          </div>

          {selectedCar.insurance && (
            <div className="mt-4 pt-4 border-t border-border">
              <h2 className="text-lg font-semibold mb-2">Versicherung</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Versicherer:</span>
                  <span className="ml-2 font-medium">{selectedCar.insurance.provider}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Versicherungsnummer:</span>
                  <span className="ml-2 font-medium">{selectedCar.insurance.policyNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ablaufdatum:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedCar.insurance.expiryDate)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TUVSection car={selectedCar} onUpdate={handleCarUpdate} />
          <InspectionSection car={selectedCar} onUpdate={handleCarUpdate} />
        </div>

        <TireSection car={selectedCar} onUpdate={handleCarUpdate} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left side - 2/3 width: Cars and maintenance lists */}
      <div className="lg:col-span-2 space-y-8">
        {cars.length === 0 ? (
          <div className="glass rounded-2xl text-center py-12">
            <p className="text-lg mb-4 text-muted-foreground">Keine Fahrzeuge vorhanden</p>
            <button
              onClick={() => setIsAddingCar(true)}
              className="rounded-xl bg-accent px-6 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
            >
              Erstes Fahrzeug hinzufügen
            </button>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Garage</p>
                  <h2 className="text-2xl font-semibold">Meine Fahrzeuge ({cars.length})</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cars.map((car) => (
                  <CarCard key={car.id} car={car} onSelect={setSelectedCar} />
                ))}
              </div>
            </div>

            {upcomingTUV.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">TÜV</p>
                    <h2 className="text-2xl font-semibold">Bevorstehende TÜV-Termine</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingTUV.map((car) => (
                    <MaintenanceCard key={car.id} car={car} type="tuv" onSelect={setSelectedCar} />
                  ))}
                </div>
              </div>
            )}

            {upcomingInspections.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Inspektion</p>
                    <h2 className="text-2xl font-semibold">Bevorstehende Inspektionen</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingInspections.map((car) => (
                    <MaintenanceCard key={car.id} car={car} type="inspection" onSelect={setSelectedCar} />
                  ))}
                </div>
              </div>
            )}

            {upcomingTireChanges.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reifenwechsel</p>
                    <h2 className="text-2xl font-semibold">Bevorstehende Reifenwechsel</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingTireChanges.map((tireChange) => (
                    <MaintenanceCard
                      key={tireChange.car.id}
                      car={tireChange.car}
                      type="tire-change"
                      onSelect={setSelectedCar}
                      tireChangeType={tireChange.type}
                      tireChangeDate={tireChange.date}
                      lastTireChangeDate={tireChange.lastChangeDate}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right side - 1/3 width: Statistics */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-4">
          <StatCard label="Fahrzeuge" value={cars.length} hint="in deiner Garage" />
          <StatCard label="Anstehend" value={upcomingSoon} hint="fällig in den nächsten 30 Tagen" />
          <StatCard label="Überfällig" value={overdue} hint="bitte zeitnah planen" />

          {/* Next appointments in 30 days */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Nächste Termine</p>
            <p className="text-sm text-muted-foreground mb-2">in den nächsten 30 Tagen</p>
            {appointmentsIn30Days.length > 0 ? (
              <div className="space-y-2 mt-3">
                {appointmentsIn30Days.map((apt, index) => {
                  const typeLabel = apt.type === 'tuv' ? 'TÜV' : apt.type === 'inspection' ? 'Inspektion' : 'Reifenwechsel';
                  return (
                    <div key={index} className="text-sm">
                      <p className="font-medium">{formatDate(apt.date)}</p>
                      <p className="text-muted-foreground text-xs">
                        {apt.car.make} {apt.car.model} ({typeLabel})
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Keine Termine</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
