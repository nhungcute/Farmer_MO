# UI02 — Loading

```text
UI02-LOADING — MỠ FARM LOADING SCREEN

Implement theo:
02_Loading.png

Chỉ màn Loading.

Target:
- bright farm illustration
- logo Mỡ Farm
- "Đang tải nông trại..."
- progress bar
- percentage
- loading status
- friendly tip

Progress phải phản ánh loading state thật nếu có.
Nếu không có granular progress:
dùng staged deterministic progress + real completion state.

States:
initializing
loading assets
loading player
loading farm
ready
error/retry

Responsive:
Desktop / iPad / mobile landscape
No overflow

REPORT:
LOADING VISUAL PASS/FAIL
PROGRESS LOGIC PASS/FAIL
ERROR STATE PASS/FAIL
RESPONSIVE PASS/FAIL
```
