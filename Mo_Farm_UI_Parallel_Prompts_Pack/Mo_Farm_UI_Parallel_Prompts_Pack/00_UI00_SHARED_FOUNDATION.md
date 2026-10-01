# UI00 — Shared UI Foundation

```text
Tiếp tục project MỠ FARM tại:

D:\Core_LVB_BIDC\Project\Farmer_MO

Mục tiêu:
Tạo foundation chung để nhiều agent implement các màn hình Mỡ Farm song song mà không xung đột.

VISUAL SOURCE OF TRUTH:
- 2.5D isometric
- cozy
- bright
- cute
- colorful
- cartoon farm
- wood + cream panels
- green/orange actions
- soft rounded corners
- warm shadows
- leaf/flower ornamentation

KHÔNG:
- dark dashboard
- SaaS UI
- Material/admin style
- glassmorphism
- monochrome dark green

UI00 là SINGLE OWNER của shared files.

Tạo:
docs/ui/UI_PARALLEL_OWNERSHIP.md

Khóa design tokens:
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

Tạo primitives:
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

Responsive contract:
1920x1080
iPad landscape
932x430
915x412
844x390
740x360

Khóa shared shell regions:
Top HUD
Left navigation
Bottom toolbar
Farm canvas
Context panel
Modal layer
Toast layer

Screen agents KHÔNG được sửa shared foundation.
Nếu cần thay đổi shared:
ghi docs/ui/SHARED_CHANGE_REQUESTS.md

Không đổi gameplay/API/PostgreSQL/economy/renderer contracts/asset contracts/Quick Tunnel.

Validation:
npm run renderer:test
npm run test:api:full
npm run test:e01:security
npm run check
git diff --check

Output:
UI FOUNDATION PASS/FAIL
TOKENS DONE/FAIL
SHARED PRIMITIVES DONE/FAIL
RESPONSIVE CONTRACT DONE/FAIL
OWNERSHIP MANIFEST DONE/FAIL
FILES OWNED BY UI00
FILES FROZEN FOR PARALLEL WORK
COMMIT
```
