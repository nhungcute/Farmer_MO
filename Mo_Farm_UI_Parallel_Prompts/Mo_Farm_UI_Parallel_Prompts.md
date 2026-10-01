# MỠ FARM — UI PARALLEL IMPLEMENTATION PROMPTS

## Mục tiêu
Triển khai song song toàn bộ giao diện Mỡ Farm dựa trên bộ mockup đã duyệt.

Phong cách bắt buộc:
- 2.5D isometric
- cozy
- bright
- cute
- colorful
- cartoon farm
- wood + cream panels
- green/orange primary actions
- soft rounded corners
- warm shadows
- leaf/flower ornamentation

Không dùng:
- dark dashboard
- SaaS UI
- generic Material UI
- glassmorphism
- monochrome dark green
- bootstrap/admin appearance

---

# PROMPT 0 — UI00: SHARED UI FOUNDATION

```text
Tiếp tục project MỠ FARM tại:

D:\Core_LVB_BIDC\Project\Farmer_MO

==================================================
UI00 — SHARED UI FOUNDATION
==================================================

Mục tiêu:

Tạo foundation chung để nhiều agent có thể implement các màn hình
Mỡ Farm song song mà không xung đột.

Đây KHÔNG phải task implement một màn hình cụ thể.

==================================================
VISUAL SOURCE OF TRUTH
==================================================

Bộ mockup Mỡ Farm đã được Project Owner duyệt là nguồn chuẩn visual.

Phong cách bắt buộc:

- 2.5D isometric
- cozy
- bright
- cute
- colorful
- cartoon farm
- wood + cream panels
- green/orange primary actions
- soft rounded corners
- warm shadows
- leaf/flower ornamentation

KHÔNG:

- dark dashboard
- SaaS UI
- generic Material UI
- glassmorphism
- monochrome dark green
- bootstrap/admin appearance

==================================================
CRITICAL PARALLEL RULE
==================================================

UI00 là SINGLE OWNER của các shared files.

Các screen agent sau đó KHÔNG được sửa shared foundation.

Tạo/freeze ownership manifest.

Ví dụ:

docs/ui/UI_PARALLEL_OWNERSHIP.md

==================================================
CREATE/FREEZE DESIGN TOKENS
==================================================

Tạo canonical UI tokens cho:

colors
typography
spacing
radius
shadow
z-index
button heights
HUD dimensions
panel surfaces
tab states
modal surfaces
toast surfaces

Preferred structure tương thích repo hiện tại, ví dụ:

apps/web/src/ui/theme/
apps/web/src/ui/components/

Không đổi kiến trúc nếu repo đã có convention tốt hơn.

==================================================
SHARED PRIMITIVES
==================================================

Tạo primitives tối thiểu:

FarmPanel
WoodHeader
FarmButton
FarmIconButton
FarmTabs
FarmModal
FarmToast
FarmProgress
FarmResourceChip
FarmItemSlot
FarmBadge
FarmCloseButton

Primitives phải hỗ trợ:

desktop
tablet landscape
mobile landscape

==================================================
9-SLICE / ART UI
==================================================

Nếu production UI art chưa đủ:

KHÔNG tự tạo asset giả.

Có thể dựng reusable CSS/SVG approximation theo visual reference
nhưng phải ghi:

ART_GAP

và đảm bảo dễ thay bằng production sprite sau này.

==================================================
RESPONSIVE BREAKPOINT CONTRACT
==================================================

Khóa responsive behavior cho ít nhất:

desktop 1920x1080 reference
iPad landscape
932x430
915x412
844x390
740x360

Không scale toàn bộ UI bằng transform.

Layout phải reflow.

==================================================
SHARED GAME SHELL CONTRACT
==================================================

Khóa regions:

Top HUD
Left navigation
Bottom toolbar
Farm canvas
Context panel
Modal layer
Toast layer

Không implement nội dung từng screen.

==================================================
PARALLEL OWNERSHIP
==================================================

Sau UI00:

Screen agents được phép tạo file riêng của screen.

Screen agents KHÔNG được sửa:

theme/tokens
shared primitives
global app shell contract
common responsive variables
shared icon registry

Nếu cần thay đổi shared:
ghi vào:

docs/ui/SHARED_CHANGE_REQUESTS.md

Integration Owner xử lý cuối.

==================================================
REGRESSION
==================================================

Không đổi:

gameplay
API
PostgreSQL
economy
renderer contracts
asset contracts
Quick Tunnel architecture

Không restart cloudflared.

==================================================
VALIDATION
==================================================

npm run renderer:test
npm run test:api:full
npm run test:e01:security
npm run check
git diff --check

==================================================
OUTPUT
==================================================

UI FOUNDATION:
PASS / FAIL

TOKENS:
DONE / FAIL

SHARED PRIMITIVES:
DONE / FAIL

RESPONSIVE CONTRACT:
DONE / FAIL

OWNERSHIP MANIFEST:
DONE / FAIL

FILES OWNED BY UI00:
...

FILES FROZEN FOR PARALLEL WORK:
...

COMMIT:
...

Do not start screen implementation.
```

