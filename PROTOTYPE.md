# CarCheck v2 design prototype

This is a throwaway branch, not the implementation PR. The question is which
information hierarchy works best for a private garage with a few vehicles.
The user's supplied AGENTS.md instructions require a preview and a design pick
before final UI implementation. Decision on 2026-10-02: user approved the recommendation, A as the garage with C as the vehicle detail.

## Run

```sh
bun install --frozen-lockfile
bun run prototype
```

No environment file, Clerk session, or Convex deployment is used. All actions
change in-memory examples and reset on a full reload. The example date is
2026-10-02. Native file watching exceeded the Mac's available watcher resources;
the prototype command uses Watchpack polling and an explicit Turbopack root.

## Compare

| Variant | URL | Main tradeoff |
| --- | --- | --- |
| A: compact garage | http://127.0.0.1:3108/?variant=A | All vehicles, status, and next tasks visible together. |
| B: tasks first | http://127.0.0.1:3108/?variant=B | Prioritizes what needs attention; vehicle data takes a second click. |
| C: vehicle workspace | http://127.0.0.1:3108/?variant=C | Fast repeated work on one car; garage-wide priorities take a second click. |

Recommendation: A as the home view, with C's detail view after selecting a car.
Use the bottom arrows or left/right keyboard keys to switch variants. Keyboard
switching ignores form inputs, dialogs, and tab lists. The switcher is hidden in
production builds. The Startseite navigation item previews new public copy.

References: [shadcn dashboard](https://ui.shadcn.com/blocks?category=dashboard),
[shadcn components](https://ui.shadcn.com/docs/components/radix/button),
[Linear task organization](https://linear.app/docs/my-issues).

## Verification and evidence

- TypeScript and ESLint pass for the prototype and shadcn components.
- Desktop layouts inspected at 1440 × 1000.
- All three layouts at 390 × 844 have no page-level horizontal overflow.
- Mobile navigation and the vehicle rail are usable.
- Mileage updated from 128450 to 128980 in memory.
- A 45 l / €78.50 fill changed Golf's totals from €158.35 to €236.85.
- Screenshot files and a reviewed H.264 MP4 recording are in the ignored
  `.evidence/` directory. They are local review artifacts, not GitHub uploads.
- Transient HMR connection errors came from restarting this task's server;
  no application runtime errors were observed during the exercised flows.

## Scope for the implementation after selection

Keep Next.js, React, Convex, Clerk, realtime ownership by tokenIdentifier, and all
existing vehicle, insurance, maintenance, fuel, tire and history records. The
core dependencies are current already. Replace the presentation and simplify
types using the generated Convex document instead of duplicated interfaces.

Read-only audit identified these concrete logic changes:

1. Derive service status from the current odometer and service intervals. A
   distance threshold reached must be due even when a stored date projection is
   stale. Preserve the legacy condition-based intervalKm = 95 marker.
2. Save calendar inputs as YYYY-MM-DD. Local midnight converted to UTC currently
   reopens one day early in Berlin. Handle existing timestamp values compatibly.
3. Recompute fuel intervals after inserting, editing, or deleting entries.
   Include first fills in purchased liters and known costs. Use priced liters
   for price averages and valid mileage intervals for weighted consumption.
4. Add atomic fuel and tire commands in convex/cars.ts using the latest document,
   instead of sending client-snapshot replacement arrays. Keep owner checks.
5. Reject odometer rollback during tire swaps; preserve cumulative tire distance;
   handle same-day swaps by append order instead of ambiguous date sorting.
6. Validate finite numbers, dates, positive intervals and liters on the server.
   Allow explicit clearing of optional VIN/plate values.
7. Record actual operations in history, including fuel edits/deletions, and avoid
   duplicate events for unchanged values.
8. Keep missed seasonal tire recommendations visible instead of rolling a missed
   October deadline into the next year. Existing utility tests explicitly encode
   the old behavior, so update them as an intentional semantic change.

Focused tests should cover owner isolation, live service status after mileage
changes, fuel sequence recalculation/denominators, calendar round trips, tire
accounting and old documents with optional arrays absent. No prototype tests.

Capture this branch as the design primary source. Create the implementation from
latest origin/main, reimplement the selected design, and leave prototype code,
examples and the variant switcher out of the real application. Open a real PR
with screenshots and an H.264 recording after verification. Link it to the T3
thread. Merging has not been requested.
