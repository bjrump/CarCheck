"use client";

import { FuelEntry } from "@/app/lib/types";
import { formatNumber } from "@/app/lib/utils";
import { useMemo } from "react";

interface FuelAnalyticsProps {
  fuelEntries: FuelEntry[];
}

interface MonthlyData {
  month: string;
  year: number;
  kmDriven: number;
  litersUsed: number;
  averageConsumption: number;
  entries: FuelEntry[];
  daysInPeriod: number;
}

export default function FuelAnalytics({ fuelEntries }: FuelAnalyticsProps) {

  const monthlyData = useMemo(() => {
    if (fuelEntries.length < 2) return [];

    // Sort entries by date
    const sorted = [...fuelEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group by month
    const monthMap = new Map<string, MonthlyData>();

    for (let i = 1; i < sorted.length; i++) {
      const currentEntry = sorted[i];
      const previousEntry = sorted[i - 1];

      if (
        currentEntry.kmDriven === undefined ||
        currentEntry.consumption === undefined
      )
        continue;

      const date = new Date(currentEntry.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const monthData = monthMap.get(monthKey) || {
        month: date.toLocaleDateString("de-DE", {
          month: "long",
          year: "numeric",
        }),
        year: date.getFullYear(),
        kmDriven: 0,
        litersUsed: 0,
        averageConsumption: 0,
        entries: [],
        daysInPeriod: 0,
      };

      monthData.kmDriven += currentEntry.kmDriven;
      monthData.litersUsed += currentEntry.liters;
      monthData.entries.push(currentEntry);

      // Calculate days between refuelings
      const daysBetween = Math.ceil(
        (new Date(currentEntry.date).getTime() -
          new Date(previousEntry.date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      monthData.daysInPeriod += daysBetween;

      monthMap.set(monthKey, monthData);
    }

    // Calculate average consumption for each month
    const result = Array.from(monthMap.values()).map((month) => ({
      ...month,
      averageConsumption:
        month.kmDriven > 0 ? (month.litersUsed / month.kmDriven) * 100 : 0,
    }));

    return result;
  }, [fuelEntries]);

  // Calculate overall statistics
  const totalKmDriven = monthlyData.reduce(
    (sum, month) => sum + month.kmDriven,
    0
  );
  const totalLitersUsed = monthlyData.reduce(
    (sum, month) => sum + month.litersUsed,
    0
  );
  const overallConsumption =
    totalKmDriven > 0 ? (totalLitersUsed / totalKmDriven) * 100 : 0;

  // Calculate max values for scaling bars
  const maxKm = Math.max(...monthlyData.map((m) => m.kmDriven), 1);
  const maxConsumption = Math.max(
    ...monthlyData.map((m) => m.averageConsumption),
    1
  );

  if (fuelEntries.length < 2) {
    return (
      <div className="glass rounded-2xl p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Statistiken
          </p>
          <h2 className="text-2xl font-semibold mb-4">Verbrauchsanalyse</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          Mindestens 2 Tankeinträge erforderlich für Statistiken
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Statistiken
        </p>
        <h2 className="text-2xl font-semibold">Verbrauchsanalyse</h2>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Gesamt gefahren</p>
          <p className="text-2xl font-bold">{formatNumber(totalKmDriven)} km</p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Gesamt verbraucht</p>
          <p className="text-2xl font-bold">{formatNumber(totalLitersUsed)} L</p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            Durchschnittsverbrauch
          </p>
          <p className="text-2xl font-bold">
            {overallConsumption.toFixed(2)} L/100km
          </p>
        </div>
      </div>

      {/* Monthly Charts */}
      <div className="space-y-6">
        {/* Driven KM per Month */}
        <div>
          <h3 className="font-semibold mb-3">Gefahrene KM pro Monat</h3>
          <div className="space-y-2">
            {monthlyData.map((month, index) => (
              <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {month.month}
                      </span>
                      <span className="font-medium">
                        {formatNumber(month.kmDriven)} km
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${(month.kmDriven / maxKm) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Average Consumption per Month */}
            <div>
              <h3 className="font-semibold mb-3">
                Durchschnittsverbrauch pro Monat
              </h3>
              <div className="space-y-2">
                {monthlyData.map((month, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {month.month}
                      </span>
                      <span className="font-medium">
                        {month.averageConsumption.toFixed(2)} L/100km
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            (month.averageConsumption / maxConsumption) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
    </div>
  );
}
