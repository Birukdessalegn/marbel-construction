import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "MarbleERP API",
      version: "1.0.0",
      description: "Phase 1 inventory and warehouse management API"
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            details: { type: "object" }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/auth/login": { post: { tags: ["Authentication"], summary: "Login", security: [], responses: { 200: { description: "Access and refresh tokens" } } } },
      "/auth/refresh": { post: { tags: ["Authentication"], summary: "Refresh access token", security: [], responses: { 200: { description: "New access token" } } } },
      "/auth/logout": { post: { tags: ["Authentication"], summary: "Revoke refresh token", responses: { 204: { description: "Logged out" } } } },
      "/auth/me": { get: { tags: ["Authentication"], summary: "Current user", responses: { 200: { description: "Authenticated user" } } } },
      "/users": { post: { tags: ["Authentication"], summary: "Create user", responses: { 201: { description: "Created user" } } } },
      "/items": {
        get: { tags: ["Items"], summary: "Search and paginate items", responses: { 200: { description: "Item list" } } },
        post: { tags: ["Items"], summary: "Create item", responses: { 201: { description: "Created item" } } }
      },
      "/items/{id}": {
        get: { tags: ["Items"], summary: "Get item", responses: { 200: { description: "Item detail" } } },
        patch: { tags: ["Items"], summary: "Update item", responses: { 200: { description: "Updated item" } } },
        delete: { tags: ["Items"], summary: "Soft deactivate item", responses: { 204: { description: "Deactivated" } } }
      },
      "/items/{id}/photos": { post: { tags: ["Items"], summary: "Upload item photo", responses: { 201: { description: "Photo uploaded" } } } },
      "/items/{id}/traceability": { get: { tags: ["Traceability"], summary: "Item lineage", responses: { 200: { description: "Parent and child lineage" } } } },
      "/items/by-block/{uniqueBlockId}": { get: { tags: ["Traceability"], summary: "Find block", responses: { 200: { description: "Block detail" } } } },
      "/items/by-slab/{uniqueSlabId}": { get: { tags: ["Traceability"], summary: "Find slab", responses: { 200: { description: "Slab detail" } } } },
      "/warehouses": {
        get: { tags: ["Warehouses"], summary: "List warehouses", responses: { 200: { description: "Warehouse list" } } },
        post: { tags: ["Warehouses"], summary: "Create warehouse", responses: { 201: { description: "Created warehouse" } } }
      },
      "/warehouses/{id}": {
        get: { tags: ["Warehouses"], summary: "Get warehouse", responses: { 200: { description: "Warehouse detail" } } },
        patch: { tags: ["Warehouses"], summary: "Update warehouse", responses: { 200: { description: "Updated warehouse" } } },
        delete: { tags: ["Warehouses"], summary: "Deactivate warehouse", responses: { 204: { description: "Deactivated" } } }
      },
      "/locations": {
        get: { tags: ["Locations"], summary: "List locations", responses: { 200: { description: "Location list" } } },
        post: { tags: ["Locations"], summary: "Create location", responses: { 201: { description: "Created location" } } }
      },
      "/locations/{id}": {
        get: { tags: ["Locations"], summary: "Get location", responses: { 200: { description: "Location detail" } } },
        patch: { tags: ["Locations"], summary: "Update location", responses: { 200: { description: "Updated location" } } },
        delete: { tags: ["Locations"], summary: "Deactivate location", responses: { 204: { description: "Deactivated" } } }
      },
      "/stock/receive": { post: { tags: ["Stock"], summary: "Receive stock", responses: { 201: { description: "Receipt recorded" } } } },
      "/stock/issue": { post: { tags: ["Stock"], summary: "Issue stock", responses: { 201: { description: "Issue recorded" } } } },
      "/stock/transfer": { post: { tags: ["Stock"], summary: "Transfer stock", responses: { 201: { description: "Transfer recorded" } } } },
      "/stock/adjust": { post: { tags: ["Stock"], summary: "Adjust stock", responses: { 201: { description: "Adjustment recorded" } } } },
      "/stock/count": { post: { tags: ["Stock"], summary: "Record stock count", responses: { 201: { description: "Count recorded" } } } },
      "/stock/balances": { get: { tags: ["Stock"], summary: "List stock balances", responses: { 200: { description: "Balance list" } } } },
      "/stock/balances/{itemId}": { get: { tags: ["Stock"], summary: "Balances for item", responses: { 200: { description: "Item balances" } } } },
      "/stock/locations/{locationId}": { get: { tags: ["Stock"], summary: "Stock at location", responses: { 200: { description: "Location balances" } } } },
      "/stock/transactions": { get: { tags: ["Stock"], summary: "Stock transaction history", responses: { 200: { description: "Transaction list" } } } },
      "/stock/transactions/{id}": { get: { tags: ["Stock"], summary: "Transaction detail", responses: { 200: { description: "Transaction detail" } } } },
      "/stock/summary": { get: { tags: ["Stock"], summary: "Stock summary", responses: { 200: { description: "Aggregated stock summary" } } } }
    }
  },
  apis: ["src/**/*.ts"]
});
