import { ConvexError, v } from "convex/values";
import {
  calculateFuelCost,
  calculateNextInspectionDateByYear,
  calculateNextTUVDate,
  formatDate,
  formatNumber,
  getTireMileage,
  isValidFuelLiters,
  normalizeCalendarDate,
  recalculateFuelEntries,
  roundCurrency,
  todayDate,
} from "../app/lib/utils";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { insuranceValidator, tireTypeValidator } from "./schema";
import { vehicleOwner } from "./owners";

type Car = Doc<"cars">;
type CarEvent = NonNullable<Car["eventLog"]>[number];
type FuelEntry = NonNullable<Car["fuelEntries"]>[number];
type CarUpdates = Partial<Omit<Car, "_id" | "_creationTime" | "userId">>;

function requireMileage(value: number, label = "Kilometerstand") {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ConvexError(`${label} muss eine nicht negative ganze Zahl sein.`);
  }
}

function requireYear(value: number) {
  if (
    !Number.isInteger(value) ||
    value < 1886 ||
    value > Number(todayDate().slice(0, 4)) + 1
  ) {
    throw new ConvexError("Bitte gib ein gültiges Baujahr ein.");
  }
}

function requireName(value: string, label: string) {
  const name = value.trim();
  if (!name) throw new ConvexError(`${label} darf nicht leer sein.`);
  return name;
}

function optionalText(value: string | null | undefined) {
  return value?.trim() || undefined;
}

function requireDate(value: string, completed = false) {
  const date = normalizeCalendarDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || date !== value) {
    throw new ConvexError("Bitte gib ein gültiges Datum ein (JJJJ-MM-TT).");
  }
  // Completed German vehicle records use the local calendar day, also around midnight.
  const today = todayDate();
  if (completed && date > today) {
    throw new ConvexError("Das Datum darf nicht in der Zukunft liegen.");
  }
  return date;
}

function normalizeInsurance(insurance: Car["insurance"]) {
  if (!insurance) return null;
  return {
    provider: requireName(insurance.provider, "Versicherung"),
    policyNumber: insurance.policyNumber.trim(),
    expiryDate: requireDate(insurance.expiryDate),
  };
}

function sameInsurance(first: Car["insurance"], second: Car["insurance"]) {
  return (
    first?.provider === second?.provider &&
    first?.policyNumber === second?.policyNumber &&
    first?.expiryDate === second?.expiryDate
  );
}

async function requireCar(ctx: MutationCtx, id: Id<"cars">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Nicht authentifiziert");
  const car = await ctx.db.get(id);
  if (!car || car.userId !== (await vehicleOwner(ctx, identity))) {
    throw new ConvexError("Fahrzeug nicht gefunden");
  }
  return car;
}

function event(
  type: CarEvent["type"],
  description: string,
  metadata?: Record<string, unknown>,
): CarEvent {
  return {
    id: crypto.randomUUID(),
    type,
    date: new Date().toISOString(),
    description,
    ...(metadata ? { metadata } : {}),
  };
}

async function saveCar(
  ctx: MutationCtx,
  car: Car,
  updates: CarUpdates,
  events: CarEvent[],
) {
  if (Object.keys(updates).length === 0 && events.length === 0) return car;
  if (updates.mileage !== undefined && updates.mileage !== car.mileage) {
    const tire = car.tires.find((item) => item.id === car.currentTireId);
    if (tire) {
      const previousMileage = getTireMileage(car, tire);
      const nextMileage = getTireMileage(
        { ...car, mileage: updates.mileage },
        tire,
      );
      if (
        Number.isFinite(previousMileage) &&
        previousMileage >= 0 &&
        previousMileage <= Number.MAX_SAFE_INTEGER &&
        (!Number.isFinite(nextMileage) || nextMileage > Number.MAX_SAFE_INTEGER)
      ) {
        throw new ConvexError("Die berechnete Reifenlaufleistung ist zu hoch.");
      }
    }
  }
  await ctx.db.patch(car._id, {
    ...updates,
    ...(events.length
      ? { eventLog: [...(car.eventLog ?? []), ...events] }
      : {}),
  });
  const updated = await ctx.db.get(car._id);
  if (!updated) throw new ConvexError("Fahrzeug nicht gefunden");
  return updated;
}

