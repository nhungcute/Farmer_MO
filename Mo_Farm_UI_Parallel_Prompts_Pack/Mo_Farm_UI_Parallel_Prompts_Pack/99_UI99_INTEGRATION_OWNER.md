# UI99 — Integration Owner

```text
UI99 — MỠ FARM UI PARALLEL INTEGRATION OWNER

Collect outputs from all UI parallel tasks.

Review:
UI00 shared foundation
UI01 Login
UI02 Loading
UI03 Starter Farm
UI04 Full Farm
UI05 Warehouse
UI06 Shop
UI07 Orders
UI08 Quests
UI09 Chicken Coop
UI10 Chicken Production
UI11 Item Detail
UI12 Level Up
UI13 Unlock
UI14 Settings
UI15 Dialogs
UI16 Toasts
UI17 Mobile Toolbar
UI18 HUD
UI19 Asset Gaps
UI20 Farm Layout

Do NOT blind merge.

Only Integration Owner may modify shared UI foundation now.
Resolve SHARED_CHANGE_REQUESTS.md.

Visual consistency:
same palette
same wood/cream panel style
same button hierarchy
same typography
same shadows
same icon sizing
same spacing
No dark-dashboard screen.

Product scope:
Rice
Carrot
Corn
Tomato
Market
Warehouse
Orders
Quests
XP/levels/unlocks
Pond
Chicken Coop
Chicken feed/egg

No cow/pig/fishing/weather/social/multiplayer/guild/chat.
No account/password/OAuth.

Consolidate asset gaps.
Do NOT silently approve placeholders as production.

Full QA:
npm run renderer:test
npm run test:api:full
npm run test:e01:security
npm run assets:validate
npm run assets:validate:strict
npm run assets:validate:wave1
npm run assets:validate:wave2
npm run assets:validate:wave2-release
npm run check
git diff --check

Capture every implemented screen at:
desktop
932x430
915x412
844x390
740x360

Only after regression PASS:
npm run e01:app:update

Do NOT restart cloudflared.

Verify:
same Quick Tunnel URL
same cloudflared container identity
public app updated successfully

RC01 remains BLOCKED_BY_UI_VISUAL_ACCEPTANCE
until Project Owner visually approves.

FINAL REPORT:
SCREENS 01-16 PASS/FAIL
HUD PASS/FAIL
MOBILE TOOLBAR PASS/FAIL
FARM COMPOSITION PASS/FAIL
ASSET GAPS
UNSUPPORTED MOCKUP FEATURES REMOVED
PUBLIC URL PRESERVED YES/NO
RC01 READY_FOR_OWNER_VISUAL_REVIEW / BLOCKED
```
