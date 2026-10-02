# UI00 shared foundation

Date: 2026-10-02 (Asia/Bangkok). Stage 1 foundation prepared for freeze; this report is committed with the gate implementation. Screen integration and owner acceptance are separate later gates.

UI FOUNDATION: PASS. TOKENS: DONE. SHARED PRIMITIVES: DONE (12). RESPONSIVE CONTRACT: DONE. OWNERSHIP MANIFEST: DONE.

VISUAL: PASS for shared wood/cream/green/orange surfaces, rounded slots and buttons, soft shadows, leaf decoration and approved atlas item art. This is a foundation specimen, not a completed warehouse or a full mockup reproduction. Desktop and 740×360 images were inspected directly.

RESPONSIVE: PASS for 1920×1080, 1366×1024, 932×430, 915×412, 844×390 and 740×360. The dialog stays within the viewport; its body scrolls internally, header/footer remain available, buttons stay at least 44×44 and the document has no horizontal overflow. Evidence: `evidence/ui00/` (six screenshots).

FUNCTION: PASS for native modal activation, Escape, focus restoration, keyboard focus containment, disabled tabs and shared primitive contracts. Corrected native `open` attribute conversion and initial enabled-tab selection during review.

ASSET GAP: dedicated pictorial wood/resource/navigation icons and ornamental panel sprites are not added by UI00. Existing manifest remains 188 approved production-ready assets, zero placeholders. Control glyphs are explicitly native UI rather than new approved art. UI19 must audit all screen requirements.

SHARED CHANGE REQUEST: none at freeze. The ownership manifest and append-only request protocol are supplied.

FILES CHANGED: `apps/web/src/ui/foundation/**`; content-copy build hook; web HTML/Docker/service-worker packaging; package scripts; foundation unit/browser tests and fixture; `docs/ui/**`. No gameplay/API/PostgreSQL/renderer/camera/chicken data edits.

TEST RESULTS: `npm run check` PASS (syntax, localization, foundation, renderer, API, security/static-serving, strict assets). `npx playwright test tests/e2e/ui00-foundation.spec.mjs --project=chromium`: 7/7 PASS. Browser checks are isolated component tests, not claims of integrated gameplay approval.

Deployment was not changed during UI00. Quick Tunnel observed RUNNING / CONNECTED with nginx/API/PostgreSQL healthy and public origin matching. Existing URL preserved: `https://francisco-ohio-camcorder-industrial.trycloudflare.com`.

UI01–UI20 may begin only after this commit is pushed to origin/main and the worktree is verified clean. UI99 owns integration and public deployment. RC01: BLOCKED_BY_UI_VISUAL_ACCEPTANCE; do not resume acceptance without Project Owner approval.
