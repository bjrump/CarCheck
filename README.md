# CarCheck - Fahrzeugverwaltung

Eine moderne Next.js-Anwendung zur umfassenden Verwaltung Ihrer Fahrzeuge mit TÜV-Terminen, Inspektionen, Reifenverwaltung und Versicherungsinformationen.

## Features

### Fahrzeugverwaltung
- **Mehrere Fahrzeuge verwalten**: Erstellen, bearbeiten und löschen Sie Fahrzeuge mit allen wichtigen Informationen
- **Fahrzeugdetails**: Marke, Modell, Baujahr, VIN, Kennzeichen und Kilometerstand
- **Versicherungsinformationen**: Versicherer, Versicherungsnummer und Ablaufdatum speichern

### TÜV-Verwaltung
- **TÜV-Termine verwalten**: Letzten und nächsten TÜV-Termin erfassen
- **Automatische Berechnung**: Nächster Termin wird automatisch auf 2 Jahre nach dem letzten Termin berechnet
- **Fortschrittsanzeige**: Visuelle Anzeige des Zeitfortschritts bis zum nächsten Termin
- **Statusanzeige**: Übersichtliche Anzeige ob Termine überfällig, anstehend oder in Ordnung sind

### Inspektions-Verwaltung
- **Duale Intervalle**: Verwaltung von Inspektionen basierend auf Zeit (Jahre) und Kilometerstand
- **Automatische Berechnung**: Nächste Inspektion wird basierend auf dem früheren Datum berechnet (Zeit oder Kilometer)
- **Fortschrittsanzeige**: Separate Fortschrittsbalken für Zeit- und Kilometer-Fortschritt
- **Flexible Intervalle**: Individuelle Intervalle pro Fahrzeug konfigurierbar

### Reifenverwaltung
- **Reifentypen**: Verwaltung von Sommer-, Winter- und Allwetterreifen
- **Reifensätze verwalten**: Mehrere Reifensätze pro Fahrzeug mit Marke, Modell und gefahrenen Kilometern
- **Reifenwechsel-Tracking**: Vollständige Historie aller Reifenwechsel mit Datum, Kilometerstand und Reifentyp
- **Automatische Kilometerberechnung**: Aktuelle Kilometer der montierten Reifen werden automatisch berechnet
- **Reifen archivieren**: Alte Reifensätze archivieren, ohne sie zu löschen
- **Reifenwechsel-Erinnerungen**: Automatische Berechnung der nächsten Reifenwechsel (Sommer/Winter)

### Dashboard
- **Übersicht**: Zentrale Übersicht über alle Fahrzeuge
- **Statistiken**: Anzahl Fahrzeuge, anstehende und überfällige Termine
- **Bevorstehende Termine**: Listen für TÜV, Inspektionen und Reifenwechsel
- **Nächste Termine**: Übersicht der Termine in den nächsten 30 Tagen
- **Statusanzeigen**: Farbcodierte Statusanzeigen für alle Wartungstermine

### Benutzeroberfläche
- **Dark/Light Mode**: Umschaltbares Theme für bessere Nutzererfahrung
- **Moderne UI**: Glassmorphism-Design mit Tailwind CSS
- **Responsive Design**: Optimiert für Desktop und Mobile
- **Fortschrittsbalken**: Visuelle Fortschrittsanzeigen für alle Wartungsintervalle

## Technologie-Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **date-fns** für Datumsberechnungen
- **JSON-basierte Datenspeicherung**

## Installation

1. Abhängigkeiten installieren:
```bash
npm install
```

2. Entwicklungsserver starten:
```bash
npm run dev
```

3. Im Browser öffnen:
```
http://localhost:3000
```

## Datenstruktur

Die Daten werden in `data/cars.json` gespeichert. Diese Datei wird automatisch erstellt, wenn Sie das erste Fahrzeug hinzufügen.

### Datenmodell

Jedes Fahrzeug enthält:
- Grundinformationen (Marke, Modell, Jahr, VIN, Kennzeichen, Kilometerstand)
- Versicherungsinformationen (optional)
- TÜV-Daten (letzter/nächster Termin)
- Inspektionsdaten (letzte Inspektion, Intervalle, nächste Termine)
- Reifensätze (mit Typ, Marke, Modell, gefahrenen Kilometern)
- Reifenwechsel-Historie (alle Montage-/Demontage-Events)
- Aktuell montierter Reifensatz

## Verwendung

### Fahrzeug hinzufügen
1. Klicken Sie auf "Neues Fahrzeug hinzufügen" (im Header oder auf der Startseite)
2. Füllen Sie das Formular mit den Fahrzeugdaten aus
3. Optional: Versicherungsinformationen hinzufügen

### TÜV verwalten
1. Öffnen Sie ein Fahrzeug auf der Detailseite
2. Im TÜV-Bereich auf "Bearbeiten" klicken
3. Letzten TÜV-Termin eingeben
4. Der nächste Termin wird automatisch auf 2 Jahre berechnet

### Inspektion verwalten
1. Auf der Fahrzeugdetailseite im Inspektions-Bereich auf "Bearbeiten" klicken
2. Letzte Inspektion (Datum und Kilometerstand) eingeben
3. Intervalle anpassen (Standard: 1 Jahr / 15.000 km)
4. Die nächste Inspektion wird automatisch basierend auf Zeit und Kilometerstand berechnet

### Reifen verwalten
1. **Reifensatz hinzufügen**: Auf "Reifensatz hinzufügen" klicken, Typ, Marke, Modell und gefahrene Kilometer eingeben
2. **Reifenwechsel durchführen**: Auf "Reifenwechsel" klicken, Datum, Kilometerstand und zu montierenden Reifensatz auswählen
3. **Reifen archivieren**: Nicht mehr verwendete Reifensätze archivieren (müssen zuvor demontiert werden)

### Dashboard nutzen
- Übersicht über alle Fahrzeuge mit Statusanzeigen
- Listen der bevorstehenden Termine (TÜV, Inspektion, Reifenwechsel)
- Statistiken zu anstehenden und überfälligen Terminen
- Schnellzugriff auf die nächsten Termine in den nächsten 30 Tagen

## Build für Produktion

```bash
npm run build
npm start
```

## Projektstruktur

```
CarCheck/
├── app/
│   ├── api/              # API-Routen für CRUD-Operationen
│   ├── components/       # React-Komponenten
│   ├── lib/              # Utilities und Datenzugriff
│   └── styles/           # Globale Styles
├── data/
│   └── cars.json         # JSON-Datenbank
└── ...
```

## Lizenz

Privat

