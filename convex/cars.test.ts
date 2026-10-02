import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function fixture(mileage = 50000) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "issuer|owner" });
  const other = t.withIdentity({ tokenIdentifier: "issuer|other" });
  const carId = await owner.mutation(api.cars.create, {
    make: " VW ",
    model: " Golf ",
    year: 2020,
    mileage,
    insurance: null,
  });
  return { t, owner, other, carId };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

const commands = [
  {
    name: "update",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.update, { id: carId, mileage: 51000 }),
  },
  {
    name: "remove",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.remove, { id: carId }),
  },
  {
    name: "saveFuelEntry",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.saveFuelEntry, {
        carId,
        date: "2026-01-01",
        mileage: 50000,
        liters: 40,
      }),
  },
  {
    name: "removeFuelEntry",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.removeFuelEntry, { carId, entryId: "entry" }),
  },
  {
    name: "addTire",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.addTire, {
        carId,
        type: "summer",
        currentMileage: 0,
      }),
  },
  {
    name: "setTireArchived",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.setTireArchived, {
        carId,
        tireId: "tire",
        archived: true,
      }),
  },
  {
    name: "changeTires",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.changeTires, {
        carId,
        tireId: "tire",
        mileage: 50000,
        date: "2026-01-01",
      }),
  },
  {
    name: "saveTuv",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.saveTuv, { carId, date: "2026-01-01" }),
  },
  {
    name: "saveInspection",
    run: (actor: Fixture["owner"], carId: Fixture["carId"]) =>
      actor.mutation(api.cars.saveInspection, {
        carId,
        date: "2026-01-01",
        mileage: 40000,
        intervalYears: 1,
        intervalKm: 15000,
      }),
  },
];

describe("vehicle ownership", () => {
  it("uses tokenIdentifier, preserves defaults, and returns only owned vehicles", async () => {
    const { t, owner, other, carId } = await fixture();
    const otherId = await other.mutation(api.cars.create, {
      make: "BMW",
      model: "i3",
      year: 2021,
      mileage: 20000,
      insurance: null,
    });
    const car = await owner.query(api.cars.getById, { id: carId });
    expect(car).toMatchObject({
      userId: "issuer|owner",
      make: "VW",
      model: "Golf",
      mileage: 50000,
      inspection: { intervalYears: 1, intervalKm: 15000, completed: false },
      tuv: { completed: false },
      tires: [],
      tireChangeEvents: [],
      fuelEntries: [],
    });
    expect(await owner.query(api.cars.list)).toEqual([car]);
    expect(await other.query(api.cars.getById, { id: carId })).toBeNull();
    expect(await owner.query(api.cars.getById, { id: otherId })).toBeNull();
    expect(await t.query(api.cars.getById, { id: carId })).toBeNull();
    expect(await t.query(api.cars.list)).toEqual([]);
    await expect(
      t.mutation(api.cars.create, {
        make: "VW",
        model: "Golf",
        year: 2020,
        mileage: 0,
        insurance: null,
      }),
    ).rejects.toThrow("Nicht authentifiziert");
  });

  for (const command of commands) {
    it(`${command.name} rejects another owner and unauthenticated callers atomically`, async () => {
      const { t, owner, other, carId } = await fixture();
      const before = await owner.query(api.cars.getById, { id: carId });
      await expect(command.run(other, carId)).rejects.toThrow(
        "Fahrzeug nicht gefunden",
      );
      await expect(command.run(t, carId)).rejects.toThrow(
        "Nicht authentifiziert",
      );
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    });
  }
});

