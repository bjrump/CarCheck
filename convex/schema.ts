import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const tireTypeValidator = v.union(
  v.literal("summer"),
  v.literal("winter"),
  v.literal("all-season")
);

const tireValidator = v.object({
  id: v.string(),
  type: tireTypeValidator,
  brand: v.optional(v.string()),
  model: v.optional(v.string()),
  currentMileage: v.number(),
  archived: v.boolean(),
});

const tireChangeEventValidator = v.object({
  id: v.string(),
  date: v.string(),
  carMileage: v.number(),
  tireId: v.string(),
  tireMileage: v.number(),
  changeType: v.union(v.literal("mount"), v.literal("unmount")),
});

const tuvValidator = v.object({
  lastAppointmentDate: v.union(v.string(), v.null()),
  nextAppointmentDate: v.union(v.string(), v.null()),
  completed: v.boolean(),
});

const inspectionValidator = v.object({
  lastInspectionDate: v.union(v.string(), v.null()),
  lastInspectionMileage: v.union(v.number(), v.null()),
  nextInspectionDateByYear: v.union(v.string(), v.null()),
  nextInspectionDateByKm: v.union(v.string(), v.null()),
  nextInspectionDate: v.union(v.string(), v.null()),
  intervalYears: v.number(),
  intervalKm: v.number(),
  completed: v.boolean(),
});

const insuranceValidator = v.object({
  provider: v.string(),
  policyNumber: v.string(),
  expiryDate: v.string(),
});

const fuelEntryValidator = v.object({
  id: v.string(),
  date: v.string(),
  mileage: v.number(),
  liters: v.number(),
  kmDriven: v.optional(v.number()),
  consumption: v.optional(v.number()),
  pricePerLiter: v.optional(v.number()),
  totalCost: v.optional(v.number()),
  notes: v.optional(v.string()),
});

const eventTypeValidator = v.union(
  v.literal("mileage_update"),
  v.literal("tuv_update"),
  v.literal("inspection_update"),
  v.literal("tire_change"),
  v.literal("car_created"),
  v.literal("car_updated"),
  v.literal("insurance_update"),
  v.literal("fuel_entry")
);

const carEventValidator = v.object({
  id: v.string(),
  type: eventTypeValidator,
  date: v.string(),
  description: v.string(),
  metadata: v.optional(v.any()),
});

export default defineSchema({
  cars: defineTable({
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    vin: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    mileage: v.number(),
    insurance: v.union(insuranceValidator, v.null()),
    tuv: tuvValidator,
    inspection: inspectionValidator,
    tires: v.array(tireValidator),
    tireChangeEvents: v.array(tireChangeEventValidator),
    currentTireId: v.union(v.string(), v.null()),
    fuelEntries: v.optional(v.array(fuelEntryValidator)),
    eventLog: v.optional(v.array(carEventValidator)),
  }).index("by_user", ["userId"]),
});
