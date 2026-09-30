# Wave 1 Production Art Approval

| Trường | Giá trị |
|---|---|
| Scope | Chicken, Rice, Carrot, Corn, Tomato |
| Asset count | 112 |
| Commit reviewed | `856705fedf0aebd624782a1be57b372517c6da1e` |
| Technical review | PASS |
| Style review | PASS |
| Content approval | **APPROVED** |
| Owner | Project Owner |
| Provenance | VERIFIED — source/tool/creator metadata được ghi theo nguồn thực tế |
| License approval | **PENDING_OWNER_INPUT** |
| Release approval | **BLOCKED** — chỉ APPROVED sau khi license approval hoàn tất |
| Approval reference | Chưa ghi vào asset metadata cho tới khi release approval hoàn tất |

Machine-readable approval gate:

```text
scope=Chicken,Rice,Carrot,Corn,Tomato
assetCount=112
commitReviewed=856705fedf0aebd624782a1be57b372517c6da1e
technicalReview=PASS
styleReview=PASS
contentApproval=APPROVED
owner=Project Owner
provenance=VERIFIED
licenseApproval=PENDING_OWNER_INPUT
releaseApproval=BLOCKED
approvalRef=null (until release approval)
blocker=LICENSE_POLICY_OWNER_INPUT_REQUIRED
```

## Phạm vi được owner duyệt

Project Owner xác nhận artwork content Wave 1 đạt yêu cầu và không cần regenerate:

- Chicken: 92/92.
- Rice: 5/5.
- Carrot: 5/5.
- Corn: 5/5.
- Tomato: 5/5.

Technical và style review của 112/112 candidate đều PASS. Cross-asset review, atlas/runtime promotion, mobile review và Chicken animation proof đều đã PASS theo [Final Owner Review V2](../review/FINAL_OWNER_REVIEW_V2.md).

## License gate

Repository có canonical metadata/approval policy trong [MO_FARM_PRODUCTION_STYLE_GUIDE.md](../MO_FARM_PRODUCTION_STYLE_GUIDE.md) và `tools/asset-inventory.mjs`, nhưng chưa có license value được Project Owner xác nhận cho các generated artwork này. Không sử dụng package license (MIT/Apache/BSD) để suy diễn license của artwork và không tự chọn MIT, Apache-2.0, CC0, CC-BY hoặc giá trị khác.

Metadata production vì vậy được giữ nguyên:

```text
license=PENDING_OWNER_REVIEW
licenseApproval=PENDING_OWNER_INPUT
approved=false
approvalRef=null
releaseApproval=BLOCKED
```

Provenance đã ghi theo nguồn thực tế:

```text
source=internal-generated
Chicken tool=built-in image_gen + deterministic pose rendering
Rice tool=built-in image_gen
Carrot/Corn/Tomato tool=image_gen.imagegen
```

`toolVersion` giữ `PENDING_OWNER_REVIEW` ở các crop entry chưa có version được expose; Chicken giữ giá trị `not exposed by runtime`. Đây là giới hạn provenance cần owner xác nhận bổ sung, không phải lý do để bịa dữ liệu.

## Inventory tại thời điểm approval record

```text
total=188
production_ready=112
approved=0
placeholder=76
```

Không thay đổi 76 placeholder còn lại. Không set `approved=true` cho 112 asset khi chưa có license policy/value và license approval rõ ràng.

## Evidence

- [Final Owner Review V2](../review/FINAL_OWNER_REVIEW_V2.md)
- [Machine-readable Final Owner Review V2](../review/FINAL_OWNER_REVIEW_V2.json)
- [Production inventory](../PRODUCTION_ASSET_INVENTORY.md)
- [Canonical animation manifest](../../../assets-src/manifests/animation-manifest.json)
- [Canonical license manifest](../../../assets-src/manifests/licenses.json)
- [Canonical metadata and approval policy](../MO_FARM_PRODUCTION_STYLE_GUIDE.md)

## Blocker và bước tiếp theo

Blocker duy nhất của release approval là `LICENSE_POLICY_OWNER_INPUT_REQUIRED`. Project Owner cần cung cấp canonical license policy/value và xác nhận license approval. Sau khi đủ xác nhận, Integration Owner mới được cập nhật 112 asset với `approved=true`, `approvalRef` trỏ về file này và chạy lại validation đầy đủ.

Wave 2, Pond/Building/Effects/Terrain/UI, Cloudflare Named Tunnel và RC01 vẫn đóng.
