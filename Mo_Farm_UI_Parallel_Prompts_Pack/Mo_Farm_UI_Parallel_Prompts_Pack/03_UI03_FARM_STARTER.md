# UI03 — Starter Farm

```text
UI03-FARM-STARTER — STARTER FARM COMPOSITION

Implement theo:
04_Farm_Empty_Starter.png

Không sửa server-authoritative starter economy.

Canonical starter:
1000 coin
5 diamonds
6 plots
3 rice ready
1 chicken_feed
warehouse capacity 100
3 starter orders

Use server data. Không hardcode gameplay state trong renderer.

Visual:
- đẹp nhưng chưa đầy
- không gian mở rộng rõ
- farmhouse
- warehouse
- starter crop zone
- coop nếu canonical state cho phép
- pond/environment phù hợp
- paths
- fences
- trees/flowers/decor
- expansion areas

Decorative environment có thể client-side visual composition.
Gameplay entities vẫn theo server state.

Initial camera phải frame farm đẹp, không nhìn như biển cỏ trống.

QA:
desktop + 4 mobile landscape viewports
renderer contracts unchanged
renderer 16/16 PASS

REPORT:
STARTER COMPOSITION PASS/FAIL
CAMERA PASS/FAIL
SERVER AUTHORITY PRESERVED YES/NO
```
