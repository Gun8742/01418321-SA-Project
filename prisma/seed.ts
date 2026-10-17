import "dotenv/config";
import { database } from "../src/server/db";
import { createAuthentication } from "../src/server/auth";
import { createDemoData } from "../src/features/demo/fixtures";
import { persistWorkforce } from "../src/features/workforce/write";
import { loadWorkforce } from "../src/features/workforce/persistence";
import { emptyData } from "../src/features/workforce/empty";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { putFile, validateFile } from "../src/server/storage";
import type { Actor } from "../src/features/workforce/model";

export function assertLocalDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/sa_local", "/sa_test"].includes(url.pathname) ||
    process.env.NODE_ENV === "production"
  )
    throw new Error(
      "Synthetic provisioning is restricted to localhost sa_local/sa_test",
    );
}
export async function seedLocal() {
  assertLocalDatabase();
  const db = database();
  if (await db.casePolicy.findUnique({ where: { version: "DEMO-1" } })) return;
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("Set SEED_PASSWORD (12+ characters)");
  const data = createDemoData();
  await db.employer.upsert({
    where: { id: 1n },
    update: {},
    create: {
      id: 1n,
      name: "บริษัทตัวอย่าง จำกัด",
      registrationNo: "DEMO-C001",
      address: "สำนักงานตัวอย่าง กรุงเทพฯ",
      contact: "ฝ่ายบุคคลตัวอย่าง",
    },
  });
  await db.employer.upsert({
    where: { id: 2n },
    update: {},
    create: {
      id: 2n,
      name: "อีกบริษัทสมมติ",
      registrationNo: "SYNTHETIC-OTHER",
      address: "ที่อยู่สมมติ",
      contact: "ผู้ติดต่อสมมติ",
    },
  });
  for (const w of data.workers)
    await db.worker.upsert({
      where: { id: BigInt(w.id) },
      update: {},
      create: {
        ...w,
        id: BigInt(w.id),
        birthDate: new Date(w.birthDate),
        passportIssuedAt: new Date(w.passportIssuedAt),
        passportExpiresAt: new Date(w.passportExpiresAt),
      },
    });
  for (const e of data.employments)
    await db.employment.upsert({
      where: { id: BigInt(e.id) },
      update: {},
      create: {
        id: BigInt(e.id),
        employerId: BigInt(e.employerId),
        workerId: BigInt(e.workerId),
        version: e.version,
        job: e.job,
        jobDescription: e.jobDescription,
        location: e.location,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
        wage: e.wage,
        wageUnit: e.wageUnit,
      },
    });
  const service = await db.loginService.upsert({
    where: { name: "password-local" },
    update: {},
    create: { name: "password-local" },
  });
  const auth = createAuthentication(true);
  for (const user of [
    {
      id: 11n,
      username: "employer",
      role: "EMPLOYER",
      employerId: 1n,
      workerId: null,
    },
    {
      id: 12n,
      username: "other_employer",
      role: "EMPLOYER",
      employerId: 2n,
      workerId: null,
    },
    {
      id: 201n,
      username: "arun",
      role: "WORKER",
      workerId: 101n,
      employerId: null,
    },
    {
      id: 202n,
      username: "maya",
      role: "WORKER",
      workerId: 102n,
      employerId: null,
    },
    {
      id: 203n,
      username: "lin",
      role: "WORKER",
      workerId: 103n,
      employerId: null,
    },
  ]) {
    if (user.role !== "WORKER" && user.role !== "EMPLOYER")
      throw new Error("Invalid seed role");
    const existing = await db.user.findUnique({
      where: { username: user.username },
    });
    const userId =
      existing?.id ??
      (
        await auth.api.signUpEmail({
          body: {
            email: user.username + "@example.invalid",
            name: user.username,
            password,
            username: user.username,
          },
        })
      ).user.id;
    await db.actorAccount.upsert({
      where: { userId },
      update: {},
      create: {
        id: user.id,
        userId,
        role: user.role,
        employerId: user.employerId,
        workerId: user.workerId,
        serviceId: service.id,
      },
    });
  }
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("SYNTHETIC TEST DOCUMENT - NOT AN OFFICIAL RECORD", {
    x: 30,
    y: 700,
    size: 12,
    font,
  });
  const bytes = await pdf.save();
  const checksum = await validateFile(
    bytes,
    "synthetic.pdf",
    "application/pdf",
  );
  for (const employment of data.employments) {
    if (
      await db.fileUpload.findFirst({
        where: {
          employmentId: BigInt(employment.id),
          status: "COMPLETE",
          documents: { some: {} },
        },
      })
    )
      continue;
    const actor: Actor = {
      role: "WORKER",
      accountId: (BigInt(employment.workerId) + 100n).toString(),
      workerId: employment.workerId,
    };
    const sourceFiles = new Map<string, string>();
    for (const document of data.documents.filter(
      (d) => d.employmentId === employment.id,
    )) {
      const uploadId = crypto.randomUUID();
      const key = "synthetic/" + uploadId;
      await putFile(key, bytes, "application/pdf");
      await db.fileUpload.create({
        data: {
          id: uploadId,
          actorId: BigInt(actor.accountId),
          employmentId: BigInt(employment.id),
          objectKey: key,
          originalName: "synthetic.pdf",
          mime: "application/pdf",
          size: bytes.length,
          checksum,
          status: "COMPLETE",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      sourceFiles.set(document.id, uploadId);
    }
    await db.$transaction(async (tx) => {
      // Internal fixture provisioning, never a user-accessible write path.
      const before = await loadWorkforce(tx, {
        role: "EMPLOYER",
        employerId: "1",
        accountId: "11",
      });
      const subset = emptyData();
      subset.workers = data.workers.filter((w) => w.id === employment.workerId);
      subset.employments = [employment];
      subset.stages = data.stages.filter(
        (s) => s.employmentId === employment.id,
      );
      subset.documents = data.documents.filter(
        (d) => d.employmentId === employment.id,
      );
      subset.entries = data.entries.filter(
        (e) => e.employmentId === employment.id,
      );
      subset.healthChecks = data.healthChecks.filter(
        (h) => h.employmentId === employment.id,
      );
      await persistWorkforce(
        tx,
        before,
        subset,
        actor,
        "reviewDocumentSet",
        undefined,
        sourceFiles,
      );
    });
  }
  await db.casePolicy.create({
    data: {
      version: "DEMO-1",
      approved: true,
      synthetic: true,
      requirements: [
        {
          requirementKey: "passport",
          label: "หนังสือเดินทาง (ตัวอย่าง)",
          required: true,
        },
        {
          requirementKey: "employment",
          label: "การจ้าง (ตัวอย่าง)",
          required: true,
        },
        {
          requirementKey: "company",
          label: "เอกสารตามกรณี (ตัวอย่าง)",
          required: true,
        },
      ],
    },
  });
  await db.idSequence.create({
    data: { name: "workforce", nextValue: 1000000n },
  });
  console.log(
    "Synthetic accounts provisioned: employer, other_employer, arun, maya, lin. Password comes from SEED_PASSWORD.",
  );
}
if (process.argv[1]?.endsWith("/seed.ts"))
  seedLocal().finally(() => database().$disconnect());