function requireMoney(value: number | undefined) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new ConvexError("Kosten müssen eine nicht negative Zahl sein.");
  }
}

function roundCents(value: number) {
  const rounded = roundCurrency(value);
  if (
    !Number.isFinite(rounded) ||
    !Number.isSafeInteger(Math.round(rounded * 100))
  ) {
    throw new ConvexError("Die angegebenen Kosten sind zu hoch.");
  }
  return rounded;
}

function validateFuelNeighbors(entries: FuelEntry[], entry: FuelEntry) {
  // Retained legacy violations do not block a new or repositioned entry.
  const chronological = entries
    .flatMap((current) => {
      const date = normalizeCalendarDate(current.date);
      return date && Number.isFinite(current.mileage) && current.mileage >= 0
        ? [{ ...current, date }]
        : [];
    })
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) || first.mileage - second.mileage,
    );
  const index = chronological.findIndex((current) => current.id === entry.id);
  const previous = chronological[index - 1];
  const next = chronological[index + 1];
  if (
    (previous && entry.mileage < previous.mileage) ||
    (next && entry.mileage > next.mileage)
  ) {
    throw new ConvexError(
      "Der Kilometerstand muss zur zeitlichen Reihenfolge der Tankeinträge passen.",
    );
  }
}

/** Preserve completed dates while removing the date replaced by an explicit correction. */
function tuvDates(car: Car) {
  const dates = new Set<string>();
  for (const entry of car.eventLog ?? []) {
    const metadata = entry.metadata;
    if (
      entry.type !== "tuv_update" ||
      (metadata?.action !== "recorded" && metadata?.action !== "corrected")
    )
      continue;
    const previousDate =
      typeof metadata.previousDate === "string"
        ? normalizeCalendarDate(metadata.previousDate)
        : null;
    if (previousDate) {
      if (metadata.action === "corrected") dates.delete(previousDate);
      else dates.add(previousDate);
    }
    const date =
      typeof metadata.date === "string"
        ? normalizeCalendarDate(metadata.date)
        : null;
    if (date) dates.add(date);
  }
  const lastDate = normalizeCalendarDate(car.tuv.lastAppointmentDate);
  if (lastDate) dates.add(lastDate);
  return [...dates];
}

/** Retain recorded services for chronology, excluding a deliberately replaced reading. */
function inspectionReadings(car: Car, skipLatest: boolean) {
  const readings = new Map<string, { date: string; mileage: number }>();
  for (const entry of car.eventLog ?? []) {
    const metadata = entry.metadata;
    if (
      entry.type !== "inspection_update" ||
      (metadata?.action !== "recorded" && metadata?.action !== "corrected")
    )
      continue;
    const previousDate =
      typeof metadata.previousDate === "string"
        ? normalizeCalendarDate(metadata.previousDate)
        : null;
    const previousMileage = metadata.previousMileage;
    if (
      previousDate &&
      typeof previousMileage === "number" &&
      Number.isFinite(previousMileage) &&
      previousMileage >= 0
    ) {
      if (metadata.action === "corrected") {
        readings.delete(`${previousDate}:${metadata.previousMileage}`);
      } else {
        readings.set(`${previousDate}:${previousMileage}`, {
          date: previousDate,
          mileage: previousMileage,
        });
      }
    }
    const date =
      typeof metadata.date === "string"
        ? normalizeCalendarDate(metadata.date)
        : null;
    const mileage = metadata.mileage;
    if (
      date &&
      typeof mileage === "number" &&
      Number.isFinite(mileage) &&
      mileage >= 0
    ) {
      readings.set(`${date}:${mileage}`, { date, mileage });
    }
  }
  const date = normalizeCalendarDate(car.inspection.lastInspectionDate);
  const mileage = car.inspection.lastInspectionMileage;
  if (date && mileage !== null && Number.isFinite(mileage) && mileage >= 0) {
    const key = `${date}:${mileage}`;
    if (skipLatest) readings.delete(key);
    else readings.set(key, { date, mileage });
  }
  return [...readings.values()];
}

