import { differenceInMonths, isValid, parseISO } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";
import type { Car, FuelEntry, Tire, TireType } from "./types";

const UPCOMING_THRESHOLD_DAYS = 30;
const UPCOMING_THRESHOLD_KM = 1000;
const DAY_MS = 86_400_000;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ZONED_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const berlinCalendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Legacy marker: this inspection is triggered by condition, not a 95 km interval.
export const AB_ZIELE_INTERVAL_KM = 95;
export type MaintenanceStatus = "overdue" | "upcoming" | "current" | "none";
export interface MaintenanceTask {
  id: string;
  carId: Id<"cars">;
  kind: "tuv" | "inspection" | "tires" | "insurance";
  title: string;
  date: string | null;
  status: MaintenanceStatus;
  detail: string;
}

function calendarParts(value: string): [number, number, number] | null {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (
    year < 1 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return [year, month, day];
}

function dateString(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function berlinDay(date: Date): string {
  const parts = berlinCalendar.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/** Calendar fields stay timezone-free; old timestamps retain their German calendar day. */
export function normalizeCalendarDate(value: string | null): string | null {
  if (!value) return null;
  if (CALENDAR_DATE.test(value)) return calendarParts(value) ? value : null;
  if (!ZONED_TIMESTAMP.test(value)) return null;
  const date = parseISO(value);
  if (!isValid(date)) return null;
  const calendarDate = berlinDay(date);
  return calendarParts(calendarDate) ? calendarDate : null;
}

export function toDateInput(value: string | null): string {
  return normalizeCalendarDate(value) ?? "";
}

export function todayDate(now = new Date()): string {
  return berlinDay(now);
}

function dayNumber(date: string): number {
  const [year, month, day] = calendarParts(date)!;
  const value = new Date(0);
  value.setUTCFullYear(year, month - 1, day);
  value.setUTCHours(0, 0, 0, 0);
  return value.getTime() / DAY_MS;
}

function daysUntil(date: string, now: Date): number {
  return dayNumber(date) - dayNumber(todayDate(now));
}

function addCalendarDays(date: string, days: number): string | null {
  const shifted = new Date((dayNumber(date) + days) * DAY_MS);
  if (!isValid(shifted) || shifted.getUTCFullYear() > 9999) return null;
  return dateString(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

function addCalendarYears(value: string | null, years: number): string | null {
  const date = normalizeCalendarDate(value);
  if (!date || !Number.isInteger(years) || years <= 0) return null;
  const [year, month, day] = calendarParts(date)!;
  const targetYear = year + years;
  if (targetYear > 9999) return null;
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return dateString(targetYear, month, Math.min(day, lastDay));
}

export function parseDate(value: string | null): Date | null {
  const date = normalizeCalendarDate(value);
  if (!date) return null;
  const [year, month, day] = calendarParts(date)!;
  const result = new Date(0);
  result.setFullYear(year, month - 1, day);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function formatDate(value: string | null): string {
  const date = normalizeCalendarDate(value);
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export function formatNumber(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? "-"
    : new Intl.NumberFormat("de-DE").format(value);
}

export function formatCurrency(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "-"
    : new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(value);
}

// Account for binary floating-point error at the half-cent boundary.
export function roundCurrency(value: number): number {
  const cents = value * 100;
  return Math.round(cents + Number.EPSILON * Math.abs(cents)) / 100;
}

export function calculateNextTUVDate(lastDate: string | null): string | null {
  return addCalendarYears(lastDate, 2);
}

export function calculateNextInspectionDateByYear(
  lastDate: string | null,
  intervalYears: number,
): string | null {
  return addCalendarYears(lastDate, intervalYears);
}

export function calculateRemainingKm(
  lastMileage: number | null,
  currentMileage: number,
  intervalKm: number,
): number | null {
  if (
    lastMileage === null ||
    !Number.isFinite(lastMileage) ||
    !Number.isFinite(currentMileage) ||
    !Number.isFinite(intervalKm) ||
    intervalKm <= 0 ||
    intervalKm === AB_ZIELE_INTERVAL_KM
  )
    return null;
  return lastMileage + intervalKm - currentMileage;
}

export function calculateNextInspectionDateByKm(
  lastDate: string | null,
  lastMileage: number | null,
  currentMileage: number,
  intervalKm: number,
  now = new Date(),
): string | null {
  const date = normalizeCalendarDate(lastDate);
  const remainingKm = calculateRemainingKm(
    lastMileage,
    currentMileage,
    intervalKm,
  );
  if (!date || lastMileage === null || remainingKm === null) return null;
  if (remainingKm <= 0) return todayDate(now);
  const elapsedDays = -daysUntil(date, now);
  const distance = currentMileage - lastMileage;
  if (elapsedDays <= 0 || distance <= 0) return null;
  return addCalendarDays(
    todayDate(now),
    Math.ceil(remainingKm / (distance / elapsedDays)),
  );
}

export function getEarliestDate(
  first: string | null,
  second: string | null,
): string | null {
  const dates = [normalizeCalendarDate(first), normalizeCalendarDate(second)]
    .filter((date) => date !== null)
    .sort();
  return dates[0] ?? null;
}

export function getMaintenanceStatus(
  value: string | null,
  now = new Date(),
): MaintenanceStatus {
  const date = normalizeCalendarDate(value);
  if (!date) return "none";
  const days = daysUntil(date, now);
  return days < 0
    ? "overdue"
    : days <= UPCOMING_THRESHOLD_DAYS
      ? "upcoming"
      : "current";
}

/** Re-derive inspection state whenever the odometer changes; persisted projections are ignored. */
export function getInspectionState(
  car: Pick<Car, "inspection" | "mileage">,
  now = new Date(),
): {
  status: MaintenanceStatus;
  date: string | null;
  remainingKm: number | null;
  isEstimate: boolean;
} {
  const inspection = car.inspection;
  const lastDate = normalizeCalendarDate(inspection.lastInspectionDate);
  const yearDate = lastDate
    ? calculateNextInspectionDateByYear(lastDate, inspection.intervalYears)
    : normalizeCalendarDate(inspection.nextInspectionDateByYear);
  const remainingKm = calculateRemainingKm(
    inspection.lastInspectionMileage,
    car.mileage,
    inspection.intervalKm,
  );
  const mileageDate = calculateNextInspectionDateByKm(
    lastDate,
    inspection.lastInspectionMileage,
    car.mileage,
    inspection.intervalKm,
    now,
  );
  const date = getEarliestDate(yearDate, mileageDate);
  const isEstimate =
    mileageDate !== null &&
    date === mileageDate &&
    mileageDate !== yearDate &&
    (remainingKm ?? 0) > 0;
  if (remainingKm !== null && remainingKm <= 0)
    return { status: "overdue", date, remainingKm, isEstimate: false };
  const dateStatus = getMaintenanceStatus(date, now);
  const conditionBased =
    inspection.intervalKm === AB_ZIELE_INTERVAL_KM &&
    (lastDate !== null || inspection.lastInspectionMileage !== null);
  const status =
    dateStatus === "overdue"
      ? "overdue"
      : dateStatus === "upcoming" ||
          (remainingKm !== null && remainingKm <= UPCOMING_THRESHOLD_KM)
        ? "upcoming"
        : dateStatus === "current" || remainingKm !== null || conditionBased
          ? "current"
          : "none";
  return { status, date, remainingKm, isEstimate };
}

/** Array append order resolves repeated mounts on the same day. */
export function getTireMileage(car: Car, tire: Tire): number {
  if (car.currentTireId !== tire.id) return tire.currentMileage;
  const mount = [...car.tireChangeEvents]
    .reverse()
    .find((event) => event.tireId === tire.id && event.changeType === "mount");
  return (
    tire.currentMileage +
    (mount ? Math.max(0, car.mileage - mount.carMileage) : 0)
  );
}

function easterDate(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dateString(year, month, day);
}

/** Keep a missed seasonal change overdue until the mounted tires suit the season again. */
export function calculateNextTireChangeDate(
  type: TireType | null,
  now = new Date(),
): { date: string; type: "winter-to-summer" | "summer-to-winter" } | null {
  if (type === null || type === "all-season") return null;
  const today = todayDate(now);
  const year = Number(today.slice(0, 4));
  const easter = easterDate(year);
  const october = dateString(year, 10, 1);
  return type === "winter"
    ? {
        date: today >= october ? easterDate(year + 1) : easter,
        type: "winter-to-summer",
      }
    : {
        date: today < easter ? dateString(year - 1, 10, 1) : october,
        type: "summer-to-winter",
      };
}

const statusOrder: Record<MaintenanceStatus, number> = {
  overdue: 0,
  upcoming: 1,
  current: 2,
  none: 3,
};

export function getMaintenanceTasks(
  cars: Car[],
  now = new Date(),
): MaintenanceTask[] {
  const tasks: MaintenanceTask[] = [];
  for (const car of cars) {
    const addTask = (
      kind: MaintenanceTask["kind"],
      title: string,
      date: string | null,
      detail: string,
      status = getMaintenanceStatus(date, now),
    ) => {
      if (status !== "none")
        tasks.push({
          id: `${car._id}:${kind}`,
          carId: car._id,
          kind,
          title,
          date,
          status,
          detail,
        });
    };
    const tuvDate =
      normalizeCalendarDate(car.tuv.nextAppointmentDate) ??
      calculateNextTUVDate(car.tuv.lastAppointmentDate);
    addTask("tuv", "TÜV", tuvDate, formatDate(tuvDate));
    const inspection = getInspectionState(car, now);
    const mileageDetail =
      inspection.remainingKm === null
        ? ""
        : inspection.remainingKm <= 0
          ? `${formatNumber(Math.abs(inspection.remainingKm))} km über dem Intervall`
          : `In ${formatNumber(inspection.remainingKm)} km`;
    const conditionDetail =
      car.inspection.intervalKm === AB_ZIELE_INTERVAL_KM ? "Nach Zustand" : "";
    const inspectionDetail = [
      inspection.date
        ? `${inspection.isEstimate ? "Geschätzt: " : ""}${formatDate(inspection.date)}`
        : "",
      mileageDetail,
      conditionDetail,
    ]
      .filter(Boolean)
      .join(" · ");
    addTask(
      "inspection",
      "Inspektion",
      inspection.date,
      inspectionDetail,
      inspection.status,
    );
    const tire = car.tires.find(
      (item) => item.id === car.currentTireId && !item.archived,
    );
    const tireChange = calculateNextTireChangeDate(tire?.type ?? null, now);
    if (tireChange)
      addTask(
        "tires",
        "Reifenwechsel",
        tireChange.date,
        tireChange.type === "winter-to-summer"
          ? "Sommerreifen montieren"
          : "Winterreifen montieren",
      );
    const insuranceDate = normalizeCalendarDate(
      car.insurance?.expiryDate ?? null,
    );
    addTask(
      "insurance",
      "Versicherung",
      insuranceDate,
      car.insurance?.provider ?? "",
    );
  }
  return tasks.sort(
    (first, second) =>
      statusOrder[first.status] - statusOrder[second.status] ||
      (first.date ?? "9999-12-31").localeCompare(second.date ?? "9999-12-31") ||
      first.id.localeCompare(second.id),
  );
}

export function getCarStatus(car: Car, now = new Date()): MaintenanceStatus {
  return getMaintenanceTasks([car], now)[0]?.status ?? "none";
}

/** Fuel intervals are always rebuilt after insert, edit, or delete. */
export function recalculateFuelEntries(entries: FuelEntry[]): FuelEntry[] {
  const sorted = entries
    .map((entry) => {
      const date = normalizeCalendarDate(entry.date);
      const result = { ...entry, date: date ?? entry.date };
      delete result.kmDriven;
      delete result.consumption;
      // Legacy forms rounded the liter price; keep the receipt's known total.
      if (
        result.totalCost === undefined ||
        !Number.isFinite(result.totalCost) ||
        result.totalCost < 0
      ) {
        delete result.totalCost;
        if (
          result.pricePerLiter !== undefined &&
          Number.isFinite(result.pricePerLiter) &&
          result.pricePerLiter >= 0 &&
          Number.isFinite(result.liters)
        ) {
          result.totalCost = roundCurrency(
            result.pricePerLiter * result.liters,
          );
        }
      }
      return result;
    })
    .sort((first, second) => {
      const firstDate = normalizeCalendarDate(first.date);
      const secondDate = normalizeCalendarDate(second.date);
      if (!firstDate || !secondDate) return firstDate ? -1 : secondDate ? 1 : 0;
      return (
        firstDate.localeCompare(secondDate) || first.mileage - second.mileage
      );
    });
  return sorted.map((entry, index) => {
    const previous = sorted[index - 1];
    const kmDriven = previous ? entry.mileage - previous.mileage : 0;
    return normalizeCalendarDate(entry.date) &&
      kmDriven > 0 &&
      Number.isFinite(kmDriven) &&
      Number.isFinite(entry.liters) &&
      entry.liters > 0
      ? { ...entry, kmDriven, consumption: (entry.liters / kmDriven) * 100 }
      : entry;
  });
}

export function getFuelSummary(entries: FuelEntry[]): {
  entries: FuelEntry[];
  totalLiters: number;
  totalCost: number | null;
  averagePrice: number | null;
  averageConsumption: number | null;
  totalKm: number;
} {
  const calculated = recalculateFuelEntries(entries);
  let totalLiters = 0;
  let pricedLiters = 0;
  let totalCost = 0;
  let hasCost = false;
  let intervalLiters = 0;
  let totalKm = 0;
  for (const entry of calculated) {
    if (Number.isFinite(entry.liters) && entry.liters > 0)
      totalLiters += entry.liters;
    if (
      entry.totalCost !== undefined &&
      Number.isFinite(entry.totalCost) &&
      entry.totalCost >= 0
    ) {
      totalCost += entry.totalCost;
      hasCost = true;
      if (entry.liters > 0 && Number.isFinite(entry.liters))
        pricedLiters += entry.liters;
    }
    if (entry.kmDriven !== undefined && entry.kmDriven > 0) {
      totalKm += entry.kmDriven;
      intervalLiters += entry.liters;
    }
  }
  return {
    entries: calculated,
    totalLiters,
    totalCost: hasCost ? totalCost : null,
    averagePrice: pricedLiters > 0 ? totalCost / pricedLiters : null,
    averageConsumption: totalKm > 0 ? (intervalLiters / totalKm) * 100 : null,
    totalKm,
  };
}

export function getStatusText(status: MaintenanceStatus): string {
  return {
    overdue: "Überfällig",
    upcoming: "Bald fällig",
    current: "Aktuell",
    none: "Keine Daten",
  }[status];
}

export function getStatusColorClass(status: MaintenanceStatus): string {
  return {
    overdue: "bg-red-100 text-red-800 border-red-300",
    upcoming: "bg-yellow-100 text-yellow-800 border-yellow-300",
    current: "bg-green-100 text-green-800 border-green-300",
    none: "bg-gray-100 text-gray-800 border-gray-300",
  }[status];
}

export function getStatusBadgeClass(status: MaintenanceStatus): string {
  return {
    overdue: "badge-danger",
    upcoming: "badge-warning",
    current: "badge-success",
    none: "badge-neutral",
  }[status];
}

export function calculateTimeProgress(
  lastDate: string | null,
  nextDate: string | null,
  now = new Date(),
): number | null {
  const last = normalizeCalendarDate(lastDate);
  const next = normalizeCalendarDate(nextDate);
  if (!last || !next) return null;
  const totalDays = dayNumber(next) - dayNumber(last);
  if (totalDays <= 0) return null;
  return (
    Math.round(
      Math.max(0, Math.min(100, (-daysUntil(last, now) / totalDays) * 100)) *
        10,
    ) / 10
  );
}

export function calculateTimeElapsed(
  lastDate: string | null,
  nextDate: string | null,
  now = new Date(),
): { months: number; days: number; totalDays: number } | null {
  const last = parseDate(lastDate);
  const next = normalizeCalendarDate(nextDate);
  const normalizedLast = normalizeCalendarDate(lastDate);
  if (
    !last ||
    !next ||
    !normalizedLast ||
    dayNumber(next) <= dayNumber(normalizedLast)
  )
    return null;
  const today = parseDate(todayDate(now))!;
  const months = Math.max(0, differenceInMonths(today, last));
  const afterMonths = new Date(last);
  afterMonths.setMonth(afterMonths.getMonth() + months);
  const afterDate = dateString(
    afterMonths.getFullYear(),
    afterMonths.getMonth() + 1,
    afterMonths.getDate(),
  );
  return {
    months,
    days: Math.max(0, dayNumber(todayDate(now)) - dayNumber(afterDate)),
    totalDays: Math.max(0, -daysUntil(normalizedLast, now)),
  };
}

export function formatTimeElapsed(
  lastDate: string | null,
  nextDate: string | null,
): string {
  const elapsed = calculateTimeElapsed(lastDate, nextDate);
  if (!elapsed) {
    const next = normalizeCalendarDate(nextDate);
    const remaining = next ? daysUntil(next, new Date()) : -1;
    return remaining === 0
      ? "Heute"
      : remaining > 0
        ? `in ${remaining} Tagen`
        : "-";
  }
  const values = [
    elapsed.months > 0
      ? `${elapsed.months} Monat${elapsed.months === 1 ? "" : "e"}`
      : "",
    elapsed.days > 0
      ? `${elapsed.days} Tag${elapsed.days === 1 ? "" : "e"}`
      : "",
  ].filter(Boolean);
  return values.join(", ") || "Heute";
}

export function calculateKmProgress(
  lastMileage: number | null,
  currentMileage: number,
  intervalKm: number,
): number | null {
  const remaining = calculateRemainingKm(
    lastMileage,
    currentMileage,
    intervalKm,
  );
  return remaining === null
    ? null
    : Math.round(
        Math.max(0, Math.min(100, (1 - remaining / intervalKm) * 100)) * 10,
      ) / 10;
}

export function calculateKmDriven(
  lastMileage: number | null,
  currentMileage: number,
): number | null {
  return lastMileage === null
    ? null
    : Math.max(0, currentMileage - lastMileage);
}

export function formatKmDriven(
  lastMileage: number | null,
  currentMileage: number,
): string {
  const distance = calculateKmDriven(lastMileage, currentMileage);
  return distance === null ? "-" : `${formatNumber(distance)} km`;
}

export function formatRemainingKm(
  lastMileage: number | null,
  currentMileage: number,
  intervalKm: number,
): string {
  const remaining = calculateRemainingKm(
    lastMileage,
    currentMileage,
    intervalKm,
  );
  return remaining === null
    ? "-"
    : remaining <= 0
      ? `0 km (${formatNumber(Math.abs(remaining))} km überschritten)`
      : `${formatNumber(remaining)} km`;
}

export function calculateTireChangeProgress(
  lastDate: string | null,
  nextDate: string | null,
): number | null {
  return calculateTimeProgress(lastDate, nextDate);
}
