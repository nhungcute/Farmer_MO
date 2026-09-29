# D02 — Load test và PostgreSQL backup/restore drill

- Task ID: D02
- Name: PostgreSQL runtime load, correctness and backup/restore gate
- Status: REVIEW
- Owner: Runtime/infrastructure workstream
- Dependencies: A02 REVIEW, A03 REVIEW, D01 REVIEW, disposable PostgreSQL 16
- Owned paths: `tools/load-test/**`, `tools/backup-restore/**`, this task note
- Forbidden paths: gameplay/economy/content definitions, Renderer/Animation/Asset pipeline, Tutorial, API payload contract, Cloudflare/public tunnel
- Start time: 2026-09-30
- End time: 2026-09-30 (review evidence)

## Checklist

- [x] Bounded PostgreSQL load probe covers concurrent normalized-name enter and durable sessions.
- [x] Concurrent mutation probe verifies row-lock serialization, coin/inventory deltas and state revision without lost updates.
- [x] Duplicate `Idempotency-Key` probe verifies one committed mutation and replayed responses.
- [x] Expected business error probe verifies rollback, unchanged revision and no idempotency row; success/error/latency metrics are emitted.
- [x] `pg_dump` custom-format backup is produced from an existing migrated database.
- [x] `pg_restore` into a separate disposable database is followed by deterministic fingerprints for aggregate, sessions, idempotency and all runtime tables.
- [x] Migrations run idempotently on existing source, fresh target and restored target.

## Deliverables

- `tools/load-test/postgres-runtime.mjs` — opt-in bounded API/database load probe. It never truncates unless `ALLOW_DESTRUCTIVE_LOAD_TEST=1` is explicit.
- `tools/load-test/README.md` — runbook, limits and invariants.
- `tools/backup-restore/postgres-drill.mjs` — migration, dump, restore and row fingerprint verification.
- `tools/backup-restore/README.md` — disposable database runbook and scope limits.

## Evidence

Run the load probe with `PERSISTENCE_DRIVER=postgres`, a disposable PostgreSQL 16
database and the API listening on `LOAD_TEST_API_URL`. It prints JSON metrics and
must report `status: PASS`. Run the backup drill with separate source and target
URLs and PostgreSQL client tools (`pg_dump`, `pg_restore`); it must report
`status: PASS` and zero fingerprint differences.

Review evidence on 2026-09-29/30 UTC:

```text
LOAD_TEST_CONCURRENT_ENTERS=12 LOAD_TEST_MUTATIONS=24
LOAD_TEST_DUPLICATE_REQUESTS=12 LOAD_TEST_MUTATION_CONCURRENCY=12
status=PASS; enter=12/12 HTTP 200; one character created; durable sessions=12
state_revision=1 -> 26 (24 unique + 1 duplicate); coins=1000 -> 875
duplicate idempotency rows=1; rollbackPreserved=true
mutation latency: p50=500.435ms, p95=1065.148ms, p99=1162.321ms
expected business error: HTTP 409 NOT_ENOUGH_ITEM; no state/revision/idempotency change

postgres-drill.mjs status=PASS on separate PostgreSQL 16 source/target databases
all 15 runtime tables fingerprinted; aggregate/session/idempotency fingerprints match
migrations passed on source, fresh target and restored target
```

The host did not have PostgreSQL client binaries, so the run used
`BACKUP_USE_DOCKER=1` with `postgres:16.4-alpine`; the script also supports local
`pg_dump`/`pg_restore` binaries. The disposable dump was removed after verification.

The measured latency values are a prototype baseline for the test machine. They
are not production SLO/throughput thresholds. The drill proves correctness and
repeatability only; production RPO/RTO, retention, encryption and object-storage
operations remain outside this prototype task.

## Current activity

- Current activity: review-ready; tools and runbooks are implemented.
- Last completed: PostgreSQL load, concurrency/idempotency/rollback probe and
  backup/restore fingerprint drill on disposable databases.
- Next activity: parent aggregate gate may consume D02 evidence. Cloudflare stays
  gated until all upstream dependencies and RC checks pass.
- Blocker: no D02 technical blocker when disposable PostgreSQL and client tools are available.
