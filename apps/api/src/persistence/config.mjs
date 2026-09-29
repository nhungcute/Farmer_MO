/**
 * Runtime persistence configuration shared by the API bootstrap and health
 * checks.  The prototype deliberately keeps the file adapter available while
 * making an accidental/unknown driver fail fast instead of silently falling
 * back to memory.
 */

export const PERSISTENCE_DRIVERS = Object.freeze({ FILE: "file", POSTGRES: "postgres" });

export class PersistenceConfigurationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "PersistenceConfigurationError";
    this.code = "INVALID_PERSISTENCE_DRIVER";
    this.details = details;
  }
}

export function resolvePersistenceDriver(value = process.env.PERSISTENCE_DRIVER) {
  const driver = String(value ?? PERSISTENCE_DRIVERS.FILE).trim().toLowerCase();
  if (driver === PERSISTENCE_DRIVERS.FILE || driver === PERSISTENCE_DRIVERS.POSTGRES) return driver;
  throw new PersistenceConfigurationError(
    "PERSISTENCE_DRIVER must be either file or postgres.",
    { field: "PERSISTENCE_DRIVER", allowed: Object.values(PERSISTENCE_DRIVERS), received: value },
  );
}

export function persistenceDescriptor(driver) {
  const resolved = resolvePersistenceDriver(driver);
  return resolved === PERSISTENCE_DRIVERS.POSTGRES
    ? { driver: resolved, durable: true, requiresDatabase: true, name: "PostgreSQL" }
    : { driver: resolved, durable: Boolean(process.env.STATE_FILE), requiresDatabase: false, name: "file adapter" };
}

/**
 * Check the selected persistence backend.  A file adapter is considered
 * ready once it has been constructed; PostgreSQL must answer `SELECT 1`.
 * Errors are returned as data so readiness endpoints can emit a stable
 * response without leaking connection strings or driver internals.
 */
export async function checkPersistenceReadiness({ driver = process.env.PERSISTENCE_DRIVER, repository, store } = {}) {
  const resolved = resolvePersistenceDriver(driver);
  if (resolved === PERSISTENCE_DRIVERS.FILE) {
    return {
      ready: Boolean(store),
      driver: resolved,
      check: store ? "file-adapter" : "file-adapter-not-initialized",
    };
  }

  if (!repository || typeof repository.health !== "function") {
    return { ready: false, driver: resolved, check: "postgres-unavailable", reason: "repository-not-initialized" };
  }
  try {
    const healthy = await repository.health();
    return {
      ready: healthy === true,
      driver: resolved,
      check: healthy === true ? "postgres" : "postgres-unavailable",
      ...(healthy === true ? {} : { reason: "health-query-failed" }),
    };
  } catch {
    return { ready: false, driver: resolved, check: "postgres-unavailable", reason: "health-query-failed" };
  }
}