/** Different record types share one odometer; dates do not establish order within a day. */
function validateDatedMileage(
  car: Car,
  reading: { date: string; mileage: number },
  options: { skipFuel?: boolean; skipInspection?: boolean } = {},
) {
  const readings = [
    ...(options.skipFuel ? [] : (car.fuelEntries ?? [])).map(
      ({ date, mileage }) => ({ date, mileage }),
    ),
    ...car.tireChangeEvents.map(({ date, carMileage }) => ({
      date,
      mileage: carMileage,
    })),
    ...inspectionReadings(car, options.skipInspection === true),
  ];
  for (const previous of readings) {
    const date = normalizeCalendarDate(previous.date);
    const mileage = previous.mileage;
    if (!date || mileage === null || !Number.isFinite(mileage) || mileage < 0)
      continue;
    if (
      (date < reading.date && mileage > reading.mileage) ||
      (date > reading.date && mileage < reading.mileage)
    ) {
      throw new ConvexError(
        "Der Kilometerstand muss zu den datierten Tank-, Reifen- und Inspektionseinträgen passen.",
      );
    }
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const owner = await vehicleOwner(ctx, identity);
    return await ctx.db
      .query("cars")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("cars") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const car = await ctx.db.get(args.id);
    return car?.userId === (await vehicleOwner(ctx, identity)) ? car : null;
  },
});

export const create = mutation({
  args: {
    make: v.string(),
    model: v.string(),
    year: v.number(),
    vin: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    mileage: v.number(),
    insurance: v.union(insuranceValidator, v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Nicht authentifiziert");
    const make = requireName(args.make, "Marke");
    const model = requireName(args.model, "Modell");
    requireYear(args.year);
    requireMileage(args.mileage);
    return await ctx.db.insert("cars", {
      userId: await vehicleOwner(ctx, identity),
      make,
      model,
      year: args.year,
      vin: optionalText(args.vin),
      licensePlate: optionalText(args.licensePlate),
      mileage: args.mileage,
      insurance: normalizeInsurance(args.insurance),
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
        intervalKm: 15000,
        completed: false,
      },
      tires: [],
      tireChangeEvents: [],
      currentTireId: null,
      fuelEntries: [],
      eventLog: [
        event(
          "car_created",
          `Fahrzeug ${make} ${model} (${args.year}) angelegt`,
          {
            make,
            model,
            year: args.year,
          },
        ),
      ],
    });
  },
});

// Clients send scalar changes only; domain commands below always read the latest document.
export const update = mutation({
  args: {
    id: v.id("cars"),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    vin: v.optional(v.union(v.string(), v.null())),
    licensePlate: v.optional(v.union(v.string(), v.null())),
    mileage: v.optional(v.number()),
    insurance: v.optional(v.union(insuranceValidator, v.null())),
  },
  handler: async (ctx, args) => {
    const car = await requireCar(ctx, args.id);
    const updates: CarUpdates = {};
    const events: CarEvent[] = [];
    if (args.make !== undefined) {
      const make = requireName(args.make, "Marke");
      if (make !== car.make) updates.make = make;
    }
    if (args.model !== undefined) {
      const model = requireName(args.model, "Modell");
      if (model !== car.model) updates.model = model;
    }
    if (args.year !== undefined) {
      requireYear(args.year);
      if (args.year !== car.year) updates.year = args.year;
    }
    if (args.vin !== undefined && optionalText(args.vin) !== car.vin) {
      updates.vin = optionalText(args.vin);
    }
    if (
      args.licensePlate !== undefined &&
      optionalText(args.licensePlate) !== car.licensePlate
    ) {
      updates.licensePlate = optionalText(args.licensePlate);
    }
    if (Object.keys(updates).length)
      events.push(event("car_updated", "Fahrzeugdaten aktualisiert"));

    if (args.mileage !== undefined) {
      requireMileage(args.mileage);
      if (args.mileage < car.mileage) {
        throw new ConvexError(
          "Der Kilometerstand darf nicht kleiner als der aktuelle Kilometerstand sein.",
        );
      }
      if (args.mileage !== car.mileage) {
        updates.mileage = args.mileage;
        events.push(
          event(
            "mileage_update",
            `Kilometerstand aktualisiert: ${car.mileage} → ${args.mileage} km`,
            {
              von: car.mileage,
              auf: args.mileage,
            },
          ),
        );
      }
    }
    if (args.insurance !== undefined) {
      const insurance = normalizeInsurance(args.insurance);
      if (!sameInsurance(car.insurance, insurance)) {
        updates.insurance = insurance;
        events.push(
          event("insurance_update", "Versicherungsinformationen aktualisiert"),
        );
      }
    }
    return await saveCar(ctx, car, updates, events);
  },
});

