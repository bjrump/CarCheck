import { afterEach, describe, expect, it, vi } from "vitest";
import { getDemoCars, runDemoMutation } from "@/app/demo/actions";

afterEach(() => vi.unstubAllEnvs());

describe("Local demo server actions", () => {
  it("runs registered mutations against seeded Convex IDs and returns the new state", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CARCHECK_DEMO", "1");
    const initialCars = await getDemoCars();
    expect(initialCars.map((car) => car.model)).toEqual([
      "Golf 7",
      "320d",
      "Octavia",
    ]);

    const created = await runDemoMutation("create", {
      make: "Audi",
      model: "A4",
      year: 2021,
      mileage: 50_000,
      insurance: null,
    });
    expect(created.cars).toHaveLength(initialCars.length + 1);
    const id = created.result;
    try {
      const updated = await runDemoMutation("update", { id, mileage: 50_100 });
      expect(updated.cars.find((car) => car._id === id)?.mileage).toBe(50_100);
    } finally {
      const removed = await runDemoMutation("remove", { id });
      expect(removed.cars).toHaveLength(initialCars.length);
    }
  });

  it("blocks production and disabled demo access, including an already seeded runtime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CARCHECK_DEMO", "1");
    await expect(getDemoCars()).rejects.toThrow("nur im Entwicklungsmodus");
    await expect(
      runDemoMutation("create", {
        make: "Audi",
        model: "A4",
        year: 2021,
        mileage: 50_000,
        insurance: null,
      }),
    ).rejects.toThrow("nur im Entwicklungsmodus");

    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CARCHECK_DEMO", "0");
    await expect(getDemoCars()).rejects.toThrow("nur im Entwicklungsmodus");
  });
});
