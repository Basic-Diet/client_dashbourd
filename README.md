<div align="center">
  <img src="./public/logo.png" alt="Basic Diet" width="120" />

# Basic Diet Operations Dashboard

**A production-oriented operations dashboard for managing subscriptions, customers, meal products, payments, delivery workflows, and day-to-day Basic Diet administration.**

Built with **React 19, TypeScript, Vite, TanStack Query, TanStack Router, Tailwind CSS 4, shadcn/ui, React Hook Form, Zod, and Recharts**.
</div>

---

## Overview

This repository contains the web administration dashboard for the **Basic Diet** platform.

The dashboard is not a standalone CRUD demo. It is the operational interface used to manage the wider Basic Diet ecosystem, working alongside the backend API and customer mobile application.

The system covers the lifecycle of diet subscriptions and one-time orders: customer management, package configuration, meal catalogs, subscription operations, payments, delivery and pickup workflows, accounting views, staff access, and supporting business operations.

## Platform Ecosystem

| Component | Responsibility | Repository |
| --- | --- | --- |
| **Operations Dashboard** | Internal administration and operational workflows | `Basic-Diet/client_dashbourd` |
| **Backend API** | Authentication, subscriptions, ordering, catalog, payments and shared business logic | [`Basic-Diet/backend`](https://github.com/Basic-Diet/backend) |
| **Mobile App** | Customer-facing Flutter application | [`Basic-Diet/mobile_app`](https://github.com/Basic-Diet/mobile_app) |
| **Documentation** | Engineering and workflow references | `Basic-Diet/documentations` |

## Core Capabilities

### Dashboard & Operational Visibility

- Operational dashboard and business metrics
- Protected application routes
- Arabic-first, RTL-oriented administration experience
- Responsive layouts for desktop and smaller screens
- Structured loading, empty, error and feedback states

### Customers & Staff

- Customer/user management
- Dashboard staff-user management
- Profile and account workflows
- Permission-aware protected areas

### Packages & Subscriptions

- Diet package creation and management
- Package configuration and selectable options
- Subscription creation and lifecycle management
- Freeze, extend and cancellation-related workflows
- Subscription-specific operational actions
- Manual deduction workflows

### Menu & Product Operations

- Menu/catalog management
- Add-on management
- Premium meal management
- Product configuration used by customer ordering flows
- Sortable/reorderable interfaces powered by `@dnd-kit`

### Orders & Fulfilment

- One-time order management
- Delivery-related administration
- Pickup branch management
- Operations-focused order views
- Notification-related workflows

### Payments & Accounting

- Payment administration
- Accounting-oriented views
- Financial/operational reporting interfaces
- Promo-code administration

> The exact business rules are enforced by the shared backend API. This dashboard focuses on presenting those workflows safely and clearly to operational users.

## Technology Stack

### Application

- **React 19**
- **TypeScript**
- **Vite 7**
- **TanStack Router** for route organization and protected application flows
- **TanStack Query** for server-state fetching, caching and synchronization
- **TanStack Table** for structured data-heavy views

### UI & Interaction

- **Tailwind CSS 4**
- **shadcn/ui / Radix UI** primitives
- **React Hook Form**
- **Zod** validation
- **Recharts**
- **Motion**
- **@dnd-kit**
- **Sonner**
- **Lucide React**

### Data & Utilities

- **Axios** for HTTP communication
- **date-fns** for date handling
- **js-cookie** for browser-accessible session/token handling used by the client

### Quality Tooling

- **ESLint**
- **Prettier**
- **TypeScript type checking**
- **Vitest**
- **Testing Library**

## Application Structure

```text
src/
├── components/          # Shared and feature UI
├── constants/           # Reusable constants and configuration
├── hooks/               # Custom React hooks
├── lib/                 # Shared libraries, API client and helpers
├── routes/              # TanStack Router routes
│   └── _protected/      # Authenticated operational areas
├── types/               # TypeScript contracts
├── utils/               # Feature/API utilities
└── main.tsx              # Application entry point
```

The protected route tree currently includes operational areas such as:

```text
_protected/
├── accounting/
├── addons/
├── dashboard-users/
├── delivery/
├── manual-deduction/
├── menu/
├── notifications/
├── one-time-orders/
├── operations/
├── packages/
├── payments/
├── pickup-branches/
├── premium-meals/
├── profile/
└── promo-codes/
```

This route-level separation keeps large operational domains independent instead of concentrating business UI inside a single dashboard page.

## Frontend Architecture

The frontend follows a few consistent rules:

- **Server state stays in TanStack Query**, not duplicated across arbitrary component state.
- **Forms are separated from validation schemas** using React Hook Form + Zod.
- **Complex feature logic is moved into hooks and utilities** instead of being embedded in large UI components.
- **API access is centralized** rather than scattering request setup across pages.
- **Protected routes are grouped explicitly** in the route tree.
- **Reusable UI primitives remain separate from feature-level components.**

## Authentication & API Integration

The dashboard communicates with the Basic Diet backend through a centralized Axios-based API layer.

Client-side authentication behavior includes:

- Session/token lookup from browser storage used by the dashboard
- Automatic token attachment to authenticated API requests
- Protected route handling
- Session cleanup and redirect behavior when authentication becomes invalid
- Shared API error normalization for consistent UI feedback

> Authentication security and authorization rules ultimately remain backend responsibilities; frontend route protection is an additional UX/application layer and should not be treated as the security boundary.

## Arabic & RTL Support

The dashboard is designed primarily for Arabic operational users. The UI includes:

- RTL-aware layouts
- Arabic-first interface copy
- Arabic-oriented API language headers where required
- Responsive tables/forms designed for RTL administration workflows

## Testing & Verification

The repository includes a frontend test setup using **Vitest** and **Testing Library**.

Available quality commands include:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

These commands are useful as release checks before deployment or pull-request handoff.

## Getting Started

### Prerequisites

- Node.js compatible with the current Vite/React toolchain
- npm (or another compatible package manager)
- Access to a compatible Basic Diet backend environment

### Install

```bash
git clone https://github.com/Basic-Diet/client_dashbourd.git
cd client_dashbourd
npm install
```

### Environment

Create a local environment file and point the dashboard at the appropriate API environment:

```env
VITE_BACKEND_URL=https://your-api.example.com
```

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
npm run preview
```

## Related Repositories

- [Backend API](https://github.com/Basic-Diet/backend)
- [Mobile Application](https://github.com/Basic-Diet/mobile_app)

## Project Status

The dashboard represents the completed administration product delivered as part of the Basic Diet platform. The wider platform may continue to receive maintenance, data, API, and operational improvements over time.

## License

This project is proprietary software developed for the Basic Diet platform. All rights reserved unless otherwise stated by the project owners.