export const saveFuelEntry = mutation({
  args: {
    carId: v.id("cars"),
    entryId: v.optional(v.string()),
    date: v.string(),
    mileage: v.number(),
    liters: v.number(),
    pricePerLiter: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const car = await requireCar(ctx, args.carId);
    const existing = car.fuelEntries ?? [];
    const previous =
      args.entryId === undefined
        ? undefined
        : existing.find((entry) => entry.id === args.entryId);
    if (args.entryId !== undefined && !previous)
      throw new ConvexError("Tankeintrag nicht gefunden.");
    const date = requireDate(args.date, true);
    // Existing finite fractional mileage can be kept while editing other fields.
    if (
      args.mileage !== previous?.mileage ||
      !Number.isFinite(args.mileage) ||
      args.mileage < 0
    ) {
      requireMileage(args.mileage);
    }
    if (!isValidFuelLiters(args.liters)) {
      throw new ConvexError(
        "Bitte gib eine gültige getankte Menge größer als null ein.",
      );
    }
    requireMoney(args.pricePerLiter);
    requireMoney(args.totalCost);
    const calculatedCost =
      args.pricePerLiter === undefined
        ? undefined
        : roundCents(calculateFuelCost(args.liters, args.pricePerLiter));
    const suppliedCost =
      args.totalCost === undefined ? undefined : roundCents(args.totalCost);
    if (
      calculatedCost !== undefined &&
      suppliedCost !== undefined &&
      Math.abs(calculatedCost - suppliedCost) > 0.010001
    ) {
      throw new ConvexError(
        "Gesamtkosten und Literpreis stimmen nicht überein.",
      );
    }
    const totalCost = suppliedCost ?? calculatedCost;
    const notes = optionalText(args.notes);
    const entry = {
      id: previous?.id ?? crypto.randomUUID(),
      date,
      mileage: args.mileage,
      liters: args.liters,
      ...(args.pricePerLiter === undefined
        ? {}
        : { pricePerLiter: args.pricePerLiter }),
      ...(totalCost === undefined ? {} : { totalCost }),
      ...(notes === undefined ? {} : { notes }),
    };
    const entries = previous
      ? existing.map((current) =>
          current.id === previous.id ? entry : current,
        )
      : [...existing, entry];
    if (
      previous?.mileage !== entry.mileage ||
      normalizeCalendarDate(previous.date) !== entry.date
    ) {
      validateFuelNeighbors(entries, entry);
      validateDatedMileage(car, entry, { skipFuel: true });
    }
    const fuelEntries = recalculateFuelEntries(entries);
    const mileage =
      previous?.mileage === entry.mileage
        ? car.mileage
        : Math.max(car.mileage, entry.mileage);
    const unchanged =
      previous &&
      normalizeCalendarDate(previous.date) === entry.date &&
      previous.mileage === entry.mileage &&
      previous.liters === entry.liters &&
      previous.pricePerLiter === entry.pricePerLiter &&
      previous.totalCost === entry.totalCost &&
      previous.notes === entry.notes;
    return await saveCar(
      ctx,
      car,
      { fuelEntries, mileage },
      unchanged
        ? []
        : [
            event(
              "fuel_entry",
              previous ? "Tankeintrag bearbeitet" : "Tankeintrag hinzugefügt",
              {
                action: previous ? "updated" : "created",
                entryId: entry.id,
                mileage: entry.mileage,
                liters: entry.liters,
              },
            ),
          ],
    );
  },
});

