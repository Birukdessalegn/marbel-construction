# MarbleERP

Backend foundation for a natural-stone and marble ERP.

## Phase 1

Includes inventory items, marble attributes, warehouses, locations, stock balances, stock movements, traceability, JWT authentication, role authorization, photo uploads, seed data, and Swagger.

## Phase 2

Adds supplier management, purchase orders and approval, goods receipts that update inventory, purchase invoices, landing-cost allocation, and supplier/purchase reports. Run `npm.cmd run prisma:migrate` to apply the additive Phase 2 migration.

### Procurement API

- `/api/v1/suppliers` — supplier CRUD (deletion deactivates the supplier)
- `/api/v1/purchase-orders` — draft orders, approval, cancellation, and closure
- `/api/v1/goods-receipts` — receive against a PO; receipts update stock balances and inventory transactions atomically
- `/api/v1/purchase-invoices` — record and void supplier invoices
- `/api/v1/purchase-orders/:id/landing-costs` — record and allocate freight, customs, and handling costs
- `/api/v1/reports/purchase-history` and `/api/v1/reports/supplier-performance`

`PURCHASE_MANAGER` can manage suppliers and purchasing. `WAREHOUSE_MANAGER` can record goods receipts. Admins can do both.

## Requirements

- Node.js 20+
- PostgreSQL 16+
- npm

## Setup

```powers
Copy-Item .env.example .env
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
npm.cmd run dev
```

## URLs

- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/docs`
- OpenAPI: `http://localhost:4000/api/openapi.json`
- Health: `http://localhost:4000/health`

## Seed Credentials

All seed users use `Password123!`:

- `admin@marbleerp.local` / ADMIN
- `purchase@marbleerp.local` / PURCHASE_MANAGER
- `manager@marbleerp.local` / WAREHOUSE_MANAGER
- `keeper@marbleerp.local` / STORE_KEEPER
- `viewer@marbleerp.local` / VIEWER

The seed script clears existing users and inventory records before recreating sample data. Use it only for a fresh development database.
