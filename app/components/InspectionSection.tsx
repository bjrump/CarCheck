"use client";

import { Car, Inspection } from "@/app/lib/types";
import {
  calculateKmProgress,
  calculateTimeProgress,
  formatDate,
  formatKmDriven,
  formatNumber,
  formatRemainingKm,
  formatTimeElapsed,
  getMaintenanceStatus,
  getStatusColorClass,
  getStatusText,
  calculateNextInspectionDateByYear,
  calculateNextInspectionDateByKm,
  getEarliestDate,
} from "@/app/lib/utils";
import { useState } from "react";
import ProgressBar from "./ProgressBar";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/app/components/ToastProvider";

interface InspectionSectionProps {
  car: Car;
  onUpdate: (updatedCar: Car) => void;
}

export default function InspectionSection({
  car,
  onUpdate,
}: InspectionSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Inspection>(car.inspection);
  const [isLoading, setIsLoading] = useState(false);
  const updateCar = useMutation(api.cars.update);
  const toast = useToast();

  const status = getMaintenanceStatus(car.inspection.nextInspectionDate);
  const statusByYear = getMaintenanceStatus(
    car.inspection.nextInspectionDateByYear
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let lastInspectionDate = formData.lastInspectionDate;
      if (
        lastInspectionDate &&
        lastInspectionDate.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        const dateParts = lastInspectionDate.split("-");
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        const localDate = new Date(year, month, day, 0, 0, 0, 0);
        lastInspectionDate = localDate.toISOString();
      }

      const nextInspectionDateByYear = lastInspectionDate
        ? calculateNextInspectionDateByYear(
            lastInspectionDate,
            formData.intervalYears
          )
        : null;

      const nextInspectionDateByKm =
        lastInspectionDate && formData.lastInspectionMileage !== null
          ? calculateNextInspectionDateByKm(
              lastInspectionDate,
              formData.lastInspectionMileage,
              car.mileage,
              formData.intervalKm
            )
          : null;

      const nextInspectionDate = getEarliestDate(
        nextInspectionDateByYear,
        nextInspectionDateByKm
      );

      const updatedInspection: Inspection = {
        lastInspectionDate,
        lastInspectionMileage: formData.lastInspectionMileage,
        nextInspectionDateByYear,
        nextInspectionDateByKm,
        nextInspectionDate,
        intervalYears: formData.intervalYears,
        intervalKm: formData.intervalKm,
        completed: formData.completed,
      };

      const result = await updateCar({
        id: car._id as Id<"cars">,
        inspection: updatedInspection,
      });

      if (result) {
        onUpdate(result as Car);
      }
      setIsEditing(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern der Inspektions-Informationen";
      console.error("Fehler beim Speichern:", error);
      toast.error(
        `Fehler beim Speichern der Inspektions-Informationen: ${errorMessage}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Inspektion
            </p>
            <h2 className="text-xl font-bold">Inspektions-Verwaltung</h2>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            Bearbeitung
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Letzte Inspektion (Datum)
            </label>
            <input
              type="date"
              value={formData.lastInspectionDate?.split("T")[0] || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lastInspectionDate: e.target.value || null,
                })
              }
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Kilometerstand bei letzter Inspektion
            </label>
            <input
              type="number"
              value={formData.lastInspectionMileage || ""}
              onChange={(e) => {
                const value = e.target.value
                  ? parseInt(e.target.value, 10)
                  : null;
                if (value === null || !isNaN(value)) {
                  setFormData({ ...formData, lastInspectionMileage: value });
                }
              }}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              placeholder="z.B. 50000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Intervall (Jahre)
              </label>
              <input
                type="number"
                value={formData.intervalYears}
                onChange={(e) => {
                  const value = e.target.value
                    ? parseInt(e.target.value, 10)
                    : 1;
                  if (!isNaN(value)) {
                    setFormData({ ...formData, intervalYears: value });
                  }
                }}
                className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Intervall (Kilometer)
              </label>
              <input
                type="number"
                value={formData.intervalKm}
                onChange={(e) => {
                  const value = e.target.value
                    ? parseInt(e.target.value, 10)
                    : 15000;
                  if (!isNaN(value)) {
                    setFormData({ ...formData, intervalKm: value });
                  }
                }}
                className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
                min="1"
              />
            </div>
          </div>

          <div className="rounded-xl bg-accent/10 p-3 text-sm text-accent">
            <strong>Hinweis:</strong> Die nächste Inspektion wird automatisch
            basierend auf dem früheren Datum berechnet (Jahre oder Kilometer).
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50"
            >
              {isLoading ? "Speichern..." : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData(car.inspection);
              }}
              className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Inspektion
          </p>
          <h2 className="text-xl font-bold">Inspektions-Verwaltung</h2>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
        >
          Bearbeiten
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Letzte Inspektion:</span>
          <span className="font-medium">
            {formatDate(car.inspection.lastInspectionDate)}
          </span>
        </div>
        {car.inspection.lastInspectionMileage !== null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kilometerstand:</span>
            <span className="font-medium">
              {formatNumber(car.inspection.lastInspectionMileage)} km
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nächste Inspektion:</span>
          <span className="font-medium">
            {formatDate(car.inspection.nextInspectionDate)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-border">
          <div>
            <span className="text-muted-foreground text-sm">Nach Jahren:</span>
            <span className="ml-2 font-medium">
              {formatDate(car.inspection.nextInspectionDateByYear)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">
              Nach Kilometer:
            </span>
            <span className="ml-2 font-medium">
              {car.inspection.intervalKm === 95 &&
              car.inspection.nextInspectionDateByKm === null &&
              car.inspection.lastInspectionMileage !== null
                ? formatRemainingKm(
                    car.inspection.lastInspectionMileage,
                    car.mileage,
                    car.inspection.intervalKm
                  )
                : formatDate(car.inspection.nextInspectionDateByKm)}
            </span>
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-muted-foreground">Intervalle:</span>
          <span className="font-medium">
            {car.inspection.intervalYears} Jahr
            {car.inspection.intervalYears !== 1 ? "e" : ""} /{" "}
            {formatNumber(car.inspection.intervalKm)} km
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-border space-y-4">
          <ProgressBar
            progress={calculateTimeProgress(
              car.inspection.lastInspectionDate,
              car.inspection.nextInspectionDateByYear
            )}
            label="Zeit-Fortschritt"
            value={formatTimeElapsed(
              car.inspection.lastInspectionDate,
              car.inspection.nextInspectionDateByYear
            )}
            color={
              statusByYear === "overdue"
                ? "danger"
                : statusByYear === "upcoming"
                ? "warning"
                : "success"
            }
          />

          {car.inspection.lastInspectionMileage !== null && (
            <ProgressBar
              progress={calculateKmProgress(
                car.inspection.lastInspectionMileage,
                car.mileage,
                car.inspection.intervalKm
              )}
              label="Kilometer-Fortschritt"
              value={formatKmDriven(
                car.inspection.lastInspectionMileage,
                car.mileage
              )}
              color={
                (calculateKmProgress(
                  car.inspection.lastInspectionMileage,
                  car.mileage,
                  car.inspection.intervalKm
                ) || 0) >= 100
                  ? "danger"
                  : (calculateKmProgress(
                      car.inspection.lastInspectionMileage,
                      car.mileage,
                      car.inspection.intervalKm
                    ) || 0) >= 80
                  ? "warning"
                  : "success"
              }
            />
          )}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
          <span className="text-muted-foreground">Status:</span>
          <span
            className={`px-3 py-1 rounded text-sm font-semibold border ${getStatusColorClass(
              status
            )}`}
          >
            {getStatusText(status)}
          </span>
        </div>
      </div>
    </div>
  );
}
