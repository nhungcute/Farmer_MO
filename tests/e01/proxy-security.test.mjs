import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const nginx = fs.readFileSync("infra/nginx/conf.d/default.conf", "utf8");
const nginxRoot = fs.readFileSync("infra/nginx/nginx.conf", "utf8");
const contract = JSON.parse(fs.readFileSync("infra/cloudflared/quick-tunnel-contract.json", "utf8"));
const historicalContract = JSON.parse(fs.readFileSync("infra/cloudflared/named-tunnel-contract.json", "utf8"));

test("E01 local Quick Tunnel contract preserves exact origins and independent lifecycle", () => {
  assert.deepEqual(contract, {
    schemaVersion: 1,
    canonical: true,
    e01ReleasePath: true,
    tunnelType: "quick",
    originService: "http://nginx:80",
    publicHostnameType: "ephemeral-trycloudflare",
    hostnameSuffix: ".trycloudflare.com",
    tokenRequired: false,
    fixedHostnameRequired: false,
    publicOriginMode: "runtime-generated-exact",
    persistentContainerLifecycle: true,
    appRedeployMustPreserveTunnel: true,
    quickTunnelAllowed: true,
    requiredCommand: ["tunnel", "--no-autoupdate", "--url", "http://nginx:80"],
    sharedNetwork: "mo-farm-frontend",
  });
  assert.doesNotMatch(JSON.stringify(contract), /token\s*[:=]\s*[^<\s]/iu);
});

test("E01 Named Tunnel evidence is superseded by the project owner decision", () => {
  assert.equal(historicalContract.status, "SUPERSEDED");
  assert.equal(historicalContract.canonical, false);
  assert.equal(historicalContract.e01ReleasePath, false);
  assert.equal(historicalContract.reason, "PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT");
  assert.equal(historicalContract.tunnelType, "named");
});

test("E01 nginx boundary has body limit, HSTS edge awareness and safe forwarded headers", () => {
  assert.match(nginx, /client_max_body_size\s+256k;/u);
  assert.match(nginx, /add_header Strict-Transport-Security \$strict_transport_security always;/u);
  assert.match(nginxRoot, /map \$http_x_forwarded_proto \$strict_transport_security/u);
  assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr;/gu);
  assert.match(nginx, /proxy_set_header X-Real-IP \$remote_addr;/gu);
  assert.match(nginx, /proxy_set_header X-Forwarded-Proto \$scheme;/gu);
  assert.match(nginx, /proxy_set_header X-Forwarded-Host \$host;/gu);
  assert.doesNotMatch(nginx, /\$proxy_add_x_forwarded_for/u);
  assert.match(nginx, /Content-Security-Policy/u);
  assert.match(nginx, /X-Content-Type-Options nosniff/u);
  assert.match(nginx, /Referrer-Policy no-referrer/u);
  assert.match(nginx, /Permissions-Policy "geolocation=\(\), camera=\(\), microphone=\(\)"/u);
});
