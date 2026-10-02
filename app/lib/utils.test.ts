import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { Car, FuelEntry } from "./types";
import {
  AB_ZIELE_INTERVAL_KM,
  calculateNextInspectionDateByKm,
  calculateNextInspectionDateByYear,
  calculateNextTUVDate,
  calculateNextTireChangeDate,
  formatCurrency,
  formatDate,
  formatNumber,
  getCarStatus,
  getFuelSummary,
  getInspectionState,
  getMaintenanceStatus,
  getMaintenanceTasks,
  getTireMileage,
  normalizeCalendarDate,
  recalculateFuelEntries,
  todayDate,
  toDateInput,
} from "./utils";

const now = new Date("2026-10-02T12:00:00Z");

function car(overrides: Partial<Car> = {}): Car {
  return {
    _id: "car" as Id<"cars">,
    _creationTime: 0,
    userId: "test-user",
    make: "VW",
    model: "Golf",
    year: 2022,
    mileage: 10_000,
    insurance: null,
    tuv: {
      lastAppointmentDate: null,
      nextAppointmentDate: null,
      completed: false,
    },
    inspection: {
      lastInspectionDate: null,
      lastInspectionMileage: null,
      nextInspectionDateByYear: null,
      nextInspectionDateByKm: null,
      nextInspectionDate: null,
      intervalYears: 1,
      intervalKm: 15_000,
      completed: false,
    },
    tires: [],
    tireChangeEvents: [],
    currentTireId: null,
    ...overrides,
  };
}

function fill(
  id: string,
  date: string,
  mileage: number,
  liters: number,
  extra: Partial<FuelEntry> = {},
): FuelEntry {
  return { id, date, mileage, liters, ...extra };
}

function inspectedCar(
  mileage: number,
  overrides: Partial<Car["inspection"]> = {},
): Car {
  const base = car({ mileage });
  return {
    ...base,
    inspection: {
      ...base.inspection,
      lastInspectionDate: "2026-09-01",
      lastInspectionMileage: 10_000,
      nextInspectionDateByYear: "2027-09-01",
      // Deliberately stale persisted predictions must not control the status.
      nextInspectionDateByKm: "2030-01-01",
      nextInspectionDate: "2030-01-01",
      ...overrides,
    },
  };
}

describe("German calendar dates", () => {
  it("keeps new dates and reopens legacy Berlin midnight in summer and winter", () => {
    expect(normalizeCalendarDate("2026-10-02")).toBe("2026-10-02");
    expect(toDateInput("2026-10-01T22:00:00.000Z")).toBe("2026-10-02");
    expect(toDateInput("2026-01-30T23:00:00.000Z")).toBe("2026-01-31");
    expect(formatDate("2026-10-01T22:00:00.000Z")).toBe("02.10.2026");
    expect(todayDate(new Date("2026-10-01T22:30:00Z"))).toBe("2026-10-02");
  });

  it.each([
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-00-10",
    "2026-01-00",
    "0000-01-01",
    "not-a-date",
    "2026-02-30T00:00:00Z",
    "2026-10-02T00:00:00",
    "2026-10-02T99:00:00Z",
  ])("rejects invalid calendar value %s", (value) => {
    expect(normalizeCalendarDate(value)).toBeNull();
    expect(toDateInput(value)).toBe("");
    expect(formatDate(value)).toBe("-");
    expect(getMaintenanceStatus(value, now)).toBe("none");
  });

  it("clamps leap day anniversaries and stores canonical calendar dates", () => {
    expect(calculateNextTUVDate("2024-02-29")).toBe("2026-02-28");
    expect(calculateNextInspectionDateByYear("2024-02-29", 1)).toBe(
      "2025-02-28",
    );
    expect(calculateNextTUVDate("2024-10-01T22:00:00Z")).toBe("2026-10-02");
    expect(calculateNextInspectionDateByYear("2026-10-02", 0)).toBeNull();
    expect(calculateNextInspectionDateByYear("2026-10-02", 1.5)).toBeNull();
  });

  it("compares days rather than elapsed hours, including the 30 day boundary", () => {
    const late = new Date("2026-10-02T21:59:00Z");
    expect(getMaintenanceStatus("2026-10-01", late)).toBe("overdue");
    expect(getMaintenanceStatus("2026-10-02", late)).toBe("upcoming");
    expect(getMaintenanceStatus("2026-11-01", late)).toBe("upcoming");
    expect(getMaintenanceStatus("2026-11-02", late)).toBe("current");
    expect(formatDate(null)).toBe("-");
    expect(formatNumber(1234)).toBe("1.234");
    expect(formatCurrency(12.5)).toMatch(/12,50\s€/);
    expect(formatCurrency(null)).toBe("-");
  });
});

