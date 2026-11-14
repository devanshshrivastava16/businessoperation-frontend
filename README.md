# Business Operations Dashboard

Internal operations console for a Shopify-based business selling **bracelets, necklaces, accessories and home-decoration products**. Shopify remains the customer-facing storefront; this React application is where the operations team manages products, inventory, warehouses, order fulfillment, picking/packing, suppliers, purchase orders, returns, customers, analytics, notifications, users/roles and the Shopify synchronization.

The frontend talks to the **Spring Boot 4 / Java 21 backend** through the exact REST contract defined in [`business-operations-api-documentation.md`](../business-operations-api-documentation.md).

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 7 |
| Routing | React Router 7 (`createBrowserRouter`, lazy routes, protected routes) |
| Client state | Zustand (auth / ui / notifications stores) |
| HTTP | Axios (centralized client, interceptors, refresh-token flow) |
| Styling | Tailwind CSS 4 (`@theme` tokens from `DESIGN-shopify.md`) |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Animation | Framer Motion (modals, drawers, page feedback only) |
| Toasts | React Hot Toast |
| Tests | Vitest + Testing Library (jsdom) |
| Lint | ESLint 9 (flat config, typescript-eslint) |

## Architecture

Feature-based structure — each domain is isolated under `src/features/<domain>`:

```
src/
├── api/                  # Centralized API layer (contract section 27)
│   ├── axiosInstance.ts  # Axios client: bearer attach, 401 refresh, ApiError
│   ├── helpers.ts        # Typed get/post/put/patch/del + params builder
│   ├── authApi.ts … shopifyApi.ts   # One module per backend domain
├── components/
│   ├── ui/               # Button, Input, Select, Table, Modal, Drawer,
│   │                     # Dropdown, DateRangePicker, Badges, KPI card,
│   │                     # Empty/Error/Loading states, Breadcrumbs…
│   └── layout/           # Sidebar, Header (notifications, user menu), AppLayout
├── features/             # auth, dashboard, products, inventory, warehouse,
│   │                     # orders, picking, packing, suppliers, purchasing,
│   │                     # returns, customers, analytics, notifications,
│   │                     # users, shopify, settings
├── hooks/                # useApi, usePagedList (pagination+search+filters), useDebounced
├── mocks/                # Isolated demo data (only loaded when VITE_USE_MOCKS=true)
├── routes/               # Router table + ProtectedRoute / RequireRole guards
├── store/                # Zustand stores
├── types/                # Shared domain + API types
└── utils/                # Formatting, date helpers, permission matrix
```

Key principles:

- **API code is centralized.** Components never call Axios directly; they consume typed API modules through hooks (contract rule, section 27).
- **Server data stays out of Zustand.** Stores hold only session, UI and notification-mirror state.
- **Role-based UI is a mirror, not a gate.** `src/utils/permissions.ts` encodes the authorization matrix (contract section 25) for navigation/action affordances. The Spring Boot backend remains the final authority.
- **Mock/demo data is fully isolated.** `src/mocks` is only imported dynamically when `VITE_USE_MOCKS=true` and is excluded from the production bundle otherwise. Replace mocks with real API calls simply by setting the flag to `false` against a running backend.

## Prerequisites

- **Node.js 20.19+ or 22+** (developed on Node 24)
- npm 10+ (or pnpm/bun if you prefer)
- The Spring Boot backend running (or `VITE_USE_MOCKS=true` for demo mode)

## Getting Started

```bash
# 1. install
npm install

# 2. configure environment
cp .env.example .env.local
# edit .env.local — see table below

# 3. run the dev server (http://localhost:5173)
npm run dev

# 4. other commands
npm run build      # typecheck (tsc --noEmit) + production build
npm run preview    # serve the production build locally
npm run test       # run vitest suite
npm run lint       # eslint
npm run typecheck  # tsc --noEmit only
```

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | Spring Boot REST base URL (contract section 3) |
| `VITE_USE_MOCKS` | `true` | `true` = serve responses from the isolated in-memory mock API; `false` = real backend |
| `VITE_CURRENCY_CODE` | `INR` | Intl currency used by the money formatter |

Never hard-code production URLs — always configure via `.env.*` files. Only variables prefixed `VITE_` are exposed to the client; **no secrets belong there**.

## API Configuration

- Base URL and every endpoint path, method, query parameter, request/response body and error shape come from `business-operations-api-documentation.md`. Nothing is invented client-side.
- **Auth**: `POST /auth/login` → `{accessToken, refreshToken, user}`. Axios attaches `Authorization: Bearer <token>`; on `401` it performs a single-flight `POST /auth/refresh` and retries the original request once. If refresh fails, the session is cleared and the router redirects to `/login`. `POST /auth/logout` is called on sign-out.
- **Errors** follow the standard error body (section 23) and are surfaced as friendly toasts plus field-level messages on forms. `401` → refresh/redirect, `403` → permission state, `404` → not-found state, `409`/`INSUFFICIENT_STOCK`/`INVALID_STATE_TRANSITION` → business-rule message.
- **Pagination** (section 24): every list screen uses `page/size/sort` and renders `content/totalElements/totalPages`.
- If the backend contract changes: **update the API documentation first**, then update `src/types/api.ts` and the matching `src/api/*Api.ts` module.

### Contract gaps noticed while building (for the backend team)

The contract has no `GET` endpoints for pick lists or packing tasks, and no submit/cancel actions for purchase orders. The frontend stays strictly within the documented endpoints by deriving queues from `GET /orders?status=…` and generating tasks per order. If the backend adds `GET /pick-lists` and `GET /packing` (documented first), the picking/packing screens can consume them directly.

## Demo Mode (mock data)

With `VITE_USE_MOCKS=true`, sign in with any of:

| Email | Role |
|---|---|
| `owner@demo.io` | OWNER |
| `manager@demo.io` | MANAGER |
| `warehouse@demo.io` | WAREHOUSE_STAFF |
| `purchasing@demo.io` | PURCHASING |
| `accountant@demo.io` | ACCOUNTANT |

Any password with **8+ characters** works. Try different roles to see the permission-aware navigation and actions.

## Production Build

```bash
npm run build     # outputs dist/
npm run preview   # sanity-check the build locally
```

Deploy `dist/` behind any static file server / CDN. Configure the real API origin in `VITE_API_BASE_URL` at build time. The backend must send appropriate CORS headers for the dashboard origin.

## Testing

```bash
npm run test        # one-shot
npm run test:watch  # watch mode
```

Covered today: role permission matrix, protected-route redirect, login-form validation, currency/badge rendering, and the mock auth flow. Add tests for critical workflows (order status transitions, purchase receiving math, inventory adjustment rules) as the real API stabilizes.

## Accessibility & Responsive Notes

- Semantic landmarks (`nav`, `main`, `header`), labelled controls, `aria-pressed`/`aria-sort`/`role=dialog` wiring, visible focus rings, ≥44px touch targets.
- Desktop-first (internal ops tool), with a collapsible sidebar drawer, horizontally scrollable tables and usable forms down to mobile widths.

## Security Notes

- Access/refresh tokens live in `localStorage` (standard for internal SPAs); no passwords or Shopify credentials are ever stored client-side.
- Shopify access tokens are **never** displayed or fetched by the UI — the backend holds them.
- Frontend role checks are convenience only; the backend enforces real authorization (contract section 25).
- Access tokens are never logged; console statements are lint-blocked.
