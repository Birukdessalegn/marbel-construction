# MarbleERP

Production backend foundation for a natural-stone and marble ERP.

## Phase 1

Includes inventory items, marble attributes, warehouses, locations, stock balances, stock movements, traceability, JWT authentication, role authorization, photo uploads, seed data, and Swagger.

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

Using Docker Desktop:

```powers
docker compose up -d postgres
```

## URLs

- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/docs`
- OpenAPI: `http://localhost:4000/api/openapi.json`
- Health: `http://localhost:4000/health`

## Seed Credentials

All seed users use `Password123!`:

- `admin@marbleerp.local` / ADMIN
- `manager@marbleerp.local` / WAREHOUSE_MANAGER
- `keeper@marbleerp.local` / STORE_KEEPER
- `viewer@marbleerp.local` / VIEWER