export const removeFuelEntry = mutation({
  args: { carId: v.id("cars"), entryId: v.string() },
  handler: async (ctx, args) => {
    const car = await requireCar(ctx, args.carId);
    const existing = car.fuelEntries ?? [];
    const previous = existing.find((entry) => entry.id === args.entryId);
    if (!previous) throw new ConvexError("Tankeintrag nicht gefunden.");
    const fuelEntries = recalculateFuelEntries(
      existing.filter((entry) => entry.id !== args.entryId),
    );
    return await saveCar(ctx, car, { fuelEntries }, [
      event("fuel_entry", "Tankeintrag gelöscht", {
        action: "deleted",
        entryId: args.entryId,
        mileage: previous.mileage,
        liters: previous.liters,
      }),
    ]);
  },
});

export const addTire = mutation({
  args: {
    carId: v.id("cars"),
    type: tireTypeValidator,
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    currentMileage: v.number(),
  },
  handler: async (ctx, args) => {
    const car = await requireCar(ctx, args.carId);
    requireMileage(args.currentMileage, "Reifenlaufleistung");
    const tire = {
      id: crypto.randomUUID(),
      type: args.type,
      brand: optionalText(args.brand),
      model: optionalText(args.model),
      currentMileage: args.currentMileage,
      archived: false,
    };
    return await saveCar(ctx, car, { tires: [...car.tires, tire] }, [
      event("tire_change", "Reifensatz hinzugefügt", {
        action: "created",
        tireId: tire.id,
        type: tire.type,
      }),
    ]);
  },
});

export const setTireArchived = mutation({
  args: { carId: v.id("cars"), tireId: v.string(), archived: v.boolean() },
  handler: async (ctx, args) => {
    const car = await requireCar(ctx, args.carId);
    const tire = car.tires.find((current) => current.id === args.tireId);
    if (!tire) throw new ConvexError("Reifensatz nicht gefunden.");
    if (args.archived && car.currentTireId === args.tireId) {
      throw new ConvexError("Montierte Reifen können nicht archiviert werden.");
    }
    if (tire.archived === args.archived) return car;
    return await saveCar(
      ctx,
      car,
      {
        tires: car.tires.map((current) =>
          current.id === tire.id
            ? { ...current, archived: args.archived }
            : current,
        ),
      },
      [
        event(
          "tire_change",
          args.archived
            ? "Reifensatz archiviert"
            : "Reifensatz wiederhergestellt",
          {
            action: args.archived ? "archived" : "restored",
            tireId: tire.id,
          },
        ),
      ],
    );
  },
});

