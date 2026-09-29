import test from "node:test";
import assert from "node:assert/strict";
import { PostgresFarmRepository, requestHash, stableStringify } from "../../src/repositories/postgresFarmRepository.mjs";

class FakeClient {
  constructor(handler) { this.handler = handler; this.statements = []; this.released = false; }
  async query(text, values = []) { this.statements.push({ text, values }); return this.handler(text, values, this); }
  release() { this.released = true; }
}

function poolFor(handler) {
  const clients = [];
  return { clients, async connect() { const client = new FakeClient(handler); clients.push(client); return client; } };
}

test("stable request hashes do not depend on object key order", () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(requestHash({ b: 2, a: 1 }), requestHash({ a: 1, b: 2 }));
});

test("withTransaction commits and releases the client", async () => {
  const pool = poolFor((text) => ({ rows: text === "SELECT 1 AS ok" ? [{ ok: 1 }] : [] }));
  const repository = new PostgresFarmRepository({ pool });
  assert.equal(await repository.withTransaction(async (client) => (await client.query("SELECT 1 AS ok")).rows[0].ok), 1);
  assert.deepEqual(pool.clients[0].statements.map((item) => item.text), ["BEGIN", "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE", "SELECT 1 AS ok", "COMMIT"]);
  assert.equal(pool.clients[0].released, true);
});

test("serialization failure is retried with rollback and a fresh client", async () => {
  let calls = 0;
  const pool = poolFor((text) => {
    if (text === "SELECT value") { calls += 1; if (calls === 1) { const error = new Error("serialization"); error.code = "40001"; throw error; } return { rows: [{ value: 42 }] }; }
    return { rows: [] };
  });
  const repository = new PostgresFarmRepository({ pool, maxTransactionRetries: 1 });
  const result = await repository.withTransaction(async (client) => (await client.query("SELECT value")).rows[0].value);
  assert.equal(result, 42);
  assert.equal(pool.clients.length, 2);
  assert.deepEqual(pool.clients[0].statements.map((item) => item.text), ["BEGIN", "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE", "SELECT value", "ROLLBACK"]);
});

test("retryable failure is surfaced after the retry budget and every attempt rolls back", async () => {
  for (const code of ["40001", "40P01"]) {
    const pool = poolFor((text) => {
      if (text === "SELECT value") {
        const error = new Error(`${code} exhausted`);
        error.code = code;
        throw error;
      }
      return { rows: [] };
    });
    const repository = new PostgresFarmRepository({ pool, maxTransactionRetries: 2 });
    await assert.rejects(() => repository.withTransaction((client) => client.query("SELECT value")), (error) => error.code === code);
    assert.equal(pool.clients.length, 3);
    for (const client of pool.clients) {
      assert.equal(client.released, true);
      assert.equal(client.statements.at(-1).text, "ROLLBACK");
    }
  }
});

test("runMutation rejects invalid idempotency keys before opening a transaction", async () => {
  const pool = poolFor(() => ({ rows: [] }));
  const repository = new PostgresFarmRepository({ pool });
  await assert.rejects(() => repository.runMutation({ characterId: "id", actionType: "test", key: "bad key", payload: {}, operation: async () => ({}) }), (error) => error.code === "INVALID_INPUT");
  assert.equal(pool.clients.length, 0);
});

test("runMutation stores one committed response and replays the same response", async () => {
  let stored;
  let operationCalls = 0;
  const pool = poolFor((text, values) => {
    if (text.includes("SELECT * FROM character")) return { rows: [{ id: "character-1", state_revision: 7 }] };
    if (text.includes("SELECT request_hash, response")) return { rows: stored ? [{ request_hash: stored.requestHash, response: stored.response }] : [] };
    if (text.includes("UPDATE character SET state_revision")) return { rows: [] };
    if (text.includes("INSERT INTO idempotency_record")) { stored = { requestHash: values[3], response: JSON.parse(values[4]) }; return { rows: [] }; }
    return { rows: [] };
  });
  const repository = new PostgresFarmRepository({ pool, clock: () => new Date("2026-09-29T08:00:00.000Z") });
  const input = { characterId: "character-1", actionType: "crops.harvest", key: "retry-1", payload: { plotId: "plot-1" }, operation: async () => { operationCalls += 1; return { harvested: { cropId: "rice", quantity: 3 } }; } };
  const first = await repository.runMutation(input);
  const second = await repository.runMutation(input);
  assert.deepEqual(second, first);
  assert.equal(first.stateRevision, 8);
  assert.equal(operationCalls, 1);
  assert.equal(pool.clients.length, 2);
  assert.ok(pool.clients[1].statements.some((statement) => statement.text.includes("SELECT request_hash, response")));
});
