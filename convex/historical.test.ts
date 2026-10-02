import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { getInspectionState, getTireMileage } from "../app/lib/utils";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("retained inspection readings", () => {
  it("can re-add a corrected-away service and enforces its re-established historical reading", async () => {
    const { owner, carId } = await fixture(20_000);
    const original = {
      carId,
      date: "2026-01-10",
      mileage: 10_000,
      intervalYears: 1,
      intervalKm: 15_000,
    };
    await owner.mutation(api.cars.saveInspection, original);
    await owner.mutation(api.cars.saveInspection, {
      ...original,
      date: "2026-01-20",
      mileage: 12_000,
      correctLast: true,
    });
    const before = await owner.mutation(api.cars.saveInspection, original);
    await expect(
      owner.mutation(api.cars.saveFuelEntry, {
        carId,
        date: "2026-01-15",
        mileage: 9_000,
        liters: 40,
      }),
    ).rejects.toThrow("Kilometerstand");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });

  it("rejects a correction that would put the current maintenance basis behind another retained service", async () => {
    const { owner, carId } = await fixture(20_000);
    await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-06-01",
      mileage: 19_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-03-01",
      mileage: 18_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    await owner.mutation(api.cars.saveTuv, { carId, date: "2026-06-01" });
    const before = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2026-03-01",
    });
    await expect(
      owner.mutation(api.cars.saveInspection, {
        carId,
        date: "2026-01-01",
        mileage: 17_000,
        intervalYears: 1,
        intervalKm: 15_000,
        correctLast: true,
      }),
    ).rejects.toThrow("Korrektur");
    await expect(
      owner.mutation(api.cars.saveTuv, {
        carId,
        date: "2026-01-01",
        correctLast: true,
      }),
    ).rejects.toThrow("Korrektur");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });

  it("carries trusted legacy snapshots forward when newer services become the latest basis", async () => {
    const { t, owner, carId } = await fixture(20_000);
    await t.run(async (ctx) => {
      const car = await ctx.db.get(carId);
      if (!car) throw new Error("Expected car");
      await ctx.db.patch(carId, {
        inspection: {
          ...car.inspection,
          lastInspectionDate: "2026-01-10",
          lastInspectionMileage: 10_000,
        },
        tuv: {
          lastAppointmentDate: "2026-01-10",
          nextAppointmentDate: "2028-01-10",
          completed: true,
        },
      });
    });
    await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-20",
      mileage: 12_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    const before = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2026-01-20",
    });
    await expect(
      owner.mutation(api.cars.saveFuelEntry, {
        carId,
        date: "2026-01-15",
        mileage: 9_000,
        liters: 40,
      }),
    ).rejects.toThrow("Kilometerstand");
    await expect(
      owner.mutation(api.cars.saveTuv, {
        carId,
        date: "2026-01-05",
        correctLast: true,
      }),
    ).rejects.toThrow("Korrektur");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });

  it("keeps historical service mileage in subsequent fuel and tire chronology validation", async () => {
    const { owner, carId, summer } = await fixture(20_000);
    await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-07-01",
      mileage: 19_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    const before = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-01",
      mileage: 10_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    await expect(
      owner.mutation(api.cars.saveFuelEntry, {
        carId,
        date: "2026-03-01",
        mileage: 9_000,
        liters: 40,
      }),
    ).rejects.toThrow("Kilometerstand");
    await expect(
      owner.mutation(api.cars.changeTires, {
        carId,
        date: "2026-03-01",
        mileage: 9_000,
        tireId: summer.id,
      }),
    ).rejects.toThrow("Kilometerstand");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
    const repeated = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-01",
      mileage: 10_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    expect(repeated).toEqual(before);
  });

  it("retains earlier completed readings but removes the replaced reading when correcting the last service", async () => {
    const { owner, carId } = await fixture(20_000);
    await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-05-01",
      mileage: 15_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    const before = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-07-01",
      mileage: 19_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    await expect(
      owner.mutation(api.cars.saveInspection, {
        carId,
        date: "2026-06-01",
        mileage: 14_000,
        intervalYears: 1,
        intervalKm: 15_000,
        correctLast: true,
      }),
    ).rejects.toThrow("Kilometerstand");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
    await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-06-01",
      mileage: 16_000,
      intervalYears: 1,
      intervalKm: 15_000,
      correctLast: true,
    });
    const valid = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-08-01",
      mileage: 17_000,
      liters: 40,
    });
    expect(valid.inspection.lastInspectionMileage).toBe(16_000);
    expect(valid.fuelEntries?.at(-1)?.mileage).toBe(17_000);
  });
});

