"use client";

import { useMemo, useState } from "react";
import { ConvexError } from "convex/values";
import Workspace from "@/app/components/Workspace";
import { runDemoMutation } from "@/app/demo/actions";
import type { CarActions } from "@/app/lib/actions";
import type { Car } from "@/app/lib/types";

export default function DemoWorkspace({ initialCars }: { initialCars: Car[] }) {
  const [cars, setCars] = useState(initialCars);
  const actions = useMemo<CarActions>(() => {
    async function applyMutation<Result>(
      request: Promise<
        { ok: true; result: Result; cars: Car[] } | { ok: false; error: string }
      >,
    ) {
      const response = await request;
      if (!response.ok) throw new ConvexError(response.error);
      setCars(response.cars);
      return response.result;
    }
    return {
      create: (args) => applyMutation(runDemoMutation("create", args)),
      update: (args) => applyMutation(runDemoMutation("update", args)),
      remove: (args) => applyMutation(runDemoMutation("remove", args)),
      saveFuelEntry: (args) =>
        applyMutation(runDemoMutation("saveFuelEntry", args)),
      removeFuelEntry: (args) =>
        applyMutation(runDemoMutation("removeFuelEntry", args)),
      addTire: (args) => applyMutation(runDemoMutation("addTire", args)),
      setTireArchived: (args) =>
        applyMutation(runDemoMutation("setTireArchived", args)),
      changeTires: (args) =>
        applyMutation(runDemoMutation("changeTires", args)),
      saveTuv: (args) => applyMutation(runDemoMutation("saveTuv", args)),
      saveInspection: (args) =>
        applyMutation(runDemoMutation("saveInspection", args)),
    };
  }, []);

  return <Workspace cars={cars} actions={actions} isDemo />;
}
