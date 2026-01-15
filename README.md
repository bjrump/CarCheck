<div align="center">

# 🚗 CarCheck - Fahrzeugverwaltung

### Moderne Webanwendung zur umfassenden Verwaltung Ihrer Fahrzeuge

[![CI](https://github.com/bjrump/CarCheck/actions/workflows/ci.yml/badge.svg)](https://github.com/bjrump/CarCheck/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Convex](https://img.shields.io/badge/Convex-1.31-FF6B6B?style=for-the-badge)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Clerk-6.36-6C47FF?style=for-the-badge)](https://clerk.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**CarCheck** ist eine moderne Next.js-Anwendung zur umfassenden Verwaltung Ihrer Fahrzeuge mit TÜV-Terminen, Inspektionen, Reifenverwaltung und Tankprotokoll. Verwalten Sie alle wichtigen Fahrzeugdaten an einem Ort – übersichtlich, intuitiv und modern.

[Features](#-features) • [Installation](#-installation) • [Verwendung](#-verwendung) • [Technologie](#️-technologie-stack)

</div>

---

## 📑 Inhaltsverzeichnis

- [✨ Features](#-features)
- [🛠️ Technologie-Stack](#️-technologie-stack)
- [🚀 Installation](#-installation)
- [💾 Datenspeicherung](#-datenspeicherung)
- [📖 Verwendung](#-verwendung)
- [🏗️ Projektstruktur](#️-projektstruktur)
- [🔧 Build für Produktion](#-build-für-produktion)
- [🐛 Fehlerbehebung](#-fehlerbehebung)
- [📄 Lizenz](#-lizenz)

---

## ✨ Features

### 🚙 Fahrzeugverwaltung

- ✅ **Mehrere Fahrzeuge verwalten**: Erstellen, bearbeiten und löschen Sie Fahrzeuge mit allen wichtigen Informationen
- 📝 **Fahrzeugdetails**: Marke, Modell, Baujahr, VIN, Kennzeichen und Kilometerstand
- 🛡️ **Versicherungsinformationen**: Versicherer, Versicherungsnummer und Ablaufdatum speichern
- 📊 **Kilometerstand-Tracking**: Aktualisieren Sie den Kilometerstand direkt aus der Detailansicht
- 🔐 **Benutzerkonten**: Jeder Benutzer sieht nur seine eigenen Fahrzeuge (Clerk Authentication)

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
- 🔔 **Reifenwechsel-Erinnerungen**: Automatische Berechnung basierend auf Jahreszeit (Ostern / 1. Oktober)

### ⛽ Tankprotokoll

- 📊 **Verbrauchsanalyse**: Durchschnittlicher Verbrauch, Kosten pro Kilometer
- 📈 **Statistiken**: Gesamtkosten, Gesamtliter, gefahrene Kilometer
- 📝 **Tankeinträge**: Datum, Kilometerstand, Liter, Preis pro Liter

### 📊 Dashboard

- 🏠 **Übersicht**: Zentrale Übersicht über alle Fahrzeuge
- 📈 **Statistiken**: Anzahl Fahrzeuge, anstehende und überfällige Termine
- 📋 **Bevorstehende Termine**: Listen für TÜV, Inspektionen und Reifenwechsel
- ⏰ **Nächste Termine**: Übersicht der Termine in den nächsten 30 Tagen
- 🚦 **Statusanzeigen**: Farbcodierte Statusanzeigen für alle Wartungstermine
- 🖥️ **Layout**: Scrollbares Dashboard für intuitive Bedienung auf allen Geräten

### 🎨 Benutzeroberfläche

- 🌓 **Dark/Light Mode**: Umschaltbares Theme für bessere Nutzererfahrung
- ✨ **Moderne UI**: Glassmorphism-Design mit Tailwind CSS
- 📱 **Responsive Design**: Optimiert für Desktop und Mobile
- 📊 **Fortschrittsbalken**: Visuelle Fortschrittsanzeigen für alle Wartungsintervalle
- 🎯 **Intuitive Navigation**: Einfache und übersichtliche Bedienung
- 💬 **Moderne Dialoge**: Eigene Bestätigungsdialoge statt Browser-Alerts

---

## 🛠️ Technologie-Stack

CarCheck basiert auf modernen Web-Technologien für beste Performance und Entwicklererfahrung:

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| ![Next.js](https://img.shields.io/badge/-Next.js-black?style=flat-square&logo=next.js) | 16.0 | React Framework mit App Router |
| ![React](https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react) | 19.0 | UI-Bibliothek |
| ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript) | 5.5 | Typsichere Entwicklung |
| ![Tailwind CSS](https://img.shields.io/badge/-Tailwind-38B2AC?style=flat-square&logo=tailwind-css) | 4.1 | Utility-First CSS Framework |
| ![Convex](https://img.shields.io/badge/-Convex-FF6B6B?style=flat-square) | 1.31 | Real-time Backend-as-a-Service |
| ![Clerk](https://img.shields.io/badge/-Clerk-6C47FF?style=flat-square) | 6.36 | Authentication & User Management |
| ![date-fns](https://img.shields.io/badge/-date--fns-770C56?style=flat-square) | 4.1 | Datumsberechnungen |
| ![Vitest](https://img.shields.io/badge/-Vitest-FCC72B?style=flat-square&logo=vitest) | 4.0 | Unit Testing Framework |

---

## 🚀 Installation

### Voraussetzungen

- [Bun](https://bun.sh/) 1.0 oder höher
- [Convex](https://convex.dev/) Account (kostenlos)
- [Clerk](https://clerk.com/) Account (kostenlos)

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

3. **Umgebungsvariablen konfigurieren**

   Erstellen Sie eine `.env.local` Datei:

   ```bash
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev

   # Convex Backend
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```

4. **Convex Backend starten**

   ```bash
   # In einem separaten Terminal
   npx convex dev
   ```

5. **Entwicklungsserver starten**

   ```bash
   bun dev
   ```

6. **Tests ausführen**

   ```bash
   bun run test
   ```

7. **Im Browser öffnen**
   ```
   http://localhost:3000
   ```

---

## 💾 Datenspeicherung

CarCheck verwendet **Convex** als Backend-as-a-Service für Echtzeit-Datenspeicherung.

### Warum Convex?

| Vorteil | Beschreibung |
|---------|--------------|
| ⚡ **Echtzeit** | Automatische Synchronisation über alle Clients |
| 🔐 **Sicher** | Integrierte Authentifizierung via Clerk JWT |
| 🚀 **Serverless** | Kein Backend-Server zu verwalten |
| 📊 **Typsicher** | TypeScript-first mit automatischer Codegenerierung |
| 💰 **Kostenlos** | Großzügiger Free-Tier für persönliche Projekte |

### Datenmodell

```
Fahrzeug (Car)
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
├── Reifensätze[]
│   ├── Typ (Sommer/Winter/Allwetter)
│   ├── Marke & Modell
│   ├── Gefahrene Kilometer
│   └── Archiviert (Ja/Nein)
├── Reifenwechsel-Historie[]
│   ├── Datum & Kilometerstand
│   ├── Reifentyp
│   └── Aktion (Montage/Demontage)
├── Tankeinträge[]
│   ├── Datum, Kilometerstand
│   ├── Liter, Preis pro Liter
│   └── Verbrauch (berechnet)
└── Event-Log[]
    ├── Datum, Typ
    └── Beschreibung
```

---

## 🏗️ Projektstruktur

```
CarCheck/
├── 📁 app/
│   ├── page.tsx             # Single-Page App (Landing + Dashboard)
│   ├── layout.tsx           # Root Layout mit Providers
│   ├── 📁 components/       # React-Komponenten
│   │   ├── CarCard.tsx      # Fahrzeugkarte
│   │   ├── CarForm.tsx      # Fahrzeugformular
│   │   ├── ConfirmDialog.tsx # Eigener Bestätigungsdialog
│   │   ├── CircularProgress.tsx
│   │   ├── TUVSection.tsx   # TÜV-Verwaltung
│   │   ├── InspectionSection.tsx
│   │   ├── TireSection.tsx
│   │   ├── FuelSection.tsx
│   │   ├── FuelAnalytics.tsx
│   │   ├── EventLogSection.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ProgressBar.tsx
│   │   └── 📁 providers/
│   │       ├── ConvexClientProvider.tsx
│   │       └── ToastProvider.tsx
│   ├── 📁 lib/
│   │   ├── types.ts         # TypeScript-Interfaces
│   │   ├── utils.ts         # Hilfsfunktionen (Datum, Status)
│   │   └── utils.test.ts    # Unit-Tests
│   └── 📁 styles/
│       └── globals.css      # Tailwind + CSS Variables
├── 📁 convex/               # Backend-Funktionen
│   ├── cars.ts              # CRUD Mutations/Queries
│   ├── cars.test.ts         # Backend-Tests
│   ├── schema.ts            # Datenbank-Schema
│   ├── auth.config.ts       # Clerk JWT Integration
│   └── 📁 _generated/       # Auto-generiert (nicht editieren!)
├── proxy.ts                 # Clerk Middleware
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
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
   vercel
   ```

2. **Umgebungsvariablen konfigurieren**

   Im Vercel Dashboard → Settings → Environment Variables:

   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   CLERK_SECRET_KEY
   CLERK_JWT_ISSUER_DOMAIN
   NEXT_PUBLIC_CONVEX_URL
   ```

3. **Convex deployen**

   ```bash
   npx convex deploy
   ```

4. **Automatisches Deployment**
   - Jeder Push auf `main` triggert automatisch ein Deployment
   - Preview-Deployments für Pull Requests

---

## 🐛 Fehlerbehebung

### Problem: "Not authenticated" Fehler

**Lösung:**
- Überprüfen Sie die Clerk Umgebungsvariablen
- Stellen Sie sicher, dass `CLERK_JWT_ISSUER_DOMAIN` korrekt ist
- Melden Sie sich ab und wieder an

### Problem: Daten werden nicht synchronisiert

**Lösung:**
- Überprüfen Sie, ob Convex läuft (`npx convex dev`)
- Überprüfen Sie `NEXT_PUBLIC_CONVEX_URL`
- Schauen Sie in die Browser-Console auf Fehler

### Problem: TÜV/Inspektion wird nicht berechnet

**Lösung:**
- Stellen Sie sicher, dass Sie einen letzten Termin eingegeben haben
- Überprüfen Sie das Datumsformat (YYYY-MM-DD)
- Aktualisieren Sie die Seite (F5)

### Problem: Build-Fehler

**Lösung:**

```bash
# Node Modules neu installieren
rm -rf node_modules bun.lockb
bun install

# Cache leeren
rm -rf .next

# Convex-Typen regenerieren
npx convex dev

# Neu bauen
bun run build
```

---

## 📄 Lizenz

Dieses Projekt ist unter der MIT Lizenz lizenziert. Siehe [LICENSE](LICENSE) für Details.

---

<div align="center">

**Entwickelt mit ❤️ für Fahrzeugbesitzer**

[⬆ Nach oben](#-carcheck---fahrzeugverwaltung)

</div>
