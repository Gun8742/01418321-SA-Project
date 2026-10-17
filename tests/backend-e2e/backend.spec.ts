import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { Client } from "pg";
test.beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/sa_local"
  )
    throw new Error(
      "Backend browser tests require the synthetic local database",
    );
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query("DELETE FROM auth_rate_limit");
  } finally {
    await client.end();
  }
});

test("real login, database persistence and private file download", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("ชื่อบัญชี", { exact: true }).fill("employer");
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "รายการลูกจ้าง", exact: true }),
  ).toBeVisible();
  await page.goto("/employer/workers/102/employments/202/edit");
  const name = "MAYA SAMPLE " + Date.now();
  await page
    .getByLabel("ชื่อ–นามสกุลตามหนังสือเดินทาง", { exact: true })
    .fill(name);
  await page
    .getByRole("button", { name: "บันทึกข้อมูลลูกจ้างและการจ้าง" })
    .click();
  await expect(page).toHaveURL(/employments\/202$/);
  await page.reload();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  const pdf = await PDFDocument.create();
  pdf.addPage();
  await page.getByLabel("เพิ่มเอกสารประกอบ", { exact: true }).setInputFiles({
    name: "browser-synthetic-proof.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "จัดเก็บไฟล์แล้ว" }),
  ).toBeVisible();
  const row = page
    .locator(".document-row")
    .filter({ hasText: "browser-synthetic-proof.pdf" })
    .last();
  await row.getByRole("button", { name: /ดูเอกสาร/ }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "ดาวน์โหลดไฟล์", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "browser-synthetic-proof.pdf",
  );
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith("sa-workforce")),
    ),
  ).toEqual([]);
  await expect(page.getByLabel("ชื่อบัญชี", { exact: true })).toBeVisible();
});
test("worker session cannot access employer operations or another worker document", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("ชื่อบัญชี", { exact: true }).fill("arun");
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/worker$/);
  await page.goto("/employer/workers");
  await expect(
    page.getByRole("heading", { name: "ไม่มีสิทธิ์เข้าพื้นที่นี้" }),
  ).toBeVisible();
  const response = await page.request.post("/api/workforce", {
    headers: { origin: "http://127.0.0.1:3187" },
    data: {
      operation: "reviewDocumentSet",
      input: {
        documentSetId: "2010",
        expectedVersion: 1,
        checklistVersion: "DEMO-1",
        requestId: crypto.randomUUID(),
      },
    },
  });
  expect(response.status()).toBe(403);
  expect(
    (await page.request.get("/api/documents/999999999/download")).status(),
  ).toBe(404);
});
