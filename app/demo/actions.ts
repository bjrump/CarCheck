"use server";

import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { api } from "@/convex/_generated/api";
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
  const result = await runtime.mutation<DemoReference<Name>>(
    api.cars[name],
    ...args,
  );
  return { result, cars: await runtime.query(api.cars.list) };
}