---

# PROMPT 1 — LOGIN

```text
UI01-LOGIN — MỠ FARM LOGIN SCREEN

Implement màn hình Login theo đúng mockup canonical:

01_Login.png

OWNERSHIP:
Chỉ sửa/tạo file thuộc màn Login.

KHÔNG sửa shared UI foundation.

Nếu cần shared change:
ghi SHARED_CHANGE_REQUESTS.md.

==================================================
VISUAL TARGET
==================================================

Màn Login phải nhìn ngay lập tức giống game nông trại,
không giống website/dashboard.

Bao gồm:

- logo Mỡ Farm lớn
- bright farm background
- farmhouse/crops/chicken decorative scene
- cream/wood login card
- label "Tên người chơi"
- input lớn, touch friendly
- CTA "Vào nông trại"
- copy ngắn, thân thiện

==================================================
PRODUCT RULE
==================================================

Login chỉ dùng display name.

KHÔNG:

email
password
OAuth
registration form

==================================================
RESPONSIVE
==================================================

Implement:

Desktop
iPad landscape
932x430
915x412
844x390
740x360

CTA phải luôn truy cập được.

No overflow.

==================================================
DO NOT
==================================================

Không dark green fullscreen.
Không generic centered SaaS card.
Không thêm gameplay/tutorial.

==================================================
QA
==================================================

Capture screenshots:
login-desktop
login-ipad
login-932x430
login-740x360

Run:
npm run check
relevant UI/browser tests

REPORT:
LOGIN VISUAL MATCH PASS/FAIL
RESPONSIVE PASS/FAIL
FUNCTION PASS/FAIL
FILES CHANGED
SHARED REQUESTS
```

---

# PROMPT 2 — LOADING

```text
UI02-LOADING — MỠ FARM LOADING SCREEN

Implement theo:

02_Loading.png

OWNERSHIP:
Chỉ màn Loading.

==================================================
TARGET
==================================================

Bright farm illustration.

Logo Mỡ Farm rõ ràng.

Loading panel gồm:

"Đang tải nông trại..."

progress bar

percentage

loading status

random friendly tip

==================================================
IMPORTANT
==================================================

Progress phải phản ánh loading state thực tế nếu app hiện có state.

Không fake 100% rồi vẫn chờ lâu.

Nếu không có granular progress:
dùng staged deterministic progress + real completion state,
nhưng không thay backend.

==================================================
STATES
==================================================

initializing
loading assets
loading player
loading farm
ready
error/retry

==================================================
RESPONSIVE
==================================================

Desktop / iPad / mobile landscape.

Không overflow.

==================================================
REPORT
==================================================

LOADING VISUAL PASS/FAIL
PROGRESS LOGIC PASS/FAIL
ERROR STATE PASS/FAIL
RESPONSIVE PASS/FAIL
```

---

# PROMPT 3 — FARM EMPTY / STARTER

```text
UI03-FARM-STARTER — STARTER FARM COMPOSITION

Implement visual composition theo:

04_Farm_Empty_Starter.png

OWNERSHIP:
Farm starter presentation/composition only.

Do NOT modify server-authoritative starter economy.

==================================================
CANONICAL STARTER DATA
==================================================

1000 coin
5 diamonds
6 plots
3 rice ready
1 chicken_feed
warehouse capacity 100
3 starter orders

Use server data.

Do NOT hardcode gameplay state in renderer.

==================================================
VISUAL TARGET
==================================================

Starter farm phải:

- đẹp nhưng chưa đầy
- thấy rõ không gian mở rộng
- farmhouse
- warehouse
- starter crop zone
- coop where canonical unlock/state permits
- pond/environment as allowed
- paths
- fences
- trees/flowers/decor
- expansion areas visually readable

==================================================
CRITICAL
==================================================

Decorative environment có thể là client visual composition.

Gameplay buildings/entities vẫn theo server state.

Không biến decoration thành authoritative gameplay object.

==================================================
CAMERA
==================================================

Initial camera phải frame farm starter đẹp,
không để player thấy một biển cỏ trống.

==================================================
QA
==================================================

desktop
4 mobile landscape viewports

No renderer contract changes.

renderer 16/16 must remain PASS.

REPORT:
STARTER COMPOSITION PASS/FAIL
CAMERA PASS/FAIL
SERVER AUTHORITY PRESERVED YES/NO
```

