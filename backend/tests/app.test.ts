import request from "supertest";
import { app } from "../src/app";

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
});
