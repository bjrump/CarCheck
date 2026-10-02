import { describe, expect, it } from "vitest";
import type { Car } from "./types";
import {
  AB_ZIELE_INTERVAL_KM,
  calculateNextInspectionDateByKm,
  calculateNextInspectionDateByYear,
  calculateNextTUVDate,
  calculateRemainingKm,
  calculateTimeElapsed,
  calculateTimeProgress,
  getEarliestDate,
  getInspectionState,
  getMaintenanceStatus,
  normalizeCalendarDate,
  parseDate,
  todayDate,
} from "./utils";

function inspection(
  mileage = 10_300,
  overrides: Partial<Car["inspection"]> = {},
): Pick<Car, "mileage" | "inspection"> {
  return {
    mileage,
    inspection: {
      lastInspectionDate: "2026-01-01",
      lastInspectionMileage: 10_000,
      intervalYears: 1,
      intervalKm: 900,
      nextInspectionDateByYear: "2099-01-01",
      nextInspectionDateByKm: "2099-01-01",
      nextInspectionDate: "2099-01-01",
      completed: true,
      ...overrides,
    },
  };
}

describe("calendar boundaries independent of elapsed hours", () => {
  it.each([
    ["2000-02-29", "2002-02-28"],
    ["2024-02-29", "2026-02-28"],
    ["2026-01-31", "2028-01-31"],
    ["2096-02-29", "2098-02-28"],
    ["9998-01-01", null],
  ])("calculates a two-year TÜV anniversary for %s", (last, next) => {
    expect(calculateNextTUVDate(last)).toBe(next);
  });

  it("uses Gregorian century leap rules and clamps annual anniversaries", () => {
    expect(normalizeCalendarDate("1900-02-29")).toBeNull();
    expect(normalizeCalendarDate("2100-02-29")).toBeNull();
    expect(normalizeCalendarDate("2400-02-29")).toBe("2400-02-29");
    expect(calculateNextInspectionDateByYear("2024-02-29", 4)).toBe(
      "2028-02-29",
    );
    expect(calculateNextInspectionDateByYear("2096-02-29", 4)).toBe(
      "2100-02-28",
    );
  });

  it.each([
    ["2026-03-28T23:00:00Z", "2026-03-29"],
    ["2026-03-29T00:59:59Z", "2026-03-29"],
    ["2026-03-29T01:00:00Z", "2026-03-29"],
    ["2026-10-24T22:00:00Z", "2026-10-25"],
    ["2026-10-25T00:59:59Z", "2026-10-25"],
    ["2026-10-25T01:00:00Z", "2026-10-25"],
    ["2026-12-31T23:30:00Z", "2027-01-01"],
    ["2026-01-01T00:30:00+02:00", "2025-12-31"],
  ])("retains the Berlin day for legacy timestamp %s", (timestamp, day) => {
    expect(normalizeCalendarDate(timestamp)).toBe(day);
    expect(todayDate(new Date(timestamp))).toBe(day);
  });

  it.each([
    "2026-01-01T00:00:00+24:00",
    "2026-01-01T00:00:00+99:00",
    "2026-01-01T00:00:00-99:00",
    "2026-01-01T00:00:00+02:60",
    "2026-01-01T00:60:00Z",
    "2026-01-01T25:00:00Z",
    "2026-01-01T00:00:00",
    " 2026-01-01",
    "10000-01-01",
    "",
  ])("does not assign a plausible calendar day to malformed date %s", (value) => {
    expect(normalizeCalendarDate(value)).toBeNull();
    expect(parseDate(value)).toBeNull();
  });

  it("changes urgency at Berlin midnight, including a 23-hour DST day", () => {
    const beforeMidnight = new Date("2026-03-29T21:59:59Z");
    const afterMidnight = new Date("2026-03-29T22:00:00Z");
    expect(getMaintenanceStatus("2026-03-29", beforeMidnight)).toBe(
      "upcoming",
    );
    expect(getMaintenanceStatus("2026-03-29", afterMidnight)).toBe("overdue");
    expect(getMaintenanceStatus("2026-04-28", beforeMidnight)).toBe(
      "upcoming",
    );
    expect(getMaintenanceStatus("2026-04-29", beforeMidnight)).toBe(
      "current",
    );
  });

  it("measures progress in calendar days through DST and clamps both ends", () => {
    expect(
      calculateTimeProgress(
        "2026-03-28",
        "2026-03-30",
        new Date("2026-03-29T12:00:00Z"),
      ),
    ).toBe(50);
    expect(
      calculateTimeProgress(
        "2026-10-24",
        "2026-10-26",
        new Date("2026-10-25T12:00:00Z"),
      ),
    ).toBe(50);
    expect(
      calculateTimeProgress(
        "2026-01-02",
        "2026-01-04",
        new Date("2026-01-01T12:00:00Z"),
      ),
    ).toBe(0);
    expect(
      calculateTimeProgress(
        "2026-01-02",
        "2026-01-04",
        new Date("2026-01-05T12:00:00Z"),
      ),
    ).toBe(100);
    expect(calculateTimeProgress("2026-01-02", "2026-01-02")).toBeNull();
  });

  it.each([
    ["2026-01-31", "2026-03-01", 1, 1, 29],
    ["2024-01-31", "2024-03-01", 1, 1, 30],
    ["2026-01-30", "2026-03-01", 1, 1, 30],
  ])(
    "decomposes elapsed months and days using clamped month anniversaries (%s)",
    (last, day, months, days, totalDays) => {
      expect(
        calculateTimeElapsed(last, "2027-12-31", new Date(`${day}T12:00:00Z`)),
      ).toEqual({ months, days, totalDays });
    },
  );
});

