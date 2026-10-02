# CarCheck project guide

Vehicle management app with German UI and informal “du”. Next.js App Router, React, Tailwind v4, shadcn/ui, Clerk authentication and Convex realtime data. Use the scripts and installed versions in `package.json`.

## Implementation seams

- `app/page.tsx` selects the live workspace or the development-only example garage. `LiveWorkspace.tsx` owns authentication and realtime hooks; `DemoWorkspace.tsx` supplies the same typed actions through an in-memory Convex harness.
- `Workspace.tsx` owns vehicle selection, global views, dialogs and vehicle deletion. Preserve URL parameters `car`, `tab` and `view` so links, reload and browser history work.
- `CarDetail.tsx` owns the five vehicle sections; `VehicleDialogs.tsx` owns controlled forms and inline errors.
- `convex/cars.ts` owns authenticated commands. Use the specific fuel, tire and maintenance mutations rather than replacing arrays read by an earlier client. Read the latest document inside the mutation and check `tokenIdentifier` ownership.
- `convex/schema.ts` is the persisted contract. `app/lib/types.ts` derives aliases from generated `Doc`; `app/lib/actions.ts` derives action contracts from the generated API. Keep generated files untouched.

## Domain rules

Use the shared helpers in `app/lib/utils.ts` in UI and backend. New calendar fields are strict `YYYY-MM-DD`; legacy timestamps retain their Europe/Berlin calendar day. Malformed legacy dates remain readable and editable without a bulk migration.

Inspection status follows both time and actual mileage. Mileage-based dates are estimates and are marked accordingly. The legacy interval marker `95` means condition-based service. Seasonal tire dates are advisory; missed changes remain overdue. Tire mileage includes accumulated previous use plus distance since the latest mount, with append order resolving same-day swaps.

Fuel edits and deletions rebuild adjacent distance/consumption. The first filling establishes an odometer baseline and still counts toward liters/cost. Average price uses only priced liters. Consumption assumes comparable full fillings. Preserve historical total-only prices and optional arrays.

## UI conventions

Use default component exports, absolute `@/` imports, semantic CSS tokens and the shadcn primitives in `app/components/ui/`. Dark mode defaults to true black; both themes must work. Keep layouts dense and copy short. All user-facing strings are German.

Use `useConfirmDialog()` for destructive actions and `useToast()` for outcomes. Forms guard pending saves and show inline validation. Keep action wiring in React rather than global browser events. Maintain focus, keyboard operation and responsive table overflow.

## Verification and local preview

For isolated browser verification, follow the example-garage command in README. It executes registered Convex handlers without credentials or a remote endpoint. All server entry points must reject production and disabled demo access before initializing the harness. Check the command tests and calculations with the repository's existing Vitest setup. Local demo verification does not verify hosted Clerk integration.

The Next.js 16 authentication entry point is `proxy.ts`. The example garage bypass applies only when `NODE_ENV` is development and `CARCHECK_DEMO=1`. Configure credentials solely for an explicitly authorized development project; never deploy or connect to production for local verification.
