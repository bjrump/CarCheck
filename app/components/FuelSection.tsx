"use client";

import { Car, FuelEntry } from "@/app/lib/types";
import { formatDate, formatNumber } from "@/app/lib/utils";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface FuelSectionProps {
  car: Car;
  onUpdate: (updatedCar: Car) => void;
}

export default function FuelSection({ car, onUpdate }: FuelSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    mileage: car.mileage.toString(),
    liters: "",
    pricePerLiter: "",
    totalCost: "",
    notes: "",
  });

  const updateCar = useMutation(api.cars.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.liters || parseFloat(formData.liters) <= 0) {
      alert("Bitte geben Sie eine gültige Literzahl ein");
      return;
    }

    if (
      !editingEntry &&
      (!formData.mileage || parseInt(formData.mileage, 10) < car.mileage)
    ) {
      alert(
        `Der Kilometerstand muss mindestens ${formatNumber(
          car.mileage
        )} km betragen`
      );
      return;
    }

    setIsSaving(true);
    try {
      const existingEntries = car.fuelEntries || [];
      const newMileage = parseInt(formData.mileage, 10);
      
      const sortedEntries = [...existingEntries].sort(
        (a, b) => a.mileage - b.mileage
      );
      const previousEntry = sortedEntries
        .filter((e) => e.mileage < newMileage && e.id !== editingEntry?.id)
        .pop();

      const kmDriven = previousEntry ? newMileage - previousEntry.mileage : undefined;
      const liters = parseFloat(formData.liters);
      const consumption = kmDriven && kmDriven > 0 ? (liters / kmDriven) * 100 : undefined;

      const newEntry: FuelEntry = {
        id: editingEntry?.id || crypto.randomUUID(),
        date: formData.date,
        mileage: newMileage,
        liters,
        kmDriven,
        consumption,
        pricePerLiter: formData.pricePerLiter ? parseFloat(formData.pricePerLiter) : undefined,
        totalCost: formData.totalCost ? parseFloat(formData.totalCost) : undefined,
        notes: formData.notes || undefined,
      };

      let updatedEntries: FuelEntry[];
      if (editingEntry) {
        updatedEntries = existingEntries.map((e) =>
          e.id === editingEntry.id ? newEntry : e
        );
      } else {
        updatedEntries = [...existingEntries, newEntry];
      }

      const updatedCar = await updateCar({
        id: car._id as Id<"cars">,
        mileage: Math.max(car.mileage, newMileage),
        fuelEntries: updatedEntries,
      });

      if (updatedCar) {
        onUpdate(updatedCar as Car);
      }
      
      setIsAdding(false);
      setEditingEntry(null);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        mileage: Math.max(car.mileage, newMileage).toString(),
        liters: "",
        pricePerLiter: "",
        totalCost: "",
        notes: "",
      });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern des Tankeintrags"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (entry: FuelEntry) => {
    setEditingEntry(entry);
    setIsAdding(true);
    setFormData({
      date: entry.date,
      mileage: entry.mileage.toString(),
      liters: entry.liters.toString(),
      pricePerLiter: entry.pricePerLiter?.toString() || "",
      totalCost: entry.totalCost?.toString() || "",
      notes: entry.notes || "",
    });
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingEntry(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      mileage: car.mileage.toString(),
      liters: "",
      pricePerLiter: "",
      totalCost: "",
      notes: "",
    });
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Möchten Sie diesen Tankeintrag wirklich löschen?")) {
      return;
    }

    try {
      const updatedEntries = (car.fuelEntries || []).filter((e) => e.id !== entryId);
      const updatedCar = await updateCar({
        id: car._id as Id<"cars">,
        fuelEntries: updatedEntries,
      });

      if (updatedCar) {
        onUpdate(updatedCar as Car);
      }
    } catch (error) {
      alert("Fehler beim Löschen des Tankeintrags");
    }
  };

  const handleLitersChange = (value: string) => {
    const newFormData = { ...formData, liters: value };
    const liters = parseFloat(value);

    if (liters > 0) {
      const totalCost = parseFloat(formData.totalCost);
      if (totalCost > 0) {
        newFormData.pricePerLiter = (totalCost / liters).toFixed(3);
      }
      const pricePerLiter = parseFloat(formData.pricePerLiter);
      if (pricePerLiter > 0 && !totalCost) {
        newFormData.totalCost = (pricePerLiter * liters).toFixed(2);
      }
    }

    setFormData(newFormData);
  };

  const handlePricePerLiterChange = (value: string) => {
    const newFormData = { ...formData, pricePerLiter: value };
    const pricePerLiter = parseFloat(value);
    const liters = parseFloat(formData.liters);

    if (pricePerLiter > 0 && liters > 0) {
      newFormData.totalCost = (pricePerLiter * liters).toFixed(2);
    } else if (!value) {
      newFormData.totalCost = "";
    }

    setFormData(newFormData);
  };

  const handleTotalCostChange = (value: string) => {
    const newFormData = { ...formData, totalCost: value };
    const totalCost = parseFloat(value);
    const liters = parseFloat(formData.liters);

    if (totalCost > 0 && liters > 0) {
      newFormData.pricePerLiter = (totalCost / liters).toFixed(3);
    } else if (!value) {
      newFormData.pricePerLiter = "";
    }

    setFormData(newFormData);
  };

  const sortedEntries = [...(car.fuelEntries || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Tankeinträge
          </p>
          <h2 className="text-2xl font-semibold">Kraftstoffverbrauch</h2>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
          >
            + Tanken hinzufügen
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold mb-2">
            {editingEntry ? "Tankeintrag bearbeiten" : "Neuer Tankeintrag"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Datum *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-input/60 px-3 py-2 text-sm text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Kilometerstand *
              </label>
              <input
                type="number"
                value={formData.mileage}
                onChange={(e) =>
                  setFormData({ ...formData, mileage: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-input/60 px-3 py-2 text-sm text-foreground"
                min={car.mileage}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Getankte Liter *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.liters}
                onChange={(e) => handleLitersChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-input/60 px-3 py-2 text-sm text-foreground"
                min="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Preis pro Liter (optional)
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.pricePerLiter}
                onChange={(e) => handlePricePerLiterChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-input/60 px-3 py-2 text-sm text-foreground"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Gesamtkosten (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalCost}
                onChange={(e) => handleTotalCostChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-input/60 px-3 py-2 text-sm text-foreground"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Notizen (optional)
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-input/60 px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-green-600 px-4 py-2 text-white font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50"
            >
              {isSaving ? "Speichern..." : "Speichern"}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {sortedEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Noch keine Tankeinträge vorhanden
        </p>
      ) : (
        <div className="space-y-3">
          {sortedEntries.map((entry) => (
            <FuelEntryCard
              key={entry.id}
              entry={entry}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FuelEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: FuelEntry;
  onEdit: (entry: FuelEntry) => void;
  onDelete: (entryId: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    await onDelete(entry.id);
    setIsDeleting(false);
  };

  return (
    <div className="border border-border rounded-xl p-4 hover:bg-muted/30 transition">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold">{formatDate(entry.date)}</p>
          <p className="text-sm text-muted-foreground">
            KM-Stand: {formatNumber(entry.mileage)} km
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="font-semibold text-accent">
              {formatNumber(entry.liters)} Liter
            </p>
            {entry.totalCost && (
              <p className="text-sm text-muted-foreground">
                {entry.totalCost.toFixed(2)} €
              </p>
            )}
          </div>
          <button
            onClick={() => onEdit(entry)}
            className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
            title="Bearbeiten"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="p-2 rounded-lg hover:bg-red-100 transition text-muted-foreground hover:text-red-600 disabled:opacity-50"
            title="Löschen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {entry.kmDriven !== undefined && (
          <div>
            <span className="text-muted-foreground">Gefahren:</span>
            <span className="ml-1 font-medium">
              {formatNumber(entry.kmDriven)} km
            </span>
          </div>
        )}
        {entry.consumption !== undefined && (
          <div>
            <span className="text-muted-foreground">Verbrauch:</span>
            <span className="ml-1 font-medium">
              {entry.consumption.toFixed(2)} L/100km
            </span>
          </div>
        )}
        {entry.pricePerLiter !== undefined && (
          <div>
            <span className="text-muted-foreground">Preis/L:</span>
            <span className="ml-1 font-medium">
              {entry.pricePerLiter.toFixed(3)} €
            </span>
          </div>
        )}
      </div>

      {entry.notes && (
        <p className="text-sm text-muted-foreground mt-2 italic">
          {entry.notes}
        </p>
      )}
    </div>
  );
}
