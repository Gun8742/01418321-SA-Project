import { test, expect } from "@playwright/test";

test("manual Passport accounts without email enrollment", async ({
  page,
  request,
  browser,
}, testInfo) => {
  const passport = "TEST-" + Date.now();
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
  const workerName = "WORKER MANUAL " + Date.now();
  await page.goto("/employer/workers/new");
  for (const [label, value] of [
    ["ชื่อ–นามสกุลตามหนังสือเดินทาง", workerName],
    ["วันเกิด", "1995-01-12"],
    ["สัญชาติ", "อินเดีย"],
    ["เลขหนังสือเดินทาง", passport],
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
  await expect(
    page.getByRole("heading", { name: "บัญชีลูกจ้างพร้อมใช้งาน" }),
  ).toBeVisible();
  await expect(page.getByLabel("เลข Passport สำหรับ Login")).toHaveValue(
    passport,
  );
  const password = await page.getByLabel("รหัสผ่านที่ระบบสร้าง").inputValue();
  expect(password.length).toBeGreaterThanOrEqual(24);
  await page.screenshot({
    path: testInfo.outputPath("generated-account-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "เสร็จสิ้น", exact: true }).click();
  await expect(page).toHaveURL(/employer\/workers$/);
  await expect(page.getByText(workerName + " · " + passport)).toBeVisible();
  for (const path of [
    "/api/accounts/invite",
    "/api/accounts/activate",
    "/api/auth/request-password-reset",
    "/api/auth/reset-password",
  ]) {
    expect(
      (
        await request.post(path, {
          headers: { origin: "http://127.0.0.1:3187" },
          data: {},
        })
      ).status(),
    ).toBe(404);
  }
  const workerPage = await browser.newPage();
  async function signIn(secret: string) {
    await workerPage.goto("/login");
    await workerPage
      .getByLabel("ชื่อบัญชี", { exact: true })
      .fill(passport.toLowerCase());
    await workerPage.getByLabel("รหัสผ่าน", { exact: true }).fill(secret);
    await workerPage
      .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
      .click();
    await expect(workerPage).toHaveURL(/\/worker$/);
  }
  try {
    await signIn(password);
    await workerPage.goto("/employer/accounts");
    await expect(
      workerPage.getByRole("heading", { name: "ไม่มีสิทธิ์เข้าพื้นที่นี้" }),
    ).toBeVisible();
    const cookies = await workerPage.context().cookies();
    const forbidden = await workerPage.request.post("/api/accounts/reset", {
      data: { workerId: "101" },
      headers: { origin: "http://127.0.0.1:3187" },
    });
    expect(forbidden.status()).toBe(403);
    await page.goto("/employer/accounts");
    await page
      .getByLabel("ลูกจ้าง", { exact: true })
      .selectOption({ label: workerName + " · " + passport });
    await page
      .getByLabel("การดำเนินการ", { exact: true })
      .selectOption("reset");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "สร้างข้อมูลสำหรับ Login" }).click();
    await expect(
      page.getByRole("heading", { name: "บัญชีลูกจ้างพร้อมใช้งาน" }),
    ).toBeVisible();
    const nextPassword = await page
      .getByLabel("รหัสผ่านที่ระบบสร้าง")
      .inputValue();
    expect(nextPassword).not.toBe(password);
    expect(
      (
        await request.get("/api/workforce", {
          headers: {
            cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
          },
        })
      ).status(),
    ).toBe(401);
    await signIn(nextPassword);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel("รหัสผ่านที่ระบบสร้าง")).toHaveValue(
      nextPassword,
    );
    await page.screenshot({
      path: testInfo.outputPath("generated-account-mobile.png"),
      fullPage: true,
    });
    await page.reload();
    await expect(page.getByLabel("ลูกจ้าง", { exact: true })).toBeVisible();
    await expect(page.getByLabel("รหัสผ่านที่ระบบสร้าง")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath("accounts-mobile.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
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
