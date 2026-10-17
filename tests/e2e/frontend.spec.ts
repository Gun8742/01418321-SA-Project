import { expect, test, type Page } from "@playwright/test";

test("multiple applications require an explicit choice and all appear in the overview", async ({
  page,
}) => {
  await employer(page);
  await page.goto("/employer/visa");
  await page
    .getByLabel("ลูกจ้าง / การจ้าง", { exact: true })
    .selectOption("201");
  await page
    .getByRole("button", { name: "สร้างชุดคำขอใหม่", exact: true })
    .click();
  await expect(page).toHaveURL(/\/employer\/visa\/\d+$/);
  await logout(page);
  await worker(page);
  await expect(
    page.getByRole("heading", {
      name: "คำร้องทั้งหมดของการจ้างนี้",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/worker/visa?employmentId=201");
  await expect(
    page.getByRole("heading", { name: "เลือกคำร้องที่ต้องการดู", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Visa ของฉัน", exact: true }),
  ).toHaveCount(0);
});

test("a blocked session-storage write does not report login success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "sa-workforce-demo-actor")
        throw new DOMException("blocked", "SecurityError");
      original.call(this, key, value);
    };
  });
  await page.goto("/login");
  await page
    .getByRole("button", { name: "เข้าสู่ระบบสาธิต", exact: true })
    .click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "บันทึกบัญชีสาธิตไม่ได้",
  );
  await expect(page).toHaveURL(/\/login$/);
});
async function employer(page: Page) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "เข้าสู่ระบบสาธิต", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "รายการลูกจ้าง", exact: true }),
  ).toBeVisible();
}
async function worker(page: Page) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "สำหรับลูกจ้างต่างด้าว", exact: true })
    .click();
  await page
    .getByRole("button", { name: "เข้าสู่ระบบสาธิต", exact: true })
    .click();
  await page
    .getByRole("link", { name: "เลือกการจ้าง 201", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ภาพรวมของฉัน", exact: true }),
  ).toBeVisible();
}
async function logout(page: Page) {
  await page
    .getByRole("button", { name: "ออกจากระบบสาธิต", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "เข้าสู่ระบบ", exact: true }),
  ).toBeVisible();
}
async function evidence(page: Page, label: string) {
  await page.getByLabel(label, { exact: true }).selectOption({ index: 1 });
}
async function approve(page: Page) {
  await page
    .getByLabel("ผลตามหลักฐาน", { exact: true })
    .selectOption("APPROVED");
  await page
    .getByLabel("วันที่แจ้งผล (ผลตัดสิน)", { exact: true })
    .fill("2026-10-17");
  await evidence(page, "หลักฐานผลพิจารณา");
  await page
    .getByRole("button", { name: "บันทึกผลตามหลักฐาน", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: /เอกสารที่ออกแล้ว|หนังสืออนุมัติประกอบ/,
    }),
  ).toBeVisible();
}
async function attachIssued(page: Page) {
  await page
    .getByLabel("เลขที่เอกสาร", { exact: true })
    .fill("DEMO-ISSUED-001");
  await page
    .getByLabel("หน่วยงานผู้ออก", { exact: true })
    .fill("หน่วยงานตัวอย่าง");
  await page.getByLabel("วันที่ออก", { exact: true }).fill("2026-10-17");
  await page
    .getByLabel("วันหมดอายุ (เมื่อมี)", { exact: true })
    .fill("2027-12-31");
  await evidence(page, "ไฟล์เอกสารที่ออกแล้ว (ตัวอย่าง)");
  await page
    .getByRole("button", {
      name: "จัดเก็บเอกสารที่ออกแล้ว (จำลอง)",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("เลขที่เอกสาร", { exact: true })).toHaveCount(0);
}
async function prepare(page: Page) {
  for (const label of [
    "หนังสือเดินทาง (จำเป็น)",
    "สัญญาจ้าง / หนังสือรับเข้าทำงาน (จำเป็น)",
    "เอกสารบริษัท / หนังสือมอบอำนาจตามกรณี (จำเป็น)",
  ])
    await evidence(page, label);
  await page
    .getByRole("button", { name: "บันทึกชุดเอกสาร", exact: true })
    .click();
  await expect(
    page.getByText("บันทึกข้อมูลสมมติแล้ว", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ตรวจทานและยืนยันความครบถ้วน", exact: true })
    .click();
  await expect(page.locator(".readiness-status .badge")).toHaveText(
    "พร้อมยื่น",
  );
}
async function submit(page: Page) {
  await page
    .getByLabel("วันที่รับคำขอ (เมื่อมีหลักฐาน)", { exact: true })
    .fill("2026-10-17");
  await page
    .getByLabel("เลขรับคำขอ / เลขอ้างอิง", { exact: true })
    .fill("DEMO-RECEIPT-001");
  await evidence(page, "หลักฐานรับคำขอ");
  await page
    .getByRole("button", { name: "บันทึกการยื่นตามหลักฐาน", exact: true })
    .click();
  await expect(page.getByLabel("ผลตามหลักฐาน", { exact: true })).toBeVisible();
}
test("UC04 validates forms, keeps employment context and supports empty search", async ({
  page,
}) => {
  await employer(page);
  await page
    .getByLabel("ชื่อ หรือเลขหนังสือเดินทาง", { exact: true })
    .fill("NO MATCH");
  await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
  await expect(
    page.getByText("ไม่พบลูกจ้างในเงื่อนไขนี้", { exact: false }),
  ).toBeVisible();
  await page.goto("/employer/workers/101");
  await expect(
    page.getByRole("link", { name: "เลือกการจ้าง 201", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "เลือกการจ้าง 204", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "เลือกการจ้าง 204", exact: true })
    .click();
  await expect(page).toHaveURL(/employments\/204$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "ARUN SAMPLE", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("ผู้ช่วยโครงการ (ประวัติเดิม) · การจ้าง 204", {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto("/employer/workers/102/employments/201");
  await expect(
    page.getByRole("heading", {
      name: "ไม่พบข้อมูลที่เข้าถึงได้",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/employer/workers/new");
  await page
    .getByRole("button", { name: "บันทึกข้อมูลลูกจ้างและการจ้าง", exact: true })
    .click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "กรุณาตรวจช่องที่จำเป็น",
  );
  for (const [label, value] of Object.entries({
    "ชื่อ–นามสกุลตามหนังสือเดินทาง": "DEMO NEW",
    วันเกิด: "1995-01-12",
    สัญชาติ: "อินเดีย",
    เลขหนังสือเดินทาง: "DEMO-P004",
    ประเทศผู้ออก: "อินเดีย",
    วันที่ออกหนังสือเดินทาง: "2024-01-01",
    วันหมดอายุหนังสือเดินทาง: "2034-01-01",
    เลขทะเบียนนิติบุคคล: "DEMO-C001",
    ที่อยู่นายจ้าง: "ตัวอย่าง",
    ผู้ติดต่อ: "ฝ่ายบุคคล",
    ตำแหน่ง: "นักพัฒนา",
    ลักษณะงาน: "พัฒนาระบบ",
    สถานที่ทำงาน: "กรุงเทพฯ",
    วันที่เริ่มตามสัญญา: "2026-12-01",
    วันสิ้นสุดการจ้าง: "2027-11-30",
    ค่าจ้าง: "30000",
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("button", { name: "บันทึกข้อมูลลูกจ้างและการจ้าง", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "รายการลูกจ้าง", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("DEMO NEW · DEMO-P004", { exact: true }),
  ).toBeVisible();
});
test("UC01 and UC05/06 fix missing documents and distinguish submission evidence", async ({
  page,
}) => {
  await employer(page);
  await page.goto("/employer/pre-arrival/2020");
  await page
    .getByRole("button", { name: "ตรวจทานและยืนยันความครบถ้วน", exact: true })
    .click();
  await expect(page.locator("form [role=alert]")).toContainText("เอกสารไม่ครบ");
  await page
    .getByRole("button", { name: "เพิ่มหลักฐานสมมติสำหรับทดลอง", exact: true })
    .click();
  await expect(
    page.getByText("เพิ่มหลักฐานตัวอย่างสมมติแล้ว", { exact: true }),
  ).toBeVisible();
  await prepare(page);
  await page
    .getByRole("link", { name: "ไปการยื่นและติดตามผล", exact: true })
    .click();
  await page
    .getByRole("button", { name: "บันทึกการยื่นตามหลักฐาน", exact: true })
    .click();
  await expect(
    page.getByText("รอยืนยันการยื่น", { exact: true }).first(),
  ).toBeVisible();
  await submit(page);
  await approve(page);
  await attachIssued(page);
  await page.goto("/employer/visa/2021");
  await prepare(page);
});
test("UC11 → UC07 → UC08 → UC09 → UC02/03 → UC10 happy path", async ({
  page,
}) => {
  await employer(page);
  await page.goto("/employer/visa/2011/application");
  await approve(page);
  await attachIssued(page);
  await logout(page);
  await worker(page);
  await page.goto("/worker/visa?employmentId=201");
  await page.getByRole("button", { name: /^ดูเอกสาร / }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "ดาวน์โหลดตัวอย่างจำลอง", exact: true })
    .click();
  await download;
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "ยืนยันว่าได้รับเอกสารแล้ว",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByLabel("ฉันได้รับเอกสารนี้จริงแล้ว (จำลอง)", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "ยืนยันว่าได้รับเอกสารแล้ว", exact: true })
    .click();
  await page
    .getByRole("link", { name: "ดำเนินการแผนเดินทาง", exact: true })
    .click();
  await page
    .getByLabel("วันที่คาดว่าจะเดินทาง", { exact: true })
    .fill("2026-10-18");
  await page
    .getByLabel("จุดผ่านแดน / ท่าอากาศยาน", { exact: true })
    .fill("ท่าอากาศยานตัวอย่าง");
  await page
    .getByLabel("เลขเที่ยวบิน (เมื่อเดินทางโดยเครื่องบิน)", { exact: true })
    .fill("DEMO-001");
  await evidence(page, "หลักฐานการเดินทาง");
  await page
    .getByRole("button", { name: "ยืนยันข้อมูลก่อนเดินทาง", exact: true })
    .click();
  await expect(page.getByText("ยืนยันแผนแล้ว", { exact: true })).toBeVisible();
  await page
    .getByText("เครื่องมือสาธิต · ข้อมูลสมมติเท่านั้น", { exact: true })
    .click();
  await page
    .getByLabel(
      "จำลอง capability บันทึกหลักฐานเข้าเมือง/ผลแพทย์ (O-02 ยังไม่อนุมัติจริง)",
      { exact: true },
    )
    .check();
  await page
    .getByLabel("ผลตามหลักฐาน", { exact: true })
    .selectOption("ALLOWED");
  await page
    .getByLabel("วันที่เข้าประเทศจริง", { exact: true })
    .fill("2026-10-18");
  await page
    .getByLabel("เหตุผลตามหลักฐาน", { exact: true })
    .fill("อนุญาตตามหลักฐานสมมติ");
  await evidence(page, "หลักฐานผลตรวจ");
  await page
    .getByRole("button", { name: "บันทึกผลตามหลักฐาน (จำลอง)", exact: true })
    .click();
  await page
    .getByRole("link", { name: "ดำเนินการตรวจสุขภาพ", exact: true })
    .click();
  await page.getByLabel("โรงพยาบาล", { exact: true }).fill("โรงพยาบาลตัวอย่าง");
  await page
    .getByLabel("วันที่ตรวจ / เข้ารับบริการ", { exact: true })
    .fill("2026-10-18");
  await page
    .getByRole("button", { name: "บันทึกและรอผล", exact: true })
    .click();
  await page
    .getByLabel("ผลตามเอกสารจริง", { exact: true })
    .selectOption("COMPLETE");
  await evidence(page, "หลักฐานผลตรวจ");
  await page
    .getByRole("button", { name: "บันทึกผลตรวจ (จำลอง)", exact: true })
    .click();
  await page
    .getByLabel("ชื่อแพทย์ตามเอกสาร", { exact: true })
    .fill("แพทย์ตัวอย่าง");
  await page
    .getByLabel("วันที่ออกใบรับรอง", { exact: true })
    .fill("2026-10-18");
  await evidence(page, "ไฟล์ใบรับรอง (ตัวอย่าง)");
  await page
    .getByRole("button", {
      name: "ยืนยันใบรับรองตามหลักฐาน (จำลอง)",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("ยืนยันใบรับรองสมมติแล้ว", { exact: false }),
  ).toBeVisible();
  await logout(page);
  await employer(page);
  await page.goto("/employer/work-permits/2012");
  await prepare(page);
  await page
    .getByRole("link", { name: "ไปการยื่นและติดตามผล", exact: true })
    .click();
  await submit(page);
  await approve(page);
  await attachIssued(page);
  await logout(page);
  await worker(page);
  await page.goto("/worker/work-permit?employmentId=201");
  await page
    .getByLabel("ฉันได้รับเอกสารนี้จริงแล้ว (จำลอง)", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "ยืนยันว่าได้รับเอกสารแล้ว", exact: true })
    .click();
  await expect(
    page.getByText("รับแล้ว", { exact: true }).first(),
  ).toBeVisible();
});
test("correction failure recovery and employer resolution are visible to worker", async ({
  page,
}) => {
  await worker(page);
  await page
    .getByText("เครื่องมือสาธิต · ข้อมูลสมมติเท่านั้น", { exact: true })
    .click();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByLabel("เริ่มสถานการณ์ใหม่ (ล้างการแก้ไข)", { exact: true })
    .selectOption("visa-ready");
  await page.goto("/worker/visa?employmentId=201");
  await page
    .getByText("เครื่องมือสาธิต · ข้อมูลสมมติเท่านั้น", { exact: true })
    .click();
  await page
    .getByLabel("จำลองบันทึกล้มเหลวครั้งถัดไป", { exact: true })
    .check();
  await page
    .getByLabel("รายการที่ไม่ตรงและรายละเอียดที่ต้องตรวจ", { exact: true })
    .fill("ชื่อใน Visa ไม่ตรง");
  await page
    .getByRole("button", { name: "ส่งคำแจ้งข้อมูลไม่ตรง", exact: true })
    .click();
  await expect(page.locator("form [role=alert]")).toContainText("ล้มเหลว");
  await expect(
    page.getByLabel("รายการที่ไม่ตรงและรายละเอียดที่ต้องตรวจ", { exact: true }),
  ).toHaveValue("ชื่อใน Visa ไม่ตรง");
  await page
    .getByRole("button", { name: "ส่งคำแจ้งข้อมูลไม่ตรง", exact: true })
    .click();
  await expect(page.locator(".correction .badge")).toHaveText("รอดำเนินการ");
  await logout(page);
  await employer(page);
  await page.goto("/employer/workers/101/employments/201?tab=corrections");
  await page.locator(".correction summary").click();
  await page
    .getByLabel("คำตอบและผลการตรวจสอบ", { exact: true })
    .fill("ตรวจหลักฐานและประสานผู้ออกแล้ว");
  await page
    .getByRole("button", { name: "ตอบกลับและปิดเรื่อง", exact: true })
    .click();
  await expect(page.locator(".correction .badge")).toHaveText("ปิดเรื่องแล้ว");
  await logout(page);
  await worker(page);
  await page.goto("/worker/visa?employmentId=201");
  await page.locator(".correction summary").click();
  await expect(page.locator(".correction[open]")).toContainText(
    "ตรวจหลักฐานและประสานผู้ออกแล้ว",
  );
  await page.goto("/employer/workers");
  await expect(
    page.getByRole("heading", {
      name: "ไม่มีสิทธิ์เข้าพื้นที่นี้",
      exact: true,
    }),
  ).toBeVisible();
});

test("additional documents stay on the same application; a new review is required", async ({
  page,
}) => {
  await employer(page);
  await page.goto("/employer/visa/2011/application");
  await page
    .getByLabel("ผลตามหลักฐาน", { exact: true })
    .selectOption("ADDITIONAL_DOCUMENTS");
  await page
    .getByLabel("วันที่แจ้งผล (ผลตัดสิน)", { exact: true })
    .fill("2026-10-17");
  await page
    .getByLabel("เหตุผลตามหลักฐาน", { exact: true })
    .fill("ข้อมูลบริษัทไม่ครบ");
  await page
    .getByLabel("รายการเอกสารที่ขอเพิ่ม", { exact: true })
    .fill("หนังสือรับรองฉบับใหม่");
  await evidence(page, "หลักฐานผลพิจารณา");
  await page
    .getByRole("button", { name: "บันทึกผลตามหลักฐาน", exact: true })
    .click();
  await page
    .getByRole("link", { name: "เพิ่มเอกสารและตรวจทานใหม่", exact: true })
    .click();
  await evidence(page, "หนังสือรับรองฉบับใหม่ (จำเป็น)");
  await prepare(page);
  await page
    .getByRole("link", { name: "ไปการยื่นและติดตามผล", exact: true })
    .click();
  await submit(page);
  await expect(page).toHaveURL(/visa\/2011\/application$/);
  await expect(
    page.getByText("คำร้อง 3011 · ชุดเอกสาร 2011", { exact: true }),
  ).toBeVisible();
});
test("rejected Visa never becomes available to receive", async ({ page }) => {
  await employer(page);
  await page.goto("/employer/visa/2011/application");
  await page
    .getByLabel("ผลตามหลักฐาน", { exact: true })
    .selectOption("REJECTED");
  await page
    .getByLabel("วันที่แจ้งผล (ผลตัดสิน)", { exact: true })
    .fill("2026-10-17");
  await page
    .getByLabel("เหตุผลตามหลักฐาน", { exact: true })
    .fill("ตามเหตุผลหน่วยงานสมมติ");
  await evidence(page, "หลักฐานผลพิจารณา");
  await page
    .getByRole("button", { name: "บันทึกผลตามหลักฐาน", exact: true })
    .click();
  await expect(page.locator(".heading .badge")).toHaveText("ไม่อนุมัติ");
  await logout(page);
  await worker(page);
  await page.goto("/worker/visa?employmentId=201");
  await expect(
    page.getByRole("heading", { name: "ยังไม่มีเอกสารพร้อมรับ", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "ยืนยันว่าได้รับเอกสารแล้ว",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("read error retries and narrow forms keep accessible labels and no page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await employer(page);
  await page
    .getByText("เครื่องมือสาธิต · ข้อมูลสมมติเท่านั้น", { exact: true })
    .click();
  await page.getByLabel("จำลองโหลดข้อมูลล้มเหลว", { exact: true }).check();
  await expect(
    page.getByRole("heading", { name: "โหลดข้อมูลไม่สำเร็จ", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ลองโหลดอีกครั้ง", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "รายการลูกจ้าง", exact: true }),
  ).toBeVisible();
  await page.goto("/employer/workers/new");
  await expect(
    page.getByLabel("ชื่อ–นามสกุลตามหนังสือเดินทาง", { exact: true }),
  ).toBeVisible();
  const checks = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("[id]")).map((e) => e.id);
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      duplicateIds: ids.length - new Set(ids).size,
    };
  });
  expect(checks).toEqual({ overflow: false, duplicateIds: 0 });
});
