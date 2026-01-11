import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    
    const userId = identity.tokenIdentifier;
    return await ctx.db
      .query("cars")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("cars") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    const car = await ctx.db.get(args.id);
    if (!car || car.userId !== identity.tokenIdentifier) {
      return null;
    }
    
    return car;
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
    insurance: v.union(
      v.object({
        provider: v.string(),
        policyNumber: v.string(),
        expiryDate: v.string(),
      }),
      v.null()
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Nicht authentifiziert");
    }
    
    const defaultTuv = {
      lastAppointmentDate: null,
      nextAppointmentDate: null,
      completed: false,
    };
    
    const defaultInspection = {
      lastInspectionDate: null,
      lastInspectionMileage: null,
      nextInspectionDateByYear: null,
      nextInspectionDateByKm: null,
      nextInspectionDate: null,
      intervalYears: 1,
      intervalKm: 15000,
      completed: false,
    };
    
    return await ctx.db.insert("cars", {
      userId: identity.tokenIdentifier,
      make: args.make,
      model: args.model,
      year: args.year,
      vin: args.vin,
      licensePlate: args.licensePlate,
      mileage: args.mileage,
      insurance: args.insurance,
      tuv: defaultTuv,
      inspection: defaultInspection,
      tires: [],
      tireChangeEvents: [],
      currentTireId: null,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("cars"),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    vin: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    mileage: v.optional(v.number()),
    insurance: v.optional(
      v.union(
        v.object({
          provider: v.string(),
          policyNumber: v.string(),
          expiryDate: v.string(),
        }),
        v.null()
      )
    ),
    tuv: v.optional(
      v.object({
        lastAppointmentDate: v.union(v.string(), v.null()),
        nextAppointmentDate: v.union(v.string(), v.null()),
        completed: v.boolean(),
      })
    ),
    inspection: v.optional(
      v.object({
        lastInspectionDate: v.union(v.string(), v.null()),
        lastInspectionMileage: v.union(v.number(), v.null()),
        nextInspectionDateByYear: v.union(v.string(), v.null()),
        nextInspectionDateByKm: v.union(v.string(), v.null()),
        nextInspectionDate: v.union(v.string(), v.null()),
        intervalYears: v.number(),
        intervalKm: v.number(),
        completed: v.boolean(),
      })
    ),
    tires: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("summer"),
            v.literal("winter"),
            v.literal("all-season")
          ),
          brand: v.optional(v.string()),
          model: v.optional(v.string()),
          currentMileage: v.number(),
          archived: v.boolean(),
        })
      )
    ),
    tireChangeEvents: v.optional(
      v.array(
        v.object({
          id: v.string(),
          date: v.string(),
          carMileage: v.number(),
          tireId: v.string(),
          tireMileage: v.number(),
          changeType: v.union(v.literal("mount"), v.literal("unmount")),
        })
      )
    ),
    currentTireId: v.optional(v.union(v.string(), v.null())),
    fuelEntries: v.optional(
      v.array(
        v.object({
          id: v.string(),
          date: v.string(),
          mileage: v.number(),
          liters: v.number(),
          kmDriven: v.optional(v.number()),
          consumption: v.optional(v.number()),
          pricePerLiter: v.optional(v.number()),
          totalCost: v.optional(v.number()),
          notes: v.optional(v.string()),
        })
      )
    ),
    eventLog: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("mileage_update"),
            v.literal("tuv_update"),
            v.literal("inspection_update"),
            v.literal("tire_change"),
            v.literal("car_created"),
            v.literal("car_updated"),
            v.literal("insurance_update"),
            v.literal("fuel_entry")
          ),
          date: v.string(),
          description: v.string(),
          metadata: v.optional(v.any()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Nicht authentifiziert");
    }
    
    const car = await ctx.db.get(args.id);
    if (!car || car.userId !== identity.tokenIdentifier) {
      throw new Error("Fahrzeug nicht gefunden");
    }
    
    const { id: _id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    await ctx.db.patch(args.id, filteredUpdates);
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("cars") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Nicht authentifiziert");
    }
    
    const car = await ctx.db.get(args.id);
    if (!car || car.userId !== identity.tokenIdentifier) {
      throw new Error("Fahrzeug nicht gefunden");
    }
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
