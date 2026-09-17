# Stockwell Pharmacy Batch Control

Stockwell is a full-stack pharmacy inventory application for batch-aware stock control. It calculates sellable stock from non-expired batches only, dispenses first-expiry-first-out (FEFO), blocks expired stock, records dispense lines, and surfaces expiry alerts.

## Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs
- Frontend: React 19, Vite, plain `fetch`, Lucide icons
- Tests: Jest

## Run Locally

Prerequisites: Node.js 20+, npm, and MongoDB. MongoDB transactions require a replica set; MongoDB Atlas works out of the box, or run local MongoDB as a single-node replica set.

```bash
cp backend/.env.example backend/.env
npm install
npm run install:all
npm run dev
```

The API runs at `http://localhost:4000` and the Vite client at the URL printed by Vite, normally `http://localhost:5173`.

For local Docker MongoDB, use `MONGO_URI=mongodb://127.0.0.1:27017/pharmacy_stock` in `backend/.env`. If `backend/.env` points to MongoDB Atlas, the Atlas network access list must allow this environment; otherwise start the API with `MONGO_URI=mongodb://127.0.0.1:27017/pharmacy_stock npm --prefix backend run dev`.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/pharmacy_stock` | MongoDB connection string |
| `JWT_SECRET` | development-only fallback | JWT signing secret |
| `PORT` | `4000` | API port |
| `VITE_API_URL` | `http://localhost:4000/api` | Frontend API base URL |

Run the FEFO tests with:

```bash
npm test
```

The backend also supports `npm --prefix backend run dev`; the frontend supports `npm --prefix frontend run dev` and `npm --prefix frontend run build`.

## API

Protected endpoints require `Authorization: Bearer <token>` after login. List responses use `{ items, pagination: { page, limit, total, pages } }`. List endpoints accept `page`, `limit`, and relevant `sort`/`order` query parameters.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Register a pharmacist/admin user |
| `POST` | `/api/auth/login` | Authenticate and return a JWT |
| `GET` | `/api/medicines` | Paginated medicine list; search `q`, sort by name, stock, expiry, or metadata |
| `POST` | `/api/medicines` | Create a medicine |
| `GET` | `/api/medicines/:id` | Fetch one medicine |
| `PUT` | `/api/medicines/:id` | Update a medicine |
| `DELETE` | `/api/medicines/:id` | Delete a medicine and its batches |
| `POST` | `/api/medicines/:id/batches` | Add a stock batch |
| `GET` | `/api/medicines/:id/batches` | Paginated batch list, sortable by expiry, quantity, received date, or batch number |
| `POST` | `/api/medicines/:id/batches/import` | Import a JSON array of messy batch rows; returns imported, deduped, and rejected counts |
| `GET` | `/api/medicines/:id/stock` | Return in-date sellable quantity and boolean `inDate` |
| `POST` | `/api/medicines/:id/dispense` | Atomically dispense `{ "quantity": 5 }` using FEFO and return batch lines |
| `GET` | `/api/alerts/expiring?days=30` | Paginated soon-to-expire batches, soonest first |
| `GET` | `/api/alerts/expired` | Paginated expired batches with leftover stock |
| `GET` | `/api/search?q=amox` | Paginated search across name, generic name, and manufacturer |
| `POST` | `/api/clock` | Set `{ "setTo": "2027-01-01T00:00:00Z" }` or advance `{ "advanceDays": 3 }`; add `runJob: true` to run quarantine |
| `POST` | `/api/clock/tick` | Run the expiry/quarantine job against the simulated clock and return its report |
| `GET` | `/api/outbox` | Paginated newest-first reorder notifications |

### Twist behavior

The simulated clock is an in-memory singleton and defaults to the real clock. All expiry checks use it. The quarantine job changes expired active batches to persisted `status: "quarantined"`; those batches remain visible in batch/audit and expired-alert lists but cannot count as sellable stock or be dispensed. `POST /api/clock/tick` returns `{ expiringSoonCount, quarantinedCount, quarantinedBatchIds }`.

Bulk import accepts a JSON array, not a file upload. Quantity values may be numbers or strings such as `"10"`, `"10 units"`, and `"10 pcs"`. Dates accept strict `dd/mm/yyyy` or ISO date strings. Its response is `{ imported, deduped, rejected: [{ row, reason }] }`.

Medicines have a required non-negative `reorderLevel`. After a successful dispense, a `REORDER_ALERT` outbox document with `status: "sent"` is created only when stock crosses from at least the reorder level to below it. Further dispensing while already below the threshold does not create duplicate alerts.

## Product Surface

The public landing page explains the product and future roadmap. Authenticated users get a medicine dashboard with searchable inventory, in-date totals, expiry alerts, and a dispense dialog that previews the exact FEFO batch drawdown before confirmation.

## Project Layout

- `backend/src/services/stockService.js`: pure FEFO, stock-count, and alert-window logic
- `backend/src/models`: Medicine, Batch, User, and DispenseLog schemas
- `backend/src/routes`: auth, medicine, alert, and search APIs
- `backend/tests/stockService.test.js`: focused business-logic tests
- `frontend/src/main.jsx`: landing, auth, dashboard, and dispense workflow
- `REASONING.md`: design and test reasoning
- `AI_LOGS.md`: build conversation log