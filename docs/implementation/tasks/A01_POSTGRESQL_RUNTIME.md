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
| End time | — (awaiting root review) |

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

Implementation is complete and handed to root for review. The repository is deliberately not wired into the HTTP server in A01 because `apps/api/src/server.mjs` is a shared/root-owned path; A02 owns runtime selection and API error mapping.

## Last completed

- `node --check apps/api/src/repositories/postgresFarmRepository.mjs` passed.
- A01 repository tests passed: **5/5**.
- Root `npm run check:syntax` passed, including renderer syntax validation.
- `001_mvp_schema.sql` followed by `002_runtime_repository.sql` applied successfully twice against a temporary PostgreSQL 16 container. The second application produced only expected `IF NOT EXISTS` notices.

## Next activity

Root/A02 should wire `PostgresFarmRepository` behind the existing API contract, map repository error codes to `ApiError`, run all mutation business operations through `runMutation`, execute migrations in numeric order and add real PostgreSQL integration/concurrency tests when a `pg` driver and service are available.

`runMutation` callbacks must contain database work only: a serialization retry can execute the callback again, so external messages, files or other side effects must happen after the committed response is returned.

## Integration contract for A02

The current HTTP server still constructs `FarmStore`; it must select this repository when `DATABASE_URL` is configured and map the repository's coded errors to the existing error envelope. Route operations should run inside `runMutation`, use server/database time, and update normalized rows through the supplied transaction client. The JSON/memory adapter remains the local fallback until that integration is deliberately enabled.

The Compose `migrate` profile must execute migrations in numeric order (`001_mvp_schema.sql`, then `002_runtime_repository.sql`) before enabling the PostgreSQL adapter. Content definitions remain server-owned imports/seed data and are not overwritten by this migration.

## Tests and blocker

No blocker for A01. The unit tests use a pool/client double because the repository intentionally has no direct `pg` dependency. This is not a PostgreSQL integration pass: A02/A03 must run the repository against PostgreSQL 16 and must not report that gate as passed when the database service or driver is unavailable.