---

# PROMPT 4 — FARM FULL

```text
UI04-FARM-FULL — FULL FARM VISUAL COMPOSITION

Implement theo canonical mockup:

03_Farm_Full.png

Mục tiêu:
Đây là visual benchmark quan trọng nhất của project.

==================================================
OWNERSHIP
==================================================

Farm visual composition and screen-specific overlays only.

Do NOT modify shared primitives.
Do NOT modify animation contracts.

==================================================
COMPOSITION
==================================================

Scene cần cảm giác phong phú:

farmhouse
warehouse
chicken coop
pond
crop areas
paths
fences
bridges where supported
trees
fruit trees
flowers
bushes
rocks
small props
decorative boundary

==================================================
IMPORTANT
==================================================

Không cần mọi decorative object là gameplay entity.

Tách:

GAMEPLAY ENTITIES
vs
VISUAL ENVIRONMENT DECORATION

==================================================
HUD
==================================================

Use shared shell:

top resource HUD
left navigation
bottom toolbar
optional right context panels

==================================================
ASSET GAP
==================================================

Nếu thiếu asset để đạt mockup:

KHÔNG tự nhét unrelated image.

Produce:

docs/ui/gaps/UI04_FARM_FULL_ASSET_GAPS.md

liệt kê chính xác asset cần thêm.

Implement best possible composition với approved assets hiện có.

==================================================
QA
==================================================

Compare screenshot to reference.

Check:

composition balance
visual density
farm readability
paths
building placement
mobile camera

REPORT:
FARM FULL PASS/FAIL
ASSET GAPS
VISUAL SIMILARITY
```

---

# PROMPT 5 — WAREHOUSE

```text
UI05-WAREHOUSE — KHO ĐỒ

Implement theo:

05_Warehouse.png

OWNERSHIP:
Warehouse UI only.

==================================================
LAYOUT
==================================================

Header: Kho đồ

Category tabs:
Tất cả
Hạt giống
Nông sản
Vật nuôi/Sản phẩm chăn nuôi where applicable
Nguyên liệu
Khác

Inventory grid

Capacity indicator

Selected item detail panel

Actions based on actual supported gameplay.

==================================================
IMPORTANT
==================================================

Do not invent unsupported items/actions.

UI may show only canonical currently supported content.

Use real inventory data.

==================================================
RESPONSIVE
==================================================

Desktop:
grid + detail side panel

Tablet:
compressed grid + detail

Mobile landscape:
grid + compact detail/drawer

==================================================
REPORT
==================================================

WAREHOUSE VISUAL PASS/FAIL
REAL DATA PASS/FAIL
MOBILE PASS/FAIL
```

---

# PROMPT 6 — SHOP

```text
UI06-SHOP — CỬA HÀNG

Implement theo:

06_Shop.png

OWNERSHIP:
Shop/Market presentation only.

==================================================
SUPPORTED PRODUCT SCOPE
==================================================

Only use canonical game content.

Primary relevant items:

Rice
Carrot
Corn
Tomato
Chicken Feed

Do not add cow/pig/fishing/social content.

==================================================
LAYOUT
==================================================

Shop header

Category tabs

Product cards

Image
Name
Price
Quantity controls if supported
Buy/Sell action according to actual API

Current resource balance

Optional selected-item information panel

==================================================
SERVER AUTHORITY
==================================================

Price comes from canonical content/server.

Do NOT hardcode conflicting prices in UI.

Chicken feed canonical price:
5 coin

==================================================
REPORT
==================================================

SHOP VISUAL PASS/FAIL
PRICE AUTHORITY PASS/FAIL
BUY/SELL PASS/FAIL
RESPONSIVE PASS/FAIL
```

---

# PROMPT 7 — ORDERS

