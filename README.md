<div align="center">

# 🚗 CarCheck - Fahrzeugverwaltung

### Moderne Webanwendung zur umfassenden Verwaltung Ihrer Fahrzeuge

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)](LICENSE)

**CarCheck** ist eine moderne Next.js-Anwendung zur umfassenden Verwaltung Ihrer Fahrzeuge mit TÜV-Terminen, Inspektionen, Reifenverwaltung und Versicherungsinformationen. Verwalten Sie alle wichtigen Fahrzeugdaten an einem Ort – übersichtlich, intuitiv und modern.

[Features](#-features) • [Installation](#-installation) • [Verwendung](#-verwendung) • [Technologie](#-technologie-stack)

</div>

---

## 📑 Inhaltsverzeichnis

- [✨ Features](#-features)
  - [🚙 Fahrzeugverwaltung](#-fahrzeugverwaltung)
  - [🔧 TÜV-Verwaltung](#-tüv-verwaltung)
  - [🔍 Inspektions-Verwaltung](#-inspektions-verwaltung)
  - [🛞 Reifenverwaltung](#-reifenverwaltung)
  - [📊 Dashboard](#-dashboard)
  - [🎨 Benutzeroberfläche](#-benutzeroberfläche)
- [🛠️ Technologie-Stack](#️-technologie-stack)
- [🚀 Installation](#-installation)
- [💾 Datenspeicherung](#-datenspeicherung)
- [📖 Verwendung](#-verwendung)
- [🏗️ Projektstruktur](#️-projektstruktur)
- [🔧 Build für Produktion](#-build-für-produktion)
- [🐛 Fehlerbehebung](#-fehlerbehebung)
- [🤝 Beitragen](#-beitragen)
- [📄 Lizenz](#-lizenz)

---

## ✨ Features

### 🚙 Fahrzeugverwaltung

- ✅ **Mehrere Fahrzeuge verwalten**: Erstellen, bearbeiten und löschen Sie Fahrzeuge mit allen wichtigen Informationen
- 📝 **Fahrzeugdetails**: Marke, Modell, Baujahr, VIN, Kennzeichen und Kilometerstand
- 🛡️ **Versicherungsinformationen**: Versicherer, Versicherungsnummer und Ablaufdatum speichern
- 📊 **Kilometerstand-Tracking**: Aktualisieren Sie den Kilometerstand direkt aus der Detailansicht

### 🔧 TÜV-Verwaltung

- 📅 **TÜV-Termine verwalten**: Letzten und nächsten TÜV-Termin erfassen
- 🤖 **Automatische Berechnung**: Nächster Termin wird automatisch auf 2 Jahre nach dem letzten Termin berechnet
- 📈 **Fortschrittsanzeige**: Visuelle Anzeige des Zeitfortschritts bis zum nächsten Termin
- 🚦 **Statusanzeige**: Übersichtliche Anzeige ob Termine überfällig, anstehend oder in Ordnung sind

### 🔍 Inspektions-Verwaltung

- ⏱️ **Duale Intervalle**: Verwaltung von Inspektionen basierend auf Zeit (Jahre) und Kilometerstand
- 🤖 **Automatische Berechnung**: Nächste Inspektion wird basierend auf dem früheren Datum berechnet (Zeit oder Kilometer)
- 📊 **Fortschrittsanzeige**: Separate Fortschrittsbalken für Zeit- und Kilometer-Fortschritt
- ⚙️ **Flexible Intervalle**: Individuelle Intervalle pro Fahrzeug konfigurierbar

### 🛞 Reifenverwaltung

- 🌡️ **Reifentypen**: Verwaltung von Sommer-, Winter- und Allwetterreifen
- 🔄 **Reifensätze verwalten**: Mehrere Reifensätze pro Fahrzeug mit Marke, Modell und gefahrenen Kilometern
- 📜 **Reifenwechsel-Tracking**: Vollständige Historie aller Reifenwechsel mit Datum, Kilometerstand und Reifentyp
- 🤖 **Automatische Kilometerberechnung**: Aktuelle Kilometer der montierten Reifen werden automatisch berechnet
- 📦 **Reifen archivieren**: Alte Reifensätze archivieren, ohne sie zu löschen
- 🔔 **Reifenwechsel-Erinnerungen**: Automatische Berechnung der nächsten Reifenwechsel (Sommer/Winter)

### 📊 Dashboard

- 🏠 **Übersicht**: Zentrale Übersicht über alle Fahrzeuge
- 📈 **Statistiken**: Anzahl Fahrzeuge, anstehende und überfällige Termine
- 📋 **Bevorstehende Termine**: Listen für TÜV, Inspektionen und Reifenwechsel
- ⏰ **Nächste Termine**: Übersicht der Termine in den nächsten 30 Tagen
- 🚦 **Statusanzeigen**: Farbcodierte Statusanzeigen für alle Wartungstermine

### 🎨 Benutzeroberfläche

- 🌓 **Dark/Light Mode**: Umschaltbares Theme für bessere Nutzererfahrung
- ✨ **Moderne UI**: Glassmorphism-Design mit Tailwind CSS
- 📱 **Responsive Design**: Optimiert für Desktop und Mobile
- 📊 **Fortschrittsbalken**: Visuelle Fortschrittsanzeigen für alle Wartungsintervalle
- 🎯 **Intuitive Navigation**: Einfache und übersichtliche Bedienung

---

## 🛠️ Technologie-Stack

CarCheck basiert auf modernen Web-Technologien für beste Performance und Entwicklererfahrung:

| Technologie                                                                                        | Version | Beschreibung                      |
| -------------------------------------------------------------------------------------------------- | ------- | --------------------------------- |
| ![Next.js](https://img.shields.io/badge/-Next.js-black?style=flat-square&logo=next.js)             | 16.0    | React Framework mit App Router    |
| ![React](https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react)                  | 19.0    | UI-Bibliothek                     |
| ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript)   | 5.5     | Typsichere Entwicklung            |
| ![Tailwind CSS](https://img.shields.io/badge/-Tailwind-38B2AC?style=flat-square&logo=tailwind-css) | 3.4     | Utility-First CSS Framework       |
| ![date-fns](https://img.shields.io/badge/-date--fns-770C56?style=flat-square)                      | 3.6     | Datumsberechnungen                |
| ![Upstash Redis](https://img.shields.io/badge/-Upstash_Redis-00E9A3?style=flat-square)             | 1.34    | Cloud-Datenspeicherung (optional) |
| ![Vercel Analytics](https://img.shields.io/badge/-Vercel_Analytics-black?style=flat-square)        | 1.6     | Analytics-Integration             |

---

## 🚀 Installation

### Voraussetzungen

- [Bun](https://bun.sh/) 1.0 oder höher (beinhaltet bereits einen schnellen JavaScript-Runtime)

### Schritte

1. **Repository klonen**

   ```bash
   git clone https://github.com/bjrump/CarCheck.git
   cd CarCheck
   ```

2. **Abhängigkeiten installieren**

   ```bash
   bun install
   ```

3. **Entwicklungsserver starten**

   ```bash
   bun dev
   ```

4. **Im Browser öffnen**
   ```
   http://localhost:3000
   ```

Die Anwendung läuft nun lokal und speichert Daten in `data/cars.json`.

## 💾 Datenspeicherung

CarCheck bietet flexible Speicheroptionen für verschiedene Anwendungsfälle:

### 📁 Lokale Entwicklung

Standardmäßig werden die Daten in `data/cars.json` gespeichert. Diese Datei wird automatisch erstellt, wenn Sie das erste Fahrzeug hinzufügen.

- ✅ Keine Konfiguration erforderlich
- ✅ Ideal für lokale Entwicklung und Tests
- ✅ Daten bleiben auf Ihrem Rechner

### ☁️ Produktion (Vercel) - Upstash Redis

Die App verwendet **Upstash Redis** für die Cloud-Speicherung in der Produktion.

#### Warum Redis?

| Vorteil                | Beschreibung                                    |
| ---------------------- | ----------------------------------------------- |
| 🎯 **Einfach**         | Key-Value Store - perfekt für JSON-Daten        |
| ⚡ **Schnell**         | Optimiert für schnelle Lese-/Schreiboperationen |
| 💰 **Günstig**         | Kostenloser Plan verfügbar                      |
| 🔄 **Direkter Ersatz** | Ähnlich wie Vercel KV (das eingestellt wurde)   |
| 🚀 **Kein Overhead**   | Keine komplexen Tabellen-Schemas nötig          |

#### Setup-Anleitung

1. **Integration hinzufügen**

   - Gehen Sie zu Vercel Dashboard → Ihr Projekt → Integrations
   - Fügen Sie die **"Upstash Redis"** Integration hinzu
   - Die Umgebungsvariablen werden automatisch hinzugefügt:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`

2. **Migration bestehender Daten**

   ```bash
   # Installiere tsx (falls noch nicht vorhanden)
   bun add -D tsx

   # Setze Umgebungsvariablen
   export UPSTASH_REDIS_REST_URL="your-redis-url"
   export UPSTASH_REDIS_REST_TOKEN="your-redis-token"

   # Führe Migration aus
   bun run scripts/migrate-to-redis.ts
   ```

> **💡 Hinweis**: Die App verwendet automatisch Redis, wenn die Umgebungsvariablen gesetzt sind. Andernfalls fällt sie auf die lokale JSON-Datei zurück.

### 📊 Datenmodell

Jedes Fahrzeug enthält folgende Informationen:

```
Fahrzeug
├── Grundinformationen
│   ├── Marke, Modell, Baujahr
│   ├── VIN (Fahrzeugidentifikationsnummer)
│   ├── Kennzeichen
│   └── Kilometerstand
├── Versicherung (optional)
│   ├── Versicherer
│   ├── Versicherungsnummer
│   └── Ablaufdatum
├── TÜV
│   ├── Letzter Termin
│   └── Nächster Termin
├── Inspektion
│   ├── Letzte Inspektion (Datum & Kilometerstand)
│   ├── Intervalle (Jahre & Kilometer)
│   └── Nächste Termine (basierend auf Zeit & Kilometer)
├── Reifensätze
│   ├── Typ (Sommer/Winter/Allwetter)
│   ├── Marke & Modell
│   ├── Gefahrene Kilometer
│   └── Archiviert (Ja/Nein)
└── Reifenwechsel-Historie
    ├── Datum & Kilometerstand
    ├── Reifentyp
    └── Aktion (Montage/Demontage)
```

---

## 📖 Verwendung

### 🚗 Fahrzeug hinzufügen

1. Klicken Sie auf **"Neues Fahrzeug hinzufügen"** (im Header oder auf der Startseite)
2. Füllen Sie das Formular mit den Fahrzeugdaten aus:
   - Marke und Modell
   - Baujahr
   - VIN (optional)
   - Kennzeichen
   - Aktueller Kilometerstand
3. Optional: Versicherungsinformationen hinzufügen
4. Klicken Sie auf **"Speichern"**

### 🔧 TÜV verwalten

1. Öffnen Sie ein Fahrzeug auf der Detailseite
2. Im TÜV-Bereich auf **"Bearbeiten"** klicken
3. Letzten TÜV-Termin eingeben
4. Der nächste Termin wird automatisch auf **2 Jahre** berechnet
5. Änderungen speichern

> **💡 Tipp**: Die Fortschrittsanzeige zeigt Ihnen visuell, wie viel Zeit bis zum nächsten TÜV verbleibt

### 🔍 Inspektion verwalten

1. Auf der Fahrzeugdetailseite im Inspektions-Bereich auf **"Bearbeiten"** klicken
2. Letzte Inspektion eingeben:
   - Datum der letzten Inspektion
   - Kilometerstand bei der letzten Inspektion
3. Intervalle anpassen (Standard: **1 Jahr / 15.000 km**)
4. Die nächste Inspektion wird automatisch berechnet basierend auf:
   - Zeit (Jahre seit letzter Inspektion)
   - Kilometerstand (gefahrene Kilometer seit letzter Inspektion)
5. Änderungen speichern

> **💡 Tipp**: Es wird immer der frühere Termin (Zeit oder Kilometer) als nächste Inspektion angezeigt

### 🛞 Reifen verwalten

#### Reifensatz hinzufügen

1. Auf der Fahrzeugdetailseite im Reifen-Bereich auf **"Reifensatz hinzufügen"** klicken
2. Reifendetails eingeben:
   - Typ (Sommer, Winter, Allwetter)
   - Marke
   - Modell
   - Bereits gefahrene Kilometer
3. Reifensatz speichern

#### Reifenwechsel durchführen

1. Im Reifen-Bereich auf **"Reifenwechsel"** klicken
2. Wechseldetails eingeben:
   - Datum des Wechsels
   - Aktueller Kilometerstand
   - Zu montierenden Reifensatz auswählen
3. Wechsel bestätigen

> **💡 Tipp**: Die App berechnet automatisch die gefahrenen Kilometer für jeden Reifensatz

#### Reifen archivieren

1. Nicht mehr verwendete Reifensätze können archiviert werden
2. Reifensatz muss zuvor demontiert werden
3. Archivierte Reifen werden ausgeblendet, können aber wiederhergestellt werden

### 📊 Dashboard nutzen

Das Dashboard bietet Ihnen eine zentrale Übersicht über alle wichtigen Informationen:

- **Fahrzeug-Übersicht**: Alle Ihre Fahrzeuge auf einen Blick
- **Statistiken**: Schnellüberblick über anstehende und überfällige Termine
- **Bevorstehende Termine**: Listen für TÜV, Inspektionen und Reifenwechsel
- **Nächste 30 Tage**: Übersicht der Termine in den nächsten 30 Tagen
- **Statusanzeigen**: Farbcodierte Visualisierung (🟢 OK, 🟡 Anstehend, 🔴 Überfällig)

---

## 🏗️ Projektstruktur

```
CarCheck/
├── 📁 app/
│   ├── 📁 api/              # API-Routen für CRUD-Operationen
│   │   ├── cars/            # Fahrzeug-Endpunkte
│   │   └── ...
│   ├── 📁 components/       # React-Komponenten
│   │   ├── CarCard.tsx      # Fahrzeugkarte
│   │   ├── CarForm.tsx      # Fahrzeugformular
│   │   ├── TUVSection.tsx   # TÜV-Verwaltung
│   │   ├── InspectionSection.tsx  # Inspektions-Verwaltung
│   │   ├── TireSection.tsx  # Reifenverwaltung
│   │   └── ...
│   ├── 📁 lib/              # Utilities und Datenzugriff
│   │   ├── types.ts         # TypeScript-Typen
│   │   ├── utils.ts         # Hilfsfunktionen
│   │   └── storage.ts       # Datenzugriff (JSON/Redis)
│   ├── 📁 styles/           # Globale Styles
│   ├── layout.tsx           # App-Layout
│   └── page.tsx             # Hauptseite
├── 📁 data/
│   └── cars.json            # JSON-Datenbank (lokal)
├── 📁 scripts/
│   └── migrate-to-redis.ts  # Migrationsskript
├── 📁 public/               # Statische Assets
├── package.json             # Abhängigkeiten
├── next.config.js           # Next.js Konfiguration
├── tailwind.config.ts       # Tailwind CSS Konfiguration
├── tsconfig.json            # TypeScript Konfiguration
└── README.md                # Diese Datei
```

---

## 🔧 Build für Produktion

### Lokaler Build

```bash
# Production-Build erstellen
bun run build

# Production-Server starten
bun start
```

### Deployment auf Vercel

1. **Repository mit Vercel verbinden**

   ```bash
   # Vercel CLI installieren
   bun add -g vercel

   # Projekt deployen
   vercel
   ```

2. **Umgebungsvariablen konfigurieren** (optional)

   - `UPSTASH_REDIS_REST_URL` - Redis URL
   - `UPSTASH_REDIS_REST_TOKEN` - Redis Token

3. **Automatisches Deployment**
   - Jeder Push auf `main` triggert automatisch ein Deployment
   - Preview-Deployments für Pull Requests

---

## 🐛 Fehlerbehebung

### Problem: Daten werden nicht gespeichert

**Lösung:**

- Stellen Sie sicher, dass das `data`-Verzeichnis existiert und beschreibbar ist
- Überprüfen Sie die Browser-Console auf Fehler
- Bei Redis: Überprüfen Sie die Umgebungsvariablen

### Problem: TÜV/Inspektion wird nicht berechnet

**Lösung:**

- Stellen Sie sicher, dass Sie einen letzten Termin eingegeben haben
- Überprüfen Sie das Datumsformat (YYYY-MM-DD)
- Aktualisieren Sie die Seite (F5)

### Problem: Reifenwechsel funktioniert nicht

**Lösung:**

- Stellen Sie sicher, dass mindestens 2 Reifensätze vorhanden sind
- Der aktuelle Kilometerstand muss höher sein als beim letzten Wechsel
- Überprüfen Sie, ob der Reifensatz nicht archiviert ist

### Problem: Dark Mode funktioniert nicht

**Lösung:**

- Leeren Sie den Browser-Cache
- Überprüfen Sie die Browser-Console auf Fehler
- Das Theme wird im LocalStorage gespeichert (`theme`)

### Problem: Build-Fehler

**Lösung:**

```bash
# Node Modules neu installieren
rm -rf node_modules bun.lockb
bun install

# Cache leeren
rm -rf .next

# Neu bauen
bun run build
```

---

## 🤝 Beitragen

Beiträge sind willkommen! Da dies ein privates Projekt ist, kontaktieren Sie bitte den Repository-Inhaber für weitere Informationen.

### Entwicklungsrichtlinien

- Verwenden Sie TypeScript für alle neuen Komponenten
- Folgen Sie dem bestehenden Code-Stil
- Testen Sie Ihre Änderungen lokal vor dem Commit
- Verwenden Sie aussagekräftige Commit-Messages

### Entwicklungsablauf

```bash
# Repository forken und klonen
git clone https://github.com/bjrump/CarCheck.git

# Branch erstellen
git checkout -b feature/mein-feature

# Änderungen durchführen und committen
git commit -am "Add: Neue Funktion"

# Branch pushen
git push origin feature/mein-feature

# Pull Request erstellen
```

---

## 📄 Lizenz

Dieses Projekt ist privat und nicht für die öffentliche Nutzung lizenziert.

---

<div align="center">

**Entwickelt mit ❤️ für Fahrzeugbesitzer**

[⬆ Nach oben](#-carcheck---fahrzeugverwaltung)

</div>
