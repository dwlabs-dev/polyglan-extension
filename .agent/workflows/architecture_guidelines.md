---
description: Architecture Guidelines
---

<architecture_guidelines>
## 🏗️ Project Structure & Boundaries
You must strictly adhere to the following directory structure for the `polyglan-extension` project.

### 1. Backend (API - Express)
Location: `/api/src/`
- **Routes (`/routes`)**: Only handle HTTP concerns (params, status codes).
- **Services (`/services`)**: All business logic and external API integrations (Google Meet, etc.) MUST live here.
- **Lib (`/lib`)**: Shared utilities like Auth helpers or DB clients.
- **RULE**: Routes call Services. Services should not call Routes.

### 2. Frontend (Front - Vite + React)
Location: `/front/src/`
Organize code primarily within **Features** to ensure scalability:

#### Feature-Based Structure (`/front/src/features/[feature-name]`)
Each feature (e.g., `addon`, `sidepanel`) should be self-contained:
- `components/`: UI specific to this feature.
- `hooks/`: Logic specific to this feature.
- `types/`: Types specific to this feature.
- **RULE**: Features can import from `shared/` (hooks, components, utils), but **never** from other features directly. Cross-feature composition happens only in `app/`.

#### Service Layer (`/front/src/services/`)
- All API communication must be centralized here. 
- Features should use these services rather than calling `fetch` or `axios` directly.

---

## 🚦 Dependency Flow (Unidirectional)
To keep the codebase maintainable, you MUST follow these import rules:

1. **Front-end Flow**: `Shared (hooks/utils/types)` -> `Services` -> `Features` -> `App`.
   - ❌ `features/addon` CANNOT import from `features/sidepanel`.
   - ❌ `services/` CANNOT import from `features/`.
   - ❌ `shared/` CANNOT import from anything else.

2. **Back-end Flow**: `Lib` -> `Services` -> `Routes` -> `Server`.
   - ❌ `services/` CANNOT import from `routes/`.

## 🛠️ ESLint & Import Enforcement
When creating or modifying code, ensure you don't break the "No Cross-Feature" rule. 
For the Frontend, assume a virtual ESLint restriction:
- **Target**: `front/src/features/*`
- **Restriction**: Cannot import from other `features/*` paths.

## 📦 Zero Barrel Files
Do not use `index.ts` (barrel files) to export entire folders in Vite/React. Import files directly (e.g., `import { MyComponent } from '../components/MyComponent'`) to ensure optimal Tree Shaking and performance.

## Project Structure

polyglan-extension/
├── api/                      # Express backend
│   ├── src/
│   │   ├── routes/           # Route handlers
│   │   │   ├── health.ts
│   │   │   ├── session.ts
│   │   │   ├── meet.ts
│   │   │   └── participants.ts
│   │   ├── services/         # Business logic / external API calls
│   │   │   └── meet.service.ts
│   │   ├── lib/              # Auth helpers
│   │   │   └── google-auth.ts
│   │   └── server.ts         # Main Express app
│   ├── tsconfig.json
│   └── package.json
├── front/                    # Vite + React frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.tsx
│   │   │   └── main.tsx
│   │   ├── assets/
│   │   ├── features/
│   │   │   ├── addon/
│   │   │   └── sidepanel/
│   │   ├── services/         # API service layer
│   │   │   ├── api.ts        # Base fetch helper
│   │   │   ├── session.service.ts
│   │   │   └── participants.service.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── ...existing shared folders
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.app.json
│   └── tsconfig.json
├── package.json              # Root scripts (dev, concurrently)
├── .env
└── infra/
</architecture_guidelines>