```text
UI07-ORDERS — ĐƠN HÀNG

Implement theo mockup Đơn hàng đã duyệt.

OWNERSHIP:
Orders screen only.

==================================================
UI
==================================================

Tabs/status:

available
in progress / deliverable if supported
completed/history if supported

Order cards show:

required products
current quantity
required quantity
coin reward
XP reward
other canonical reward
delivery action

Selected order detail.

==================================================
DATA
==================================================

Use actual server order state.

Do not fabricate customer system if backend doesn't have named NPC
customer metadata.

If mockup contains unsupported decorative customer identity:
use presentation-only generic label or document gap.

==================================================
REPORT
==================================================

ORDERS VISUAL PASS/FAIL
ORDER STATE PASS/FAIL
DELIVERY PASS/FAIL
```

---

# PROMPT 8 — QUESTS

```text
UI08-QUESTS — NHIỆM VỤ

Implement theo mockup Nhiệm vụ.

OWNERSHIP:
Quest screen only.

==================================================
LAYOUT
==================================================

Quest category tabs if supported.

Quest list

progress bars

reward presentation

claim / navigate action

milestone strip only if actual game supports it.

==================================================
IMPORTANT
==================================================

Do not create new daily/event quest systems merely because mockup
shows them.

Map UI to current canonical quest model.

Unsupported mockup elements:
document as FUTURE_UI_GAP.

==================================================
REPORT
==================================================

QUEST VISUAL PASS/FAIL
REAL QUEST DATA PASS/FAIL
REWARDS PASS/FAIL
```

---

# PROMPT 9 — CHICKEN COOP

```text
UI09-CHICKEN-COOP — CHUỒNG GÀ

Implement theo mockup Chuồng gà.

OWNERSHIP:
Chicken Coop screen/context UI only.

==================================================
CANONICAL GAMEPLAY
==================================================

Existing gameplay:

Chicken Coop
chicken feed
egg production

Use actual state.

==================================================
CHICKEN CONTRACT LOCKED
==================================================

Do NOT modify:

animation IDs
frame IDs
states
directions
FPS
events
anchor
pivot
mirror behavior

Existing canonical states:

IDLE
WALK
EAT
HAPPY
SLEEP
PRODUCT_READY

==================================================
UI
==================================================

Coop status

Chicken status

Feed action

Production timer

Egg ready state

Collect action

Capacity/upgrade only if supported by backend.

==================================================
REPORT
==================================================

COOP VISUAL PASS/FAIL
FEED FLOW PASS/FAIL
EGG FLOW PASS/FAIL
ANIMATION CONTRACT UNCHANGED YES/NO
```

---

# PROMPT 10 — CHICKEN FEED / PRODUCT

```text
UI10-CHICKEN-PRODUCTION — THỨC ĂN & SẢN PHẨM

Implement theo mockup Thức ăn gà & Sản phẩm.

OWNERSHIP:
Chicken production management UI only.

==================================================
CURRENT SCOPE
==================================================

Canonical:

chicken_feed
egg

Do NOT introduce:

advanced feed recipes
meat
manure
multi-tier feed production

unless these already exist in canonical content.

==================================================
DESIGN
==================================================

Use mockup visual structure,
but hide/remove unsupported product blocks.

Show:

feed inventory
feed action
production timer
egg readiness
egg collection
relevant inventory quantities

==================================================
REPORT
==================================================

VISUAL PASS/FAIL
CANONICAL SCOPE PRESERVED YES/NO
FEED/EGG FLOW PASS/FAIL
```

---

# PROMPT 11 — ITEM DETAIL

```text
UI11-ITEM-DETAIL — CHI TIẾT VẬT PHẨM

Implement according to approved item-detail mockup.

OWNERSHIP:
Reusable item-detail screen/modal wrapper for this task only.
Do not modify shared primitives.

==================================================
SHOW
==================================================

Item image

name

category

quantity

canonical description where available

price where available

growth/production time where relevant

source where available

supported actions only

==================================================
DO NOT INVENT
==================================================

Do not fabricate:

recipes
nutrition
selling price
item source
rarity

when canonical content does not provide them.

==================================================
REPORT
==================================================

ITEM DETAIL PASS/FAIL
DATA ACCURACY PASS/FAIL
```

---

# PROMPT 12 — LEVEL UP

```text
UI12-LEVEL-UP — LÊN CẤP

Implement according to approved Level Up mockup.

OWNERSHIP:
Level-up presentation only.

==================================================
TRIGGER
==================================================

Use real XP/level progression event/state.

Do not fake level increase.

==================================================
DISPLAY
==================================================

old level
new level
canonical rewards
canonical newly unlocked content
continue action

==================================================
IMPORTANT
==================================================

Mockup may contain illustrative rewards/features not present in game.

Only display real server/content unlocks.

==================================================
REPORT
==================================================

LEVEL-UP VISUAL PASS/FAIL
XP AUTHORITY PASS/FAIL
UNLOCK DATA PASS/FAIL
```

