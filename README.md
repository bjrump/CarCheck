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

Historische TÜV- und Inspektionseinträge bleiben in der Historie sichtbar und ersetzen keine neuere Wartung. „Letzten Eintrag korrigieren“ ersetzt ausdrücklich die aktuelle Wartung; die Korrektur darf nicht hinter einen weiteren gespeicherten Service fallen. Gespeicherte Inspektionskilometer bleiben Teil der Plausibilitätsprüfung für spätere Einträge.

Ein verspätet eingetragener letzter Reifenwechsel verwendet den damaligen Kilometerstand. Der heutige Fahrzeugstand bleibt erhalten; die gefahrene Strecke wird den tatsächlich montierten Reifen zugeordnet. Wechsel vor bereits gespeicherten Reifenwechseln werden weiterhin abgewiesen.

Aufeinanderfolgende Tankbelege mit gleichem Kilometerstand bilden einen Tankstopp. Der letzte Beleg schließt dessen gemeinsames Verbrauchsintervall ab, auch über Monatsgrenzen. Verbrauch und Distanz gehören zum Abschlussmonat; Kosten und getankte Liter zum jeweiligen Belegmonat. Der erste gesamte Tankstopp bildet die Ausgangsbasis und zählt ausschließlich zu Litern und Kosten.

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

## Clerk-Instanz wechseln

Fahrzeuge gehören zur vollständigen Clerk-Identität einschließlich des Issuers. Nur die Schlüssel zu wechseln würde bestehende Fahrzeuge ausblenden.

Vor dem Wechsel auf der Convex-Produktionsinstanz konfigurieren:

- `CLERK_JWT_ISSUER_DOMAIN`: neuer Produktions-Issuer.
- `CLERK_LEGACY_ISSUER_DOMAIN`: bisheriger Issuer während des Rollouts; anschließend auf den leeren String setzen. Die Variable muss für die Auswertung der Convex-Auth-Konfiguration vorhanden sein.
- `CLERK_SECRET_KEY`: ausschließlich der geheime Schlüssel der neuen Instanz.
- `CLERK_LEGACY_GOOGLE_OWNERS`: privates JSON-Objekt mit bestätigter Google-Konto-ID als Schlüssel und bisherigem vollständigem `cars.userId` als Wert. Die IDs über die Clerk-Backend-API prüfen, niemals per E-Mail oder Client-Metadaten zuordnen. Diese Zuordnung gehört nicht ins Repository.

Die neue Clerk-Instanz braucht ein `convex`-JWT-Template mit Audience `convex`. Zuerst Backend und Konfiguration bereitstellen, danach die neuen Frontend-Schlüssel ausrollen. Die Garage wartet vor ihren Abfragen auf die Kontoprüfung. Convex bestätigt die Google-Konto-ID über Clerks Server-API und speichert eine eindeutige Besitzerzuordnung. Bestehende Fahrzeug-IDs und Inhalte bleiben erhalten; andere Nutzer können sie nicht übernehmen. Bei einem Prüfungsfehler erscheint eine Wiederholen-Aktion statt einer leeren Garage.

DNS, Zertifikate, Google OAuth und die bestehende Garage mit der neuen Anmeldung prüfen, bevor der alte Issuer entfernt wird. Für einen Rollback Frontend-Schlüssel und primären Issuer zurückstellen; Besitzerzuordnungen und Fahrzeuge bleiben bestehen.

[MIT-Lizenz](LICENSE).
