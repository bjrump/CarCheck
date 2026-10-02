"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Show, UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import AppHeader from "@/app/components/AppHeader";
import LandingPage from "@/app/components/LandingPage";
import Workspace from "@/app/components/Workspace";

function Garage() {
  const { isAuthenticated } = useConvexAuth();
  const cars = useQuery(api.cars.list, isAuthenticated ? {} : "skip");
  const actions = {
    create: useMutation(api.cars.create),
    update: useMutation(api.cars.update),
    remove: useMutation(api.cars.remove),
    saveFuelEntry: useMutation(api.cars.saveFuelEntry),
    removeFuelEntry: useMutation(api.cars.removeFuelEntry),
    addTire: useMutation(api.cars.addTire),
    setTireArchived: useMutation(api.cars.setTireArchived),
    changeTires: useMutation(api.cars.changeTires),
    saveTuv: useMutation(api.cars.saveTuv),
    saveInspection: useMutation(api.cars.saveInspection),
  };
  const account = (
    <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
  );
  if (cars === undefined)
    return (
      <div className="workspace-shell">
        <AppHeader view="garage" account={account} />
        <main className="garage-main" role="status">
          <h1 className="text-2xl font-medium">Deine Garage wird geladen.</h1>
          <p className="mt-3 text-sm text-muted-foreground">Einen Moment.</p>
        </main>
      </div>
    );
  return <Workspace cars={cars} actions={actions} account={account} />;
}

export default function LiveWorkspace() {
  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>
      <Show when="signed-in">
        <Garage />
      </Show>
    </>
  );
}
