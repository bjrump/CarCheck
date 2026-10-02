import { convexTest } from "convex-test";
import { addDays, addYears, formatISO } from "date-fns";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import type { Doc } from "@/convex/_generated/dataModel";

const demoIdentity = "carcheck-demo";

function requireDemoMode() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.CARCHECK_DEMO !== "1"
  ) {
    throw new Error("Die lokale Demo ist nur im Entwicklungsmodus verfügbar.");
  }
}

async function initializeDemoRuntime() {
  const runtime = convexTest(schema, {
    "./_generated/server.js": () => import("@/convex/_generated/server"),
    "./cars.ts": () => import("@/convex/cars"),
  }).withIdentity({ tokenIdentifier: demoIdentity });
  const today = new Date();
  const day = (offset: number) =>
    formatISO(addDays(today, offset), { representation: "date" });
  const yearsAgo = (date: string, years: number) =>
    formatISO(addYears(new Date(date), -years), { representation: "date" });

  function carFixture(
    make: string,
    model: string,
    year: number,
    licensePlate: string,
    mileage: number,
    tuvIn: number,
    inspectionIn: number,
    tireType: "summer" | "winter" | "all-season",
  ): Omit<Doc<"cars">, "_id" | "_creationTime"> {
    const tireId = `${model}-mounted`;
    const tireBrand =
      tireType === "summer"
        ? "Continental"
        : tireType === "winter"
          ? "Michelin"
          : "Goodyear";
    return {
      userId: demoIdentity,
      make,
      model,
      year,
      licensePlate,
      mileage,
      insurance: {
        provider: "HUK24",
        policyNumber: "DEMO-2026",
        expiryDate: day(240),
      },
      tuv: {
        lastAppointmentDate: yearsAgo(day(tuvIn), 2),
        nextAppointmentDate: day(tuvIn),
        completed: false,
      },
      inspection: {
        lastInspectionDate: yearsAgo(day(inspectionIn), 1),
        lastInspectionMileage: mileage - (inspectionIn < 0 ? 15_400 : 9_000),
        nextInspectionDateByYear: day(inspectionIn),
        nextInspectionDateByKm: day(inspectionIn + 30),
        nextInspectionDate: day(inspectionIn),
        intervalYears: 1,
        intervalKm: 15_000,
        completed: false,
      },
      tires: [
        {
          id: tireId,
          type: tireType,
          brand: tireBrand,
          currentMileage: 7_200,
          archived: false,
        },
        ...(tireType === "all-season"
          ? []
          : [
              {
                id: `${model}-stored`,
                type:
                  tireType === "summer"
                    ? ("winter" as const)
                    : ("summer" as const),
                brand: tireType === "summer" ? "Michelin" : "Continental",
                currentMileage: 8_200,
                archived: false,
              },
            ]),
      ],
      currentTireId: tireId,
      tireChangeEvents: [
        {
          id: `${model}-mounted-event`,
          date: day(-140),
          carMileage: mileage - 5_600,
          tireId,
          tireMileage: 7_200,
          changeType: "mount",
        },
      ],
      fuelEntries: [
        {
          id: `${model}-fuel-1`,
          date: day(-30),
          mileage: mileage - 1_200,
          liters: 39.5,
          pricePerLiter: 1.729,
          totalCost: 68.3,
        },
        {
          id: `${model}-fuel-2`,
          date: day(-15),
          mileage: mileage - 600,
          liters: 38.8,
          kmDriven: 600,
          consumption: 38.8 / 6,
        },
        {
          id: `${model}-fuel-3`,
          date: day(-2),
          mileage,
          liters: 40.2,
          kmDriven: 600,
          consumption: 40.2 / 6,
          pricePerLiter: 1.689,
          totalCost: 67.9,
        },
      ],
      eventLog: [
        {
          id: `${model}-created`,
          type: "car_created",
          date: day(-400),
          description: `Fahrzeug ${make} ${model} (${year}) angelegt`,
        },
        {
          id: `${model}-fuel-log`,
          type: "fuel_entry",
          date: day(-2),
          description: "Tankfüllung: 40,2 l erfasst",
        },
      ],
    };
  }

  await runtime.run(async (ctx) => {
    await ctx.db.insert(
      "cars",
      carFixture(
        "Volkswagen",
        "Golf 7",
        2018,
        "OL BR 401",
        84_230,
        28,
        160,
        "summer",
      ),
    );
    await ctx.db.insert(
      "cars",
      carFixture("BMW", "320d", 2020, "OL BR 320", 112_600, 200, -4, "winter"),
    );
    await ctx.db.insert(
      "cars",
      carFixture(
        "Škoda",
        "Octavia",
        2022,
        "OL BR 812",
        38_450,
        19,
        220,
        "all-season",
      ),
    );
  });
  return runtime;
}

type DemoRuntime = Awaited<ReturnType<typeof initializeDemoRuntime>>;
const demoGlobal: typeof globalThis & {
  carcheckDemoRuntime?: Promise<DemoRuntime>;
} = globalThis;

// Keep this isolated in-memory database across development hot reloads.
export async function getDemoRuntime() {
  requireDemoMode();
  demoGlobal.carcheckDemoRuntime ??= initializeDemoRuntime();
  return demoGlobal.carcheckDemoRuntime;
}

export async function readDemoCars() {
  const runtime = await getDemoRuntime();
  return runtime.query(api.cars.list);
}
