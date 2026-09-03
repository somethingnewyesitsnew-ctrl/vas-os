# Digital Plus OS — automated test suite

Two checks, no real browser or Supabase access required. Both run against
the code exactly as it sits in this repo.

## 1. Wiring check (`wiring-check.py`)

Scans every `onclick`/`onchange`/etc. handler across `material.html` and
`js/*.js`, and confirms each one actually calls a function that's defined
somewhere in the codebase. Catches "dead button" bugs — a handler
pointing at a function that was renamed, removed, or never written.

```
python3 tests/wiring-check.py .
```

Exit code 0 = clean, 1 = orphaned handlers found (printed with the file
they're called from).

## 2. Runtime smoke test (`runtime-harness.js`)

Actually executes the app's JS in a simulated browser (jsdom) — loads all
29 modules + `material-overrides.js` in the exact order `material.html`
loads them, logs in as a demo admin, loads the built-in demo data, and
renders all 24 major pages. Catches real runtime errors (undefined
functions, undefined properties, typos in object keys) that a syntax
check alone can't, because syntax checking never actually runs the code.

Supabase/network calls are stubbed out (a fake chainable client that
resolves everything to `{data:[],error:null}`), so this needs no real
credentials or connectivity.

One-time setup:
```
npm install jsdom
```

Run:
```
node tests/runtime-harness.js .
```

Exit code 0 = clean, 1 = one or more modules failed to load or one or
more pages threw while rendering (both printed with a stack trace).

## When to run these

- Before pushing any change that touches `js/*.js` or `material.html`.
- Whenever asked to "test the whole system" — run both, report results.

## History

This suite caught a real, serious production bug on 2026-09-03: four
functions (`isHR`, `canSeeHrCom`, `sbCommsUpdate`, `initCommsData`) were
called throughout the app but never defined, which meant the HR Comms
page crashed for every user and Reminders/Announcements never actually
loaded real data from Supabase. Fixed in the same session — see commit
history around that date for the full fix.
