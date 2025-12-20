import {
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  differenceInMonths,
  format,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
import { Car } from "./types";

// Format date to German format (DD.MM.YYYY)
export function formatDate(date: string | null): string {
  if (!date) return "-";
  try {
    // Handle both YYYY-MM-DD and ISO string formats
    let dateObj: Date;
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Handle YYYY-MM-DD format (treat as local date)
      dateObj = new Date(date + "T00:00:00");
    } else {
      dateObj = parseISO(date);
    }
    return format(dateObj, "dd.MM.yyyy", { locale: de });
  } catch {
    return "-";
  }
}

// Format number with German formatting (1.234)
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  return new Intl.NumberFormat("de-DE").format(num);
}

// Calculate next TÜV date - always 2 years after last appointment
export function calculateNextTUVDate(lastDate: string | null): string | null {
  if (!lastDate) return null;

  try {
    // Normalize date format - handle both YYYY-MM-DD and ISO strings
    let lastDateObj: Date;
    if (lastDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Handle YYYY-MM-DD format (treat as local date, not UTC)
      lastDateObj = new Date(lastDate + "T00:00:00");
    } else {
      lastDateObj = parseISO(lastDate);
    }

    const nextDate = addYears(lastDateObj, 2);
    return nextDate.toISOString();
  } catch (error) {
    console.error("Error calculating next TÜV date:", error);
    return null;
  }
}

// Calculate next inspection date by year
export function calculateNextInspectionDateByYear(
  lastDate: string | null,
  intervalYears: number
): string | null {
  if (!lastDate) return null;

  try {
    // Normalize date format - handle both YYYY-MM-DD and ISO strings
    let lastDateObj: Date;
    if (lastDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Handle YYYY-MM-DD format (treat as local date, not UTC)
      // Parse manually to avoid timezone issues
      const dateParts = lastDate.split("-");
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(dateParts[2], 10);
      lastDateObj = new Date(year, month, day, 0, 0, 0, 0);
    } else {
      lastDateObj = parseISO(lastDate);
    }

    // Ensure intervalYears is a valid number and at least 1
    const yearsToAdd =
      typeof intervalYears === "number" && intervalYears > 0
        ? intervalYears
        : 1;

    const nextDate = addYears(lastDateObj, yearsToAdd);
    return nextDate.toISOString();
  } catch (error) {
    console.error("Error calculating next inspection date by year:", error);
    return null;
  }
}

// Calculate next inspection date by KM
// Uses actual driving behavior (average km/day) based on:
// - Last inspection date and mileage
// - Current date and mileage
export function calculateNextInspectionDateByKm(
  lastDate: string | null,
  lastMileage: number | null,
  currentMileage: number,
  intervalKm: number
): string | null {
  if (!lastDate || lastMileage === null) return null;

  // For AB Ziele 95, don't calculate expected time
  if (intervalKm === 95) {
    return null;
  }

  try {
    // Parse last inspection date
    let lastDateObj: Date;
    if (lastDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      lastDateObj = new Date(lastDate + "T00:00:00");
    } else {
      lastDateObj = parseISO(lastDate);
    }

    const today = new Date();

    // Calculate days since last inspection
    const daysSinceLastInspection = differenceInDays(today, lastDateObj);

    // If less than 1 day passed, we can't calculate average yet
    if (daysSinceLastInspection < 1) {
      return null;
    }

    // Calculate km driven since last inspection
    const kmDriven = currentMileage - lastMileage;

    // If no km driven, we can't calculate
    if (kmDriven <= 0) {
      return null;
    }

    // Calculate average km per day based on actual driving behavior
    const avgKmPerDay = kmDriven / daysSinceLastInspection;

    // Calculate remaining km until next inspection
    const remainingKm = intervalKm - kmDriven;

    // If already exceeded the interval
    if (remainingKm <= 0) {
      // Return today (or a date in the past would be more accurate)
      return today.toISOString();
    }

    // Calculate remaining days based on average km/day
    const remainingDays = Math.ceil(remainingKm / avgKmPerDay);

    // Calculate expected inspection date
    const expectedDate = addDays(today, remainingDays);

    return expectedDate.toISOString();
  } catch (error) {
    console.error("Error calculating next inspection date by KM:", error);
    return null;
  }
}

