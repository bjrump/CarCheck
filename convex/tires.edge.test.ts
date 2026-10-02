import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { getTireMileage } from "../app/lib/utils";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function fixture(mileage = 10_000) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "issuer|tire-audit-owner" });
  const carId = await owner.mutation(api.cars.create, {
    make: "VW",
    model: "Golf",
    year: 2020,
    mileage,
    insurance: null,
  });
  const added = await owner.mutation(api.cars.addTire, {
    carId,
    type: "summer",
    currentMileage: 2_000,
  });
  const withWinter = await owner.mutation(api.cars.addTire, {
    carId,
    type: "winter",
    currentMileage: 500,
  });
  return {
    t,
    owner,
    carId,
    summer: added.tires[0],
    winter: withWinter.tires[1],
  };
}

describe("tire odometer command sequences", () => {
  it.each(["manual", "fuel"] as const)(
    "rejects a %s odometer advance that would overflow a mounted tire's accumulated mileage",
    async (method) => {
      const { owner, carId } = await fixture(0);
      const added = await owner.mutation(api.cars.addTire, {
        carId,
        type: "all-season",
        currentMileage: Number.MAX_SAFE_INTEGER,
      });
      const tire = added.tires.at(-1);
      if (!tire) throw new Error("Expected the added tire");
      const before = await owner.mutation(api.cars.changeTires, {
        carId,
        tireId: tire.id,
        mileage: 0,
        date: "2026-01-01",
      });
      expect(getTireMileage(before, tire)).toBe(Number.MAX_SAFE_INTEGER);
      const advance =
        method === "manual"
          ? owner.mutation(api.cars.update, { id: carId, mileage: 1 })
          : owner.mutation(api.cars.saveFuelEntry, {
              carId,
              date: "2026-01-02",
              mileage: 1,
              liters: 40,
            });
      await expect(advance).rejects.toThrow("Reifenlaufleistung");
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
      const detached = await owner.mutation(api.cars.changeTires, {
        carId,
        tireId: null,
        mileage: 0,
        date: "2026-01-02",
      });
      expect(detached.currentTireId).toBeNull();
      expect(detached.tires.at(-1)?.currentMileage).toBe(
        Number.MAX_SAFE_INTEGER,
      );
    },
  );

  it("conserves exactly 1,900 km of travel across fuel/manual updates, same-day swaps and remounts", async () => {
    const { owner, carId, summer, winter } = await fixture();
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-01",
    });
    const fuel = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-01",
      mileage: 10_600,
      liters: 40,
    });
    expect(getTireMileage(fuel, fuel.tires[0])).toBe(2_600);
    const swapped = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: winter.id,
      mileage: 10_700,
      date: "2026-01-01",
    });
    expect(swapped.tires[0].currentMileage).toBe(2_700);
    const driven = await owner.mutation(api.cars.update, {
      id: carId,
      mileage: 11_200,
    });
    expect(getTireMileage(driven, driven.tires[1])).toBe(1_000);
    const remounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 11_300,
      date: "2026-01-01",
    });
    expect(remounted.tires[1].currentMileage).toBe(1_100);
    const sameMileageSwap = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: winter.id,
      mileage: 11_300,
      date: "2026-01-01",
    });
    expect(sameMileageSwap.tires[0].currentMileage).toBe(2_700);
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 11_600,
      date: "2026-01-02",
    });
    const unmounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: null,
      mileage: 11_900,
      date: "2026-01-03",
    });
    expect(unmounted.tires.map((tire) => tire.currentMileage)).toEqual([
      3_000, 1_400,
    ]);
    expect(3_000 - 2_000 + (1_400 - 500)).toBe(11_900 - 10_000);
    expect(unmounted.tireChangeEvents.at(-1)).toMatchObject({
      tireId: summer.id,
      tireMileage: 3_000,
      carMileage: 11_900,
      changeType: "unmount",
    });
    const archived = await owner.mutation(api.cars.setTireArchived, {
      carId,
      tireId: summer.id,
      archived: true,
    });
    expect(archived.tires[0].currentMileage).toBe(3_000);
    await owner.mutation(api.cars.setTireArchived, {
      carId,
      tireId: summer.id,
      archived: false,
    });
    const restored = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 12_500,
      date: "2026-01-04",
    });
    // Driving with no mounted set never becomes tire mileage.
    expect(getTireMileage(restored, restored.tires[0])).toBe(3_000);
  });

  it("leaves the odometer and tire distance unchanged after deleting or correcting historical fuel", async () => {
    const { owner, carId, summer } = await fixture();
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-01",
    });
    const fueled = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-02",
      mileage: 10_800,
      liters: 40,
    });
    const entryId = fueled.fuelEntries?.[0].id;
    if (!entryId) throw new Error("Expected a saved filling");
    const corrected = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      entryId,
      date: "2026-01-02",
      mileage: 10_500,
      liters: 40,
    });
    expect(corrected.mileage).toBe(10_800);
    expect(getTireMileage(corrected, corrected.tires[0])).toBe(2_800);
    const removed = await owner.mutation(api.cars.removeFuelEntry, {
      carId,
      entryId,
    });
    expect(removed.mileage).toBe(10_800);
    expect(getTireMileage(removed, removed.tires[0])).toBe(2_800);
    const unchanged = await owner.mutation(api.cars.update, {
      id: carId,
      mileage: 10_800,
    });
    expect(unchanged.eventLog).toEqual(removed.eventLog);
  });

  it("rejects a past fuel odometer above a later tire mount without crediting fictitious tire distance", async () => {
    const { owner, carId, summer } = await fixture();
    const before = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-10",
    });
    // A Jan 1 reading of 12,000 km contradicts Jan 10's 10,000 km reading.
    await expect(
      owner.mutation(api.cars.saveFuelEntry, {
        carId,
        date: "2026-01-01",
        mileage: 12_000,
        liters: 40,
      }),
    ).rejects.toThrow();
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });

  it("rejects a later fuel stop below an earlier tire odometer", async () => {
    const { owner, carId, summer } = await fixture();
    const before = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-10",
    });
    await expect(
      owner.mutation(api.cars.saveFuelEntry, {
        carId,
        date: "2026-01-20",
        mileage: 9_000,
        liters: 40,
      }),
    ).rejects.toThrow();
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });

  it("rejects a backdated tire mount above the odometer of a later fuel stop", async () => {
    const { owner, carId, summer } = await fixture();
    const before = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-10",
      mileage: 12_000,
      liters: 40,
    });
    await expect(
      owner.mutation(api.cars.changeTires, {
        carId,
        tireId: summer.id,
        mileage: 13_000,
        date: "2026-01-01",
      }),
    ).rejects.toThrow();
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });

  it("checks fuel readings against dated inspection mileage in both directions", async () => {
    const { owner, carId } = await fixture();
    const before = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-10",
      mileage: 9_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    for (const point of [
      { date: "2026-01-01", mileage: 9_500 },
      { date: "2026-01-20", mileage: 8_500 },
    ]) {
      await expect(
        owner.mutation(api.cars.saveFuelEntry, {
          carId,
          liters: 40,
          ...point,
        }),
      ).rejects.toThrow();
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    }
  });

  it("checks new inspection readings against fuel dates in both directions", async () => {
    const { owner, carId } = await fixture();
    const before = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-10",
      mileage: 8_500,
      liters: 40,
    });
    for (const point of [
      { date: "2026-01-01", mileage: 9_000 },
      { date: "2026-01-20", mileage: 8_000 },
    ]) {
      await expect(
        owner.mutation(api.cars.saveInspection, {
          carId,
          intervalYears: 1,
          intervalKm: 15_000,
          ...point,
        }),
      ).rejects.toThrow();
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    }
  });

  it("rechecks a fuel reading when its date is repositioned across a tire mount", async () => {
    const { owner, carId, summer } = await fixture();
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-10",
    });
    const before = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-20",
      mileage: 12_000,
      liters: 40,
    });
    const entryId = before.fuelEntries?.[0].id;
    if (!entryId) throw new Error("Expected a saved filling");
    await expect(
      owner.mutation(api.cars.saveFuelEntry, {
        carId,
        entryId,
        date: "2026-01-01",
        mileage: 12_000,
        liters: 40,
      }),
    ).rejects.toThrow();
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });

  it("allows different readings on the same calendar date when intraday order is unknown", async () => {
    const { owner, carId, summer } = await fixture();
    await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-10",
      mileage: 9_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-10",
      mileage: 8_000,
      liters: 40,
    });
    const mounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-10",
    });
    expect(mounted.mileage).toBe(10_000);
    const fueled = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-10",
      mileage: 10_500,
      liters: 40,
    });
    expect(getTireMileage(fueled, fueled.tires[0])).toBe(2_500);
  });

  it("preserves unchanged legacy fuel readings even if they contradict later tire history", async () => {
    const { t, owner, carId, summer } = await fixture();
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-10",
    });
    await t.run(async (ctx) =>
      ctx.db.patch(carId, {
        fuelEntries: [
          { id: "legacy", date: "2026-01-01", mileage: 12_000, liters: 40 },
        ],
      }),
    );
    const edited = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      entryId: "legacy",
      date: "2026-01-01",
      mileage: 12_000,
      liters: 40,
      notes: "Beleg ergänzt",
    });
    expect(edited.fuelEntries?.[0]).toMatchObject({
      notes: "Beleg ergänzt",
      mileage: 12_000,
    });
    expect(edited.mileage).toBe(10_000);
    expect(getTireMileage(edited, edited.tires[0])).toBe(2_000);
  });

  it("rejects unsafe source totals atomically while allowing the largest exact integer", async () => {
    const { t, owner, carId, summer } = await fixture(0);
    await t.run(async (ctx) => {
      const car = await ctx.db.get(carId);
      if (!car) throw new Error("Expected vehicle");
      await ctx.db.patch(carId, {
        tires: car.tires.map((tire) =>
          tire.id === summer.id
            ? { ...tire, currentMileage: Number.MAX_SAFE_INTEGER - 2 }
            : tire,
        ),
      });
    });
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 0,
      date: "2026-01-01",
    });
    const before = await owner.query(api.cars.getById, { id: carId });
    await expect(
      owner.mutation(api.cars.changeTires, {
        carId,
        tireId: null,
        mileage: 3,
        date: "2026-01-02",
      }),
    ).rejects.toThrow("Reifenlaufleistung");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
    const exact = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: null,
      mileage: 2,
      date: "2026-01-02",
    });
    expect(exact.tires[0].currentMileage).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("rejects invalid newly entered tire mileage and odometer values before writing", async () => {
    const { owner, carId, summer } = await fixture();
    const before = await owner.query(api.cars.getById, { id: carId });
    for (const invalid of [
      -1,
      0.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      await expect(
        owner.mutation(api.cars.addTire, {
          carId,
          type: "all-season",
          currentMileage: invalid,
        }),
      ).rejects.toThrow("Reifenlaufleistung");
      await expect(
        owner.mutation(api.cars.changeTires, {
          carId,
          tireId: summer.id,
          date: "2026-01-01",
          mileage: invalid,
        }),
      ).rejects.toThrow("Kilometerstand");
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    }
  });

  it("rejects missing mounted tires and permits detaching a legacy archived mounted set", async () => {
    const { t, owner, carId, summer, winter } = await fixture();
    await t.run(async (ctx) =>
      ctx.db.patch(carId, { currentTireId: "missing" }),
    );
    const before = await owner.query(api.cars.getById, { id: carId });
    await expect(
      owner.mutation(api.cars.changeTires, {
        carId,
        tireId: winter.id,
        date: "2026-01-01",
        mileage: 10_000,
      }),
    ).rejects.toThrow("montierte Reifensatz");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
    await t.run(async (ctx) => {
      const car = await ctx.db.get(carId);
      if (!car) throw new Error("Expected vehicle");
      await ctx.db.patch(carId, {
        currentTireId: summer.id,
        tires: car.tires.map((tire) =>
          tire.id === summer.id ? { ...tire, archived: true } : tire,
        ),
      });
    });
    const detached = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: null,
      date: "2026-01-01",
      mileage: 10_000,
    });
    expect(detached.currentTireId).toBeNull();
    expect(detached.tires[0]).toMatchObject({
      archived: true,
      currentMileage: 2_000,
    });
  });

  it("uses Berlin dates for old timestamps and rejects a change before the latest valid event", async () => {
    const { t, owner, carId, summer, winter } = await fixture();
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-01",
    });
    await t.run(async (ctx) => {
      const car = await ctx.db.get(carId);
      if (!car) throw new Error("Expected vehicle");
      await ctx.db.patch(carId, {
        tireChangeEvents: car.tireChangeEvents.map((change) => ({
          ...change,
          date: "2026-01-01T23:00:00Z",
        })),
      });
    });
    const before = await owner.query(api.cars.getById, { id: carId });
    await expect(
      owner.mutation(api.cars.changeTires, {
        carId,
        tireId: winter.id,
        mileage: 10_100,
        date: "2026-01-01",
      }),
    ).rejects.toThrow("Datum");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
    const changed = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: winter.id,
      mileage: 10_100,
      date: "2026-01-02",
    });
    expect(changed.tires[0].currentMileage).toBe(2_100);
  });
});
