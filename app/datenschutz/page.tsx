import type { Metadata } from "next";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";

export const metadata: Metadata = { title: "Datenschutz | CarCheck" };

export default function PrivacyPage() {
  return (
    <div className="workspace-shell">
      <AppHeader isPublic />
      <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
        <h1 className="text-3xl font-medium">Datenschutz</h1>
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Nutzung und Kontakt</h2>
          <p>
            CarCheck wird privat zur Verwaltung von Fahrzeugen im Freundeskreis
            genutzt. Betreiber ist Benedikt Rump. Bei Fragen zur Verarbeitung
            oder Löschung deiner Daten erreichst du mich unter{" "}
            <a
              className="text-primary underline"
              href="mailto:bjrump@gmail.com"
            >
              bjrump@gmail.com
            </a>
            .
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Google-Anmeldung</h2>
          <p>
            Bei der Anmeldung werden deine Google-Konto-ID, dein Name, deine
            E-Mail-Adresse und dein Profilbild verarbeitet. Sie dienen der
            Anmeldung, der Anzeige deines Kontos und der Zuordnung deiner
            Garage. Clerk verwaltet das Benutzerkonto und die Anmeldesitzung.
            Beim Wechsel der Anmeldeinstanz wird die bestätigte Google-Konto-ID
            verwendet, um bestehende Fahrzeuge demselben Nutzer zuzuordnen.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Fahrzeugdaten</h2>
          <p>
            Convex speichert die von dir eingegebenen Fahrzeugdaten: unter
            anderem Marke, Modell, Baujahr, Kilometerstände, Kennzeichen,
            Fahrgestellnummer, Versicherungsangaben, Wartungen, Reifen,
            Tankeinträge und Notizen. Die Daten werden deinem Konto zugeordnet
            und für die Ansichten und Berechnungen in deiner Garage verwendet.
          </p>
          <p>
            Fahrzeuge und Tankeinträge kannst du in der Garage löschen. Die
            übrigen gespeicherten Angaben bleiben erhalten, bis sie bearbeitet
            oder mit dem Fahrzeug gelöscht werden. Für die Löschung deines
            Kontos und verbleibender Daten kontaktiere mich über die oben
            genannte E-Mail-Adresse.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Technische Dienstleister</h2>
          <p>
            Vercel stellt die Website bereit, Clerk die Anmeldung und Convex die
            Datenbank. Beim Betrieb können diese Dienste technische
            Verbindungsdaten wie IP-Adressen und Protokolle verarbeiten.
            Notwendige Anmeldecookies halten deine Sitzung aufrecht; deine
            gewählte Darstellung wird im Browser gespeichert.
          </p>
          <p>
            Informationen der Dienstleister:{" "}
            <a
              className="text-primary underline"
              href="https://policies.google.com/privacy"
            >
              Google
            </a>
            ,{" "}
            <a
              className="text-primary underline"
              href="https://clerk.com/legal/privacy"
            >
              Clerk
            </a>
            ,{" "}
            <a
              className="text-primary underline"
              href="https://www.convex.dev/legal/privacy"
            >
              Convex
            </a>{" "}
            und{" "}
            <a
              className="text-primary underline"
              href="https://vercel.com/legal/privacy-policy"
            >
              Vercel
            </a>
            .
          </p>
        </section>
        <Link className="inline-block text-sm text-primary underline" href="/">
          Zurück zur Garage
        </Link>
      </main>
    </div>
  );
}