// Get the earlier date (next inspection date - whichever comes first)
export function getEarliestDate(
  date1: string | null,
  date2: string | null
): string | null {
  if (!date1 && !date2) return null;
  if (!date1) return date2;
  if (!date2) return date1;

  try {
    const d1 = parseISO(date1);
    const d2 = parseISO(date2);
    return d1 < d2 ? date1 : date2;
  } catch {
    return date1 || date2;
  }
}

// Get maintenance status (overdue, upcoming, current)
export type MaintenanceStatus = "overdue" | "upcoming" | "current" | "none";

export function getMaintenanceStatus(date: string | null): MaintenanceStatus {
  if (!date) return "none";

  try {
    const targetDate = parseISO(date);
    const today = new Date();
    const daysUntil = differenceInDays(targetDate, today);

    if (daysUntil < 0) return "overdue";
    if (daysUntil <= 30) return "upcoming";
    return "current";
  } catch {
    return "none";
  }
}

// Get status color class
export function getStatusColorClass(status: MaintenanceStatus): string {
  switch (status) {
    case "overdue":
      return "bg-red-100 text-red-800 border-red-300";
    case "upcoming":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "current":
      return "bg-green-100 text-green-800 border-green-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

// Get status text in German
export function getStatusText(status: MaintenanceStatus): string {
  switch (status) {
    case "overdue":
      return "Überfällig";
    case "upcoming":
      return "Bald fällig";
    case "current":
      return "Aktuell";
    default:
      return "Keine Daten";
  }
}

// Helper function to parse date (handles both YYYY-MM-DD and ISO formats)
function parseDate(date: string | null): Date | null {
  if (!date) return null;
  try {
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(date + "T00:00:00");
    }
    return parseISO(date);
  } catch {
    return null;
  }
}

// Calculate time progress percentage (0-100) between two dates
export function calculateTimeProgress(
  lastDate: string | null,
  nextDate: string | null
): number | null {
  if (!lastDate || !nextDate) return null;

  const last = parseDate(lastDate);
  const next = parseDate(nextDate);
  if (!last || !next) return null;

  const today = new Date();
  const totalDays = differenceInDays(next, last);
  const daysPassed = differenceInDays(today, last);

  if (totalDays <= 0) return null;

  const progress = Math.max(0, Math.min(100, (daysPassed / totalDays) * 100));
  return Math.round(progress * 10) / 10; // Round to 1 decimal place
}

// Calculate time elapsed since last date (returns months and days)
export function calculateTimeElapsed(
  lastDate: string | null,
  nextDate: string | null
): { months: number; days: number; totalDays: number } | null {
  if (!lastDate || !nextDate) return null;

  const last = parseDate(lastDate);
  const next = parseDate(nextDate);
  if (!last || !next) return null;

  const today = new Date();
  const totalDays = differenceInDays(next, last);
  const daysPassed = differenceInDays(today, last);

  if (totalDays <= 0) return null;

  // Calculate months and remaining days
  const months = differenceInMonths(today, last);
  const lastDatePlusMonths = new Date(last);
  lastDatePlusMonths.setMonth(lastDatePlusMonths.getMonth() + months);
  const remainingDays = differenceInDays(today, lastDatePlusMonths);

  return {
    months: Math.max(0, months),
    days: Math.max(0, remainingDays),
    totalDays: Math.max(0, daysPassed),
  };
}

// Format time elapsed as string (e.g., "12 Monate, 5 Tage" or "365 Tage")
export function formatTimeElapsed(
  lastDate: string | null,
  nextDate: string | null
): string {
  const elapsed = calculateTimeElapsed(lastDate, nextDate);
  if (!elapsed) {
    // If no last date, calculate days until next date
    if (!lastDate && nextDate) {
      const next = parseDate(nextDate);
      if (next) {
        const today = new Date();
        const daysUntil = differenceInDays(next, today);
        if (daysUntil >= 0) {
          return `in ${daysUntil} Tag${daysUntil !== 1 ? "en" : ""}`;
        }
      }
    }
    return "-";
  }

  if (elapsed.months === 0 && elapsed.days === 0) {
    // If both are 0, show "Heute" or calculate days until next
    if (nextDate) {
      const next = parseDate(nextDate);
      if (next) {
        const today = new Date();
        const daysUntil = differenceInDays(next, today);
        if (daysUntil > 0) {
          return `in ${daysUntil} Tag${daysUntil !== 1 ? "en" : ""}`;
        } else if (daysUntil === 0) {
          return "Heute";
        }
      }
    }
    return "0 Tage";
  }

  if (elapsed.months === 0) {
    return `${elapsed.days} Tag${elapsed.days !== 1 ? "e" : ""}`;
  }

  if (elapsed.days === 0) {
    return `${elapsed.months} Monat${elapsed.months !== 1 ? "e" : ""}`;
  }

  return `${elapsed.months} Monat${elapsed.months !== 1 ? "e" : ""}, ${
    elapsed.days
  } Tag${elapsed.days !== 1 ? "e" : ""}`;
}

// Calculate kilometer progress percentage (0-100) for inspection
export function calculateKmProgress(
  lastMileage: number | null,
  currentMileage: number,
  intervalKm: number
): number | null {
  if (lastMileage === null || intervalKm <= 0) return null;

  const kmDriven = currentMileage - lastMileage;
  const progress = Math.max(0, Math.min(100, (kmDriven / intervalKm) * 100));
  return Math.round(progress * 10) / 10; // Round to 1 decimal place
}

// Calculate kilometers driven since last inspection
export function calculateKmDriven(
  lastMileage: number | null,
  currentMileage: number
): number | null {
  if (lastMileage === null) return null;
  return Math.max(0, currentMileage - lastMileage);
}

// Format kilometers driven as string
export function formatKmDriven(
  lastMileage: number | null,
  currentMileage: number
): string {
  const kmDriven = calculateKmDriven(lastMileage, currentMileage);
  if (kmDriven === null) return "-";
  return `${formatNumber(kmDriven)} km`;
}

// Calculate remaining kilometers until next inspection
export function calculateRemainingKm(
  lastMileage: number | null,
  currentMileage: number,
  intervalKm: number
): number | null {
  if (lastMileage === null || intervalKm <= 0) return null;

  const kmSinceLastInspection = currentMileage - lastMileage;
  const kmUntilNextInspection = intervalKm - kmSinceLastInspection;

  // Return remaining km (can be negative if exceeded)
  return kmUntilNextInspection;
}

// Format remaining kilometers as string
export function formatRemainingKm(
  lastMileage: number | null,
  currentMileage: number,
  intervalKm: number
): string {
  const remainingKm = calculateRemainingKm(
    lastMileage,
    currentMileage,
    intervalKm
  );
  if (remainingKm === null) return "-";

  if (remainingKm <= 0) {
    return `0 km (${formatNumber(Math.abs(remainingKm))} km überschritten)`;
  }

  return `${formatNumber(remainingKm)} km`;
}

// Calculate Easter date for a given year (using algorithm by Gauss)
function calculateEaster(year: number): Date {
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
  return new Date(year, month - 1, day);
}

// Calculate next tire change date based on current tire type
// Winter -> Summer: Easter
// Summer -> Winter: October 1st
export function calculateNextTireChangeDate(
  currentTireType: "summer" | "winter" | "all-season" | null
): { date: string; type: "winter-to-summer" | "summer-to-winter" } | null {
  if (!currentTireType || currentTireType === "all-season") return null;

  const today = new Date();
  const currentYear = today.getFullYear();
  const easter = calculateEaster(currentYear);
  const october1 = new Date(currentYear, 9, 1); // October is month 9 (0-indexed)

  if (currentTireType === "winter") {
    // Next change: Winter -> Summer (Easter)
    if (today < easter) {
      // Easter this year hasn't passed yet
      return { date: easter.toISOString(), type: "winter-to-summer" };
    } else {
      // Easter this year has passed, use next year's Easter
      const nextEaster = calculateEaster(currentYear + 1);
      return { date: nextEaster.toISOString(), type: "winter-to-summer" };
    }
  } else if (currentTireType === "summer") {
    // Next change: Summer -> Winter (October 1st)
    if (today < october1) {
      // October 1st this year hasn't passed yet
      return { date: october1.toISOString(), type: "summer-to-winter" };
    } else {
      // October 1st this year has passed, use next year's October 1st
      const nextOctober1 = new Date(currentYear + 1, 9, 1);
      return { date: nextOctober1.toISOString(), type: "summer-to-winter" };
    }
  }

  return null;
}

// Calculate tire change progress (time-based)
export function calculateTireChangeProgress(
  lastChangeDate: string | null,
  nextChangeDate: string | null
): number | null {
  if (!lastChangeDate || !nextChangeDate) return null;
  return calculateTimeProgress(lastChangeDate, nextChangeDate);
}
