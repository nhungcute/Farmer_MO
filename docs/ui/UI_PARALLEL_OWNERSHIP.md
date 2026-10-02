# UI parallel ownership

Stage 1: UI00 owns and freezes the foundation below after its tested commit is pushed to origin/main. Stage 2 starts only with a clean main worktree. Stage 3: UI99 alone integrates and resolves shared requests. RC01 remains BLOCKED_BY_UI_VISUAL_ACCEPTANCE until Project Owner review.

## Frozen UI00 files

- `apps/web/src/ui/foundation/**`: tokens, primitives, icons, content adapter, responsive shell, event contracts.
- `apps/web/build/sync-content.mjs`, `apps/web/index.html`, `apps/web/sw.js`, `package.json` and `apps/web/Dockerfile` packaging hooks.
- `tests/e2e/ui-fixture.mjs`, `tests/e2e/ui00-foundation.spec.mjs`, `tests/ui/foundation.test.mjs`.
- This file and `docs/ui/UI_FOUNDATION_CONTRACT.md`.

Screen owners import `foundation/index.js`, implement `renderScreen(props)`, and use documented data attributes. Screen CSS starts with `.uiNN`; screen workers must not redefine shared variables or primitives. UI99 connects pure screen markup to existing API operations and shell regions.

## Task paths

Each UI01–UI18 task exclusively owns `apps/web/src/ui/screens/uiNN/**`, `tests/ui/uiNN.test.mjs`, `tests/e2e/uiNN.spec.mjs`, `docs/ui/UI_NN_REPORT.md` and `docs/ui/evidence/uiNN/**`. Each task reads its assigned prompt under `Mo_Farm_UI_Parallel_Prompts_Pack/Mo_Farm_UI_Parallel_Prompts_Pack/` and the foundation contract. No sibling screen edits.

UI03/UI04 own presentation only; no renderer, authoritative state, placement or collision changes. They may provide region markup and view metadata for integration.

UI19 owns `docs/ui/UI19_ASSET_GAP_AUDIT.md` and associated evidence. UI20 owns `docs/ui/UI20_FARM_LAYOUT_SPEC.md`. Both are documentation tasks and do not approve new artwork or change game data.

UI99 owns integration adapters, `main.js`, legacy UI/CSS migration, integration tests, consolidated reports, and resolutions to shared requests. The existing gameplay/API/PostgreSQL, canonical content, asset/chicken contracts and Quick Tunnel lifecycle stay locked.

## Repository-safe execution

Each worker gets an isolated Git worktree with its own branch and independent browser/API ports. Never run two writers in one worktree. A worker may complete several tasks sequentially; each task gets a separate commit with owned paths, test results and a clean worktree. Branches are based on the pushed UI00 commit. Workers never merge to main or deploy. UI99 reviews and cherry-picks approved task commits in dependency order.

Use `npm run check` and owned browser tests for each implementation; renderer-facing tasks additionally retain renderer checks. Dedicated `PW_PORT` / `PW_API_PORT` values prevent shared harness collisions. Do not claim isolated screen screenshots prove integrated gameplay.

## Shared changes

Append requests to `docs/ui/SHARED_CHANGE_REQUESTS.md` in the worker's isolated branch with task, reason, affected screens and proposed implementation. UI99 consolidates these append-only entries during review. A worker may also record the request in its report to avoid document conflicts. Only UI99 changes frozen files after the gate.

## Evidence and acceptance

Screens support 1920×1080, 1366×1024, 932×430, 915×412, 844×390 and 740×360 with reflow, visible controls and no document horizontal overflow. Screenshots live in the task's evidence directory. Reports distinguish functional/responsive checks from visual comparison and owner acceptance. Missing artwork is an explicit gap, never an approved placeholder.
