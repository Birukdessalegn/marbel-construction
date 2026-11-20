import { Prisma } from "@prisma/client";
import { AppError } from "../src/common/errors";
import { distributeAmount } from "../src/modules/procurement/landing-costs.service";

describe("landing cost allocation", () => {
  it("allocates rounded cents exactly across purchase order lines", () => {
    const allocations = distributeAmount(new Prisma.Decimal("10.00"), [
      { purchaseOrderItemId: "line-1", weight: new Prisma.Decimal(1) },
      { purchaseOrderItemId: "line-2", weight: new Prisma.Decimal(1) },
      { purchaseOrderItemId: "line-3", weight: new Prisma.Decimal(1) }
    ]);

    expect(allocations.map(({ amount }) => amount.toFixed(2))).toEqual(["3.33", "3.33", "3.34"]);
    expect(allocations.reduce((total, entry) => total.plus(entry.amount), new Prisma.Decimal(0)).toFixed(2)).toBe("10.00");
  });

  it("rejects allocation when the selected basis has no positive weight", () => {
    expect(() => distributeAmount(new Prisma.Decimal("5.00"), [
      { purchaseOrderItemId: "line-1", weight: new Prisma.Decimal(0) }
    ])).toThrow(AppError);
  });
});