async function fixture(mileage = 12_000) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "issuer|historical-owner" });
  const carId = await owner.mutation(api.cars.create, {
    make: "VW",
    model: "Golf",
    year: 2020,
    mileage,
    insurance: null,
  });
  const first = await owner.mutation(api.cars.addTire, {
    carId,
    type: "summer",
    currentMileage: 2_000,
  });
  const second = await owner.mutation(api.cars.addTire, {
    carId,
    type: "winter",
    currentMileage: 500,
  });
  return { t, owner, carId, summer: first.tires[0], winter: second.tires[1] };
}

describe("historical tire changes preserve today's odometer", () => {
  it("mounts and unmounts the latest historical set while only crediting its mounted distance", async () => {
    const { owner, carId, summer } = await fixture();
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-20",
      mileage: 12_000,
      liters: 40,
    });
    const mounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 11_000,
      date: "2026-01-10",
    });
    expect(mounted.mileage).toBe(12_000);
    expect(mounted.currentTireId).toBe(summer.id);
    expect(mounted.tires[0].currentMileage).toBe(2_000);
    expect(getTireMileage(mounted, mounted.tires[0])).toBe(3_000);
    const unmounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: null,
      mileage: 11_500,
      date: "2026-01-15",
    });
    expect(unmounted.mileage).toBe(12_000);
    expect(unmounted.currentTireId).toBeNull();
    expect(unmounted.tires[0].currentMileage).toBe(2_500);
    expect(unmounted.tireChangeEvents.at(-1)).toMatchObject({
      carMileage: 11_500,
      tireMileage: 2_500,
      changeType: "unmount",
    });
  });

  it("moves driven distance between sets when a legitimate last switch is entered after a newer fuel stop", async () => {
    const { owner, carId, summer, winter } = await fixture(10_000);
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10_000,
      date: "2026-01-01",
    });
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-20",
      mileage: 12_000,
      liters: 40,
    });
    const switched = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: winter.id,
      mileage: 11_000,
      date: "2026-01-10",
    });
    expect(switched.mileage).toBe(12_000);
    expect(switched.tires[0].currentMileage).toBe(3_000);
    expect(switched.tires[1].currentMileage).toBe(500);
    expect(getTireMileage(switched, switched.tires[1])).toBe(1_500);
    expect(
      switched.tires[0].currentMileage -
        2_000 +
        getTireMileage(switched, switched.tires[1]) -
        500,
    ).toBe(2_000);
    expect(switched.tireChangeEvents.slice(-2)).toMatchObject([
      {
        tireId: summer.id,
        changeType: "unmount",
        carMileage: 11_000,
        tireMileage: 3_000,
      },
      {
        tireId: winter.id,
        changeType: "mount",
        carMileage: 11_000,
        tireMileage: 500,
      },
    ]);
  });

  it("keeps insertion order for same-day historical swaps and never counts a distance twice", async () => {
    const { owner, carId, summer, winter } = await fixture();
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 11_000,
      date: "2026-01-10",
    });
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: winter.id,
      mileage: 11_500,
      date: "2026-01-10",
    });
    const remounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 11_600,
      date: "2026-01-10",
    });
    expect(remounted.mileage).toBe(12_000);
    expect(remounted.currentTireId).toBe(summer.id);
    expect(remounted.tires.map((tire) => tire.currentMileage)).toEqual([
      2_500, 600,
    ]);
    expect(getTireMileage(remounted, remounted.tires[0])).toBe(2_900);
    expect(remounted.tireChangeEvents.at(-1)).toMatchObject({
      tireId: summer.id,
      changeType: "mount",
      carMileage: 11_600,
      tireMileage: 2_500,
    });
  });

  it("rejects inserting before the latest tire switch or contradicting an adjacent dated odometer atomically", async () => {
    const { owner, carId, summer, winter } = await fixture(10_000);
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
    for (const point of [
      { date: "2026-01-09", mileage: 10_500 },
      { date: "2026-01-10", mileage: 9_900 },
      { date: "2026-01-15", mileage: 9_900 },
      { date: "2026-01-15", mileage: 12_100 },
    ]) {
      await expect(
        owner.mutation(api.cars.changeTires, {
          carId,
          tireId: winter.id,
          ...point,
        }),
      ).rejects.toThrow();
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    }
  });

  it("rejects an overflowing historical target and accepts the exact largest accumulated tire distance", async () => {
    const { owner, carId } = await fixture(2_000);
    const added = await owner.mutation(api.cars.addTire, {
      carId,
      type: "all-season",
      currentMileage: Number.MAX_SAFE_INTEGER,
    });
    const overflowingTire = added.tires.at(-1);
    if (!overflowingTire) throw new Error("Expected overflow-boundary tire");
    await expect(
      owner.mutation(api.cars.changeTires, {
        carId,
        tireId: overflowingTire.id,
        date: "2026-01-01",
        mileage: 1_000,
      }),
    ).rejects.toThrow("Reifenlaufleistung");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(added);
    const withExactTire = await owner.mutation(api.cars.addTire, {
      carId,
      type: "all-season",
      currentMileage: Number.MAX_SAFE_INTEGER - 1_000,
    });
    const exactTire = withExactTire.tires.at(-1);
    if (!exactTire) throw new Error("Expected exact-boundary tire");
    const mounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: exactTire.id,
      date: "2026-01-01",
      mileage: 1_000,
    });
    expect(mounted.mileage).toBe(2_000);
    const mountedTire = mounted.tires.find((tire) => tire.id === exactTire.id);
    if (!mountedTire) throw new Error("Expected mounted tire");
    expect(getTireMileage(mounted, mountedTire)).toBe(Number.MAX_SAFE_INTEGER);
    await expect(
      owner.mutation(api.cars.update, {
        id: carId,
        mileage: 2_001,
      }),
    ).rejects.toThrow("Reifenlaufleistung");
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(mounted);
  });
});

