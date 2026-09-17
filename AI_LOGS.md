# AI Build Log

This file records the build conversation for the application in chronological order.

## User brief

> Build a production-quality full-stack web application for a neighbourhood pharmacy that tracks medicine batches by expiry date, dispenses stock first-expiry-first-out, and never lets an expired batch be sold. Use Node.js, Express, MongoDB/Mongoose, React/Vite, JWT/bcrypt, and Jest. Implement the work in this order: data model, batch CRUD, FEFO and in-date stock, auth, search, expiry alerts, UI, pagination/sorting, landing page, and documentation. Deliver README.md, REASONING.md, and AI_LOGS.md.

## Build transcript

The workspace was inspected first and contained only a placeholder README and Git metadata. Node 24 and npm 11 were available. The implementation began with a pure stock service and five Jest tests for FEFO ordering, cross-batch deductions, insufficient stock rejection, expired-stock exclusion, and the 30-day alert boundary.

The focused tests passed. Mongoose models for Medicine, Batch, User, and DispenseLog were then added, followed by JWT auth, medicines/batches/stock/dispense routes, search, alerts, Mongo connection setup, and transaction-backed conditional batch decrements.

The React/Vite client was added with a public landing page, registration/login screens, and an authenticated inventory dashboard. The dashboard calls the real API, shows in-date totals and alerts, and loads sorted batches to preview exact FEFO drawdown lines before confirming a dispense.

The first route implementation performed some sort/slice work after fetching broader result sets. That was identified during review and corrected with Mongo aggregation and server-side `sort`, `skip`, `limit`, and counts. A CSS import-order warning from the preview styling was also found during the production build and removed.

Final checks passed: Vite production build and all five Jest tests.

## Follow-up twist implementation

The follow-up requirements added a singleton simulated clock, persisted batch quarantine, JSON bulk import, and a reorder notification outbox. The clock now controls all application expiry decisions and exposes `/api/clock` plus `/api/clock/tick`. Batch status is `active` or `quarantined`; the quarantine job updates expired active records and reports seven-day active alerts.

Bulk import was implemented as a pure parser/normalizer with tests for unit-suffixed quantities, both date formats, invalid dates, null fields, and stable duplicate keys. The dispense transaction now calculates the stock threshold transition and writes one `REORDER_ALERT` outbox entry only when crossing below the medicine's required reorder level. The expanded backend suite passed with 15 tests across four suites.