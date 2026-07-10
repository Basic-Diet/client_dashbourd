# Dashboard Role Permissions

This document is the dashboard role-permission baseline for the frontend dashboard and backend dashboard API families.

## Roles

Canonical dashboard roles:

- `superadmin`
- `admin`
- `kitchen`
- `courier`
- `cashier`

Unknown roles fail closed. Logged-out users are redirected to login. Direct navigation to a disallowed route redirects to that role's default route.

## Frontend Route Matrix

| Role | Default Route | Allowed Protected Routes |
|---|---|---|
| `superadmin` | `/dashboard` | `/dashboard`, `/operations`, `/one-time-orders`, `/subscriptions`, `/packages`, `/users`, `/addons`, `/delivery`, `/payments`, `/accounting`, `/promo-codes`, `/zones`, `/manual-deduction`, `/menu`, `/premium-meals`, `/dashboard-users`, `/settings`, `/restaurant-hours`, `/pickup-branches`, `/notifications`, `/profile` |
| `admin` | `/dashboard` | `/dashboard`, `/operations`, `/one-time-orders`, `/subscriptions`, `/packages`, `/users`, `/addons`, `/delivery`, `/payments`, `/accounting`, `/promo-codes`, `/zones`, `/manual-deduction`, `/menu`, `/premium-meals`, `/dashboard-users`, `/settings`, `/restaurant-hours`, `/pickup-branches`, `/notifications`, `/profile` |
| `kitchen` | `/operations` | `/addons`, `/operations`, `/one-time-orders`, `/menu`, `/premium-meals`, `/profile` |
| `courier` | `/delivery` | `/delivery`, `/profile` |
| `cashier` | `/operations` | `/manual-deduction`, `/operations`, `/one-time-orders`, `/users`, `/profile` |

Nested routes inherit access from their parent route. For example, `/menu/categories/:id/update` is allowed when `/menu` is allowed.

## Sidebar Navigation

The sidebar is filtered from the same route matrix used by the route guard. A role should not see a sidebar link that it cannot open directly.

- `admin` and `superadmin`: full dashboard navigation plus settings, restaurant hours, pickup branches, notifications, and dashboard users.
- `kitchen`: add-ons, operations, menu catalog, and premium meals.
- `courier`: delivery only.
- `cashier`: operations, manual deduction, and users.

`/profile` is available through user/account UI, not the main sidebar.

`/one-time-orders` is retired from the visible dashboard UX and must not appear in sidebar/nav. It is allowed through the protected route guard only as a deprecated redirect route to `/operations?tab=kitchen` for roles that already access `/operations`. Backend one-time order APIs may still be used by Operations, but the standalone frontend route should not be part of role navigation.

## Backend API Matrix

All protected dashboard API families must require dashboard authentication. `superadmin` is allowed by middleware bypass wherever a dashboard role guard is used. User role and active status are read from the database on authenticated requests; inactive dashboard users are blocked.

| API Family | Allowed Dashboard Roles | Notes |
|---|---|---|
| `/api/courier/*` | `superadmin`, `admin`, `courier` | Canonical courier delivery/order action surface. `/delivery` must continue using this family. |
| `/api/dashboard/ops/list`, `/api/dashboard/ops/search`, `/api/dashboard/ops/actions/*`, `/api/dashboard/ops/subscription-days/*` | `superadmin`, `admin`, `kitchen`, `cashier` | Unified operations surface. Courier role must not use these endpoints directly. |
| `/api/dashboard/ops/cashier/*` | `superadmin`, `admin`, `cashier` | Cashier operational lookup/consumption helpers. |
| `/api/dashboard/orders/*` | `superadmin`, `admin`, `kitchen`, `cashier` | One-time order dashboard APIs remain backend-owned for Operations/detail/action support. Courier uses `/api/courier/orders/*` instead. |
| `/api/dashboard/kitchen/*`, `/api/dashboard/pickup/*` | `superadmin`, `admin`, `kitchen` | Kitchen and pickup operations lanes. |
| `/api/dashboard/courier/*`, `/api/dashboard/delivery-schedule` | `superadmin`, `admin`, `cashier` | Operations delivery lane after backend role alignment. Courier dashboard role uses `/api/courier/*`. |
| `/api/dashboard/subscriptions/search`, `/api/dashboard/subscriptions/*/balances`, `/api/dashboard/subscriptions/*/manual-deduction`, `/api/dashboard/subscriptions/*/manual-deductions` | `superadmin`, `admin`, `cashier` | Cashier-safe subscription search, balances, and manual deduction surfaces. |
| `/api/dashboard/subscriptions/*/audit`, subscription lifecycle admin actions | `superadmin`, `admin` | Admin-only subscription management. |
| `/api/dashboard/overview`, `/api/dashboard/search`, `/api/dashboard/users`, `/api/dashboard/orders`, `/api/dashboard/payments`, subscription read/create/quote routes in `admin.js` | `superadmin`, `admin`, `cashier` | Cashier dashboard, customer, order, subscription, and payment read/workflow routes where backend permits. |
| `/api/dashboard/addons*`, `/api/dashboard/addon-plans*`, `/api/dashboard/addon-items*`, `/api/dashboard/addon-prices*`, `/api/dashboard/menu*`, `/api/dashboard/catalog-items*`, `/api/dashboard/premium-upgrades*` | `superadmin`, `admin`, `kitchen` | Kitchen owns menu/add-ons/catalog/premium meals according to the latest backend role contract. |
| `/api/dashboard/settings*`, `/api/dashboard/restaurant-hours*`, `/api/dashboard/zones*`, `/api/dashboard/promo-codes*`, `/api/dashboard/dashboard-users*`, `/api/dashboard/notifications*`, `/api/dashboard/logs*` | `superadmin`, `admin` | Admin configuration and management APIs. Dashboard user management remains admin/superadmin unless product later decides superadmin-only. |
| `/api/dashboard/accounting/*` | `superadmin`, `admin` | Accounting screen is not cashier-accessible unless explicitly approved later. |

## Response Rules

- Missing or invalid dashboard auth: `401`.
- Valid auth with inactive dashboard user: blocked by dashboard auth middleware.
- Valid auth with a disallowed dashboard role: `403`.
- `superadmin` bypasses dashboard role guards.

## Invariants

- Do not change endpoint semantics as part of role alignment.
- Do not migrate `/delivery` away from `/api/courier/*`.
- Do not synthesize courier action buttons from frontend `can*` booleans.
- Do not add `/api` to `VITE_BACKEND_URL`; frontend API paths already include `/api/...`.
- Frontend route guard and sidebar filtering must use the same matrix.
