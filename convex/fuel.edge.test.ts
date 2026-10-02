import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { getFuelSummary } from "../app/lib/utils";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "issuer|fuel-edge-owner" });
  const carId = await owner.mutation(api.cars.create, {
    make: "Toyota",
    model: "Yaris",
    year: 2020,
    mileage: 10000,
    insurance: null,
  });
  return { t, owner, carId };
}

describe("fuel input and persisted arithmetic edge cases", () => {
  it("keeps receipt rounding, same-day reordering and chronological insertion consistent", async () => {
    const { owner, carId } = await fixture();
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-02",
      mileage: 10000,
      liters: 42.5,
      pricePerLiter: 1.799,
    });
    const inserted = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-02",
      mileage: 9500,
      liters: 30,
      totalCost: 54,
    });
    expect(inserted.mileage).toBe(10000);
    expect(inserted.fuelEntries?.map((entry) => entry.mileage)).toEqual([9500, 10000]);
    expect(inserted.fuelEntries?.[1]).toMatchObject({
      totalCost: 76.46,
      kmDriven: 500,
      consumption: 8.5,
    });
    const later = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-03",
      mileage: 10500,
      liters: 25,
      pricePerLiter: 1.999,
      totalCost: 49.97,
    });
    expect(later.mileage).toBe(10500);
    const summary = getFuelSummary(later.fuelEntries ?? []);
    expect(summary.totalLiters).toBe(97.5);
    expect(summary.totalCost).toBeCloseTo(180.43);
    expect(summary.averagePrice).toBeCloseTo(180.43 / 97.5);
    expect(summary.totalKm).toBe(1000);
    expect(summary.averageConsumption).toBe(6.75);
    const firstId = later.fuelEntries?.[0].id;
    if (!firstId) throw new Error("Expected first entry");
    const removed = await owner.mutation(api.cars.removeFuelEntry, {
      carId,
      entryId: firstId,
    });
    expect(removed.mileage).toBe(10500);
    expect(removed.fuelEntries?.[0]).not.toHaveProperty("consumption");
    expect(getFuelSummary(removed.fuelEntries ?? []).averageConsumption).toBe(5);
  });

  it("rejects every nonfinite/unsafe mileage and monetary input atomically", async () => {
    const { owner, carId } = await fixture();
    const before = await owner.query(api.cars.getById, { id: carId });
    const base = { carId, date: "2026-01-01", mileage: 10000, liters: 42.5 };
    for (const input of [
      { mileage: Number.MAX_SAFE_INTEGER + 1 },
      { mileage: Number.NaN },
      { mileage: Number.POSITIVE_INFINITY },
      { mileage: Number.NEGATIVE_INFINITY },
      { liters: Number.NEGATIVE_INFINITY },
      { pricePerLiter: Number.POSITIVE_INFINITY },
      { pricePerLiter: Number.NEGATIVE_INFINITY },
      { totalCost: Number.NaN },
      { totalCost: Number.POSITIVE_INFINITY },
      { totalCost: Number.NEGATIVE_INFINITY },
      { totalCost: Number.MAX_SAFE_INTEGER },
      { pricePerLiter: Number.MAX_VALUE },
    ]) {
      await expect(owner.mutation(api.cars.saveFuelEntry, { ...base, ...input })).rejects.toThrow();
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
    }
  });

  it("accepts a zero odometer and free fuel without treating either as missing", async () => {
    const { owner, carId } = await fixture();
    const added = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-01",
      mileage: 0,
      liters: 0.001,
      pricePerLiter: 0,
      totalCost: 0,
    });
    expect(added.fuelEntries?.[0]).toMatchObject({ mileage: 0, totalCost: 0 });
    expect(added.mileage).toBe(10000);
    expect(getFuelSummary(added.fuelEntries ?? []).averagePrice).toBe(0);
  });

  it("rejects finite quantities that overflow persisted consumption before writing", async () => {
    const { owner, carId } = await fixture();
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-01",
      mileage: 10000,
      liters: 40,
    });
    const before = await owner.query(api.cars.getById, { id: carId });
    await expect(
      owner.mutation(api.cars.saveFuelEntry, {
        carId,
        date: "2026-01-02",
        mileage: 10001,
        liters: Number.MAX_VALUE,
      }),
    ).rejects.toThrow();
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });
});
