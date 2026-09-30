# A01 — PostgreSQL runtime repository

| Field | Value |
|---|---|
| Task ID | A01 |
| Name | PostgreSQL runtime repository |
| Status | REVIEW |
| Owner | Backend workstream |
| Dependencies | Baseline M0–M3; canonical numbers in `packages/content/index.mjs` |
| Owned paths | `apps/api/src/db/**`, `apps/api/src/repositories/**`, new `apps/api/sql/**` migrations, `apps/api/test/postgres/**`, this task note |
| Forbidden paths | `package.json`, `package-lock.json`, `compose.yaml`, `.env.example`, `packages/content/**`, `apps/api/src/server.mjs`, `apps/api/src/store.mjs`, shared status documents |
| Start time | 2026-09-29 |
| End time | 2026-09-29 (review-ready) |

## Checklist

- [x] Add an additive, rerunnable PostgreSQL runtime migration without changing `001_mvp_schema.sql`.
- [x] Add normalized tables and constraints for sessions, farms, objects, plots, crops, animals, inventory, warehouse, orders, order lines and quest progress.
- [x] Persist `state_revision`, settings and durable idempotency records (including retention metadata).
- [x] Add a repository boundary that accepts a node-postgres-compatible pool and does not require a package dependency in the prototype.
- [x] Create the complete starter aggregate in one transaction and handle concurrent lookup-name creation safely.
- [x] Add bounded rollback/retry handling for serialization failures and deadlocks.
- [x] Add mutation orchestration with character/farm locking, request-hash validation, exactly-once state revision and durable response replay.
- [x] Add explicit row-lock helpers for inventory, warehouse, farm, plot, animal and order operations.
- [x] Add repository tests and apply the migration twice against PostgreSQL 16.

## Deliverables

- `apps/api/sql/002_runtime_repository.sql` adds schema migration tracking, active sessions, normalized runtime aggregate tables, indexes, checks, state revision/settings columns and idempotency expiry metadata.
- `apps/api/src/repositories/postgresFarmRepository.mjs` exports `PostgresFarmRepository`, `requestHash` and `stableStringify`.
- `apps/api/src/repositories/index.mjs` is the repository export boundary.
- `apps/api/test/postgres/postgres-repository.test.mjs` verifies canonical request hashing, transaction commit/release, bounded serialization retry, input validation and idempotent replay.

## Current activity

Implementation is complete and handed to root for review. A02 has since selected this repository behind `PERSISTENCE_DRIVER=postgres`, while preserving the file/memory adapter for demo and test compatibility.

## Last completed

- `node --check apps/api/src/repositories/postgresFarmRepository.mjs` passed.
- A01 repository tests passed: **5/5**.
- Root `npm run check:syntax` passed, including renderer syntax validation.
- A02/A03 PostgreSQL runtime and concurrency evidence passed: 20/20 repository/integration tests on disposable PostgreSQL 16.
- `001_mvp_schema.sql` followed by `002_runtime_repository.sql` applied successfully twice against a temporary PostgreSQL 16 container. The second application produced only expected `IF NOT EXISTS` notices.

## Next activity

Parent review should close A01 after confirming the A02/A03 evidence. The repository remains the persistence boundary for PostgreSQL runtime; no further A01 code change is required.

`runMutation` callbacks must contain database work only: a serialization retry can execute the callback again, so external messages, files or other side effects must happen after the committed response is returned.

## Integration contract for A02

A02 now selects this repository explicitly with `PERSISTENCE_DRIVER=postgres`, maps coded repository errors to the existing envelope, routes all gameplay mutations through `runMutation`, and preserves the JSON/memory adapter as the local fallback. Route operations use server/database time and update normalized rows inside the transaction boundary.

The Compose `migrate` profile must execute migrations in numeric order (`001_mvp_schema.sql`, then `002_runtime_repository.sql`) before enabling the PostgreSQL adapter. Content definitions remain server-owned imports/seed data and are not overwritten by this migration.

## Tests and blocker

No blocker for A01. The original repository tests use a pool/client double; A02/A03 additionally verified the repository against disposable PostgreSQL 16 and must keep that distinction in future CI reports.
