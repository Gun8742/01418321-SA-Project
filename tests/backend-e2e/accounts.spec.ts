import { test, expect, type APIRequestContext } from "@playwright/test";
import { z } from "zod";

async function emailLink(request: APIRequestContext, email: string) {
  const inbox = z.object({
    messages: z.array(
      z.object({
        ID: z.string(),
        To: z.array(z.object({ Address: z.string() })),
      }),
    ),
  });
  let messageId = "";
  await expect
    .poll(async () => {
      const response = await request.get(
        "http://127.0.0.1:8025/api/v1/messages",
      );
      const parsed = inbox.parse(await response.json());
      messageId =
        parsed.messages.find((m) => m.To.some((to) => to.Address === email))
          ?.ID ?? "";
      return !!messageId;
    })
    .toBe(true);
  const response = await request.get(
    "http://127.0.0.1:8025/api/v1/message/" + messageId,
  );
  const { Text } = z.object({ Text: z.string() }).parse(await response.json());
  const link = Text.match(/https?:\/\/[^\s]+/)?.[0];
  if (!link) throw new Error("No account link in email");
  return link;
}

test("closed employer registration and worker invitation with password recovery", async ({
  page,
  request,
  browser,
}, testInfo) => {
  const email = `browser-${Date.now()}@example.test`;
  const password = "Synthetic-Browser-Password-91";
  await page.goto("/login");
  await expect(
    page.getByRole("link", { name: "สมัครบัญชีนายจ้าง" }),
  ).toHaveCount(0);
  expect((await request.get("/register")).status()).toBe(404);
  expect(
    (
      await request.post("/api/accounts/register", {
        headers: { origin: "http://127.0.0.1:3187" },
        data: {},
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/auth/sign-up/email", {
        headers: { origin: "http://127.0.0.1:3187" },
        data: {},
      })
    ).status(),
  ).toBe(404);
  await page.getByLabel("ชื่อบัญชี", { exact: true }).fill("employer");
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/employer\/workers$/);
  const workerName = "WORKER INVITE " + Date.now();
  await page.goto("/employer/workers/new");
  for (const [label, value] of [
    ["ชื่อ–นามสกุลตามหนังสือเดินทาง", workerName],
    ["วันเกิด", "1995-01-12"],
    ["สัญชาติ", "อินเดีย"],
    ["เลขหนังสือเดินทาง", "TEST-" + Date.now()],
    ["ประเทศผู้ออก", "อินเดีย"],
    ["วันที่ออกหนังสือเดินทาง", "2024-01-01"],
    ["วันหมดอายุหนังสือเดินทาง", "2034-01-01"],
    ["ตำแหน่ง", "ผู้ทดสอบ"],
    ["ลักษณะงาน", "ทดสอบระบบ"],
    ["สถานที่ทำงาน", "ที่อยู่สมมติ"],
    ["วันที่เริ่มตามสัญญา", "2026-12-01"],
    ["วันสิ้นสุดการจ้าง", "2027-11-30"],
    ["ค่าจ้าง", "30000"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("button", { name: "บันทึกข้อมูลลูกจ้างและการจ้าง" })
    .click();
  await expect(page).toHaveURL(/employer\/workers$/);
  await expect(page.getByText(/WORKER INVITE/).last()).toBeVisible();
  await page.goto("/employer/accounts");
  const workerEmail = "worker-" + email;
  await page
    .getByLabel("ลูกจ้าง", { exact: true })
    .selectOption({ label: workerName });
  await page.getByLabel("อีเมลของลูกจ้าง", { exact: true }).fill(workerEmail);
  await page.getByRole("button", { name: "ส่งคำขอ", exact: true }).click();
  await expect(
    page.getByText(/ส่งคำขอแล้ว หากอีเมลนี้สามารถใช้งานได้/),
  ).toBeVisible();
  const workerPage = await browser.newPage();
  try {
    await workerPage.goto(await emailLink(request, workerEmail));
    await workerPage
      .getByLabel("รหัสผ่านใหม่อย่างน้อย 12 ตัวอักษร", { exact: true })
      .fill(password);
    await workerPage
      .getByLabel("ยืนยันรหัสผ่านใหม่", { exact: true })
      .fill(password);
    await workerPage
      .getByRole("button", { name: "ตั้งรหัสผ่าน", exact: true })
      .click();
    await expect(workerPage.getByText(/ตั้งค่าบัญชีสำเร็จ/)).toBeVisible();
    await workerPage.goto("/login");
    await workerPage.getByLabel("ชื่อบัญชี", { exact: true }).fill(workerEmail);
    await workerPage.getByLabel("รหัสผ่าน", { exact: true }).fill(password);
    await workerPage
      .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
      .click();
    await expect(workerPage).toHaveURL(/\/worker$/);
    await workerPage.goto("/employer/accounts");
    await expect(
      workerPage.getByRole("heading", { name: "ไม่มีสิทธิ์เข้าพื้นที่นี้" }),
    ).toBeVisible();
    const oldCookies = await workerPage.context().cookies();
    await workerPage.goto("/forgot-password");
    await workerPage.getByLabel("อีเมล", { exact: true }).fill(workerEmail);
    await workerPage
      .getByRole("button", { name: "ส่งคำขอ", exact: true })
      .click();
    await expect(
      workerPage.getByText(/ส่งคำขอแล้ว หากอีเมลนี้สามารถใช้งานได้/),
    ).toBeVisible();
    await workerPage.goto(await emailLink(request, workerEmail));
    await workerPage
      .getByLabel("รหัสผ่านใหม่อย่างน้อย 12 ตัวอักษร", { exact: true })
      .fill(password + "changed");
    await workerPage
      .getByLabel("ยืนยันรหัสผ่านใหม่", { exact: true })
      .fill(password + "changed");
    await workerPage
      .getByRole("button", { name: "ตั้งรหัสผ่าน", exact: true })
      .click();
    await expect(workerPage.getByText(/ตั้งค่าบัญชีสำเร็จ/)).toBeVisible();
    const response = await request.get("/api/workforce", {
      headers: {
        cookie: oldCookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
    });
    expect(response.status()).toBe(401);
    await page.setViewportSize({ width: 390, height: 844 });
  } finally {
    await workerPage.close();
  }
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "เข้าสู่ระบบ", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("login-mobile.png"),
    fullPage: true,
  });
});
