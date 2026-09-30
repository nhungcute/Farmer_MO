# ART-13 local review

Technical candidate QA: **PASS** (4/4 exact IDs, 256x256 RGBA PNG, true alpha, transparent corners, canonical DEFAULT/NONE 4-frame order at 8 FPS, and stable alpha centroids).

The glow was generated with built-in `image_gen` as a transparent 2x2 sheet and cropped into canonical frames. It remains a separate overlay; no crop artwork was changed. Style/owner/release review remains pending; `production_ready` and `approved` remain false.
