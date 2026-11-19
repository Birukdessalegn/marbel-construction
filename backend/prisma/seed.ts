import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.refreshToken.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.stockBalance.deleteMany();
  await prisma.itemPhoto.deleteMany();
  await prisma.item.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  const users = [
    ["ADMIN", "Admin User", "admin@marbleerp.local"],
    ["WAREHOUSE_MANAGER", "Warehouse Manager", "manager@marbleerp.local"],
    ["STORE_KEEPER", "Store Keeper", "keeper@marbleerp.local"],
    ["VIEWER", "Viewer User", "viewer@marbleerp.local"]
  ] as const;

  for (const [role, name, email] of users) {
    await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash("Password123!", 12), role }
    });
  }

  const mainWarehouse = await prisma.warehouse.create({
    data: { code: "MAIN-YARD", name: "Main Stone Yard", address: "Addis Ababa, Ethiopia" }
  });
  const factory = await prisma.warehouse.create({
    data: { code: "FAB-SHOP", name: "Fabrication Shop", address: "Industrial Zone" }
  });
  const quarantine = await prisma.warehouse.create({
    data: { code: "QUARANTINE", name: "Quarantine Store", address: "Main Yard - West" }
  });

  for (const code of ["A-01", "A-02", "RACK-B-01"]) {
    await prisma.location.create({ data: { warehouseId: mainWarehouse.id, code, name: `Block Rack ${code}` } });
  }
  for (const code of ["CUT-01", "PACK-01", "FINISH-01"]) {
    await prisma.location.create({ data: { warehouseId: factory.id, code, name: `Factory Area ${code}` } });
  }
  await prisma.location.create({ data: { warehouseId: quarantine.id, code: "QC-01", name: "Inspection Bay" } });

  const block = await prisma.item.create({
    data: {
      sku: "BLK-WLT-001", name: "Wollega Marble Block", type: "BLOCK",
      uniqueBlockId: "BLOCK-WLT-2026-001", quarryOrigin: "Wollega", color: "Cream",
      veinPattern: "Soft grey veining", qualityGrade: "A", weightKg: 18500
    }
  });
  const slab = await prisma.item.create({
    data: {
      sku: "SLB-WLT-001", name: "Wollega Polished Slab", type: "SLAB",
      uniqueSlabId: "SLAB-WLT-2026-001", quarryOrigin: "Wollega", color: "Cream",
      veinPattern: "Soft grey veining", qualityGrade: "A", finish: "Polished",
      thicknessMm: 20, lengthMm: 2800, widthMm: 1800, areaSqm: 5.04,
      recoveryPercent: 68.5, parentId: block.id
    }
  });
  await prisma.item.createMany({
    data: [
      { sku: "SLB-ETH-002", name: "Bale Marble Honed Slab", type: "SLAB", uniqueSlabId: "SLAB-BALE-2026-002", quarryOrigin: "Bale", color: "Green", veinPattern: "Linear", qualityGrade: "B", finish: "Honed", thicknessMm: 30, lengthMm: 3000, widthMm: 1600, areaSqm: 4.8, parentId: block.id },
      { sku: "TL-WHT-001", name: "White Marble Tile", type: "TILE", quarryOrigin: "Tigray", color: "White", qualityGrade: "A", finish: "Polished", thicknessMm: 10, lengthMm: 600, widthMm: 600, areaSqm: 0.36 },
      { sku: "CTS-HSP-001", name: "Hotel Reception Countertop", type: "CUT_TO_SIZE", quarryOrigin: "Wollega", color: "Cream", qualityGrade: "A", finish: "Leathered", thicknessMm: 30, lengthMm: 2400, widthMm: 900, areaSqm: 2.16, parentId: slab.id },
      { sku: "RES-WLT-001", name: "Wollega Marble Residual", type: "RESIDUAL", quarryOrigin: "Wollega", color: "Cream", qualityGrade: "Commercial", areaSqm: 0.75, parentId: slab.id },
      { sku: "CON-ADH-001", name: "Stone Adhesive", type: "CONSUMABLE", color: null }
    ]
  });

  await prisma.itemPhoto.createMany({
    data: [
      { itemId: block.id, url: "https://placehold.co/800x600/png?text=Marble+Block", caption: "Seed block photo", sortOrder: 0 },
      { itemId: slab.id, url: "https://placehold.co/800x600/png?text=Polished+Slab", caption: "Seed slab photo", sortOrder: 0 }
    ]
  });

  const blockLocation = await prisma.location.findFirst({ where: { code: "A-01" } });
  const slabLocation = await prisma.location.findFirst({ where: { code: "CUT-01" } });
  const qcLocation = await prisma.location.findFirst({ where: { code: "QC-01" } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@marbleerp.local" } });

  if (blockLocation && slabLocation && qcLocation) {
    await prisma.stockBalance.createMany({
      data: [
        { itemId: block.id, locationId: blockLocation.id, qualityStatus: "AVAILABLE", quantity: 3, areaSqm: 0 },
        { itemId: slab.id, locationId: slabLocation.id, qualityStatus: "AVAILABLE", quantity: 12, areaSqm: 60.48 },
        { itemId: slab.id, locationId: qcLocation.id, qualityStatus: "QUARANTINE", quantity: 2, areaSqm: 10.08 }
      ]
    });
    await prisma.stockTransaction.create({
      data: {
        transactionNo: "REC-20261119-000001", type: "RECEIPT", itemId: block.id,
        toLocationId: blockLocation.id, qualityStatus: "AVAILABLE", quantity: 3,
        note: "Initial block receipt", actorId: admin.id
      }
    });
  }

  console.log("Seed completed: users, warehouses, locations, items, stock, and traceability");
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