export const changeTires = mutation({
  args: {
    carId: v.id("cars"),
    tireId: v.union(v.string(), v.null()),
    mileage: v.number(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const car = await requireCar(ctx, args.carId);
    const date = requireDate(args.date, true);
    requireMileage(args.mileage);
    if (car.tireChangeEvents.some((entry) => entry.carMileage > args.mileage)) {
      throw new ConvexError(
        "Der Kilometerstand darf nicht kleiner als beim letzten Reifenwechsel sein.",
      );
    }
    if (args.tireId === car.currentTireId) {
      throw new ConvexError(
        args.tireId
          ? "Dieser Reifensatz ist bereits montiert."
          : "Es sind keine Reifen montiert.",
      );
    }
    const target =
      args.tireId === null
        ? null
        : car.tires.find((tire) => tire.id === args.tireId);
    if (args.tireId !== null && !target)
      throw new ConvexError("Reifensatz nicht gefunden.");
    if (target?.archived)
      throw new ConvexError("Archivierte Reifen können nicht montiert werden.");
    if (target) requireMileage(target.currentMileage, "Reifenlaufleistung");
    const source =
      car.currentTireId === null
        ? null
        : car.tires.find((tire) => tire.id === car.currentTireId);
    if (car.currentTireId !== null && !source)
      throw new ConvexError("Der montierte Reifensatz wurde nicht gefunden.");
    for (const previous of car.tireChangeEvents) {
      const previousDate = normalizeCalendarDate(previous.date);
      if (previousDate && previousDate > date) {
        throw new ConvexError(
          "Das Datum darf nicht vor dem letzten Reifenwechsel liegen.",
        );
      }
    }
    const tireChangeEvents = [...car.tireChangeEvents];
    validateDatedMileage(car, { date, mileage: args.mileage });
    const sourceMileage = source
      ? getTireMileage({ ...car, mileage: args.mileage }, source)
      : null;
    if (sourceMileage !== null)
      requireMileage(sourceMileage, "Reifenlaufleistung");
    if (source && sourceMileage !== null) {
      tireChangeEvents.push({
        id: crypto.randomUUID(),
        date,
        carMileage: args.mileage,
        tireId: source.id,
        tireMileage: sourceMileage,
        changeType: "unmount",
      });
    }
    if (target) {
      tireChangeEvents.push({
        id: crypto.randomUUID(),
        date,
        carMileage: args.mileage,
        tireId: target.id,
        tireMileage: target.currentMileage,
        changeType: "mount",
      });
    }
    const mileage = Math.max(car.mileage, args.mileage);
    const tires = car.tires.map((tire) =>
      tire.id === source?.id && sourceMileage !== null
        ? { ...tire, currentMileage: sourceMileage }
        : tire,
    );
    if (target) {
      requireMileage(
        getTireMileage(
          {
            ...car,
            mileage,
            currentTireId: target.id,
            tireChangeEvents,
            tires,
          },
          target,
        ),
        "Reifenlaufleistung",
      );
    }
    return await saveCar(
      ctx,
      car,
      {
        mileage,
        currentTireId: args.tireId,
        tireChangeEvents,
        tires,
      },
      [
        event(
          "tire_change",
          target ? "Reifenwechsel durchgeführt" : "Reifensatz demontiert",
          {
            action: target ? "changed" : "unmounted",
            fromTireId: source?.id ?? null,
            toTireId: target?.id ?? null,
            mileage: args.mileage,
            date,
          },
        ),
      ],
    );
  },
});

export const saveTuv = mutation({
  args: {
    carId: v.id("cars"),
    date: v.string(),
    correctLast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const car = await requireCar(ctx, args.carId);
    const date = requireDate(args.date, true);
    const lastDate = normalizeCalendarDate(car.tuv.lastAppointmentDate);
    const dates = tuvDates(car);
    if (
      args.correctLast &&
      dates.some(
        (recordedDate) => recordedDate !== lastDate && recordedDate > date,
      )
    ) {
      throw new ConvexError(
        "Die Korrektur darf nicht vor einem weiteren gespeicherten TÜV-Termin liegen.",
      );
    }
    const historical =
      !args.correctLast && lastDate !== null && date < lastDate;
    if (historical) {
      const recorded = dates.includes(date);
      return await saveCar(
        ctx,
        car,
        {},
        recorded
          ? []
          : [
              event(
                "tuv_update",
                `Hauptuntersuchung nachgetragen: ${formatDate(date)}`,
                {
                  date,
                  historical: true,
                  action: "recorded",
                },
              ),
            ],
      );
    }
    const tuv = {
      lastAppointmentDate: date,
      nextAppointmentDate: calculateNextTUVDate(date),
      completed: true,
    };
    const unchanged =
      car.tuv.lastAppointmentDate === tuv.lastAppointmentDate &&
      car.tuv.nextAppointmentDate === tuv.nextAppointmentDate &&
      car.tuv.completed === tuv.completed;
    return await saveCar(
      ctx,
      car,
      { tuv },
      unchanged
        ? []
        : [
            event(
              "tuv_update",
              args.correctLast
                ? "Hauptuntersuchung korrigiert"
                : "Hauptuntersuchung eingetragen",
              {
                date,
                action: args.correctLast ? "corrected" : "recorded",
                previousDate: car.tuv.lastAppointmentDate,
              },
            ),
          ],
    );
  },
});

export const saveInspection = mutation({
  args: {
    carId: v.id("cars"),
    date: v.string(),
    mileage: v.number(),
    intervalYears: v.number(),
    intervalKm: v.number(),
    correctLast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const car = await requireCar(ctx, args.carId);
    const date = requireDate(args.date, true);
    requireMileage(args.mileage);
    if (args.mileage > car.mileage) {
      throw new ConvexError(
        "Der Inspektionskilometerstand darf nicht über dem aktuellen Kilometerstand liegen.",
      );
    }
    if (
      !Number.isInteger(args.intervalYears) ||
      args.intervalYears < 1 ||
      args.intervalYears > 10
    ) {
      throw new ConvexError(
        "Das Inspektionsintervall muss zwischen einem und zehn Jahren liegen.",
      );
    }
    if (!Number.isSafeInteger(args.intervalKm) || args.intervalKm <= 0) {
      throw new ConvexError(
        "Das Kilometerintervall muss eine positive ganze Zahl sein.",
      );
    }
    if (
      args.correctLast &&
      inspectionReadings(car, true).some(
        (reading) =>
          reading.date > date ||
          (reading.date === date && reading.mileage > args.mileage),
      )
    ) {
      throw new ConvexError(
        "Die Korrektur darf nicht vor einer weiteren gespeicherten Inspektion liegen.",
      );
    }
    if (
      normalizeCalendarDate(car.inspection.lastInspectionDate) !== date ||
      car.inspection.lastInspectionMileage !== args.mileage
    ) {
      validateDatedMileage(
        car,
        { date, mileage: args.mileage },
        { skipInspection: args.correctLast === true },
      );
    }
    const lastDate = normalizeCalendarDate(car.inspection.lastInspectionDate);
    const lastMileage = car.inspection.lastInspectionMileage;
    const historical =
      !args.correctLast &&
      lastDate !== null &&
      (date < lastDate ||
        (date === lastDate &&
          lastMileage !== null &&
          args.mileage < lastMileage));
    if (historical) {
      const activeReading = inspectionReadings(car, false).some(
        (reading) => reading.date === date && reading.mileage === args.mileage,
      );
      const recorded =
        activeReading &&
        car.eventLog?.some(
          (entry) =>
            entry.type === "inspection_update" &&
            entry.metadata?.date === date &&
            entry.metadata?.mileage === args.mileage &&
            entry.metadata?.intervalYears === args.intervalYears &&
            entry.metadata?.intervalKm === args.intervalKm,
        );
      return await saveCar(
        ctx,
        car,
        {},
        recorded
          ? []
          : [
              event(
                "inspection_update",
                `Inspektion nachgetragen: ${formatDate(date)} bei ${formatNumber(args.mileage)} km`,
                {
                  date,
                  mileage: args.mileage,
                  intervalYears: args.intervalYears,
                  intervalKm: args.intervalKm,
                  historical: true,
                  action: "recorded",
                },
              ),
            ],
      );
    }
    const nextDate = calculateNextInspectionDateByYear(
      date,
      args.intervalYears,
    );
    const inspection = {
      lastInspectionDate: date,
      lastInspectionMileage: args.mileage,
      nextInspectionDateByYear: nextDate,
      // Mileage projections change with today's date and are derived when reading the vehicle.
      nextInspectionDateByKm: null,
      nextInspectionDate: nextDate,
      intervalYears: args.intervalYears,
      intervalKm: args.intervalKm,
      completed: true,
    };
    const unchanged =
      car.inspection.lastInspectionDate === inspection.lastInspectionDate &&
      car.inspection.lastInspectionMileage ===
        inspection.lastInspectionMileage &&
      car.inspection.nextInspectionDateByYear ===
        inspection.nextInspectionDateByYear &&
      car.inspection.nextInspectionDateByKm ===
        inspection.nextInspectionDateByKm &&
      car.inspection.nextInspectionDate === inspection.nextInspectionDate &&
      car.inspection.intervalYears === inspection.intervalYears &&
      car.inspection.intervalKm === inspection.intervalKm &&
      car.inspection.completed === inspection.completed;
    return await saveCar(
      ctx,
      car,
      { inspection },
      unchanged
        ? []
        : [
            event(
              "inspection_update",
              args.correctLast
                ? "Inspektion korrigiert"
                : "Inspektion eingetragen",
              {
                date,
                mileage: args.mileage,
                intervalYears: args.intervalYears,
                intervalKm: args.intervalKm,
                action: args.correctLast ? "corrected" : "recorded",
                previousDate: car.inspection.lastInspectionDate,
                previousMileage: car.inspection.lastInspectionMileage,
              },
            ),
          ],
    );
  },
});

export const remove = mutation({
  args: { id: v.id("cars") },
  handler: async (ctx, args) => {
    await requireCar(ctx, args.id);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