describe("vehicle updates", () => {
  it("validates create and update inputs before writing", async () => {
    const { owner, carId } = await fixture();
    const before = await owner.query(api.cars.getById, { id: carId });
    for (const mileage of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      await expect(
        owner.mutation(api.cars.update, { id: carId, mileage }),
      ).rejects.toThrow("Kilometerstand");
      await expect(
        owner.mutation(api.cars.create, {
          make: "Audi",
          model: "A4",
          year: 2020,
          mileage,
          insurance: null,
        }),
      ).rejects.toThrow("Kilometerstand");
    }
    await expect(
      owner.mutation(api.cars.update, { id: carId, mileage: 49999 }),
    ).rejects.toThrow("kleiner");
    await expect(
      owner.mutation(api.cars.update, { id: carId, make: " " }),
    ).rejects.toThrow("Marke");
    await expect(
      owner.mutation(api.cars.update, { id: carId, model: " " }),
    ).rejects.toThrow("Modell");
    for (const year of [
      1885,
      2020.5,
      Number.NaN,
      new Date().getFullYear() + 2,
    ]) {
      await expect(
        owner.mutation(api.cars.update, { id: carId, year }),
      ).rejects.toThrow("Baujahr");
    }
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });

  it("clears optional fields explicitly and records only actual scalar changes", async () => {
    const { owner, carId } = await fixture();
    const insurance = {
      provider: "ADAC",
      policyNumber: "123",
      expiryDate: "2027-01-01",
    };
    const updated = await owner.mutation(api.cars.update, {
      id: carId,
      vin: " VIN123 ",
      licensePlate: " OL AB 123 ",
      mileage: 51000,
      insurance,
    });
    expect(updated).toMatchObject({
      vin: "VIN123",
      licensePlate: "OL AB 123",
      mileage: 51000,
      insurance,
    });
    expect(updated.eventLog?.map((entry) => entry.type)).toEqual([
      "car_created",
      "car_updated",
      "mileage_update",
      "insurance_update",
    ]);
    const unchanged = await owner.mutation(api.cars.update, {
      id: carId,
      make: " VW ",
      model: "Golf",
      year: 2020,
      vin: "VIN123",
      licensePlate: "OL AB 123",
      mileage: 51000,
      insurance,
    });
    expect(unchanged.eventLog).toEqual(updated.eventLog);
    const cleared = await owner.mutation(api.cars.update, {
      id: carId,
      vin: null,
      licensePlate: null,
      insurance: null,
    });
    expect(cleared).not.toHaveProperty("vin");
    expect(cleared).not.toHaveProperty("licensePlate");
    expect(cleared.insurance).toBeNull();
    expect(cleared.eventLog).toHaveLength(6);
    expect(await owner.mutation(api.cars.remove, { id: carId })).toEqual({
      success: true,
    });
    expect(await owner.query(api.cars.getById, { id: carId })).toBeNull();
  });

  it("initializes absent legacy optional arrays without losing existing document fields", async () => {
    const { t, owner, carId } = await fixture();
    await t.run(async (ctx) =>
      ctx.db.patch(carId, { fuelEntries: undefined, eventLog: undefined }),
    );
    const updated = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-01",
      mileage: 49000,
      liters: 10,
    });
    expect(updated.fuelEntries).toHaveLength(1);
    expect(updated.eventLog?.[0].description).toBe("Tankeintrag hinzugefügt");
    expect(updated).toMatchObject({
      userId: "issuer|owner",
      make: "VW",
      inspection: { intervalYears: 1, intervalKm: 15000 },
      mileage: 50000,
    });
  });
});

