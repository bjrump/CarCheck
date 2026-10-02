"use client";

import {
  CalendarDays,
  CarFront,
  CircleDot,
  Fuel,
  History,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { Button } from "@/app/components/ui/button";

export default function LandingPage({ isDemo = false }: { isDemo?: boolean }) {
  return (
    <div className="workspace-shell">
      <AppHeader
        isPublic
        account={
          isDemo ? (
            <Button size="sm" variant="outline" asChild>
              <Link href="/">Garage öffnen</Link>
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button size="sm" variant="outline">
                Anmelden
              </Button>
            </SignInButton>
          )
        }
      />
      <main className="landing-preview">
        <div className="landing-hero">
          <div>
            <h1>
              Dein Auto.
              <br />
              Alles im Blick.
            </h1>
            <p>
              TÜV, Inspektion, Reifen und Tankkosten. CarCheck hält zusammen,
              was du sonst zusammensuchen musst.
            </p>
            {isDemo ? (
              <Button asChild>
                <Link href="/">
                  Garage ausprobieren
                  <ArrowRight />
                </Link>
              </Button>
            ) : (
              <SignUpButton mode="modal">
                <Button>
                  Garage anlegen
                  <ArrowRight />
                </Button>
              </SignUpButton>
            )}
            <p className="!mt-4 !text-xs">
              Ein Auto oder mehrere. Ein Platz für alles.
            </p>
          </div>
          <div
            className="landing-example"
            aria-label="Beispiel einer Fahrzeugübersicht"
          >
            <div className="flex items-center justify-between border-b pb-5">
              <div>
                <p className="text-sm font-medium">Volkswagen Golf 7</p>
                <p className="vehicle-meta">B CC 204 · 128.450 km</p>
              </div>
              <CarFront size={23} strokeWidth={1.5} />
            </div>
            <div className="task-row">
              <CircleDot size={16} className="text-upcoming" />
              <div className="flex-1">
                <p className="task-title">Winterreifen montieren</p>
                <p className="task-meta">Sommerreifen sind noch montiert</p>
              </div>
              <ArrowUpRight size={14} className="text-muted-foreground" />
            </div>
            <div className="task-row">
              <CalendarDays size={16} className="text-upcoming" />
              <div className="flex-1">
                <p className="task-title">Hauptuntersuchung</p>
                <p className="task-meta">Nächsten Termin im Blick behalten</p>
              </div>
              <ArrowUpRight size={14} className="text-muted-foreground" />
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              So könnte deine Garage aussehen.
            </p>
          </div>
        </div>
        <div className="landing-features">
          {[
            {
              icon: CalendarDays,
              title: "Wissen, was fällig ist.",
              text: "Termine und Kilometerintervalle in einer Übersicht. Die nächste Aufgabe steht zuerst.",
            },
            {
              icon: Fuel,
              title: "Kosten nachvollziehen.",
              text: "Tankfüllungen eintragen. Verbrauch und Ausgaben direkt beim Fahrzeug sehen.",
            },
            {
              icon: History,
              title: "Die Historie behalten.",
              text: "Wartung, Reifenwechsel und Kilometerstände. Zusammen statt über Notizen verteilt.",
            },
          ].map((feature) => (
            <section key={feature.title}>
              <feature.icon
                size={18}
                strokeWidth={1.5}
                className="mb-4 text-muted-foreground"
              />
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