describe("inspection state from current mileage", () => {
  it("marks the actual distance threshold overdue immediately without trusting projections", () => {
    const threshold = getInspectionState(inspectedCar(25_000), now);
    expect(threshold).toMatchObject({
      status: "overdue",
      remainingKm: 0,
      isEstimate: false,
    });
    expect(getInspectionState(inspectedCar(25_100), now)).toMatchObject({
      status: "overdue",
      remainingKm: -100,
    });
    expect(
      calculateNextInspectionDateByKm(
        "2026-09-01",
        10_000,
        25_000,
        15_000,
        now,
      ),
    ).toBe("2026-10-02");
  });

  it("uses the 1000 km warning boundary even with no date estimate", () => {
    const options = {
      lastInspectionDate: null,
      nextInspectionDateByYear: null,
    };
    expect(
      getInspectionState(inspectedCar(24_000, options), now),
    ).toMatchObject({
      status: "upcoming",
      remainingKm: 1000,
      date: null,
      isEstimate: false,
    });
    expect(getInspectionState(inspectedCar(23_999, options), now).status).toBe(
      "current",
    );
  });

  it("recalculates a projected date and marks it as an estimate", () => {
    const before = getInspectionState(inspectedCar(15_000), now);
    const after = getInspectionState(inspectedCar(20_000), now);
    expect(before.date).toBe("2026-12-03");
    expect(after.date).toBe("2026-10-18");
    expect(after.isEstimate).toBe(true);
    expect(after.status).toBe("upcoming");
  });

  it("uses the earlier annual date and calendar-day status", () => {
    const state = getInspectionState(
      inspectedCar(10_100, { lastInspectionDate: "2025-10-02" }),
      now,
    );
    expect(state).toMatchObject({
      date: "2026-10-02",
      status: "upcoming",
      isEstimate: false,
    });
    expect(
      getInspectionState(
        inspectedCar(10_100, { lastInspectionDate: "2025-10-01" }),
        now,
      ).status,
    ).toBe("overdue");
  });

  it("preserves the condition marker without a distance estimate or 95 km warning", () => {
    const state = getInspectionState(
      inspectedCar(50_000, { intervalKm: AB_ZIELE_INTERVAL_KM }),
      now,
    );
    expect(state).toEqual({
      status: "current",
      date: "2027-09-01",
      remainingKm: null,
      isEstimate: false,
    });
    expect(
      calculateNextInspectionDateByKm(
        "2026-09-01",
        10_000,
        50_000,
        AB_ZIELE_INTERVAL_KM,
        now,
      ),
    ).toBeNull();
    expect(
      getMaintenanceTasks(
        [inspectedCar(50_000, { intervalKm: AB_ZIELE_INTERVAL_KM })],
        now,
      )[0].detail,
    ).toContain("Nach Zustand");
  });

  it("does not invent an inspection for a new car without service data", () => {
    expect(getInspectionState(car(), now)).toEqual({
      status: "none",
      date: null,
      remainingKm: null,
      isEstimate: false,
    });
    expect(getMaintenanceTasks([car()], now)).toEqual([]);
    expect(getCarStatus(car(), now)).toBe("none");
  });
});