describe("fuel commands", () => {
  it("preserves malformed legacy dates while allowing new records and corrections", async () => {
    const { t, owner, carId } = await fixture(10000);
    await t.run(async (ctx) =>
      ctx.db.patch(carId, {
        fuelEntries: [
          {
            id: "legacy",
            date: "invalid",
            mileage: 1000,
            liters: 10,
            kmDriven: 999,
            consumption: 99,
          },
        ],
      }),
    );
    const saved = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-02",
      mileage: 2000,
      liters: 20,
    });
    expect(saved.fuelEntries?.at(-1)).toEqual({
      id: "legacy",
      date: "invalid",
      mileage: 1000,
      liters: 10,
    });
    expect(saved.fuelEntries?.[0]).not.toHaveProperty("kmDriven");
    const corrected = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      entryId: "legacy",
      date: "2026-01-01",
      mileage: 1000,
      liters: 10,
    });
    expect(corrected.fuelEntries?.[1]).toMatchObject({
      kmDriven: 1000,
      consumption: 2,
    });
    expect(corrected.mileage).toBe(10000);
  });

  it("recalculates adjacent intervals after historical insert, edit and deletion", async () => {
    const { owner, carId } = await fixture(10000);
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-01",
      mileage: 1000,
      liters: 10,
    });
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-03",
      mileage: 2000,
      liters: 20,
    });
    const inserted = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-02",
      mileage: 1500,
      liters: 15,
      pricePerLiter: 1.5,
      notes: " Mitte ",
    });
    expect(inserted.mileage).toBe(10000);
    expect(
      inserted.fuelEntries?.map((entry) => [
        entry.mileage,
        entry.kmDriven,
        entry.consumption,
      ]),
    ).toEqual([
      [1000, undefined, undefined],
      [1500, 500, 3],
      [2000, 500, 4],
    ]);
    const middle = inserted.fuelEntries?.[1];
    expect(middle).toMatchObject({
      totalCost: 22.5,
      pricePerLiter: 1.5,
      notes: "Mitte",
    });
    if (!middle) throw new Error("Expected saved entry");
    const edited = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      entryId: middle.id,
      date: "2026-01-02",
      mileage: 1600,
      liters: 18,
    });
    expect(
      edited.fuelEntries?.map((entry) => [entry.kmDriven, entry.consumption]),
    ).toEqual([
      [undefined, undefined],
      [600, 3],
      [400, 5],
    ]);
    expect(edited.fuelEntries?.[1]).not.toHaveProperty("pricePerLiter");
    expect(edited.fuelEntries?.[1]).not.toHaveProperty("totalCost");
    expect(edited.fuelEntries?.[1]).not.toHaveProperty("notes");
    const removedMiddle = await owner.mutation(api.cars.removeFuelEntry, {
      carId,
      entryId: middle.id,
    });
    expect(removedMiddle.fuelEntries?.[1]).toMatchObject({
      kmDriven: 1000,
      consumption: 2,
    });
    const first = removedMiddle.fuelEntries?.[0];
    if (!first) throw new Error("Expected first entry");
    const removedFirst = await owner.mutation(api.cars.removeFuelEntry, {
      carId,
      entryId: first.id,
    });
    expect(removedFirst.fuelEntries).toHaveLength(1);
    expect(removedFirst.fuelEntries?.[0]).not.toHaveProperty("kmDriven");
    expect(removedFirst.fuelEntries?.[0]).not.toHaveProperty("consumption");
    expect(removedFirst.mileage).toBe(10000);
    expect(
      removedFirst.eventLog?.slice(1).map((entry) => entry.metadata?.action),
    ).toEqual([
      "created",
      "created",
      "created",
      "updated",
      "deleted",
      "deleted",
    ]);
  });

  it("raises the odometer only for new higher mileages and keeps manual costs", async () => {
    const { owner, carId } = await fixture(1000);
    const added = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-02",
      mileage: 1500,
      liters: 40,
      totalCost: 75.123,
    });
    expect(added.mileage).toBe(1500);
    expect(added.fuelEntries?.[0].totalCost).toBe(75.12);
    const id = added.fuelEntries?.[0].id;
    if (!id) throw new Error("Expected entry");
    const edited = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      entryId: id,
      date: "2026-01-02",
      mileage: 1400,
      liters: 40,
      totalCost: 75.12,
    });
    expect(edited.mileage).toBe(1500);
    const unchanged = await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      entryId: id,
      date: "2026-01-02",
      mileage: 1400,
      liters: 40,
      totalCost: 75.12,
    });
    expect(unchanged.eventLog).toEqual(edited.eventLog);
    const deleted = await owner.mutation(api.cars.removeFuelEntry, {
      carId,
      entryId: id,
    });
    expect(deleted.fuelEntries).toEqual([]);
    expect(deleted.mileage).toBe(1500);
  });

  it("validates fuel chronology, dates, quantities and pricing atomically", async () => {
    const { owner, carId } = await fixture(10000);
    await owner.mutation(api.cars.saveFuelEntry, {
      carId,
      date: "2026-01-02",
      mileage: 2000,
      liters: 20,
    });
    const before = await owner.query(api.cars.getById, { id: carId });
    const defaults = { carId, date: "2026-01-03", mileage: 2500, liters: 20 };
    for (const inputs of [
      { date: "2026-01-01", mileage: 3000 },
      { date: "2026-01-03", mileage: 1000 },
      { date: "2026-02-30" },
      { date: "2026-13-01" },
      { date: "2099-01-01" },
      { date: "2026-01-01T00:00:00.000Z" },
      { liters: 0 },
      { liters: -1 },
      { liters: Number.NaN },
      { liters: Number.POSITIVE_INFINITY },
      { mileage: 2500.5 },
      { pricePerLiter: -1 },
      { totalCost: -1 },
      { pricePerLiter: Number.NaN },
      { pricePerLiter: 1.5, totalCost: 35 },
      { entryId: "missing" },
    ]) {
      await expect(
        owner.mutation(api.cars.saveFuelEntry, { ...defaults, ...inputs }),
      ).rejects.toThrow();
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    }
    await expect(
      owner.mutation(api.cars.removeFuelEntry, { carId, entryId: "missing" }),
    ).rejects.toThrow("nicht gefunden");
    const saved = await owner.mutation(api.cars.saveFuelEntry, {
      ...defaults,
      pricePerLiter: 1.599,
      totalCost: 31.98,
    });
    expect(saved.fuelEntries?.[1].totalCost).toBe(31.98);
    const rounded = await owner.mutation(api.cars.saveFuelEntry, {
      ...defaults,
      liters: 1,
      pricePerLiter: 1.005,
      totalCost: 1.01,
    });
    expect(rounded.fuelEntries?.at(-1)?.totalCost).toBe(1.01);
    const receipt = await owner.mutation(api.cars.saveFuelEntry, {
      ...defaults,
      pricePerLiter: 1.599,
      totalCost: 31.99,
    });
    expect(receipt.fuelEntries?.at(-1)?.totalCost).toBe(31.99);
  });
});

