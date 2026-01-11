# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-11
**Commit:** 10a809e
**Branch:** main

## OVERVIEW

Vehicle management app (German: "Fahrzeugverwaltung") for tracking TUV, inspections, tires, and fuel. Next.js 16 + React 19, Tailwind CSS v4, **Convex** real-time backend, **Clerk** authentication.

## STRUCTURE

```
CarCheck/
├── .github/              # CI/CD Workflows, Dependabot, Issue Templates (YAML)
│   ├── ISSUE_TEMPLATE/   # bug-report.yml, feature-request.yml
│   └── workflows/        # ci.yml, stale-issues.yml
├── app/
│   ├── page.tsx          # Single-page app: LandingPage (guest) / Dashboard (auth)
│   ├── layout.tsx        # Root layout with Clerk + Convex + Theme providers
│   ├── components/       # React components (flat, no nesting except providers/)
│   ├── lib/              # types.ts, utils.ts (date calculations, status helpers)
│   └── styles/           # globals.css (Tailwind v4 + CSS vars + glassmorphism)
├── convex/               # Backend functions (NOT REST APIs)
│   ├── cars.ts           # CRUD mutations/queries (list, getById, create, update, remove)
│   ├── schema.ts         # Database schema with validators
│   ├── auth.config.ts    # Clerk JWT integration
│   └── _generated/       # Auto-generated (do not edit)
├── eslint.config.mjs     # ESLint 9 Flat Config
├── postcss.config.mjs    # Tailwind v4 PostCSS Config
└── proxy.ts              # Clerk middleware (non-standard name, should be middleware.ts)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add vehicle feature | `app/components/` | Create component, import in `page.tsx` |
| Modify backend logic | `convex/cars.ts` | Convex mutations/queries, NOT REST |
| Change data model | `convex/schema.ts` + `app/lib/types.ts` | Schema validators + TS interfaces |
| Add utility function | `app/lib/utils.ts` | Date/calculation helpers with `date-fns` |
| Change styling | `app/styles/globals.css` | CSS variables for theming |
| Auth configuration | `convex/auth.config.ts` | Clerk JWT provider settings |
| CI/CD Config | `.github/workflows/` | CI/CD (ci.yml) & Stale Issues (stale-issues.yml) |


## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `Dashboard` | Function | `app/page.tsx:115` | Main authenticated view (763 lines total) |
| `LandingPage` | Function | `app/page.tsx:25` | Guest landing page |
| `Car` | Interface | `app/lib/types.ts:74` | Core vehicle data model |
| `list` | Query | `convex/cars.ts:5` | Fetch all user's cars |
| `create` | Mutation | `convex/cars.ts:38` | Create new vehicle |
| `update` | Mutation | `convex/cars.ts:96` | Update vehicle (complex nested args) |
| `remove` | Mutation | `convex/cars.ts:220` | Delete vehicle |
| `calculateNextTireChangeDate` | Function | `app/lib/utils.ts:413` | Easter-based tire change logic |

## CONVENTIONS

### Code Style
- **Components**: `export default function Name()` (no named exports)
- **Imports**: Absolute paths via `@/*` alias (maps to project root, NOT src)
- **German UI**: All user-facing text in German, code in English
- **Date locale**: `date-fns/locale/de` for German formatting

### Backend (Convex)
- **Mutations**: Use `mutation({ args: {...}, handler: async (ctx, args) => {...} })`
- **Queries**: Use `query({ args: {...}, handler: async (ctx, args) => {...} })`
- **Auth**: Call `ctx.auth.getUserIdentity()` - throws if not authenticated
- **Schema**: Validators in `convex/schema.ts`, TS types in `app/lib/types.ts`

### Components
- **State**: Local useState, no global state library
- **Data fetching**: `useQuery(api.cars.list)`, `useMutation(api.cars.update)`
- **Forms**: Controlled inputs with inline validation
- **Communication**: `window.dispatchEvent(new CustomEvent('addCar'))` (fragile - see anti-patterns)

### Styling
- **Tailwind**: Utility-first with custom `.glass` class (glassmorphism)
- **Theme**: CSS variables in `:root` / `.dark`, toggle via `ThemeProvider`
- **Colors**: Use semantic vars (`--accent`, `--muted-foreground`, `--background`)
- **Dark mode**: Class-based (`darkMode: "class"` in tailwind.config.ts)

## ANTI-PATTERNS (THIS PROJECT)

| Pattern | Count | Why Bad | Alternative |
|---------|-------|---------|-------------|
| `alert()` for errors | 14 | Poor UX, blocks UI | Create toast component |
| `window.dispatchEvent` | 1 | Fragile coupling | Use React context |
| `console.error` in prod | 6 | No proper error handling | Error boundary / logging service |

### Files with `alert()` violations:
- `app/page.tsx` (3)
- `app/components/TireSection.tsx` (5)
- `app/components/FuelSection.tsx` (4)
- `app/components/TUVSection.tsx` (1)
- `app/components/InspectionSection.tsx` (1)

## UNIQUE STYLES

- **Glassmorphism**: `.glass` class with `backdrop-blur-xl` + `color-mix()` transparency
- **Progress bars**: Custom `ProgressBar` component with color variants
- **Maintenance status**: Color-coded via `getStatusColorClass()` (`overdue`/`upcoming`/`current`)
- **Grid backgrounds**: Custom `bg-grid-light` / `bg-grid-dark` patterns

## COMMANDS

```bash
bun dev              # Dev server on :3000
bun run build        # Production build
bun run lint         # ESLint check (ESLint 9)
npx convex dev       # Convex dev server (separate terminal)
npx convex deploy    # Deploy Convex functions
```

## DOMAIN CONCEPTS

| German Term | English | Description |
|-------------|---------|-------------|
| TUV | Vehicle inspection | German mandatory safety check (2-year cycle) |
| Inspektion | Service inspection | Manufacturer maintenance (time + km based) |
| Reifenwechsel | Tire change | Summer->Winter (Oct 1), Winter->Summer (Easter) |
| Kilometerstand | Mileage | Current odometer reading |
| Kennzeichen | License plate | Vehicle registration number |

## ENVIRONMENT VARIABLES

```bash
# Required (Clerk auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_JWT_ISSUER_DOMAIN

# Required (Convex backend)  
NEXT_PUBLIC_CONVEX_URL
CONVEX_DEPLOY_KEY  # For production deployment
```

## NOTES

- **Single page app**: `page.tsx` manages car selection via state, NOT route-based navigation
- **Easter calculation**: `calculateEaster()` in utils.ts for tire change dates (Gaussian algorithm)
- **Inspection logic**: Uses EARLIER of time-based or km-based next date
- **No tests**: Project has zero test files or test infrastructure
- **CI/CD**: GitHub Actions workflows run Lint/Build and manage stale issues
- **License**: MIT License (see LICENSE file)
- **Proxy naming**: `proxy.ts` should be `middleware.ts` for Next.js convention
- **Convex _generated/**: Auto-generated files with `eslint-disable` - never edit manually
