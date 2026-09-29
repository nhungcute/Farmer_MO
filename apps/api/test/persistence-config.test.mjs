import test from "node:test";
import assert from "node:assert/strict";
import {
  PERSISTENCE_DRIVERS,
  checkPersistenceReadiness,
  resolvePersistenceDriver,
} from "../src/persistence/config.mjs";
import { applyMigrations } from "../src/migrate.mjs";

test("persistence driver accepts only the explicit file/postgres modes", () => {
  assert.equal(resolvePersistenceDriver(undefined), PERSISTENCE_DRIVERS.FILE);
  assert.equal(resolvePersistenceDriver("file"), PERSISTENCE_DRIVERS.FILE);
  assert.equal(resolvePersistenceDriver("POSTGRES"), PERSISTENCE_DRIVERS.POSTGRES);
  assert.throws(() => resolvePersistenceDriver("sqlite"), (error) => error.code === "INVALID_PERSISTENCE_DRIVER");
});

test("file readiness requires an initialized adapter but does not require a database", async () => {
  assert.deepEqual(await checkPersistenceReadiness({ driver: "file" }), {
    ready: false,
    driver: "file",
    check: "file-adapter-not-initialized",
  });
  assert.deepEqual(await checkPersistenceReadiness({ driver: "file", store: {} }), {
    ready: true,
    driver: "file",
    check: "file-adapter",
  });
});

test("postgres readiness is not ready without a repository or a healthy query", async () => {
  assert.equal((await checkPersistenceReadiness({ driver: "postgres" })).ready, false);
  assert.equal((await checkPersistenceReadiness({ driver: "postgres", repository: { health: async () => false } })).ready, false);
  assert.equal((await checkPersistenceReadiness({ driver: "postgres", repository: { health: async () => { throw new Error("connection refused"); } } })).ready, false);
});

test("postgres readiness is ready only when the repository health query returns true", async () => {
  const result = await checkPersistenceReadiness({ driver: "postgres", repository: { health: async () => true } });
  assert.deepEqual(result, { ready: true, driver: "postgres", check: "postgres" });
});

test("migration command never opens a database in file mode", async () => {
  const result = await applyMigrations({ driver: "file", databaseUrl: "postgresql://should-not-connect" });
  assert.deepEqual(result.mode, "file");
  assert.deepEqual(result.applied, []);
});
