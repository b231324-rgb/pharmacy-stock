# Design Reasoning

## Data model

Medicine holds product-level identity and reorder metadata. Batch owns mutable stock quantity and expiry information, with an index on `(medicineId, expiryDate)` because both FEFO reads and batch lists use that access pattern. User stores only a bcrypt password hash. DispenseLog stores the requested quantity plus the exact batch lines used, which makes a dispense auditable without reconstructing historical state later.

## FEFO and sellable stock

The core implementation is deliberately pure in `backend/src/services/stockService.js`. A batch is in date only when `expiryDate > now`; equality with the current instant is treated as expired. Sellable stock sums quantities only from those batches. The dispense planner validates a positive whole-number request, filters out expired and empty batches, sorts by expiry ascending, and builds all batch deductions before any mutation. If the total is insufficient it throws before producing a plan, so there is no partial allocation.

## Concurrency

The API executes dispense in a Mongo session transaction. Each deduction uses `findOneAndUpdate` with `quantity: { $gte: requestedLine }`, so a concurrent request cannot decrement a quantity that another request already consumed. If any conditional update fails, the transaction throws and Mongo rolls the whole operation back. The DispenseLog is written in that same transaction.

## Testing and fixes

The focused Jest suite covers:

1. FEFO ordering, including a request split across two batches.
2. Correct partial deduction across multiple batches.
3. Rejection when total in-date stock is insufficient, with the available quantity in the error.
4. Exclusion of expired leftover quantity from sellable stock.
5. The expiring-soon boundary: exactly 30 days is included, while a timestamp just beyond it is excluded.

During implementation, the first API shape sorted some medicine results after pagination and sliced alert results in application memory. That would make `page` and `sort` misleading for larger pharmacies. It was corrected to use Mongo aggregation for stock/expiry medicine sorting and Mongo `sort`, `skip`, `limit`, and `countDocuments` for alerts. The frontend dispense dialog was also changed to fetch the selected medicine's sorted batches and show the actual FEFO preview before confirmation.

The final validation was `npm --prefix frontend run build && npm --prefix backend test`: the Vite build passed and all five Jest tests passed.

## Twist implementation

`clockService.js` owns the overridable application time. `POST /api/clock` sets or advances it, and `POST /api/clock/tick` runs `quarantineService.js`. Expired active batches are updated to the persisted `quarantined` status. The job reports the IDs it changed and counts active batches inside the seven-day warning window.

`batchImportService.js` is pure and separate from Express. It normalizes supported quantity strings and dates, rejects missing or malformed required values with the original row, and maintains stable duplicate keys for both existing database rows and rows in the same request.

The `Outbox` collection is the notification abstraction. Dispense calculates stock before and after the atomic deduction at the simulated time. A `REORDER_ALERT` is written only for the transition `before >= reorderLevel` and `after < reorderLevel`, preventing repeated notifications while stock remains low.