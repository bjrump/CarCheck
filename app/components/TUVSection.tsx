"use client";

import { useState } from "react";
import { Car, TUV } from "@/app/lib/types";
import {
  formatDate,
  getMaintenanceStatus,
  getStatusColorClass,
  getStatusText,
  calculateTimeProgress,
  formatTimeElapsed,
  calculateNextTUVDate,
} from "@/app/lib/utils";
import ProgressBar from "./ProgressBar";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/app/components/ToastProvider";

interface TUVSectionProps {
  car: Car;
  onUpdate: (updatedCar: Car) => void;
}

export default function TUVSection({ car, onUpdate }: TUVSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<TUV>(car.tuv);
  const [isLoading, setIsLoading] = useState(false);
  const updateCar = useMutation(api.cars.update);
  const toast = useToast();

  const status = getMaintenanceStatus(car.tuv.nextAppointmentDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let lastAppointmentDate = formData.lastAppointmentDate;
      if (lastAppointmentDate && lastAppointmentDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const dateParts = lastAppointmentDate.split("-");
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        const localDate = new Date(year, month, day, 0, 0, 0, 0);
        lastAppointmentDate = localDate.toISOString();
      }

      const nextAppointmentDate = lastAppointmentDate
        ? calculateNextTUVDate(lastAppointmentDate)
        : null;

      const updatedTuv: TUV = {
        lastAppointmentDate,
        nextAppointmentDate,
        completed: formData.completed,
      };

      const result = await updateCar({
        id: car._id as Id<"cars">,
        tuv: updatedTuv,
      });

      if (result) {
        onUpdate(result as Car);
      }
      setIsEditing(false);
      toast.success("TÜV-Informationen erfolgreich gespeichert");
    } catch (error) {
      toast.error("Fehler beim Speichern der TÜV-Informationen");
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
              TÜV
            </p>
            <h2 className="text-xl font-bold">TÜV-Verwaltung</h2>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            Bearbeitung
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Letzter TÜV-Termin
            </label>
            <input
              type="date"
              value={formData.lastAppointmentDate?.split("T")[0] || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lastAppointmentDate: e.target.value || null,
                })
              }
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="rounded-xl bg-accent/10 p-3 text-sm text-accent">
            <strong>Hinweis:</strong> Der nächste TÜV-Termin wird automatisch
            auf 2 Jahre nach dem letzten Termin berechnet.
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
                setFormData(car.tuv);
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
            TÜV
          </p>
          <h2 className="text-xl font-bold">TÜV-Verwaltung</h2>
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
          <span className="text-muted-foreground">Letzter Termin:</span>
          <span className="font-medium">
            {formatDate(car.tuv.lastAppointmentDate)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nächster Termin:</span>
          <span className="font-medium">
            {formatDate(car.tuv.nextAppointmentDate)}
          </span>
        </div>
        <div className="flex justify-between mt-2 pt-2 border-t border-border">
          <span className="text-muted-foreground">Intervall:</span>
          <span className="font-medium">2 Jahre</span>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <ProgressBar
            progress={calculateTimeProgress(
              car.tuv.lastAppointmentDate,
              car.tuv.nextAppointmentDate
            )}
            label="Zeit-Fortschritt"
            value={formatTimeElapsed(
              car.tuv.lastAppointmentDate,
              car.tuv.nextAppointmentDate
            )}
            color={
              status === "overdue"
                ? "danger"
                : status === "upcoming"
                ? "warning"
                : "success"
            }
          />
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
