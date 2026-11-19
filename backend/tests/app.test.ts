import express from "express";
import request from "supertest";
import { z } from "zod";
import { app } from "../src/app";
import { validateQuery } from "../src/common/middleware";

describe("MarbleERP API", () => {
  it("returns a healthy status", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("serves OpenAPI documentation", async () => {
    const response = await request(app).get("/api/openapi.json").expect(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.paths["/stock/summary"].get.summary).toBe("Stock summary");
  });

  it("validates query parameters without assigning to Express's read-only req.query", async () => {
    const testApp = express();
    testApp.get(
      "/test",
      validateQuery(z.object({ page: z.coerce.number().int().default(1) })),
      (_req, res) => res.json(res.locals.validatedQuery)
    );

    await request(testApp).get("/test?page=2").expect(200, { page: 2 });
  });
});
