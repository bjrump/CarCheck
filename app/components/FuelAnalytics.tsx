"use client";

import { FuelEntry } from "@/app/lib/types";
import { formatNumber } from "@/app/lib/utils";
import { useMemo } from "react";

interface FuelAnalyticsProps {
  fuelEntries: FuelEntry[];
}

interface MonthlyData {
  month: string;
  monthShort: string;
  monthIndex: number;
  year: number;
  kmDriven: number;
  litersUsed: number;
  totalCost: number;
  averageConsumption: number;
  averagePricePerLiter: number;
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
        monthShort: date.toLocaleDateString("de-DE", { month: "short" }),
        monthIndex: date.getMonth(),
        year: date.getFullYear(),
        kmDriven: 0,
        litersUsed: 0,
        totalCost: 0,
        averageConsumption: 0,
        averagePricePerLiter: 0,
        entries: [],
        daysInPeriod: 0,
      };

      monthData.kmDriven += currentEntry.kmDriven;
      monthData.litersUsed += currentEntry.liters;
      monthData.totalCost += currentEntry.totalCost || 0;
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

    // Calculate average consumption and price for each month
    const result = Array.from(monthMap.values()).map((month) => ({
      ...month,
      averageConsumption:
        month.kmDriven > 0 ? (month.litersUsed / month.kmDriven) * 100 : 0,
      averagePricePerLiter:
        month.litersUsed > 0 ? month.totalCost / month.litersUsed : 0,
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
  const totalCost = monthlyData.reduce(
    (sum, month) => sum + month.totalCost,
    0
  );
  const overallConsumption =
    totalKmDriven > 0 ? (totalLitersUsed / totalKmDriven) * 100 : 0;
  const averagePricePerLiter =
    totalLitersUsed > 0 ? totalCost / totalLitersUsed : 0;

  // Calculate max values for scaling graphs
  const maxKm = Math.max(...monthlyData.map((m) => m.kmDriven), 1);
  const maxConsumption = Math.max(
    ...monthlyData.map((m) => m.averageConsumption),
    1
  );
  const minConsumption = Math.min(
    ...monthlyData.map((m) => m.averageConsumption)
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

  // Generate SVG path for line graph
  const generatePath = (
    data: MonthlyData[],
    getValue: (m: MonthlyData) => number,
    maxValue: number,
    minValue: number = 0
  ) => {
    if (data.length === 0) return "";
    const padding = 10;
    const width = 100;
    const height = 100;
    const range = maxValue - minValue || 1;

    return data
      .map((m, i) => {
        const x =
          padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
        const y =
          height -
          padding -
          ((getValue(m) - minValue) / range) * (height - padding * 2);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  // Generate area path (closed path for gradient fill)
  const generateAreaPath = (
    data: MonthlyData[],
    getValue: (m: MonthlyData) => number,
    maxValue: number,
    minValue: number = 0
  ) => {
    if (data.length === 0) return "";
    const padding = 10;
    const width = 100;
    const height = 100;
    const range = maxValue - minValue || 1;
    const baseline = height - padding;

    const linePath = data
      .map((m, i) => {
        const x =
          padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
        const y =
          height -
          padding -
          ((getValue(m) - minValue) / range) * (height - padding * 2);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    const lastX =
      padding +
      ((data.length - 1) / Math.max(data.length - 1, 1)) *
        (width - padding * 2);
    const firstX = padding;

    return `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Statistiken
        </p>
        <h2 className="text-2xl font-semibold">Verbrauchsanalyse</h2>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Gesamt gefahren</p>
          <p className="text-xl font-bold">{formatNumber(totalKmDriven)} km</p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Gesamt verbraucht</p>
          <p className="text-xl font-bold">{formatNumber(totalLitersUsed)} L</p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            Durchschnittsverbrauch
          </p>
          <p className="text-xl font-bold">
            {overallConsumption.toFixed(2)} L/100km
          </p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Gesamtkosten</p>
          <p className="text-xl font-bold">{totalCost.toFixed(2)} €</p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Ø Preis/Liter</p>
          <p className="text-xl font-bold">
            {averagePricePerLiter.toFixed(3)} €
          </p>
        </div>
      </div>

      {/* Monthly Charts as Line Graphs */}
      <div className="space-y-6">
        {/* Driven KM per Month - Line Graph */}
        <div>
          <h3 className="font-semibold mb-3">Gefahrene KM pro Monat</h3>
          <div className="border border-border rounded-xl p-4 bg-muted/20">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-48"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="kmGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--accent))"
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--accent))"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line
                x1="40"
                y1="60"
                x2="60"
                y2="60"
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              <line
                x1="40"
                y1="40"
                x2="60"
                y2="40"
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              <line
                x1="40"
                y1="20"
                x2="60"
                y2="20"
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              {/* Area fill */}
              <path
                d={generateAreaPath(monthlyData, (m) => m.kmDriven, maxKm)}
                fill="url(#kmGradient)"
              />
              {/* Line */}
              <path
                d={generatePath(monthlyData, (m) => m.kmDriven, maxKm)}
                fill="none"
                stroke="hsl(var(--accent))"
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {monthlyData.map((m, i) => {
                const x = 40 + (i / Math.max(monthlyData.length - 1, 1)) * 20;
                const y = 60 - (m.kmDriven / maxKm) * 40;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="1"
                    fill="hsl(var(--accent))"
                  />
                );
              })}
            </svg>
            {/* X-axis labels */}
            <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
              {monthlyData.map((m, i) => (
                <span key={i} className="truncate max-w-[60px] text-center">
                  {m.monthShort}
                </span>
              ))}
            </div>
            {/* Legend */}
            <div className="flex justify-between text-sm mt-3 pt-3 border-t border-border">
              <span className="text-muted-foreground">
                Min:{" "}
                {formatNumber(Math.min(...monthlyData.map((m) => m.kmDriven)))}{" "}
                km
              </span>
              <span className="text-muted-foreground">
                Max: {formatNumber(maxKm)} km
              </span>
            </div>
          </div>
        </div>

        {/* Average Consumption per Month - Line Graph */}
        <div>
          <h3 className="font-semibold mb-3">
            Durchschnittsverbrauch pro Monat
          </h3>
          <div className="border border-border rounded-xl p-4 bg-muted/20">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-48"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="consumptionGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line
                x1="40"
                y1="60"
                x2="60"
                y2="60"
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              <line
                x1="40"
                y1="40"
                x2="60"
                y2="40"
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              <line
                x1="40"
                y1="20"
                x2="60"
                y2="20"
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              {/* Area fill */}
              <path
                d={generateAreaPath(
                  monthlyData,
                  (m) => m.averageConsumption,
                  maxConsumption,
                  minConsumption * 0.9
                )}
                fill="url(#consumptionGradient)"
              />
              {/* Line */}
              <path
                d={generatePath(
                  monthlyData,
                  (m) => m.averageConsumption,
                  maxConsumption,
                  minConsumption * 0.9
                )}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {monthlyData.map((m, i) => {
                const x = 40 + (i / Math.max(monthlyData.length - 1, 1)) * 20;
                const range = maxConsumption - minConsumption * 0.9 || 1;
                const y =
                  60 -
                  ((m.averageConsumption - minConsumption * 0.9) / range) * 40;
                return <circle key={i} cx={x} cy={y} r="1" fill="#3b82f6" />;
              })}
            </svg>
            {/* X-axis labels */}
            <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
              {monthlyData.map((m, i) => (
                <span key={i} className="truncate max-w-[60px] text-center">
                  {m.monthShort}
                </span>
              ))}
            </div>
            {/* Legend */}
            <div className="flex justify-between text-sm mt-3 pt-3 border-t border-border">
              <span className="text-muted-foreground">
                Min: {minConsumption.toFixed(2)} L/100km
              </span>
              <span className="text-muted-foreground">
                Max: {maxConsumption.toFixed(2)} L/100km
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Cost Table */}
        {totalCost > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Kosten pro Monat</h3>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Monat</th>
                    <th className="text-right p-3 font-medium">Liter</th>
                    <th className="text-right p-3 font-medium">Kosten</th>
                    <th className="text-right p-3 font-medium">Ø €/L</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((month, index) => (
                    <tr
                      key={index}
                      className="border-t border-border hover:bg-muted/30 transition"
                    >
                      <td className="p-3">{month.month}</td>
                      <td className="p-3 text-right">
                        {formatNumber(month.litersUsed)} L
                      </td>
                      <td className="p-3 text-right font-medium">
                        {month.totalCost.toFixed(2)} €
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {month.averagePricePerLiter.toFixed(3)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
