"use server";

import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { api } from "@/convex/_generated/api";
import { ConvexError } from "convex/values";
import type { CarActionName } from "@/app/lib/actions";
import { getDemoRuntime, readDemoCars } from "@/app/demo/runtime";

type DemoReference<Name extends CarActionName> = FunctionReference<
  "mutation",
  "public",
  FunctionArgs<(typeof api.cars)[Name]>,
  FunctionReturnType<(typeof api.cars)[Name]>
>;

export async function getDemoCars() {
  return readDemoCars();
}

export async function runDemoMutation<Name extends CarActionName>(
  name: Name,
  ...args: OptionalRestArgs<(typeof api.cars)[Name]>
) {
  const runtime = await getDemoRuntime();
  try {
    const result = await runtime.mutation<DemoReference<Name>>(
      api.cars[name],
      ...args,
    );
    return { ok: true as const, result, cars: await runtime.query(api.cars.list) };
  } catch (error) {
    // Server Actions do not preserve the ConvexError prototype across the browser boundary.
    if (error instanceof ConvexError && typeof error.data === "string")
      return { ok: false as const, error: error.data };
    throw error;
  }
}
