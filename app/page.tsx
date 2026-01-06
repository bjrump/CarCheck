"use client";

import CarCard from "@/app/components/CarCard";
import CarForm from "@/app/components/CarForm";
import EventLogSection from "@/app/components/EventLogSection";
import FuelAnalytics from "@/app/components/FuelAnalytics";
import FuelSection from "@/app/components/FuelSection";
import InspectionSection from "@/app/components/InspectionSection";
import MaintenanceCard from "@/app/components/MaintenanceCard";
import TireSection from "@/app/components/TireSection";
import TUVSection from "@/app/components/TUVSection";
import { Car } from "@/app/lib/types";
import {
  calculateNextTireChangeDate,
  formatDate,
  formatNumber,
  getMaintenanceStatus,
} from "@/app/lib/utils";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function Home() {
  const carsData = useQuery(api.cars.list);
  const cars = (carsData ?? []) as Car[];
  const deleteCar = useMutation(api.cars.remove);
  const updateCar = useMutation(api.cars.update);
  
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isUpdatingMileage, setIsUpdatingMileage] = useState(false);
  const [showMileageInput, setShowMileageInput] = useState(false);
  const [newMileage, setNewMileage] = useState("");
  const [isEditingCar, setIsEditingCar] = useState(false);
  const [showEventLog, setShowEventLog] = useState(true);

  const isLoading = carsData === undefined;

  const handleCarUpdate = (updatedCar: Car) => {
    setSelectedCar(updatedCar);
  };

  const handleCarUpdated = (updatedCar: Car) => {
    handleCarUpdate(updatedCar);
    setIsEditingCar(false);
  };

  const handleCancelEdit = () => {
    setIsEditingCar(false);
  };

  const handleCarDelete = async (carId: string) => {
    if (
      !confirm(
        "Möchten Sie dieses Fahrzeug wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
      )
    ) {
      return;
    }

    try {
      await deleteCar({ id: carId as Id<"cars"> });
      if (selectedCar?._id === carId) {
        setSelectedCar(null);
      }
    } catch (error) {
      alert("Fehler beim Löschen des Fahrzeugs");
    }
  };

  const handleCarCreated = () => {
    setIsAddingCar(false);
  };

  const handleMileageUpdate = async () => {
    if (!selectedCar || !newMileage || isNaN(parseInt(newMileage, 10))) {
      alert("Bitte geben Sie einen gültigen Kilometerstand ein");
      return;
    }

    setIsUpdatingMileage(true);
    try {
      const updated = await updateCar({
        id: selectedCar._id as Id<"cars">,
        mileage: parseInt(newMileage, 10),
      });
      if (updated) {
        handleCarUpdate(updated as Car);
      }
      setShowMileageInput(false);
      setNewMileage("");
    } catch (error) {
      alert("Fehler beim Aktualisieren des Kilometerstands");
    } finally {
      setIsUpdatingMileage(false);
    }
  };

  const upcomingTUV = cars
    .filter((car) => car.tuv.nextAppointmentDate)
    .sort((a, b) => {
      if (!a.tuv.nextAppointmentDate || !b.tuv.nextAppointmentDate) return 0;
      return (
        new Date(a.tuv.nextAppointmentDate).getTime() -
        new Date(b.tuv.nextAppointmentDate).getTime()
      );
    })
    .slice(0, 5);

  const upcomingInspections = cars
    .filter((car) => car.inspection.nextInspectionDate)
    .sort((a, b) => {
      if (!a.inspection.nextInspectionDate || !b.inspection.nextInspectionDate)
        return 0;
      return (
        new Date(a.inspection.nextInspectionDate).getTime() -
        new Date(b.inspection.nextInspectionDate).getTime()
      );
    })
    .slice(0, 5);

  const upcomingTireChanges = cars
    .map((car) => {
      const currentTire = car.currentTireId
        ? car.tires?.find((t) => t.id === car.currentTireId)
        : null;
      const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
      if (!tireChange) return null;

      let lastChangeDate: string | null = null;

      if (car.currentTireId && car.tireChangeEvents) {
        const lastMountEvent = car.tireChangeEvents
          .filter(
            (e) => e.tireId === car.currentTireId && e.changeType === "mount"
          )
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];

        if (lastMountEvent) {
          lastChangeDate = lastMountEvent.date;
        } else {
          const anyMountEvent = car.tireChangeEvents
            .filter((e) => e.changeType === "mount")
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];
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
        ? new Date(a.date + "T00:00:00").getTime()
        : new Date(a.date).getTime();
      const dateB = b.date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(b.date + "T00:00:00").getTime()
        : new Date(b.date).getTime();
      return dateA - dateB;
    })
    .slice(0, 5);

  const allAppointments = cars
    .flatMap((car) => {
      const appointments: Array<{
        car: Car;
        date: string;
        type: "tuv" | "inspection" | "tire-change";
      }> = [];
      if (car.tuv.nextAppointmentDate) {
        appointments.push({
          car,
          date: car.tuv.nextAppointmentDate,
          type: "tuv",
        });
      }
      if (car.inspection.nextInspectionDate) {
        appointments.push({
          car,
          date: car.inspection.nextInspectionDate,
          type: "inspection",
        });
      }
      const currentTire = car.currentTireId
        ? car.tires?.find((t) => t.id === car.currentTireId)
        : null;
      const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
      if (tireChange) {
        appointments.push({ car, date: tireChange.date, type: "tire-change" });
      }
      return appointments;
    })
    .sort((a, b) => {
      const dateA = a.date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(a.date + "T00:00:00").getTime()
        : new Date(a.date).getTime();
      const dateB = b.date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(b.date + "T00:00:00").getTime()
        : new Date(b.date).getTime();
      return dateA - dateB;
    });

  const appointmentsIn30Days = allAppointments
    .filter((apt) => {
      if (!apt.date) return false;
      const aptDate = apt.date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(apt.date + "T00:00:00")
        : new Date(apt.date);
      const today = new Date();
      const daysUntil = Math.ceil(
        (aptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 30;
    })
    .slice(0, 5);

  const overdue = cars.filter((car) => {
    const tuv = getMaintenanceStatus(car.tuv.nextAppointmentDate);
    const insp = getMaintenanceStatus(car.inspection.nextInspectionDate);
    const currentTire = car.currentTireId
      ? car.tires?.find((t) => t.id === car.currentTireId)
      : null;
    const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
    const tireChangeStatus = tireChange
      ? getMaintenanceStatus(tireChange.date)
      : "none";
    return (
      tuv === "overdue" || insp === "overdue" || tireChangeStatus === "overdue"
    );
  }).length;

  const upcomingSoon = cars.filter((car) => {
    const tuv = getMaintenanceStatus(car.tuv.nextAppointmentDate);
    const insp = getMaintenanceStatus(car.inspection.nextInspectionDate);
    const currentTire = car.currentTireId
      ? car.tires?.find((t) => t.id === car.currentTireId)
      : null;
    const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
    const tireChangeStatus = tireChange
      ? getMaintenanceStatus(tireChange.date)
      : "none";
    return (
      tuv === "upcoming" ||
      insp === "upcoming" ||
      tireChangeStatus === "upcoming"
    );
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

  if (isEditingCar && selectedCar) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <button
          onClick={handleCancelEdit}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
        >
          ← Zurück zur Detailansicht
        </button>
        <CarForm car={selectedCar} onUpdated={handleCarUpdated} onCancel={handleCancelEdit} />
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
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditingCar(true)}
              className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
            >
              ✏️ Bearbeiten
            </button>
            <button
              onClick={() => handleCarDelete(selectedCar._id)}
              className="rounded-xl bg-red-600 px-4 py-2 text-white font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
            >
              Fahrzeug löschen
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Fahrzeug
              </p>
              <h1 className="text-3xl font-bold">
                {selectedCar.make} {selectedCar.model}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-muted-foreground">
                  Baujahr: {selectedCar.year} | Kilometerstand:{" "}
                  {formatNumber(selectedCar.mileage)} km
                </p>
                {!showMileageInput ? (
                  <button
                    onClick={() => {
                      setNewMileage(selectedCar.mileage.toString());
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
                      {isUpdatingMileage ? "..." : "✓"}
                    </button>
                    <button
                      onClick={() => {
                        setShowMileageInput(false);
                        setNewMileage("");
                      }}
                      className="text-xs rounded-lg bg-gray-500 px-2 py-1 text-white font-medium hover:bg-gray-600 transition"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              {selectedCar.licensePlate && (
                <p className="text-muted-foreground">
                  Kennzeichen: {selectedCar.licensePlate}
                </p>
              )}
              {selectedCar.vin && (
                <p className="text-muted-foreground">VIN: {selectedCar.vin}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsEditingCar(true)}
                className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
              >
                ✏️ Bearbeiten
              </button>
              <button
                onClick={() => setShowEventLog(!showEventLog)}
                className={`rounded-xl px-4 py-2 font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg ${
                  showEventLog
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                }`}
              >
                📋 {showEventLog ? 'Event-Log ausblenden' : 'Event-Log anzeigen'}
              </button>
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
                onClick={() => handleCarDelete(selectedCar._id)}
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
                  <span className="ml-2 font-medium">
                    {selectedCar.insurance.provider}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Versicherungsnummer:
                  </span>
                  <span className="ml-2 font-medium">
                    {selectedCar.insurance.policyNumber}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ablaufdatum:</span>
                  <span className="ml-2 font-medium">
                    {formatDate(selectedCar.insurance.expiryDate)}
                  </span>
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

        <FuelSection car={selectedCar} onUpdate={handleCarUpdate} />

        {selectedCar.fuelEntries && selectedCar.fuelEntries.length > 1 && (
          <FuelAnalytics fuelEntries={selectedCar.fuelEntries} />
        )}

        {showEventLog && <EventLogSection car={selectedCar} />}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-8">
        {cars.length === 0 ? (
          <div className="glass rounded-2xl text-center py-12">
            <p className="text-lg mb-4 text-muted-foreground">
              Keine Fahrzeuge vorhanden
            </p>
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
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Garage
                  </p>
                  <h2 className="text-2xl font-semibold">
                    Meine Fahrzeuge ({cars.length})
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cars.map((car) => (
                  <CarCard key={car._id} car={car} onSelect={setSelectedCar} />
                ))}
              </div>
            </div>

            {upcomingTUV.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      TÜV
                    </p>
                    <h2 className="text-2xl font-semibold">
                      Bevorstehende TÜV-Termine
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingTUV.map((car) => (
                    <MaintenanceCard
                      key={car._id}
                      car={car}
                      type="tuv"
                      onSelect={setSelectedCar}
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingInspections.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Inspektion
                    </p>
                    <h2 className="text-2xl font-semibold">
                      Bevorstehende Inspektionen
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingInspections.map((car) => (
                    <MaintenanceCard
                      key={car._id}
                      car={car}
                      type="inspection"
                      onSelect={setSelectedCar}
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingTireChanges.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Reifenwechsel
                    </p>
                    <h2 className="text-2xl font-semibold">
                      Bevorstehende Reifenwechsel
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingTireChanges.map((tireChange) => (
                    <MaintenanceCard
                      key={tireChange.car._id}
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

      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-4">
          <StatCard
            label="Fahrzeuge"
            value={cars.length}
            hint="in deiner Garage"
          />
          <StatCard
            label="Anstehend"
            value={upcomingSoon}
            hint="fällig in den nächsten 30 Tagen"
          />
          <StatCard
            label="Überfällig"
            value={overdue}
            hint="bitte zeitnah planen"
          />

          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Nächste Termine
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              in den nächsten 30 Tagen
            </p>
            {appointmentsIn30Days.length > 0 ? (
              <div className="space-y-2 mt-3">
                {appointmentsIn30Days.map((apt, index) => {
                  const typeLabel =
                    apt.type === "tuv"
                      ? "TÜV"
                      : apt.type === "inspection"
                      ? "Inspektion"
                      : "Reifenwechsel";
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
              <p className="text-sm text-muted-foreground mt-2">
                Keine Termine
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
