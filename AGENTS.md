# PROJECT KNOWLEDGE BASE

**Generated:** 2025-12-30
**Commit:** e64aa86
**Branch:** main

## OVERVIEW

Vehicle management app (German: "Fahrzeugverwaltung") for tracking TÜV, inspections, tires, and fuel. Next.js 16 + React 19, Tailwind CSS, hybrid Redis/JSON storage.

## STRUCTURE

```
CarCheck/
├── app/
│   ├── api/cars/         # REST API routes (CRUD + sub-resources)
│   ├── components/       # React components (flat, no nesting)
│   ├── lib/              # types.ts, data.ts, utils.ts
│   └── styles/           # globals.css (Tailwind + CSS vars)
├── scripts/              # Migration utilities (run with tsx)
└── data/                 # Local JSON fallback (gitignored in prod)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add vehicle feature | `app/components/` | Create component, add to `page.tsx` |
| Add API endpoint | `app/api/cars/[id]/` | Follow existing route.ts pattern |
| Modify data model | `app/lib/types.ts` | Update interfaces, then `data.ts` migration |
| Add utility function | `app/lib/utils.ts` | Date/calculation helpers with `date-fns` |
| Change styling | `app/styles/globals.css` | CSS variables for theming |
| Run migrations | `scripts/` | `bun run migrate:eventlog` |

## CONVENTIONS

### Code Style
- **Components**: `export default function Name()` (no named exports)
- **Imports**: Absolute paths via `@/*` alias (maps to project root)
- **German UI**: All user-facing text in German, code in English
- **Date locale**: `date-fns/locale/de` for German formatting

### Data Layer (`app/lib/data.ts`)
- **Storage strategy**: Redis if `UPSTASH_REDIS_REST_URL` set, else `data/cars.json`
- **Auto-migration**: `migrateCar()` upgrades old schemas on read
- **Event logging**: `addCarEvent()` for audit trail on all mutations

### API Routes
- **Pattern**: `try/catch` → `NextResponse.json()` with status codes
- **Next.js 15+ compat**: Params handled as `Promise<{id}>` or `{id}`
- **German errors**: Error messages in German ("Fahrzeug nicht gefunden")

### Components
- **State**: Local useState, no global state library
- **Forms**: Controlled inputs with inline validation
- **Communication**: `window.dispatchEvent(new CustomEvent('addCar'))` for header→page

### Styling
- **Tailwind**: Utility-first with custom `glass` class
- **Theme**: CSS variables in `:root` / `.dark`, toggle via `ThemeProvider`
- **Colors**: Use semantic vars (`--accent`, `--muted-foreground`)

## ANTI-PATTERNS (THIS PROJECT)

| Pattern | Why | Alternative |
|---------|-----|-------------|
| `alert()` for errors | Poor UX | Should use toast component |
| `window.dispatchEvent` | Fragile coupling | Should use React context |
| Inline `any` casts | Type safety | Fix types in `types.ts` |

## UNIQUE STYLES

- **Glassmorphism**: `.glass` class with `backdrop-blur-xl` + transparency
- **Progress bars**: Custom `ProgressBar` component with color variants
- **Maintenance status**: Color-coded (`overdue`/`upcoming`/`current`)

## COMMANDS

```bash
bun dev              # Dev server on :3000
bun run build        # Production build
bun run lint         # ESLint check
bun run migrate:eventlog  # Run event log migration
```

## DOMAIN CONCEPTS

| German Term | English | Description |
|-------------|---------|-------------|
| TÜV | Vehicle inspection | German mandatory safety check (2-year cycle) |
| Inspektion | Service inspection | Manufacturer maintenance (time + km based) |
| Reifenwechsel | Tire change | Summer→Winter (Oct 1), Winter→Summer (Easter) |
| Kilometerstand | Mileage | Current odometer reading |
| Kennzeichen | License plate | Vehicle registration number |

## NOTES

- **Easter calculation**: `calculateEaster()` in utils.ts for tire change dates
- **Inspection logic**: Uses EARLIER of time-based or km-based next date
- **No tests**: Project currently has no test files
- **Single page app style**: `page.tsx` manages car selection via state, not routes
- **Next.js 16 dynamic params**: API routes handle both Promise and direct params for backwards compat