describe("fuel calculations", () => {
  const first = fill("a", "2026-09-01", 1000, 50, {
    pricePerLiter: 2,
    totalCost: 99,
    kmDriven: 99,
    consumption: 99,
  });
  const middle = fill("b", "2026-09-10", 1500, 20);
  const last = fill("c", "2026-09-20", 2500, 90, {
    pricePerLiter: 1.5,
    kmDriven: 99,
    consumption: 99,
  });

  it("includes every fill and uses only priced liters and valid driven intervals", () => {
    const summary = getFuelSummary([last, first, middle]);
    expect(summary.entries.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(summary.totalLiters).toBe(160);
    expect(summary.totalCost).toBe(234);
    expect(summary.averagePrice).toBeCloseTo(234 / 140);
    expect(summary.totalKm).toBe(1500);
    expect(summary.averageConsumption).toBeCloseTo((110 / 1500) * 100);
    expect(summary.entries[0].kmDriven).toBeUndefined();
    expect(summary.entries[0].consumption).toBeUndefined();
    expect(first.totalCost).toBe(99);
  });

  it("recomputes adjacent distances after an edit and delete", () => {
    const edited = recalculateFuelEntries([
      first,
      { ...middle, mileage: 2000 },
      last,
    ]);
    expect(edited[1]).toMatchObject({ kmDriven: 1000, consumption: 2 });
    expect(edited[2]).toMatchObject({ kmDriven: 500, consumption: 18 });
    const deleted = getFuelSummary([first, last]);
    expect(deleted.entries[1]).toMatchObject({
      kmDriven: 1500,
      consumption: 6,
    });
    expect(deleted.averageConsumption).toBe(6);
  });

  it("rounds fractional-cent prices consistently at the half-cent boundary", () => {
    const entries = recalculateFuelEntries([
      fill("fraction", "2026-09-01", 1000, 1, { pricePerLiter: 1.005 }),
    ]);
    expect(entries[0].totalCost).toBe(1.01);
  });

  it("preserves legacy receipt totals when the stored liter price was rounded", () => {
    const legacy = fill("receipt", "2026-09-01", 1000, 50, {
      totalCost: 75.12,
      pricePerLiter: 1.502,
    });
    const entries = recalculateFuelEntries([legacy]);
    expect(entries[0].totalCost).toBe(75.12);
    expect(getFuelSummary([legacy])).toMatchObject({
      totalLiters: 50,
      totalCost: 75.12,
      averagePrice: 75.12 / 50,
    });
  });

  it("orders same-day fills by mileage and suppresses nonpositive distances", () => {
    const entries = recalculateFuelEntries([
      fill("high", "2026-09-01", 1500, 20),
      fill("low", "2026-09-01", 1000, 40),
      fill("same", "2026-09-02", 1500, 10),
      fill("rollback", "2026-09-03", 1400, 10),
    ]);
    expect(entries.map((entry) => entry.id)).toEqual([
      "low",
      "high",
      "same",
      "rollback",
    ]);
    expect(entries[1].kmDriven).toBe(500);
    expect(entries[2].consumption).toBeUndefined();
    expect(entries[3].consumption).toBeUndefined();
  });

  it("keeps manual costs, missing price information, and zero-cost fills distinct", () => {
    const summary = getFuelSummary([
      fill("manual", "2026-09-01", 1000, 20, { totalCost: 40 }),
      fill("unknown", "2026-09-02", 1200, 10),
    ]);
    expect(summary.totalLiters).toBe(30);
    expect(summary.totalCost).toBe(40);
    expect(summary.averagePrice).toBe(2);
    expect(
      getFuelSummary([fill("unknown", "2026-09-02", 1200, 10)]).totalCost,
    ).toBeNull();
    expect(
      getFuelSummary([
        fill("free", "2026-09-02", 1200, 10, { pricePerLiter: 0 }),
      ]).averagePrice,
    ).toBe(0);
    expect(getFuelSummary([])).toMatchObject({
      totalLiters: 0,
      totalCost: null,
      averagePrice: null,
      averageConsumption: null,
      totalKm: 0,
    });
  });

  it("normalizes timestamps, preserves malformed legacy dates without crashing, and drops unsafe intervals", () => {
    const summary = getFuelSummary([
      fill("bad", "not-a-date", 1800, 30, {
        totalCost: 60,
        kmDriven: 500,
        consumption: 6,
      }),
      fill("legacy", "2026-09-01T22:00:00Z", 1000, 20),
    ]);
    expect(summary.entries[0].date).toBe("2026-09-02");
    expect(summary.entries[1]).toMatchObject({ id: "bad", date: "not-a-date" });
    expect(summary.entries[1].kmDriven).toBeUndefined();
    expect(summary.entries[1].consumption).toBeUndefined();
    expect(summary.totalLiters).toBe(50);
    expect(summary.totalCost).toBe(60);
    expect(summary.averageConsumption).toBeNull();
  });
});

describe("seasonal tires and maintenance tasks", () => {
  it("keeps a missed October change overdue across New Year while summer tires are mounted", () => {
    expect(calculateNextTireChangeDate("summer", now)?.date).toBe("2026-10-01");
    expect(
      calculateNextTireChangeDate("summer", new Date("2027-01-10T12:00:00Z"))
        ?.date,
    ).toBe("2026-10-01");
    expect(
      calculateNextTireChangeDate("summer", new Date("2027-05-10T12:00:00Z"))
        ?.date,
    ).toBe("2027-10-01");
  });

  it("keeps a missed Easter change overdue until winter season begins", () => {
    expect(
      calculateNextTireChangeDate("winter", new Date("2024-01-01T12:00:00Z"))
        ?.date,
    ).toBe("2024-03-31");
    expect(
      calculateNextTireChangeDate("winter", new Date("2024-06-01T12:00:00Z"))
        ?.date,
    ).toBe("2024-03-31");
    expect(
      calculateNextTireChangeDate("winter", new Date("2024-11-01T12:00:00Z"))
        ?.date,
    ).toBe("2025-04-20");
    expect(calculateNextTireChangeDate("all-season", now)).toBeNull();
  });

  it("derives configured tasks across all statuses and sorts by urgency then date", () => {
    const vehicle = inspectedCar(25_000, {
      lastInspectionDate: "2026-09-01",
    });
    vehicle.tuv.nextAppointmentDate = "2026-10-20";
    vehicle.insurance = {
      provider: "Test",
      policyNumber: "123",
      expiryDate: "2027-01-01",
    };
    vehicle.tires = [
      { id: "summer", type: "summer", currentMileage: 100, archived: false },
    ];
    vehicle.currentTireId = "summer";
    const tasks = getMaintenanceTasks([vehicle], now);
    expect(tasks.map((task) => task.kind)).toEqual([
      "tires",
      "inspection",
      "tuv",
      "insurance",
    ]);
    expect(tasks.map((task) => task.status)).toEqual([
      "overdue",
      "overdue",
      "upcoming",
      "current",
    ]);
    expect(getCarStatus(vehicle, now)).toBe("overdue");
  });

  it("adds live tire mileage using the latest appended same-day mount", () => {
    const vehicle = car({ mileage: 2200, currentTireId: "summer" });
    const tire = {
      id: "summer",
      type: "summer" as const,
      currentMileage: 600,
      archived: false,
    };
    vehicle.tires = [tire];
    vehicle.tireChangeEvents = [
      {
        id: "early",
        date: "2026-10-02",
        carMileage: 1000,
        tireId: "summer",
        tireMileage: 0,
        changeType: "mount",
      },
      {
        id: "off",
        date: "2026-10-02",
        carMileage: 1600,
        tireId: "summer",
        tireMileage: 600,
        changeType: "unmount",
      },
      {
        id: "later",
        date: "2026-10-02",
        carMileage: 2000,
        tireId: "summer",
        tireMileage: 600,
        changeType: "mount",
      },
    ];
    expect(getTireMileage(vehicle, tire)).toBe(800);
    expect(getTireMileage({ ...vehicle, currentTireId: null }, tire)).toBe(600);
  });
});