describe("historical maintenance preserves the latest completed basis", () => {
  it("records an earlier inspection without replacing the latest mileage, intervals or deadline", async () => {
    const { owner, carId } = await fixture(50_000);
    const latest = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-07-01",
      mileage: 45_000,
      intervalYears: 2,
      intervalKm: 20_000,
    });
    const historical = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-01",
      mileage: 40_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    expect(historical.inspection).toEqual(latest.inspection);
    expect(historical.mileage).toBe(50_000);
    expect(
      getInspectionState(historical, new Date("2026-07-02T12:00:00Z"))
        .remainingKm,
    ).toBe(15_000);
    expect(historical.eventLog).toHaveLength(
      (latest.eventLog?.length ?? 0) + 1,
    );
    expect(historical.eventLog?.at(-1)).toMatchObject({
      type: "inspection_update",
      metadata: {
        date: "2026-01-01",
        mileage: 40_000,
        intervalYears: 1,
        intervalKm: 15_000,
      },
    });
  });

  it("records an earlier TUV appointment while keeping the current two-year deadline", async () => {
    const { owner, carId } = await fixture();
    const latest = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2026-07-01",
    });
    const historical = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2024-06-30",
    });
    expect(historical.tuv).toEqual(latest.tuv);
    expect(historical.tuv.nextAppointmentDate).toBe("2028-07-01");
    expect(historical.eventLog).toHaveLength(
      (latest.eventLog?.length ?? 0) + 1,
    );
    expect(historical.eventLog?.at(-1)).toMatchObject({
      type: "tuv_update",
      metadata: { date: "2024-06-30" },
    });
  });

  it("checks older and newer inspections against the last service's odometer", async () => {
    const { owner, carId } = await fixture(50_000);
    const before = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-07-01",
      mileage: 45_000,
      intervalYears: 2,
      intervalKm: 20_000,
    });
    for (const point of [
      { date: "2026-01-01", mileage: 46_000 },
      { date: "2026-08-01", mileage: 44_000 },
    ]) {
      await expect(
        owner.mutation(api.cars.saveInspection, {
          carId,
          intervalYears: 1,
          intervalKm: 15_000,
          ...point,
        }),
      ).rejects.toThrow("Kilometerstand");
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    }
  });

  it("uses a valid entered date to recover malformed legacy maintenance state", async () => {
    const { t, owner, carId } = await fixture(50_000);
    await t.run(async (ctx) => {
      const car = await ctx.db.get(carId);
      if (!car) throw new Error("Expected vehicle");
      await ctx.db.patch(carId, {
        tuv: { ...car.tuv, lastAppointmentDate: "ungültig", completed: true },
        inspection: {
          ...car.inspection,
          lastInspectionDate: "ungültig",
          lastInspectionMileage: 48_000,
          completed: true,
        },
      });
    });
    const tuv = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2026-01-01",
    });
    expect(tuv.tuv).toEqual({
      lastAppointmentDate: "2026-01-01",
      nextAppointmentDate: "2028-01-01",
      completed: true,
    });
    const inspected = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-01",
      mileage: 45_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    expect(inspected.inspection).toMatchObject({
      lastInspectionDate: "2026-01-01",
      lastInspectionMileage: 45_000,
      nextInspectionDate: "2027-01-01",
      completed: true,
    });
    expect(inspected.mileage).toBe(50_000);
  });

  it("compares compatible legacy service timestamps by their Berlin calendar day", async () => {
    const { t, owner, carId } = await fixture(50_000);
    const latest = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-07-01",
      mileage: 45_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    await t.run((ctx) =>
      ctx.db.patch(carId, {
        inspection: {
          ...latest.inspection,
          lastInspectionDate: "2026-06-30T22:30:00Z",
        },
      }),
    );
    const before = await owner.query(api.cars.getById, { id: carId });
    const historical = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-06-30",
      mileage: 44_000,
      intervalYears: 2,
      intervalKm: 20_000,
    });
    expect(historical.inspection).toEqual(before?.inspection);
  });

  it("keeps identical current maintenance submissions idempotent", async () => {
    const { owner, carId } = await fixture(50_000);
    const inspectionArgs = {
      carId,
      date: "2026-07-01",
      mileage: 45_000,
      intervalYears: 1,
      intervalKm: 15_000,
    };
    await owner.mutation(api.cars.saveInspection, inspectionArgs);
    const before = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2026-07-01",
    });
    expect(
      await owner.mutation(api.cars.saveInspection, inspectionArgs),
    ).toEqual(before);
    expect(
      await owner.mutation(api.cars.saveTuv, { carId, date: "2026-07-01" }),
    ).toEqual(before);
  });

  it("preserves the later mileage on the same service day unless correction was explicitly selected", async () => {
    const { owner, carId } = await fixture(20_000);
    const args = {
      carId,
      date: "2026-06-01",
      mileage: 19_000,
      intervalYears: 1,
      intervalKm: 15_000,
    };
    const latest = await owner.mutation(api.cars.saveInspection, args);
    const historical = await owner.mutation(api.cars.saveInspection, {
      ...args,
      mileage: 18_000,
    });
    expect(historical.inspection).toEqual(latest.inspection);
    expect(historical.eventLog).toHaveLength(
      (latest.eventLog?.length ?? 0) + 1,
    );
    const corrected = await owner.mutation(api.cars.saveInspection, {
      ...args,
      mileage: 18_000,
      correctLast: true,
    });
    expect(corrected.inspection.lastInspectionMileage).toBe(18_000);
    expect(corrected.mileage).toBe(20_000);
    expect(
      getInspectionState(corrected, new Date("2026-06-02T12:00:00Z"))
        .remainingKm,
    ).toBe(13_000);
    expect(
      await owner.mutation(api.cars.saveInspection, {
        ...args,
        mileage: 18_000,
        correctLast: true,
      }),
    ).toEqual(corrected);
  });

  it("deliberately replaces the latest TUV and inspection basis when correcting their previous data", async () => {
    const { owner, carId } = await fixture(50_000);
    await owner.mutation(api.cars.saveTuv, { carId, date: "2026-07-01" });
    await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-07-01",
      mileage: 45_000,
      intervalYears: 2,
      intervalKm: 20_000,
    });
    const tuvCorrected = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2026-01-01",
      correctLast: true,
    });
    expect(tuvCorrected.tuv).toEqual({
      lastAppointmentDate: "2026-01-01",
      nextAppointmentDate: "2028-01-01",
      completed: true,
    });
    const inspected = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-01",
      mileage: 46_000,
      intervalYears: 1,
      intervalKm: 15_000,
      correctLast: true,
    });
    expect(inspected.inspection).toMatchObject({
      lastInspectionDate: "2026-01-01",
      lastInspectionMileage: 46_000,
      nextInspectionDate: "2027-01-01",
      intervalYears: 1,
      intervalKm: 15_000,
    });
    expect(inspected.mileage).toBe(50_000);
    expect(
      getInspectionState(inspected, new Date("2026-01-02T12:00:00Z"))
        .remainingKm,
    ).toBe(11_000);
  });

  it("still validates corrections against other dated fuel and tire readings", async () => {
    const { owner, carId, summer } = await fixture(50_000);
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      date: "2026-01-10",
      mileage: 40_000,
    });
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-20",
      mileage: 42_000,
      liters: 40,
    });
    const before = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-07-01",
      mileage: 45_000,
      intervalYears: 1,
      intervalKm: 15_000,
    });
    for (const point of [
      { date: "2026-01-15", mileage: 43_000 },
      { date: "2026-01-05", mileage: 41_000 },
    ]) {
      await expect(
        owner.mutation(api.cars.saveInspection, {
          carId,
          intervalYears: 1,
          intervalKm: 15_000,
          correctLast: true,
          ...point,
        }),
      ).rejects.toThrow("Kilometerstand");
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    }
    const corrected = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2026-01-15",
      mileage: 41_000,
      intervalYears: 1,
      intervalKm: 15_000,
      correctLast: true,
    });
    expect(corrected.inspection.lastInspectionMileage).toBe(41_000);
    expect(corrected.inspection.lastInspectionDate).toBe("2026-01-15");
    expect(corrected.mileage).toBe(50_000);
  });
});
