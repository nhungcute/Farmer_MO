# UI foundation v1 — canonical contract

UI00 owns the foundation in Stage 1. After the UI00 gate it is frozen; only UI99 may resolve shared changes. Approved mockups are the visual source of truth. RC01 remains `BLOCKED_BY_UI_VISUAL_ACCEPTANCE` until the integrated result is ready for owner review.

## Imports and data

Import shared functions from `apps/web/src/ui/foundation/index.js`. Shared CSS is `foundation.css` and `tokens.css`. Scope screen CSS to its own `.uiXX-screen`; never override `:root`, `.farm-*`, `body`, `button`, `dialog` or another screen. Use `--farm-*` tokens for color, typography, spacing, surfaces, shadow and dimensions; screen grid geometry is owned by that screen.

`content` contains canonical exports from `packages/content/index.mjs`. `cropChoices`, `legacyCrops`, `levelProgress`, `itemQuantity`, `inventoryUsage` and `isUnlocked` are read-only view adapters. `content.generated.mjs` is a byte-checked packaging copy, never an editable source. Run `npm run ui:sync-content` after canonical changes. Do not duplicate prices, rewards, durations, level thresholds or unlock levels in screen code. Do not expose repository source or add a content API.

Inventory, currency, XP, level, placement, readiness and timers remain server-owned. A view renders state and emits intent; it must not grant rewards, deduct balances or fabricate a successful mutation. Countdown labels are presentation only. No cow/pig/fishing/weather/social/multiplayer/guild/chat or additional authentication gameplay.

## Screen module contract

UI01–UI18 each export `renderScreen(props = {})` from their owned `index.js`, returning HTML with one root `.uiXX-screen`. Use `screen.css` for scoped responsive geometry. Views accept immutable props and escape all user/API text with `escapeHtml` or primitive label props. `body`, `header`, `footer`, `content` and shell-region strings are trusted component markup; never insert unescaped API text in them.

Props may include `farm`, `category`, `selectedItem`, `quantity`, `busy`, `error`, `notice`, `now`, `crop`, `chicken`, `building`, `order`, `quest`, `unlocks`, `previousLevel`, `name`, `progress`, `message`, `confirmAction`. Defaults come from canonical content or an explicitly empty view. Do not create/mutate a farm in a view. Optional composition or controller bridge exports must be documented for UI99. UI19/UI20 own audit/layout specifications rather than inventing user screens.

UI99 integrates screens. Workers do not edit main.js, FarmInterface.js, LiveHud.js, ReferenceEntry.js, ReferencePanels.js, PanelLayout.js, global CSS, HTML, service worker, build scripts, renderer, API or content. Test isolated modules with `tests/e2e/ui-fixture.mjs`, then run relevant browser/API tests. Full integrated acceptance belongs to UI99. Never replace a real canvas with a full-scene screenshot.

## Shared primitives

- `FarmPanel({title,icon,body,footer,header,className,attrs})`
- `WoodHeader({title,icon,content,close,id})`
- `FarmButton({label,icon,variant,disabled,busy,className,attrs})`
- `FarmIconButton({label,icon,variant,disabled,attrs})`
- `FarmCloseButton({label,attrs})`
- `FarmTabs({tabs,selected,action,label,id})`
- `FarmModal({id,title,icon,body,footer,className,open,attrs})`
- `FarmToast({message,variant,dismissible,id,attrs})`
- `FarmProgress({value,max,label,id,className,attrs})`
- `FarmResourceChip({icon,label,value,id,action,attrs})`
- `FarmItemSlot({itemId,title,quantity,selected,disabled,badge,action,attrs})`
- `FarmBadge({label,variant,attrs})`

Button variants: green/orange/cream/red/blue. Toast variants: info/success/error. Tabs take `{id,label,icon,count,disabled}` and emit `data-category` by default; `action` selects another data key. `attributes()` rejects event-handler attributes/arbitrary styles. Busy implies disabled. Native dialog focus trapping, Escape and focus restoration use `openFarmModal`, `closeFarmModal` and one `attachFoundation(root)` listener; call its cleanup on destruction. Keep a dialog-local notice because a native top-layer dialog sits above page toasts.

`FarmIcon(name)` uses the frozen registry. `paintFarmIcons(root, registry?)` paints existing atlas frames; pass the app registry when available. Missing names produce an explicit text/empty gap marker, never an invented production ID. Native control glyphs are not newly approved art. Do not change the 188-entry manifest or locked chicken animation contract.

## Shell and actions

`FarmShell({hud,navigation,toolbar,context,sidebar,modal,toast,status,world})` owns Top HUD, Left navigation, Bottom toolbar, Canvas, Context, Modal and Toast regions. `EntryShell({body,footer,className})` handles entry/loading. Mount the shell once; update regions without replacing/reparenting mounted Pixi canvases. `createScreenRegistry()` rejects duplicate task IDs; UI99 owns registrations.

Keep applicable IDs: login-form, farmer-name, login-error, farm-canvas, game-renderer-host, farmer-name-label, coins, diamonds, wood, capacity, level, xp-fill, xp-label, quest-dot, crop-choice, status, notice, logout, dialog-title. Loading keeps `.loading-track > span`, `.loading-track > b`, `.loading-status`. Icons use `canvas[data-asset]`.

Existing intents: `data-tool=inspect|plant|harvest|build|feed|collect|buy-feed`; `data-context=crops|animals`; `data-panel=quests|orders|shop|warehouse|build|settings`; `data-camera=in|out|home`; data-category/item/seed/building/quest/order; `data-step=sell|feed|cart`, data-delta, data-focus-key; `data-action=close|sell|use-feed|add-feed|remove-feed|checkout|center|logout`. Namespace extra view intents `data-uiXX-*` and document them. No new social/payment gameplay.

## Responsive and QA

Targets: 1920×1080, iPad landscape 1366×1024, 932×430, 915×412, 844×390, 740×360. Keep a usable portrait hint. No page horizontal overflow. Minimum touch target 44×44 CSS px, including compact landscape. Use flex/grid reflow, wrapped tabs, bounded panel bodies and internal scrolling. Never scale a complete interface/panel with CSS transform; translation solely for centering is allowed.

Do not alter renderer/camera/DPR/pinch contracts. Use accessible names, actual disabled states, progress semantics, keyboard tabs, visible focus, native dialog Escape and focus restoration. Toasts do not steal focus; confirmations support cancel. Respect reduced motion; all user-facing copy is Vietnamese.

Each worker runs `npm run check`, owned browser checks and relevant API tests; renderer-facing tasks also run renderer:test. Save desktop, 932×430, 740×360 screenshots at minimum. Label isolated evidence separately from integrated gameplay. Reports contain VISUAL PASS/FAIL, RESPONSIVE PASS/FAIL, FUNCTION PASS/FAIL, ASSET GAP, SHARED CHANGE REQUEST, FILES CHANGED and TEST RESULTS. Never claim unexecuted tests passed. Missing artwork is a gap, not permission to generate/promote production art. Append shared requests in the task branch for UI99. RC01 is never automatically DONE.
