> Deployment references only: **SUPERSEDED / NON_CANONICAL / NOT_CURRENT_E01_RELEASE_PATH** (2026-10-01), reason `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. Any Named Tunnel mention below records the historical checkpoint. Current deployment: [`PERSISTENT_QUICK_TUNNEL`](../../implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md). Artwork findings and approvals below are unchanged.

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
| License approval | **APPROVED** — `MO_FARM_INTERNAL_ASSET_POLICY_V1` |
| Release approval | **APPROVED** |
| Approval reference | `docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md` |

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
license=MO_FARM_INTERNAL_ASSET_POLICY_V1
licenseApproval=APPROVED
releaseApproval=APPROVED
approvalRef=docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md
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

License policy canonical được Project Owner xác nhận là [MO_FARM_INTERNAL_ASSET_POLICY_V1](../licenses/MO_FARM_INTERNAL_ASSET_POLICY_V1.md). Policy này chỉ áp dụng cho artwork có `source=internal-generated` trong scope Wave 1. Không sử dụng package license (MIT/Apache/BSD) để suy diễn license của artwork.

Metadata production vì vậy được giữ nguyên:

```text
license=MO_FARM_INTERNAL_ASSET_POLICY_V1
licenseApproval=APPROVED
approved=true
approvalRef=docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md
releaseApproval=APPROVED
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
approved=112
placeholder=76
licensePending=0 (within Wave 1)
```

Không thay đổi 76 placeholder còn lại. Không set `approved=true` cho bất kỳ asset nào ngoài Wave 1.

## Evidence

- [Final Owner Review V2](../review/FINAL_OWNER_REVIEW_V2.md)
- [Machine-readable Final Owner Review V2](../review/FINAL_OWNER_REVIEW_V2.json)
- [Production inventory](../PRODUCTION_ASSET_INVENTORY.md)
- [Canonical animation manifest](../../../assets-src/manifests/animation-manifest.json)
- [Canonical license manifest](../../../assets-src/manifests/licenses.json)
- [Canonical metadata and approval policy](../MO_FARM_PRODUCTION_STYLE_GUIDE.md)
- [MO_FARM_INTERNAL_ASSET_POLICY_V1](../licenses/MO_FARM_INTERNAL_ASSET_POLICY_V1.md)

## Blocker và bước tiếp theo

License policy và release approval của 112 asset đã được Project Owner xác nhận. Integration Owner cập nhật đúng 112 asset theo policy này và giữ nguyên 76 placeholder còn lại.

Wave 2, Pond/Building/Effects/Terrain/UI, Cloudflare Named Tunnel và RC01 vẫn đóng.
