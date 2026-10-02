# CarCheck

Deine Fahrzeuge, Wartung und Tankkosten an einem Ort. Deutsche Oberfläche mit kompakter Garage, Aufgabenliste und Fahrzeugdetails. Dark Mode ist Standard; das helle Design lässt sich jederzeit einschalten.

CarCheck nutzt Next.js, React, TypeScript, Tailwind CSS v4, shadcn/ui, Clerk und Convex. Die installierten Versionen stehen in `package.json`.

## Funktionen

- Fahrzeuge mit Kilometerstand, Kennzeichen, FIN und optionaler Versicherung verwalten.
- TÜV nach zwei Jahren; Inspektion nach Zeit oder Kilometerintervall. Kilometeränderungen aktualisieren den Status und die ausdrücklich als Schätzung markierte Prognose.
- Sommer-, Winter- und Ganzjahresreifen mit kumulierter Laufleistung, Montagehistorie und Archiv verwalten. Verpasste saisonale Wechsel bleiben überfällig.
- Tankfüllungen hinzufügen, bearbeiten und löschen. Verbrauch und gewichteter Literpreis werden neu berechnet; fehlende Preise werden kenntlich gemacht.
- Gemeinsame Aufgabenliste und durchsuchbare Fahrzeughistorie. Fahrzeugauswahl und Tabs lassen sich über die URL teilen.

Datumsfelder verwenden `YYYY-MM-DD`. Bestehende ISO-Zeitstempel werden anhand ihres Kalendertags in Europe/Berlin gelesen. Die bestehenden Convex-Dokumente bleiben kompatibel; eine Datenmigration ist für diese Version nicht erforderlich.

## Lokal ausprobieren

```bash
bun install --frozen-lockfile
bun run dev:demo
```

Öffne <http://127.0.0.1:3109>. Die öffentliche Startseite kannst du lokal unter `/demo/landing` ansehen. Die Beispielgarage führt die echten registrierten Convex-Funktionen mit `convex-test` im Arbeitsspeicher aus. Änderungen gehen beim Neustart verloren. Es werden keine Zugangsdaten oder gehosteten Datenbanken verwendet. Der Modus ist ausschließlich in der Entwicklung mit `CARCHECK_DEMO=1` verfügbar.

## Entwicklung mit Anmeldung

Erstelle `.env.local` mit den Werten deiner eigenen Entwicklungsumgebung:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev
NEXT_PUBLIC_CONVEX_URL=https://your-dev-project.convex.cloud
```

Konfiguriere Clerk mit dem Convex-JWT-Template. Starte für dieses Entwicklungsprojekt `bunx convex dev` und in einem zweiten Terminal `bun dev`. Die App läuft auf Port 3000. Anmeldung und Echtzeitdaten werden durch Clerk und Convex bereitgestellt.

## Prüfung

```bash
bun run lint
bun run test
bun x tsc --noEmit
bun run build
```

Für den Build werden die öffentlichen Clerk- und Convex-Variablen benötigt; die CI verwendet Platzhalter. Die Tests prüfen Domänenberechnungen, registrierte Mutationen, Eigentümerzugriff und die lokale Vorschau. Browserprüfungen der Beispielgarage ersetzen keine Prüfung der gehosteten Clerk-Anmeldung.

## Struktur

- `app/components/Workspace.tsx`: Garage, globale Aufgaben/Historie und URL-Navigation.
- `app/components/CarDetail.tsx`: Übersicht, Wartung, Reifen, Tankbuch und Historie.
- `app/components/VehicleDialogs.tsx`: kontrollierte Formulare.
- `app/components/ui/`: shadcn/ui-Komponenten; `components.json` enthält die Registry-Konfiguration.
- `app/lib/utils.ts`: gemeinsame Kalender-, Wartungs-, Reifen- und Tankberechnungen.
- `convex/cars.ts`: authentifizierte, atomare Befehle für jede Änderung.
- `app/demo/`: lokale Testumgebung und Server Actions, in Produktion gesperrt.

Beim Rollout müssen die neuen Convex-Funktionen zusammen mit dem Frontend verfügbar sein. Deployment erfolgt getrennt von lokaler Entwicklung.

[MIT-Lizenz](LICENSE).
