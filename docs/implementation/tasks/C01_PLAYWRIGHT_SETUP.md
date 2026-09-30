# C01 — Playwright E2E setup

- Task ID: C01
- Name: Playwright setup và core direct-entry/gameplay E2E
- Status: DONE
- Owner: QA workstream
- Dependencies: web/API baseline; A02 PostgreSQL wiring remains outside this local harness
- Owned paths: `playwright.config.mjs`, `tests/e2e/**`, this task note
- Forbidden paths: API/web/renderer source contracts, gameplay numbers, package ownership before root integration, shared status docs, Cloudflare
- Deliverables: Chromium desktop/mobile projects, deterministic same-origin harness, API clock endpoint, core E2E flows, failure artifacts
- Checklist: 6/6
  - [x] direct entry and no Tutorial
  - [x] existing character/resume and one bootstrap assertion
  - [x] crop/plant/harvest/reload flow with server-aligned clock
  - [x] pond and chicken/egg flow
  - [x] mobile orientation/touch/PWA smoke
  - [x] browser error capture and failure artifacts
- Current activity: DONE — parent review completed after Playwright installation and suite execution.
- Last completed: C01-scoped two-project run — 5 passed, 5 intentionally skipped; the current three-project aggregate including C03 is recorded in the C03 task note.
- Next activity: maintenance only; physical-device validation remains outside this prototype gate.
- Tests: static syntax checks for all C01 files PASS; Playwright 1.63 with local Chrome channel PASS. Remote CI runs [36660295559](https://github.com/nhungcute/Farmer_MO/actions/runs/36660295559) and [36662455574](https://github.com/nhungcute/Farmer_MO/actions/runs/36662455574) completed all five workflow jobs successfully; C01 remains the local file-adapter harness and does not use a shared database.
- Blocker: no blocker for local harness; physical-device validation remains outside this prototype gate.
- Start time: 2026-09-29 14:57 UTC
- End time: 2026-09-30 (DONE after parent review)

This task adds the Playwright configuration and the canonical direct-entry smoke flows. It does not change the web, API, renderer, package manifest, or lockfile.

## Files

- `playwright.config.mjs` — Chromium desktop and Pixel 7 mobile projects, one worker, traces/screenshots/video on failure, and the local E2E web server.
- `tests/e2e/harness.mjs` — same-origin static web server plus API proxy. It owns an in-memory `FarmStore` and exposes `GET /__e2e/clock?advanceMs=...` for deterministic crop/chicken timers.
- `tests/e2e/helpers.mjs` — API calls, clock alignment, grid hit testing for the Pixi and Canvas renderers, direct-entry helpers, and browser-error capture.
- `tests/e2e/direct-entry.spec.mjs` — new/existing character, one-bootstrap, crop/reload, pond persistence, coop/chicken timer, portrait overlay, touch-action, and standalone-manifest checks.

The harness is intentionally local. E2E does not use Cloudflare, a public hostname, or a production database. Each test uses a unique character name; the harness process is shared for the run but browser contexts remain isolated. Gameplay mutations are issued through the browser session with the production API contract; the toolbar is still selected in the UI, while renderer-specific grid/pinch geometry stays in the renderer test track so headless WebGL cannot make economy assertions flaky.

## Required root changes (owned by the root integration task)

Do not copy these changes into the task branch automatically; apply them with the repository's chosen package-manager policy:

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:headed": "playwright test --headed"
  },
  "devDependencies": {
    "@playwright/test": "^1.63.0"
  }
}
```

After installing the dependency, use the installed Chrome channel or install the pinned Playwright Chromium browser once:

```text
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm e2e
```

The repository config prefers the locally installed `chrome` channel so CI/agents can run without downloading a second browser. In CI, install Chrome or remove the `channel` override and run the pinned browser install before invoking `pnpm e2e`.

The suite requires `@playwright/test` 1.45 or newer for `page.clock`; the repository integration currently targets `^1.63.0`. The API clock is advanced through the harness endpoint so tests never sleep for 120 or 600 seconds.

## Coverage and acceptance mapping

| Flow | Assertions |
|---|---|
| New direct entry | Name login, exactly one `/api/game/bootstrap`, farm visible immediately, no tutorial, starter harvest, plant, server/browser fake clock, harvest, reload state |
| Existing character | Re-enter same name returns `existing`, no tutorial, one bootstrap after reload |
| Pond | Reach level 2 through starter harvest/order, place `pond_small_lv1`, reload, same grid/rotation |
| Chicken | Place coop, exactly one generated chicken, feed starter feed, advance server clock, collect egg, buy feed, feed again |
| Mobile/PWA | Portrait rotation overlay, landscape hides it, canvas `touch-action: none`, standalone manifest |

The tests collect `pageerror` and `console.error` and fail the flow if either occurs. The local API remains authoritative for economy and timers; direct browser-session API calls are used where the current demo toolbar has no pond control, a timer would otherwise require a ten-minute wait, or headless WebGL hit coordinates would make a state assertion flaky.
