import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { Car, Tire, TireChangeEvent } from "./types";
import {
  calculateNextTireChangeDate,
  getMaintenanceStatus,
  getTireMileage,
} from "./utils";

const summer: Tire = {
  id: "summer",
  type: "summer",
  currentMileage: 2_500,
  archived: false,
};

function vehicle(overrides: Partial<Car> = {}): Car {
  return {
    _id: "car" as Id<"cars">,
    _creationTime: 0,
    userId: "issuer|owner",
    make: "VW",
    model: "Golf",
    year: 2020,
    mileage: 15_000,
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
    tires: [summer],
    tireChangeEvents: [],
    currentTireId: summer.id,
    ...overrides,
  };
}

function mount(
  id: string,
  carMileage: number,
  overrides: Partial<TireChangeEvent> = {},
): TireChangeEvent {
  return {
    id,
    date: "2026-04-05",
    carMileage,
    tireId: summer.id,
    tireMileage: summer.currentMileage,
    changeType: "mount",
    ...overrides,
  };
}

describe("tire distance baselines", () => {
  it("adds only distance since the most recently appended mount, even on one day", () => {
    const car = vehicle({
      tireChangeEvents: [
        mount("old-mount", 10_000),
        mount("unmount", 12_000, { changeType: "unmount" }),
        mount("latest-mount", 14_000),
      ],
    });
    // Previous 2,500 km + (15,000 - 14,000) = 3,500 km.
    expect(getTireMileage(car, summer)).toBe(3_500);
    expect(getTireMileage({ ...car, currentTireId: null }, summer)).toBe(2_500);
    expect(car.tireChangeEvents[2].carMileage).toBe(14_000);
    expect(summer.currentMileage).toBe(2_500);
  });

  it("does not invent travel for a missing mount or an odometer below the mount", () => {
    expect(getTireMileage(vehicle(), summer)).toBe(2_500);
    expect(
      getTireMileage(
        vehicle({ tireChangeEvents: [mount("future-odometer", 16_000)] }),
        summer,
      ),
    ).toBe(2_500);
  });

  it.each([
    -100,
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ])(
    "retains known tire mileage when the legacy mount odometer is %s",
    (carMileage) => {
      const car = vehicle({
        tireChangeEvents: [mount("invalid-legacy-mount", carMileage)],
      });
      expect(getTireMileage(car, summer)).toBe(2_500);
    },
  );

  it("does not count another tire's mounts or unmount events as a distance baseline", () => {
    const car = vehicle({
      tireChangeEvents: [
        mount("summer-mount", 10_000),
        mount("other-mount", 14_000, { tireId: "winter" }),
        mount("unmount", 14_500, { changeType: "unmount" }),
      ],
    });
    expect(getTireMileage(car, summer)).toBe(7_500);
  });
});

describe("seasonal advisory dates", () => {
  it.each([
    ["2024-01-01T12:00:00Z", "2024-03-31"],
    ["2025-01-01T12:00:00Z", "2025-04-20"],
    ["2026-01-01T12:00:00Z", "2026-04-05"],
    ["2027-01-01T12:00:00Z", "2027-03-28"],
    ["2038-01-01T12:00:00Z", "2038-04-25"],
  ])("returns the Easter date for winter tires in %s", (now, expected) => {
    expect(calculateNextTireChangeDate("winter", new Date(now))).toEqual({
      date: expected,
      type: "winter-to-summer",
    });
  });

  it("keeps missed winter-to-summer changes overdue through September", () => {
    for (const now of [
      "2026-04-06T12:00:00Z",
      "2026-07-01T12:00:00Z",
      "2026-09-30T21:59:59Z",
    ]) {
      const date = new Date(now);
      const advisory = calculateNextTireChangeDate("winter", date);
      expect(advisory?.date).toBe("2026-04-05");
      expect(getMaintenanceStatus(advisory?.date ?? null, date)).toBe(
        "overdue",
      );
    }
  });

  it("changes to next year's Easter exactly at German October midnight", () => {
    expect(
      calculateNextTireChangeDate("winter", new Date("2026-09-30T22:00:00Z")),
    )?.toEqual({ date: "2027-03-28", type: "winter-to-summer" });
    expect(
      calculateNextTireChangeDate("winter", new Date("2026-12-31T23:00:00Z")),
    )?.toEqual({ date: "2027-03-28", type: "winter-to-summer" });
  });

  it("keeps summer tires overdue over New Year until Easter", () => {
    for (const now of [
      "2026-10-02T12:00:00Z",
      "2026-12-31T23:00:00Z",
      "2027-03-27T12:00:00Z",
    ]) {
      const date = new Date(now);
      const advisory = calculateNextTireChangeDate("summer", date);
      expect(advisory?.date).toBe("2026-10-01");
      expect(getMaintenanceStatus(advisory?.date ?? null, date)).toBe(
        "overdue",
      );
    }
    expect(
      calculateNextTireChangeDate("summer", new Date("2027-03-27T23:00:00Z")),
    )?.toEqual({ date: "2027-10-01", type: "summer-to-winter" });
  });

  it("keeps due-day changes upcoming and skips all-season or missing tires", () => {
    const easter = new Date("2026-04-05T12:00:00Z");
    const october = new Date("2026-10-01T12:00:00Z");
    expect(
      getMaintenanceStatus(
        calculateNextTireChangeDate("winter", easter)?.date ?? null,
        easter,
      ),
    ).toBe("upcoming");
    expect(
      getMaintenanceStatus(
        calculateNextTireChangeDate("summer", october)?.date ?? null,
        october,
      ),
    ).toBe("upcoming");
    expect(calculateNextTireChangeDate("all-season", easter)).toBeNull();
    expect(calculateNextTireChangeDate(null, easter)).toBeNull();
  });
});