describe("tire commands", () => {
  it("retains cumulative mileage through same-day swaps, remounts and unmounting", async () => {
    const { owner, carId } = await fixture(10000);
    const summerCar = await owner.mutation(api.cars.addTire, {
      carId,
      type: "summer",
      brand: " Michelin ",
      currentMileage: 2000,
    });
    const summer = summerCar.tires[0];
    const winterCar = await owner.mutation(api.cars.addTire, {
      carId,
      type: "winter",
      currentMileage: 500,
    });
    const winter = winterCar.tires[1];
    expect(summer.brand).toBe("Michelin");
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10000,
      date: "2026-01-01",
    });
    const firstSwap = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: winter.id,
      mileage: 10500,
      date: "2026-01-01",
    });
    expect(firstSwap.tires[0].currentMileage).toBe(2500);
    expect(firstSwap.tireChangeEvents.map((entry) => entry.changeType)).toEqual(
      ["mount", "unmount", "mount"],
    );
    const remounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 11500,
      date: "2026-01-02",
    });
    expect(remounted.tires[1].currentMileage).toBe(1500);
    const unmounted = await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: null,
      mileage: 12000,
      date: "2026-01-03",
    });
    expect(unmounted.currentTireId).toBeNull();
    expect(unmounted.tires[0].currentMileage).toBe(3000);
    expect(unmounted.tires[1].currentMileage).toBe(1500);
    expect(unmounted.tireChangeEvents.at(-1)).toMatchObject({
      changeType: "unmount",
      tireMileage: 3000,
      carMileage: 12000,
    });
    expect(unmounted.eventLog?.at(-1)).toMatchObject({
      description: "Reifensatz demontiert",
      metadata: { action: "unmounted" },
    });
    const archived = await owner.mutation(api.cars.setTireArchived, {
      carId,
      tireId: summer.id,
      archived: true,
    });
    expect(archived.tires[0]).toMatchObject({
      archived: true,
      currentMileage: 3000,
    });
    const unchanged = await owner.mutation(api.cars.setTireArchived, {
      carId,
      tireId: summer.id,
      archived: true,
    });
    expect(unchanged.eventLog).toEqual(archived.eventLog);
    const restored = await owner.mutation(api.cars.setTireArchived, {
      carId,
      tireId: summer.id,
      archived: false,
    });
    expect(restored.tires[0].archived).toBe(false);
  });

  it("rejects rollback, archived/mounted targets, bad dates and mounted archiving", async () => {
    const { owner, carId } = await fixture(10000);
    await expect(
      owner.mutation(api.cars.addTire, {
        carId,
        type: "summer",
        currentMileage: -1,
      }),
    ).rejects.toThrow("Reifenlaufleistung");
    const added = await owner.mutation(api.cars.addTire, {
      carId,
      type: "summer",
      currentMileage: 0,
    });
    const summer = added.tires[0];
    const addedWinter = await owner.mutation(api.cars.addTire, {
      carId,
      type: "winter",
      currentMileage: 0,
    });
    const winter = addedWinter.tires[1];
    await owner.mutation(api.cars.setTireArchived, {
      carId,
      tireId: winter.id,
      archived: true,
    });
    await owner.mutation(api.cars.changeTires, {
      carId,
      tireId: summer.id,
      mileage: 10000,
      date: "2026-01-02",
    });
    const before = await owner.query(api.cars.getById, { id: carId });
    await expect(
      owner.mutation(api.cars.setTireArchived, {
        carId,
        tireId: summer.id,
        archived: true,
      }),
    ).rejects.toThrow("Montierte");
    for (const inputs of [
      { tireId: summer.id },
      { tireId: winter.id },
      { tireId: "missing" },
      { tireId: null, mileage: 9999 },
      { tireId: null, mileage: 10000.5 },
      { tireId: null, date: "2026-01-01" },
      { tireId: null, date: "2026-02-30" },
      { tireId: null, date: "2099-01-01" },
    ]) {
      await expect(
        owner.mutation(api.cars.changeTires, {
          carId,
          mileage: 10000,
          date: "2026-01-02",
          ...inputs,
        }),
      ).rejects.toThrow();
      expect(await owner.query(api.cars.getById, { id: carId })).toEqual(
        before,
      );
    }
  });
});