---

# PROMPT 13 — UNLOCK

```text
UI13-UNLOCK — MỞ KHÓA

Implement according to approved Unlock mockup.

OWNERSHIP:
Unlock presentation only.

==================================================
SOURCE
==================================================

Use actual unlock data from canonical content/server.

==================================================
DISPLAY
==================================================

Unlocked item/building/content image

unlock reason / level where available

benefit summary derived from canonical data

view / close action

==================================================
DO NOT
==================================================

Do not introduce:

new buildings
new products
new gameplay systems

only because they appear illustratively in mockup.

==================================================
REPORT
==================================================

UNLOCK VISUAL PASS/FAIL
SERVER UNLOCK MATCH PASS/FAIL
```

---

# PROMPT 14 — SETTINGS

```text
UI14-SETTINGS — CÀI ĐẶT

Implement visual style from approved Settings mockup,
BUT adapt strictly to actual Mỡ Farm capabilities.

OWNERSHIP:
Settings screen only.

==================================================
IMPORTANT PRODUCT CONSTRAINT
==================================================

Mỡ Farm has no account/password system.

Therefore DO NOT implement:

account linking
Facebook login
logout of external account
account ID management

unless existing product already supports it.

==================================================
ONLY SHOW REAL SETTINGS
==================================================

Examples if implemented:

sound
music
display/performance option
orientation/help
PWA information

Do not create fake settings backend.

==================================================
REPORT
==================================================

SETTINGS VISUAL PASS/FAIL
NO FAKE ACCOUNT SYSTEM PASS/FAIL
```

---

# PROMPT 15 — CONFIRMATION DIALOGS

```text
UI15-CONFIRM-DIALOGS — HỘP THOẠI XÁC NHẬN

Implement based on approved confirmation-dialog mockup.

OWNERSHIP:
Confirmation scenarios only.

==================================================
SUPPORTED DIALOG TYPES
==================================================

Create presentation for actual actions only, such as:

purchase confirmation
sell confirmation
destructive/remove confirmation
leave/cancel warning if relevant

==================================================
BUTTON HIERARCHY
==================================================

Primary:
green/orange

Destructive:
red

Cancel:
cream/neutral

Touch height >= 44px

==================================================
ACCESSIBILITY
==================================================

Focus trap
Escape behavior where appropriate
keyboard focus
aria dialog semantics

==================================================
REPORT
==================================================

DIALOG VISUAL PASS/FAIL
ACCESSIBILITY PASS/FAIL
```

---

# PROMPT 16 — TOAST / ERROR / SUCCESS

```text
UI16-TOASTS — THÔNG BÁO

Implement according to approved notification mockup.

OWNERSHIP:
Toast/notification presentation only.

==================================================
TYPES
==================================================

success
error
warning
info

==================================================
EXAMPLES
==================================================

harvest success
inventory full
insufficient coin
network issue
quest complete
item received

Only map to real application events.

==================================================
RULES
==================================================

Do not block gameplay for ordinary toast.

Auto dismiss where appropriate.

Manual dismiss supported.

Avoid covering critical HUD controls.

Responsive mobile positioning.

==================================================
REPORT
==================================================

TOAST VISUAL PASS/FAIL
EVENT INTEGRATION PASS/FAIL
MOBILE PASS/FAIL
```

---

# PROMPT 17 — MOBILE TOOLBAR

```text
UI17-MOBILE-TOOLBAR

Own only mobile toolbar layout.

Create responsive toolbar matching Mỡ Farm mockups.

Required:
740x360
844x390
915x412
932x430

Ensure all important controls reachable.

Do not require all controls simultaneously visible.

Allowed patterns:
scrollable toolbar
compact groups
overflow drawer

No clipped unreachable controls.

Do not modify desktop toolbar shared implementation directly.
Return shared change requests if needed.
```

---

# PROMPT 18 — HUD

```text
UI18-HUD

Own HUD implementation only.

Match mockups:

avatar/level/XP
coin
diamond
relevant capacity/resource indicators
settings/menu

Use real data.

Do not add wood/energy resources if game doesn't have them.

Compact layout for mobile.

No blocking farm canvas excessively.
```

---

# PROMPT 19 — UI COMPONENT ART GAP

