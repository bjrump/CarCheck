import type { Doc } from "@/convex/_generated/dataModel";

export type Car = Doc<"cars">;
export type Tire = Car["tires"][number];
export type TireType = Tire["type"];
export type TireChangeEvent = Car["tireChangeEvents"][number];
export type FuelEntry = NonNullable<Car["fuelEntries"]>[number];
export type TUV = Car["tuv"];
export type Inspection = Car["inspection"];
export type Insurance = NonNullable<Car["insurance"]>;
export type CarEvent = NonNullable<Car["eventLog"]>[number];
export type EventType = CarEvent["type"];