describe("maintenance commands", () => {
  it("stores canonical dates, historical service mileage and the legacy 95 km regime", async () => {
    const { owner, carId } = await fixture(50000);
    const tuv = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2024-02-29",
    });
    expect(tuv.tuv).toEqual({
      lastAppointmentDate: "2024-02-29",
      nextAppointmentDate: "2026-02-28",
      completed: true,
    });
    const inspection = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2024-02-29",
      mileage: 40000,
      intervalYears: 1,
      intervalKm: 95,
    });
    expect(inspection.mileage).toBe(50000);
    expect(inspection.inspection).toEqual({
      lastInspectionDate: "2024-02-29",
      lastInspectionMileage: 40000,
      nextInspectionDateByYear: "2025-02-28",
      nextInspectionDateByKm: null,
      nextInspectionDate: "2025-02-28",
      intervalYears: 1,
      intervalKm: 95,
      completed: true,
    });
    const unchangedTuv = await owner.mutation(api.cars.saveTuv, {
      carId,
      date: "2024-02-29",
    });
    const unchangedInspection = await owner.mutation(api.cars.saveInspection, {
      carId,
      date: "2024-02-29",
      mileage: 40000,
      intervalYears: 1,
      intervalKm: 95,
    });
    expect(unchangedTuv.eventLog).toEqual(inspection.eventLog);
    expect(unchangedInspection.eventLog).toEqual(inspection.eventLog);
  });

  it("rejects impossible completed dates and service intervals before writing", async () => {
    const { owner, carId } = await fixture();
    const before = await owner.query(api.cars.getById, { id: carId });
    for (const date of [
      "2025-02-29",
      "2026-02-30",
      "2026-04-31",
      "2099-01-01",
      "2026-01-01T00:00:00Z",
    ]) {
      await expect(
        owner.mutation(api.cars.saveTuv, { carId, date }),
      ).rejects.toThrow("Datum");
      await expect(
        owner.mutation(api.cars.saveInspection, {
          carId,
          date,
          mileage: 40000,
          intervalYears: 1,
          intervalKm: 15000,
        }),
      ).rejects.toThrow("Datum");
    }
    for (const inputs of [
      { mileage: 50001 },
      { mileage: -1 },
      { mileage: 1.5 },
      { intervalYears: 0 },
      { intervalYears: 0.5 },
      { intervalYears: 11 },
      { intervalKm: 0 },
      { intervalKm: Number.NaN },
      { intervalKm: 1.5 },
    ]) {
      await expect(
        owner.mutation(api.cars.saveInspection, {
          carId,
          date: "2026-01-01",
          mileage: 40000,
          intervalYears: 1,
          intervalKm: 15000,
          ...inputs,
        }),
      ).rejects.toThrow();
    }
    expect(await owner.query(api.cars.getById, { id: carId })).toEqual(before);
  });
});
