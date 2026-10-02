import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getInspectionState } from "../app/lib/utils";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function fixture(mileage = 50_000) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "issuer|maintenance-edge-owner" });
  const carId = await owner.mutation(api.cars.create, {
    make: "VW",
    model: "Golf",
    year: 2020,
    mileage,
    insurance: null,
  });
  return { t, owner, carId };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("completed records use the German calendar day", () => {
  it.each([
    ["2026-03-28T23:30:00Z", "2026-03-29", "2026-03-30"],
    ["2026-03-29T22:30:00Z", "2026-03-30", "2026-03-31"],
    ["2026-10-25T23:30:00Z", "2026-10-26", "2026-10-27"],
    ["2026-12-31T23:30:00Z", "2027-01-01", "2027-01-02"],
  ])("accepts Berlin today and rejects tomorrow at %s", async (instant, today, tomorrow) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
    const { owner, carId } = await fixture();
    const tuv = await owner.mutation(api.cars.saveTuv, { carId, date: today });
    expect(tuv.tuv.lastAppointmentDate).toBe(today);
    const inspected = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: today,
      mileage: 50_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    expect(inspected.inspection.lastInspectionDate).toBe(today);
    await expect(
      owner.mutation(api.cars.saveTuv, { carId, date: tomorrow }),
    ).rejects.toThrow("Zukunft");
    await expect(
      owner.mutation(api.cars.saveInspection, {
        carId,
        date: tomorrow,
        mileage: 50_000,
        intervalYears: 1,
        intervalKm: 15_000,
      }),
    ).rejects.toThrow("Zukunft");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(inspected);
  });

  it("accepts a future insurance expiry independently of completed-service dates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T23:30:00Z"));
    const { owner, carId } = await fixture();
    const updated = await owner.mutation(api.cars.update, {
      id: carId,
      insurance: {
        provider: " Beispiel Versicherung ",
        policyNumber: " P-123 ",
        expiryDate: "2028-02-29",
      },
    });
    expect(updated.insurance).toEqual({
      provider: "Beispiel Versicherung",
      policyNumber: "P-123",
      expiryDate: "2028-02-29",
    });
    await expect(
      owner.mutation(api.cars.update, {
        id: carId,
        insurance: {
          provider: "Beispiel Versicherung",
          policyNumber: "P-123",
          expiryDate: "2027-02-29",
        },
      }),
    ).rejects.toThrow("Datum");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(updated);
  });

  it("uses the Berlin year for the maximum accepted model year at New Year", async () => {
    // Convex's runtime is UTC; Germany has already entered 2028 at this instant.
    vi.stubEnv("TZ", "UTC");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-12-31T23:30:00Z"));
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "issuer|maintenance-edge-owner" });
    await expect(
      owner.mutation(api.cars.create, {
        make: "VW",
        model: "Golf",
        year: 2029,
        mileage: 0,
        insurance: null,
      }),
    ).resolves.toBeTypeOf("string");
  });
});

describe("inspection numeric boundaries are atomic", () => {
  it("accepts both supported year limits and the smallest mileage interval", async () => {
    const { owner, carId } = await fixture();
    const annual = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2024-02-29",
      mileage: 50_000,
      intervalYears: 1,
      intervalKm: 1,
    });
    expect(annual.inspection.nextInspectionDateByYear).toBe("2025-02-28");
    const decade = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2024-02-29",
      mileage: 50_000,
      intervalYears: 10,
      intervalKm: Number.MAX_SAFE_INTEGER,
    });
    expect(decade.inspection.nextInspectionDateByYear).toBe("2034-02-28");
    expect(decade.inspection.intervalKm).toBe(Number.MAX_SAFE_INTEGER);
    expect(decade.mileage).toBe(50_000);
  });

  it("does not lose a kilometre when a valid large odometer meets a small interval", async () => {
    const { owner, carId } = await fixture(Number.MAX_SAFE_INTEGER);
    const inspected = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-01",
      mileage: Number.MAX_SAFE_INTEGER,
      intervalYears: 1,
      intervalKm: 2,
    });
    expect(
      getInspectionState(inspected, new Date("2026-01-01T12:00:00Z")).remainingKm,
    ).toBe(2);
  });

  it.each([
    { intervalYears: Number.NaN },
    { intervalYears: Number.POSITIVE_INFINITY },
    { intervalYears: Number.NEGATIVE_INFINITY },
    { intervalYears: -1 },
    { intervalYears: Number.MAX_SAFE_INTEGER },
    { intervalKm: Number.POSITIVE_INFINITY },
    { intervalKm: Number.NEGATIVE_INFINITY },
    { intervalKm: -1 },
    { intervalKm: Number.MAX_SAFE_INTEGER + 1 },
    { mileage: Number.POSITIVE_INFINITY },
    { mileage: Number.NaN },
    { mileage: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects unsupported service input %j without a partial write", async (invalid) => {
    const { owner, carId } = await fixture();
    const before = await owner.query(api.cars.getById, { id: carId });
    await expect(
      owner.mutation(api.cars.saveInspection, {
        carId,
        date: "2026-01-01",
        mileage: 40_000,
        intervalYears: 1,
        intervalKm: 15_000,
        ...invalid,
      }),
    ).rejects.toThrow();
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });
});

describe("legacy readings and cross-record validation", () => {
  it("allows a new fuel reading after an unrelated historical fuel rollback", async () => {
    const { t, owner, carId } = await fixture(10_000);
    await t.run((ctx) => ctx.db.patch(carId, {
      fuelEntries: [
        { id: "legacy-high", date: "2026-01-01", mileage: 5000, liters: 20 },
        { id: "legacy-rollback", date: "2026-01-03", mileage: 1000, liters: 10 },
      ],
    }));

    const saved = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-05",
      mileage: 3000,
      liters: 30,
    });
    expect(saved.fuelEntries?.map(({ mileage }) => mileage)).toEqual([
      5000, 1000, 3000,
    ]);
    expect(saved.fuelEntries?.at(-1)).not.toHaveProperty("consumption");
    expect(saved.mileage).toBe(10_000);
  });
});
