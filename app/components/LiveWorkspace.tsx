"use client";

import { useEffect, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { Show, UserButton, useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import AppHeader from "@/app/components/AppHeader";
import LandingPage from "@/app/components/LandingPage";
import Workspace from "@/app/components/Workspace";

function Garage() {
  const { isAuthenticated } = useConvexAuth();
  const prepare = useAction(api.identity.prepare);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    prepare().then(
      () => {
        if (active) setReady(true);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [isAuthenticated, prepare, attempt]);
  const cars = useQuery(api.cars.list, isAuthenticated && ready ? {} : "skip");
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
          <h1 className="text-2xl font-medium">
            {error
              ? "Deine Garage konnte nicht geladen werden."
              : "Deine Garage wird geladen."}
          </h1>
          {error ? (
            <button
              className="mt-3 text-sm text-primary underline"
              onClick={() => {
                setError(false);
                setAttempt((value) => value + 1);
              }}
            >
              Erneut versuchen
            </button>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Einen Moment.</p>
          )}
        </main>
      </div>
    );
  return <Workspace cars={cars} actions={actions} account={account} />;
}

export default function LiveWorkspace() {
  const { userId } = useAuth();
  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>
      <Show when="signed-in">
        <Garage key={userId} />
      </Show>
    </>
  );
}