describe("inspection estimates and actual thresholds", () => {
  const now = new Date("2026-01-11T12:00:00Z");

  it("projects 600 remaining km at 30 km/day to January 31", () => {
    const state = getInspectionState(inspection(), now);
    expect(state).toEqual({
      date: "2026-01-31",
      remainingKm: 600,
      status: "upcoming",
      isEstimate: true,
    });
  });

  it("rounds a partial travel day up instead of showing an earlier deadline", () => {
    // Ten days, 300 km travelled, 901 km interval: 601 / 30 = 20 1/30 days.
    expect(
      calculateNextInspectionDateByKm("2026-01-01", 10_000, 10_300, 901, now),
    ).toBe("2026-02-01");
  });

  it("prefers an earlier annual due date and resolves equal dates as unestimated", () => {
    const annualFirst = getInspectionState(
      inspection(10_001, { lastInspectionDate: "2025-01-21" }),
      now,
    );
    expect(annualFirst).toMatchObject({
      date: "2026-01-21",
      isEstimate: false,
      status: "upcoming",
    });
    const tied = getInspectionState(
      inspection(13_550, { lastInspectionDate: "2025-01-21", intervalKm: 3650 }),
      now,
    );
    expect(tied).toMatchObject({ date: "2026-01-21", isEstimate: false });
  });

  it("does not project without elapsed days or travelled distance", () => {
    expect(
      calculateNextInspectionDateByKm("2026-01-11", 10_000, 10_300, 900, now),
    ).toBeNull();
    expect(
      calculateNextInspectionDateByKm("2026-01-01", 10_000, 10_000, 900, now),
    ).toBeNull();
    expect(
      calculateNextInspectionDateByKm(null, 10_000, 10_300, 900, now),
    ).toBeNull();
    expect(
      calculateNextInspectionDateByKm("2026-01-01", null, 10_300, 900, now),
    ).toBeNull();
  });

  it("keeps an actually exhausted interval overdue even with a future annual date", () => {
    expect(getInspectionState(inspection(10_900), now)).toEqual({
      date: "2026-01-11",
      remainingKm: 0,
      status: "overdue",
      isEstimate: false,
    });
    expect(getInspectionState(inspection(11_001), now).remainingKm).toBe(-101);
  });

  it("keeps a past annual due date overdue despite remaining mileage", () => {
    expect(
      getInspectionState(
        inspection(10_001, { lastInspectionDate: "2025-01-10" }),
        now,
      ),
    ).toMatchObject({
      date: "2026-01-10",
      remainingKm: 899,
      status: "overdue",
      isEstimate: false,
    });
  });

  it("does not turn the condition-based marker into a 95 km interval", () => {
    expect(
      getInspectionState(inspection(100_000, { intervalKm: AB_ZIELE_INTERVAL_KM }), now),
    ).toEqual({
      date: "2027-01-01",
      remainingKm: null,
      status: "current",
      isEstimate: false,
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not compute mileage state for invalid interval %s",
    (interval) => {
      expect(calculateRemainingKm(10_000, 10_300, interval)).toBeNull();
      expect(
        calculateNextInspectionDateByKm("2026-01-01", 10_000, 10_300, interval, now),
      ).toBeNull();
    },
  );

  it("keeps exact remaining mileage for individually safe large integer inputs", () => {
    expect(
      calculateRemainingKm(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 2),
    ).toBe(2);
    expect(
      calculateRemainingKm(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER, 3),
    ).toBe(2);
  });

  it("ignores malformed candidates when choosing an earlier due date", () => {
    expect(getEarliestDate("invalid", "2026-02-28")).toBe("2026-02-28");
    expect(getEarliestDate("2026-12-31T23:30:00Z", "2027-01-02")).toBe(
      "2027-01-01",
    );
    expect(getEarliestDate(null, "2026-02-30")).toBeNull();
  });
});
