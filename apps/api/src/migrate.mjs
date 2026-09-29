import { CONTENT_VERSION } from "../../../packages/content/index.mjs";
console.log(JSON.stringify({ event: "migration.ready", schemaVersion: 1, contentVersion: CONTENT_VERSION, mode: process.env.DATABASE_URL ? "prototype-file-adapter" : "memory" }));
