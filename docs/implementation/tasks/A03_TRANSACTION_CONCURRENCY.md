# A03 — Transaction/concurrency integration gate

- Task ID: A03
- Name: PostgreSQL transaction, rollback, idempotency and concurrency gate
- Status: DONE
- Owner: Backend/runtime workstream
- Dependencies: A02 DONE; disposable PostgreSQL 16 instance; canonical API/error contract
- Owned paths: `apps/api/test/postgres/postgres-integration.test.mjs`, `apps/api/test/postgres/postgres-repository.test.mjs`, this task note
- Forbidden paths: renderer/animation/asset pipeline, `packages/content/index.mjs`, Tutorial, API response shape, file/memory adapter removal, Cloudflare/public tunnel
- Deliverables: real-PostgreSQL concurrent enter and mutation coverage, durable idempotency race coverage, rollback proof, retry-budget proof, state-revision/lost-update proof

## Checklist

- [x] concurrent normalized-name enter creates exactly one character and one durable session per request
- [x] concurrent PostgreSQL mutations serialize on the character lock without lost coins/inventory updates
- [x] concurrent duplicate `Idempotency-Key` requests execute one operation and replay one committed response
- [x] a reused key with a different payload is rejected without a second revision or mutation
- [x] a mutation error rolls back business state, `state_revision` and the idempotency record together
- [x] serialization retry exhaustion rolls back every attempt, releases every client and preserves the retryable error for API mapping

## Evidence and commands

The integration suite is opt-in and must target a disposable database. It truncates only when both the URL and the integration flag are present:

```powershell
$env:POSTGRES_TEST_URL = "postgresql://mo_farm:change_me@localhost:5432/mo_farm"
$env:RUN_POSTGRES_INTEGRATION = "1"
node --test apps/api/test/postgres/postgres-repository.test.mjs apps/api/test/postgres/postgres-integration.test.mjs
```

The A03 additions contribute **6 tests**: five real-PostgreSQL scenarios and one repository retry-budget test. The existing A02 integration scenarios remain in the same opt-in file. A run with the disposable PostgreSQL database must report all enabled tests passing; without the explicit URL/flag the integration cases are skipped by design.

The tests prove:

- `SERIALIZABLE` transactions retry `40001`/`40P01` with a fresh client and rollback; after the configured budget the original code is surfaced for stable API mapping.
- `runMutation` takes the character row lock before loading the aggregate, so concurrent writes increment `state_revision` one at a time and persist every inventory/coin delta.
- PostgreSQL is the source of truth for idempotency. Identical concurrent requests return semantically equivalent committed bodies (object key order is not part of the JSON contract); a payload hash mismatch returns `IDEMPOTENCY_KEY_REUSED`.
- An error after a SQL write leaves no partial wallet update, revision increment or idempotency row after the transaction rolls back.

## Current activity

- Current activity: complete; the isolated PostgreSQL gate has passed with all enabled scenarios.
- Last completed: repository audit, READ COMMITTED aggregate-lock fix, and opt-in real-database concurrency/rollback tests.
- Next activity: maintain the completed transaction/concurrency gate; keep Cloudflare gated until approved B02 artwork, Docker and remaining RC dependencies pass.
- Tests: `node --test apps/api/test/postgres/postgres-repository.test.mjs apps/api/test/postgres/postgres-integration.test.mjs` with PostgreSQL 16.4 disposable database: **20/20 PASS** (14 integration + 6 repository). All three repository syntax checks pass. Without the explicit URL/flag the integration cases are skipped by design.
- GitHub Actions CI runs [36660295559](https://github.com/nhungcute/Farmer_MO/actions/runs/36660295559) and [36662455574](https://github.com/nhungcute/Farmer_MO/actions/runs/36662455574) completed successfully; the PostgreSQL runtime, browser, operational, container and Node/asset jobs all passed.
- Blocker: none for A03; parent review is complete.
- Start time: 2026-09-30
- End time: 2026-09-30 (parent review complete)
