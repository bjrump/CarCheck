import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("Cars Backend Tests", () => {
  it("should create a car with default values", async () => {
    const t = convexTest(schema, modules);
    const userId = "user-123";

    const carId = await t.withIdentity({ tokenIdentifier: userId }).mutation(api.cars.create, {
      make: "Audi",
      model: "A4",
      year: 2020,
      mileage: 50000,
      insurance: null,
    });

    const car = await t.withIdentity({ tokenIdentifier: userId }).query(api.cars.getById, { id: carId });
    expect(car).not.toBeNull();
    expect(car?.make).toBe("Audi");
    expect(car?.userId).toBe(userId);
    
    expect(car?.tuv.completed).toBe(false);
    expect(car?.inspection.intervalKm).toBe(15000);
  });

  it("should fail to create a car if not authenticated", async () => {
    const t = convexTest(schema, modules);
    
    await expect(async () => {
      await t.mutation(api.cars.create, {
        make: "BMW",
        model: "X5",
        year: 2022,
        mileage: 10000,
        insurance: null,
      });
    }).rejects.toThrow("Nicht authentifiziert");
  });

  it("should list only user's own cars", async () => {
    const t = convexTest(schema, modules);
    const userA = "user-A";
    const userB = "user-B";

    await t.withIdentity({ tokenIdentifier: userA }).mutation(api.cars.create, {
      make: "VW", model: "Golf", year: 2019, mileage: 80000, insurance: null
    });
    await t.withIdentity({ tokenIdentifier: userA }).mutation(api.cars.create, {
      make: "VW", model: "Passat", year: 2021, mileage: 40000, insurance: null
    });

    await t.withIdentity({ tokenIdentifier: userB }).mutation(api.cars.create, {
      make: "Tesla", model: "Model 3", year: 2023, mileage: 5000, insurance: null
    });

    const carsA = await t.withIdentity({ tokenIdentifier: userA }).query(api.cars.list);
    expect(carsA).toHaveLength(2);
    expect(carsA.every(c => c.userId === userA)).toBe(true);

    const carsB = await t.withIdentity({ tokenIdentifier: userB }).query(api.cars.list);
    expect(carsB).toHaveLength(1);
    expect(carsB[0].make).toBe("Tesla");
  });

  it("should update car details", async () => {
    const t = convexTest(schema, modules);
    const userId = "user-123";

    const carId = await t.withIdentity({ tokenIdentifier: userId }).mutation(api.cars.create, {
      make: "Opel", model: "Corsa", year: 2018, mileage: 60000, insurance: null
    });

    await t.withIdentity({ tokenIdentifier: userId }).mutation(api.cars.update, {
      id: carId,
      mileage: 65000
    });

    const updatedCar = await t.withIdentity({ tokenIdentifier: userId }).query(api.cars.getById, { id: carId });
    expect(updatedCar?.mileage).toBe(65000);
  });
});
