# 03 — SOURCE STRUCTURE

## 1. Folder đề xuất

```text
mo-farm/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── game/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── stores/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── locales/
│   │   │   │   └── vi-VN.json
│   │   │   ├── styles/
│   │   │   └── main.tsx
│   │   ├── public/
│   │   └── vite.config.ts
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   ├── plugins/
│       │   ├── lib/
│       │   ├── db/
│       │   └── server.ts
│       └── prisma/
│           └── schema.prisma
│
├── packages/
│   ├── game-core/
│   ├── renderer/
│   ├── shared/
│   └── ui/
│
├── assets-src/
│   ├── terrain/
│   ├── buildings/
│   ├── crops/
│   ├── animals/
│   ├── characters/
│   ├── ponds/
│   ├── decor/
│   ├── effects/
│   ├── ui/
│   ├── style/
│   └── manifests/
│
├── infra/
│   ├── nginx/
│   └── cloudflared/
├── tools/
│   └── export-assets/
│
├── docker-compose.yml
├── .env.example
└── package.json
```

## 2. Frontend feature folders

```text
features/
├── character/
├── farm/
├── crops/
├── animals/
├── build/
├── warehouse/
├── market/
├── orders/
├── quests/
└── onboarding-hints/
```

Mỗi feature có thể chứa:

```text
api.ts
types.ts
store.ts
components/
selectors.ts
```

## 3. Renderer package

```text
renderer/src/
├── RendererApp.ts
├── scene/
│   └── FarmScene.ts
├── camera/
│   └── CameraController.ts
├── iso/
│   ├── isoToScreen.ts
│   ├── screenToIso.ts
│   └── sortDepth.ts
├── entities/
│   ├── BuildingView.ts
│   ├── CropView.ts
│   ├── AnimalView.ts
│   └── PondView.ts
├── systems/
│   ├── CullingSystem.ts
│   ├── AnimationSystem.ts
│   ├── SelectionSystem.ts
│   └── PlacementSystem.ts
└── assets/
    └── AssetRegistry.ts
```

## 4. Shared package

```text
shared/
├── api-contracts/
├── enums/
├── schemas/
└── constants/
```

Không duplicate type giữa web và api.

## 5. Naming convention

- File component: `FarmHud.tsx`
- Store: `useFarmStore.ts`
- Service: `farmService.ts`
- Server route: `farm.routes.ts`
- Domain service: `farm.service.ts`
- Prisma model PascalCase.
- DB column snake_case nếu dùng mapping.


## 6. Hạ tầng và vận hành

```text
ops/
├── backup-db.ps1
├── backup-db.sh
├── restore-db.ps1
└── restore-db.sh

.github/workflows/ci.yml
compose.yaml
.nvmrc
.env.example
```

MVP không có `tutorial` folder. Onboarding hint là local UI feature nếu cần.

`tools/export-assets` là pipeline deterministic cho animation:

```text
pnpm assets:validate
pnpm assets:pack
pnpm assets:preview
```

Generated atlas không chỉnh tay trong `public/assets`; source và manifest ở `assets-src/` là input duy nhất.