```text
UI19-ASSET-GAP-AUDIT

Do NOT implement screens.

Compare all approved UI mockups to current production assets.

Create exact missing-asset inventory:

UI frames
buttons
tabs
icons
environment decor
paths
fences
trees
props
market visual
panel ornaments

For each gap:

asset ID proposal
use cases
size
canvas
alpha
9-slice suitability
priority

Do not generate assets.
```

---

# PROMPT 20 — FARM LAYOUT SPEC

```text
UI20-FARM-LAYOUT-SPEC

Do NOT alter gameplay.

Create canonical 24x24 farm composition specification.

Define:

building zones
crop zones
pond area
paths
decor zones
expansion zones
camera initial target
camera safe bounds
visual density
mobile framing

Separate clearly:

SERVER GAMEPLAY ENTITY
CLIENT VISUAL DECOR

Produce machine-readable layout/spec if appropriate.

Do not move authoritative gameplay objects without considering server state.
```

---

# PROMPT CUỐI — UI99 INTEGRATION OWNER

```text
UI99 — MỠ FARM UI PARALLEL INTEGRATION OWNER

Collect outputs from all UI parallel tasks.

==================================================
DO NOT BLIND MERGE
==================================================

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

==================================================
RESOLVE SHARED REQUESTS
==================================================

Only Integration Owner may now modify shared UI foundation.

Resolve SHARED_CHANGE_REQUESTS.md.

Reject unnecessary duplicated components.

==================================================
VISUAL CONSISTENCY
==================================================

All screens must share:

same palette
same wood/cream panel style
same button hierarchy
same typography
same shadows
same icon sizing
same spacing system

No dark-dashboard screen may remain.

==================================================
PRODUCT SCOPE AUDIT
==================================================

Remove accidental unsupported concepts introduced from illustrative mockups.

Mỡ Farm remains:

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

==================================================
ASSET GAP
==================================================

Consolidate asset gaps.

Do NOT silently approve generated placeholders as production.

==================================================
FULL QA
==================================================

Run:

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

==================================================
VISUAL SCREENSHOT MATRIX
==================================================

Capture every implemented screen at:

desktop
932x430
915x412
844x390
740x360

Compare to canonical references.

==================================================
PUBLIC DEPLOY
==================================================

Only after regression PASS:

npm run e01:app:update

Do NOT restart cloudflared.

Verify:

same Quick Tunnel URL
same cloudflared container identity
public app updated successfully

==================================================
RC STATUS
==================================================

RC01 remains:

BLOCKED_BY_UI_VISUAL_ACCEPTANCE

until Project Owner visually approves the integrated screens.

Do NOT mark RC01 DONE.

==================================================
FINAL REPORT
==================================================

SCREENS:
01 Login PASS/FAIL
02 Loading PASS/FAIL
03 Starter Farm PASS/FAIL
04 Full Farm PASS/FAIL
05 Warehouse PASS/FAIL
06 Shop PASS/FAIL
07 Orders PASS/FAIL
08 Quests PASS/FAIL
09 Chicken Coop PASS/FAIL
10 Chicken Production PASS/FAIL
11 Item Detail PASS/FAIL
12 Level Up PASS/FAIL
13 Unlock PASS/FAIL
14 Settings PASS/FAIL
15 Dialogs PASS/FAIL
16 Toasts PASS/FAIL

HUD:
PASS/FAIL

MOBILE TOOLBAR:
PASS/FAIL

FARM COMPOSITION:
PASS/FAIL

ASSET GAPS:
...

UNSUPPORTED MOCKUP FEATURES REMOVED:
...

PUBLIC URL PRESERVED:
YES/NO

RC01:
READY_FOR_OWNER_VISUAL_REVIEW / BLOCKED
```

---

# Gợi ý cách chạy song song

Sau khi UI00 hoàn tất:

```text
THREAD 01 → Login
THREAD 02 → Loading
THREAD 03 → Starter Farm
THREAD 04 → Full Farm

THREAD 05 → Warehouse
THREAD 06 → Shop
THREAD 07 → Orders
THREAD 08 → Quests

THREAD 09 → Chicken Coop
THREAD 10 → Chicken Production
THREAD 11 → Item Detail
THREAD 12 → Level Up

THREAD 13 → Unlock
THREAD 14 → Settings
THREAD 15 → Dialogs
THREAD 16 → Toasts

THREAD 17 → Mobile Toolbar
THREAD 18 → HUD
THREAD 19 → Asset Gap Audit
THREAD 20 → Farm Layout Spec
```

Sau đó chỉ chạy UI99 Integration Owner.
