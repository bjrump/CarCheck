import { describe, expect, it } from "vitest";
import type { FuelEntry } from "./types";
import { getFuelSummary, recalculateFuelEntries, roundCurrency } from "./utils";

function fill(
  id: string,
  mileage: number,
  liters: number,
  pricing: Pick<FuelEntry, "pricePerLiter" | "totalCost"> = {},
): FuelEntry {
  return { id, date: "2026-01-01", mileage, liters, ...pricing };
}

describe("fuel arithmetic edge cases", () => {
  it.each([1e21, Number.MAX_VALUE])("avoids cent conversion overflow when rounding %s", (value) => {
    expect(roundCurrency(value)).toBe(value);
  });
  it("rounds decimal pump quantities and prices against an integer decimal oracle", () => {
    // Milliliters × thousandths of a euro have 1/1,000,000 euro precision.
    const samples = [
      [100, 350],
      [1, 1999],
      [1000, 1005],
      [42500, 1799],
      [50123, 1789],
      [33333, 1505],
      [99999, 2001],
      [123456, 9999],
    ];
    for (const [milliliters, milliEuro] of samples) {
      const cents =
        (BigInt(milliliters) * BigInt(milliEuro) + BigInt(5000)) / BigInt(10000);
      const expected = Number(cents) / 100;
      const entries = recalculateFuelEntries([
        fill("receipt", 1000, milliliters / 1000, {
          pricePerLiter: milliEuro / 1000,
        }),
      ]);
      expect(entries[0].totalCost).toBe(expected);
    }
    expect(roundCurrency(1.005)).toBe(1.01);
    expect(roundCurrency(2.675)).toBe(2.68);
  });

  it("matches an exact decimal oracle for 10,000 reproducible pump receipts", () => {
    let seed = 12345;
    for (let sample = 0; sample < 10000; sample++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const milliliters = 1 + (seed % 1000000);
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const milliEuro = seed % 10000;
      const cents =
        (BigInt(milliliters) * BigInt(milliEuro) + BigInt(5000)) / BigInt(10000);
      const calculated = recalculateFuelEntries([
        fill(String(sample), 1000, milliliters / 1000, {
          pricePerLiter: milliEuro / 1000,
        }),
      ]);
      expect(
        calculated[0].totalCost,
        `${milliliters / 1000} l × ${milliEuro / 1000} €/l`,
      ).toBe(Number(cents) / 100);
    }
  });

  it("weights consumption by distance, excluding the first filling's liters", () => {
    const summary = getFuelSummary([
      fill("last", 12000, 90, { pricePerLiter: 1.5 }),
      fill("baseline", 10000, 50, { pricePerLiter: 2 }),
      fill("short-trip", 10200, 20, { pricePerLiter: 2 }),
    ]);
    expect(summary.totalLiters).toBe(160);
    expect(summary.totalCost).toBe(275);
    expect(summary.averagePrice).toBeCloseTo(1.71875);
    expect(summary.totalKm).toBe(2000);
    expect(summary.entries[1].consumption).toBe(10);
    expect(summary.entries[2].consumption).toBe(5);
    expect(summary.averageConsumption).toBe(5.5);
  });

  it("keeps unknown receipts out of the weighted price denominator and includes free fuel", () => {
    const summary = getFuelSummary([
      fill("paid", 1000, 20, { totalCost: 30 }),
      fill("unknown", 1500, 10),
      fill("free", 2000, 40, { pricePerLiter: 0 }),
    ]);
    expect(summary.totalLiters).toBe(70);
    expect(summary.totalCost).toBe(30);
    expect(summary.averagePrice).toBe(0.5);
    expect(summary.totalKm).toBe(1000);
    expect(summary.averageConsumption).toBe(5);
  });

  it("preserves fractional legacy intervals and independently recomputes changed neighbors", () => {
    const entries = [
      fill("baseline", 1000.5, 30),
      fill("middle", 1500, 25),
      fill("last", 2500, 50),
    ];
    const original = getFuelSummary(entries);
    expect(original.totalKm).toBe(1499.5);
    expect(original.averageConsumption).toBeCloseTo(7500 / 1499.5);
    const changed = getFuelSummary([
      entries[0],
      { ...entries[1], mileage: 1750, liters: 30 },
      entries[2],
    ]);
    expect(changed.entries[1].kmDriven).toBe(749.5);
    expect(changed.entries[1].consumption).toBeCloseTo(3000 / 749.5);
    expect(changed.entries[2].kmDriven).toBe(750);
    expect(changed.entries[2].consumption).toBeCloseTo(20 / 3);
    expect(changed.averageConsumption).toBeCloseTo(8000 / 1499.5);
    const removed = getFuelSummary([entries[0], entries[2]]);
    expect(removed.totalKm).toBe(1499.5);
    expect(removed.averageConsumption).toBeCloseTo(5000 / 1499.5);
  });

  it("is pure and idempotent even with stale derived fields and same-mileage fills", () => {
    const entries = [
      Object.freeze({ ...fill("later", 1500, 25), kmDriven: 123, consumption: 99 }),
      Object.freeze(fill("baseline", 1000, 40)),
      Object.freeze(fill("zero-distance", 1000, 10)),
    ];
    Object.freeze(entries);
    const calculated = recalculateFuelEntries(entries);
    expect(calculated.map((entry) => entry.id)).toEqual([
      "baseline",
      "zero-distance",
      "later",
    ]);
    expect(calculated[1]).not.toHaveProperty("consumption");
    expect(calculated[2]).toMatchObject({ kmDriven: 500, consumption: 5 });
    expect(recalculateFuelEntries(calculated)).toEqual(calculated);
    expect(entries[0].consumption).toBe(99);
  });

  it("does not use an invalid legacy quantity's receipt to inflate average price", () => {
    const summary = getFuelSummary([
      fill("legacy-zero", 1000, 0, { totalCost: 10 }),
      fill("valid", 1500, 10, { totalCost: 20 }),
    ]);
    expect(summary.totalCost).toBe(30);
    expect(summary.totalLiters).toBe(10);
    expect(summary.averagePrice).toBe(2);
  });

  it("does not derive or display nonfinite consumption from extreme legacy quantities", () => {
    const summary = getFuelSummary([
      fill("baseline", 1000, 10),
      fill("overflow", 1001, Number.MAX_VALUE),
    ]);
    expect(summary.entries[1]).not.toHaveProperty("consumption");
    expect(summary.totalLiters).toBe(10);
    expect(summary.averageConsumption).toBeNull();
  });

  it("does not add a cent to an exactly integral large monetary amount", () => {
    // These integer cent values remain below Number.MAX_SAFE_INTEGER.
    expect(roundCurrency(25_000_000_000_000)).toBe(25_000_000_000_000);
    expect(roundCurrency(40_000_000_000_000)).toBe(40_000_000_000_000);
  });

  it.each([
    [20_000_000_000_000.01, 20_000_000_000_000.01],
    [40_000_000_000_000.016, 40_000_000_000_000.02],
  ])("does not shift the large fractional-cent amount %s into the next cent", (input, expected) => {
    expect(roundCurrency(input)).toBe(expected);
  });

  it("does not derive a receipt cost from invalid legacy quantities", () => {
    const calculated = recalculateFuelEntries([
      fill("negative", 1000, -10, { pricePerLiter: 2 }),
    ]);
    expect(calculated[0]).not.toHaveProperty("totalCost");
  });

  it("does not use a negative legacy odometer as a consumption baseline", () => {
    const summary = getFuelSummary([
      fill("invalid-baseline", -1000, 10),
      fill("valid", 1000, 10),
    ]);
    expect(summary.entries[1]).not.toHaveProperty("consumption");
    expect(summary.totalKm).toBe(0);
    expect(summary.averageConsumption).toBeNull();
  });

  it("resumes known intervals only after a plausible baseline follows a legacy rollback", () => {
    const summary = getFuelSummary([
      { ...fill("baseline", 10000, 40), date: "2026-01-01" },
      { ...fill("rollback", 9000, 50), date: "2026-01-02" },
      { ...fill("recovery-baseline", 11000, 60), date: "2026-01-03" },
      { ...fill("recovered", 12000, 70), date: "2026-01-04" },
    ]);
    expect(summary.entries[1]).not.toHaveProperty("kmDriven");
    expect(summary.entries[2]).not.toHaveProperty("kmDriven");
    expect(summary.entries[3].kmDriven).toBe(1000);
    expect(summary.entries[3].consumption).toBeCloseTo(7, 12);
    expect(summary.totalKm).toBe(1000);
    expect(summary.averageConsumption).toBeCloseTo(7, 12);
    expect(summary.totalLiters).toBe(220);
  });

  it("does not turn an invalid legacy calendar date into an interval baseline", () => {
    const summary = getFuelSummary([
      { ...fill("invalid-date", 1000, 40), date: "2026-02-30" },
      { ...fill("valid", 1500, 50), date: "2026-03-01" },
    ]);
    expect(summary.entries.every((entry) => entry.kmDriven === undefined)).toBe(
      true,
    );
    expect(summary.totalKm).toBe(0);
    expect(summary.averageConsumption).toBeNull();
    expect(summary.totalLiters).toBe(90);
  });

  it("keeps subnormal positive legacy quantities finite when the ratio is representable", () => {
    const summary = getFuelSummary([
      fill("baseline", 0, 1),
      fill("tiny-distance", Number.MIN_VALUE, Number.MIN_VALUE),
      fill("tiny-quantity", 1, Number.MIN_VALUE),
    ]);
    expect(summary.entries[1]).toMatchObject({
      kmDriven: Number.MIN_VALUE,
      consumption: 100,
    });
    expect(summary.entries[2].consumption).toBe(Number.MIN_VALUE * 100);
    expect(summary.averageConsumption).not.toBe(Number.POSITIVE_INFINITY);
    expect(Number.isFinite(summary.averageConsumption)).toBe(true);
  });

  it("does not expose infinite consumption when a tiny positive legacy distance overflows the ratio", () => {
    const summary = getFuelSummary([
      fill("baseline", 0, 1),
      fill("overflow", Number.MIN_VALUE, 1),
    ]);
    expect(summary.entries[1]).not.toHaveProperty("consumption");
    expect(summary.averageConsumption).toBeNull();
  });
});
