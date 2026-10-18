import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { seedLocal } from "../../prisma/seed";
import { database } from "../../src/server/db";
import {
  authentication,
  resolvePrincipal,
  type Principal,
} from "../../src/server/auth";
import { tokenDigest } from "../../src/server/auth-db";
import { executeCommand, snapshot } from "../../src/features/workforce/service";
import {
  initiateUpload,
  uploadBytes,
  completeUpload,
  authorizeDownload,
  cleanupTemporaryUploads,
} from "../../src/server/documents";
import { getFile, deleteFile, validateFile } from "../../src/server/storage";
import { PDFDocument } from "pdf-lib";
import { businessDate } from "../../src/lib/date";
import { demoDataSchema } from "../../src/features/workforce/model";
import { executeQuery } from "../../src/features/workforce/queries";
const db = database();
let employer: Principal;
let arun: Principal;
let other: Principal;
async function login(username: string) {
  const response = await authentication().api.signInUsername({
    body: { username, password: process.env.SEED_PASSWORD ?? "" },
    headers: new Headers({ origin: process.env.BETTER_AUTH_URL ?? "" }),
    asResponse: true,
  });
  expect(response.status).toBe(200);
  const headers = new Headers({
    cookie: response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; "),
  });
  return { headers, principal: await resolvePrincipal(headers) };
}
beforeAll(async () => {
  if (new URL(process.env.DATABASE_URL ?? "").pathname !== "/sa_test")
    throw new Error("Refuse to reset a non-test database");
  await db.$executeRawUnsafe(
    "TRUNCATE employer, worker, auth_user, login_service, auth_rate_limit, id_sequence, case_policy RESTART IDENTITY CASCADE",
  );
  await seedLocal();
  employer = (await login("employer")).principal;
  arun = (await login("arun")).principal;
  other = (await login("other_employer")).principal;
});
afterAll(async () => {
  await db.$disconnect();
});
describe("PostgreSQL and native authentication", () => {
  it("uses cookie-derived identity and hashed, revocable sessions", async () => {
    const signed = await login("maya");
    const parsed = await authentication().api.getSession({
      headers: signed.headers,
    });
    expect(parsed?.user.id).toBe(signed.principal.userId);
    const stored = await db.session.findUniqueOrThrow({
      where: { id: signed.principal.sessionId },
    });
    expect(stored.token === tokenDigest(parsed?.session.token ?? "")).toBe(
      true,
    );
    expect(stored.token !== parsed?.session.token).toBe(true);
    await db.session.update({
      where: { id: stored.id },
      data: { updatedAt: new Date(Date.now() - 3600000) },
    });
    const refreshed = await authentication().api.getSession({
      headers: signed.headers,
    });
    expect(refreshed?.session.id === stored.id).toBe(true);
    expect((await resolvePrincipal(signed.headers)).actor.accountId).toBe(
      signed.principal.actor.accountId,
    );
    await authentication().api.signOut({ headers: signed.headers });
    await expect(resolvePrincipal(signed.headers)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
  it("never trusts Actor or scope supplied by another account", async () => {
    expect((await snapshot(other)).data.employments).toHaveLength(0);
    await expect(
      executeCommand(other, {
        operation: "reviewDocumentSet",
        input: {
          documentSetId: "2010",
          expectedVersion: 1,
          checklistVersion: "DEMO-1",
          requestId: crypto.randomUUID(),
        },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(
      demoDataSchema
        .parse((await snapshot(arun)).data)
        .workers.map((w) => w.id),
    ).toEqual(["101"]);
  });
  it("does not accept a client capability toggle", async () => {
    const result = (await snapshot(employer)).data;
    const entry = result.entries[0];
    expect(entry).toBeDefined();
    await expect(
      executeCommand(employer, {
        operation: "recordEntryResult",
        input: {
          entryId: entry.id,
          expectedVersion: entry.version,
          grants: true,
          requestId: crypto.randomUUID(),
        },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

async function command(
  principal: Principal,
  operation: string,
  input: Record<string, unknown>,
  requestId = crypto.randomUUID(),
) {
  return executeCommand(principal, {
    operation,
    input: { ...input, requestId },
  });
}
async function upload(
  principal: Principal,
  employmentId: string,
  ownerKind: "WORKER" | "EMPLOYER" = "WORKER",
) {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const bytes = await pdf.save();
  const reservation = await initiateUpload(principal, {
    employmentId,
    ownerKind,
    originalName: "synthetic-proof.pdf",
    declaredMime: "application/pdf",
    declaredSize: bytes.length,
    requestId: crypto.randomUUID(),
  });
  await uploadBytes(principal, reservation.uploadId, bytes, "application/pdf");
  const result = await completeUpload(principal, reservation.uploadId, {
    requestId: crypto.randomUUID(),
  });
  return { id: result.data.id, uploadId: reservation.uploadId, bytes };
}
async function stage(id: string) {
  return (await snapshot(employer)).data.stages.find((s) => s.id === id)!;
}
async function prepareAndReview(id: string, documentId: string) {
  let current = await stage(id);
  await command(employer, "savePreparation", {
    documentSetId: id,
    expectedVersion: current.version,
    country: "ประเทศสมมติ",
    authority: "หน่วยงานสมมติ",
    caseKey: current.caseKey,
    items: current.items.map((i) => ({
      requirementKey: i.requirementKey,
      documentId,
    })),
  });
  current = await stage(id);
  await command(employer, "reviewDocumentSet", {
    documentSetId: id,
    expectedVersion: current.version,
    checklistVersion: current.checklistVersion,
  });
}
async function accept(id: string, documentId: string) {
  const current = await stage(id);
  return command(employer, "recordSubmission", {
    documentSetId: id,
    expectedVersion: current.version,
    expectedApplicationVersion: current.application.version,
    authority: "หน่วยงานสมมติ",
    receiptNo: "SYNTHETIC-RECEIPT",
    submittedAt: businessDate(),
    acceptedEvidenceDocumentIds: [documentId],
  });
}
async function approve(id: string, documentId: string) {
  const current = await stage(id);
  await command(employer, "recordDecision", {
    applicationId: current.application.id,
    expectedVersion: current.application.version,
    decision: "APPROVED",
    decidedAt: businessDate(),
    reason: "ตามหลักฐานสมมติ",
    requestedItems: "",
    evidenceDocumentIds: [documentId],
  });
}
async function issue(id: string, documentId: string) {
  const current = await stage(id);
  return command(employer, "attachIssuedDocument", {
    applicationId: current.application.id,
    expectedVersion: current.application.version,
    sourceDocumentId: documentId,
    fileName: "synthetic-proof.pdf",
    documentNo: "SYNTHETIC-" + id,
    issuer: "หน่วยงานสมมติ",
    issuedAt: businessDate(),
    validFrom: businessDate(),
    expiresAt: "2027-12-31",
  });
}
describe("Private files and transaction integrity", () => {
  it("validates bytes and enforces ownership, immutable uploads and receipt-free download", async () => {
    await expect(
      validateFile(
        new TextEncoder().encode("%PDF-fake"),
        "fake.pdf",
        "application/pdf",
      ),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE_TYPE" });
    const file = await upload(employer, "201");
    const repeated = await completeUpload(employer, file.uploadId, {
      requestId: crypto.randomUUID(),
    });
    expect(repeated.data.id).toBe(file.id);
    expect(
      await db.document.count({
        where: { fileId: file.uploadId, type: "SUPPORTING" },
      }),
    ).toBe(1);
    expect((await authorizeDownload(arun, file.id)).bytes).toEqual(file.bytes);
    expect(
      await db.documentReceipt.count({
        where: { documentId: BigInt(file.id) },
      }),
    ).toBe(0);
    await expect(authorizeDownload(other, file.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const company = await upload(employer, "201", "EMPLOYER");
    await expect(authorizeDownload(arun, company.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(
      (await snapshot(arun)).data.documents.some((d) => d.id === company.id),
    ).toBe(false);
    const changed = await PDFDocument.create();
    changed.addPage([100, 100]);
    await expect(
      uploadBytes(
        employer,
        file.uploadId,
        await changed.save(),
        "application/pdf",
      ),
    ).rejects.toBeDefined();
    await db.fileUpload.update({
      where: { id: file.uploadId },
      data: { createdAt: new Date(0) },
    });
    await cleanupTemporaryUploads();
    expect(
      await db.fileUpload.findUnique({ where: { id: file.uploadId } }),
    ).not.toBeNull();
  });
  it("rolls back profile and employer writes when a later employment write fails", async () => {
    const before = await snapshot(employer);
    const e = before.data.employments.find((e) => e.id === "202")!;
    const w = before.data.workers.find((w) => w.id === e.workerId)!;
    await db.$executeRawUnsafe(
      `CREATE FUNCTION reject_synthetic_job() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.job = 'FAIL-SYNTHETIC' THEN RAISE EXCEPTION 'synthetic write failure'; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      "CREATE TRIGGER synthetic_job_failure BEFORE UPDATE ON employment FOR EACH ROW EXECUTE FUNCTION reject_synthetic_job()",
    );
    const { id: workerId, version: workerVersion, ...profile } = w;
    const {
      id: employmentId,
      version: employmentVersion,
      employerId,
      workerId: ignored,
      ...employment
    } = e;
    const requestId = crypto.randomUUID();
    try {
      await expect(
        command(
          employer,
          "saveWorkerEmployment",
          {
            workerId,
            employmentId,
            expectedVersions: {
              worker: workerVersion,
              employment: employmentVersion,
            },
            profile: { ...profile, name: "SHOULD ROLLBACK" },
            employment: {
              ...employment,
              job: "FAIL-SYNTHETIC",
              companyName: "SHOULD ROLLBACK",
            },
          },
          requestId,
        ),
      ).rejects.toBeDefined();
      const after = await snapshot(employer);
      expect(after.data.workers).toEqual(before.data.workers);
      expect(after.data.employments).toEqual(before.data.employments);
      expect(await db.operationReceipt.count({ where: { requestId } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        "DROP TRIGGER synthetic_job_failure ON employment",
      );
      await db.$executeRawUnsafe("DROP FUNCTION reject_synthetic_job()");
    }
  });
});
describe("Integrated UC-01–UC-11 workflow", () => {
  it("records external evidence, handles corrections/additional documents and preserves gates under retries and races", async () => {
    const maya = (await login("maya")).principal;
    const today = businessDate();
    const file = await upload(employer, "202");
    await prepareAndReview("2020", file.id);
    let current = await stage("2020");
    await command(employer, "recordSubmission", {
      documentSetId: current.id,
      expectedVersion: current.version,
      expectedApplicationVersion: current.application.version,
      authority: "หน่วยงานสมมติ",
      receiptNo: "",
      submittedAt: "",
      acceptedEvidenceDocumentIds: [],
    });
    expect((await stage("2020")).application.submissionStatus).toBe(
      "AWAITING_SUBMISSION_CONFIRMATION",
    );
    await accept("2020", file.id);
    current = await stage("2020");
    await command(employer, "recordDecision", {
      applicationId: current.application.id,
      expectedVersion: current.application.version,
      decision: "ADDITIONAL_DOCUMENTS",
      decidedAt: today,
      reason: "หลักฐานเพิ่ม",
      requestedItems: "ไฟล์เพิ่มเติม",
      evidenceDocumentIds: [file.id],
    });
    current = await stage("2020");
    await command(employer, "addRequestedDocuments", {
      applicationId: current.application.id,
      expectedVersion: current.application.version,
      documentSetExpectedVersion: current.version,
      requestedItemIds: current.items
        .filter((i) => i.requirementKey.startsWith("additional-"))
        .map((i) => i.requirementKey),
      documentIds: [file.id],
    });
    await prepareAndReview("2020", file.id);
    await accept("2020", file.id);
    await approve("2020", file.id);
    await issue("2020", file.id);
    await prepareAndReview("2021", file.id);
    await accept("2021", file.id);
    await approve("2021", file.id);
    current = await stage("2021");
    const attachment = {
      applicationId: current.application.id,
      expectedVersion: current.application.version,
      sourceDocumentId: file.id,
      fileName: "synthetic-proof.pdf",
      documentNo: "SYNTHETIC-VISA",
      issuer: "หน่วยงานสมมติ",
      issuedAt: today,
      validFrom: today,
      expiresAt: "2027-12-31",
    };
    const outcomes = await Promise.allSettled([
      command(employer, "attachIssuedDocument", attachment),
      command(employer, "attachIssuedDocument", attachment),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(
      await db.applicationIssuedDocument.count({
        where: { applicationId: BigInt(current.application.id) },
      }),
    ).toBe(1);
    const visa = (await stage("2021")).application.issuedDocumentId!;
    const receiptRequest = crypto.randomUUID();
    const receiptInput = {
      documentId: visa,
      receivedAt: today,
      channel: "DIGITAL",
      confirmation: true,
    };
    await command(maya, "confirmReceipt", receiptInput, receiptRequest);
    await command(maya, "confirmReceipt", receiptInput, receiptRequest);
    await command(maya, "confirmReceipt", receiptInput);
    expect(
      await db.documentReceipt.count({ where: { documentId: BigInt(visa) } }),
    ).toBe(1);
    const draft = await command(maya, "saveTravelPlan", {
      visaDocumentId: visa,
      mode: "DRAFT",
    });
    let entry = (await snapshot(maya)).data.entries.find(
      (e) => e.id === draft.data.id,
    )!;
    expect(entry.planStatus).toBe("DRAFT");
    await db.capabilityGrant.createMany({
      data: ["entry:record-evidence", "medical:record-evidence"].map(
        (capability) => ({
          actorId: BigInt(maya.actor.accountId),
          employmentId: 202n,
          capability,
        }),
      ),
    });
    await expect(
      command(maya, "recordEntryResult", {
        entryId: entry.id,
        expectedVersion: entry.version,
        result: "PENDING_VERIFICATION",
        actualArrivalAt: "",
        permittedUntil: "",
        reason: "",
        evidenceDocumentIds: [],
      }),
    ).rejects.toBeDefined();
    await command(maya, "saveTravelPlan", {
      visaDocumentId: visa,
      entryId: entry.id,
      expectedVersion: entry.version,
      mode: "CONFIRM",
      plannedArrivalAt: today,
      travelMode: "AIR",
      flightNo: "SYN-001",
      port: "ท่าอากาศยานสมมติ",
      travelEvidenceDocumentIds: [file.id],
    });
    entry = (await snapshot(maya)).data.entries.find((e) => e.id === entry.id)!;
    await command(maya, "recordEntryResult", {
      entryId: entry.id,
      expectedVersion: entry.version,
      result: "ALLOWED",
      actualArrivalAt: today,
      permittedUntil: "2027-10-17",
      reason: "ตามหลักฐานสมมติ",
      evidenceDocumentIds: [file.id],
    });
    const visit = await command(maya, "saveHealthVisit", {
      entryId: entry.id,
      hospitalName: "โรงพยาบาลสมมติ",
      examDate: today,
    });
    let health = (await snapshot(maya)).data.healthChecks.find(
      (h) => h.id === visit.data.id,
    )!;
    await command(maya, "recordHealthResult", {
      healthCheckId: health.id,
      expectedVersion: health.version,
      result: "COMPLETE",
      pendingItems: "",
      evidenceDocumentIds: [file.id],
    });
    health = (await snapshot(maya)).data.healthChecks.find(
      (h) => h.id === health.id,
    )!;
    await expect(
      command(maya, "saveHealthVisit", {
        healthCheckId: health.id,
        entryId: entry.id,
        expectedVersion: health.version,
        hospitalName: "CHANGED",
        examDate: today,
      }),
    ).rejects.toBeDefined();
    await command(maya, "confirmMedicalCertificate", {
      healthCheckId: health.id,
      expectedVersion: health.version,
      doctorName: "แพทย์สมมติ",
      issuedAt: today,
      certificateNo: "SYN-MEDICAL",
      sourceDocumentId: file.id,
      fileName: "synthetic-proof.pdf",
    });
    await prepareAndReview("2022", file.id);
    await accept("2022", file.id);
    await approve("2022", file.id);
    const permit = await issue("2022", file.id);
    await command(maya, "confirmReceipt", {
      documentId: permit.data.id,
      receivedAt: today,
      channel: "DIGITAL",
      confirmation: true,
    });
    const correction = await command(maya, "reportCorrection", {
      targetType: "VISA",
      targetId: visa,
      reason: "ตรวจข้อมูลบันทึกสมมติ",
      evidenceDocumentIds: [file.id],
    });
    const row = (await snapshot(employer)).data.corrections.find(
      (c) => c.id === correction.data.id,
    )!;
    await command(employer, "resolveCorrection", {
      correctionId: row.id,
      expectedVersion: row.version,
      resolution: "ตรวจแล้ว บันทึกคำตอบโดยไม่แก้ต้นฉบับ",
    });
    const answer = await executeQuery(maya, {
      query: "getCorrection",
      input: { correctionId: row.id },
    });
    expect(answer).toMatchObject({
      status: "RESOLVED",
      resolvedByAccountId: employer.actor.accountId,
    });
    expect((await stage("2020")).application.history.length).toBeGreaterThan(3);
  });
});

describe("Boundary and persistence regressions", () => {
  it("creates a worker atomically and replays the committed reference", async () => {
    const state = (await snapshot(employer)).data;
    const template = state.employments.find((e) => e.id === "202")!;
    const worker = state.workers.find((w) => w.id === template.workerId)!;
    const { id: workerId, version, ...profile } = worker;
    const {
      id,
      workerId: oldWorker,
      employerId,
      version: oldVersion,
      ...employment
    } = template;
    const requestId = crypto.randomUUID();
    const input = {
      profile: {
        ...profile,
        name: "NEW SYNTHETIC WORKER",
        passportNo: "SYNTHETIC-NEW",
      },
      employment,
    };
    const first = await command(
      employer,
      "saveWorkerEmployment",
      input,
      requestId,
    );
    expect(
      (await command(employer, "saveWorkerEmployment", input, requestId)).data
        .id,
    ).toBe(first.data.id);
    await expect(
      command(
        employer,
        "saveWorkerEmployment",
        { ...input, profile: { ...input.profile, name: "DIFFERENT PAYLOAD" } },
        requestId,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(
      await db.worker.count({ where: { passportNo: "SYNTHETIC-NEW" } }),
    ).toBe(1);
    const result = await executeQuery(employer, {
      query: "listWorkers",
      input: { q: "NEW SYNTHETIC", sort: "updatedAt", pageSize: 1 },
    });
    expect(result).toMatchObject({ total: 1, pageSize: 1 });
    await expect(
      executeQuery(employer, {
        query: "getWorkerEmployment",
        input: { workerId: "101", employmentId: "202" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("does not issue a document when its stored evidence is unavailable", async () => {
    const file = await upload(employer, "201");
    await approve("2011", file.id);
    const stored = await db.fileUpload.findUniqueOrThrow({
      where: { id: file.uploadId },
    });
    await deleteFile(stored.objectKey);
    await expect(issue("2011", file.id)).rejects.toMatchObject({
      code: "FILE_UNAVAILABLE",
    });
    expect((await stage("2011")).application.issuedDocumentId).toBeNull();
  });
});

describe("Current ownership and shared profiles", () => {
  it("rechecks company-upload rights after an account role changes", async () => {
    const signed = await login("employer");
    const company = await upload(signed.principal, "201", "EMPLOYER");
    const id = BigInt(signed.principal.actor.accountId);
    await db.actorAccount.update({
      where: { id },
      data: { role: "WORKER", employerId: null, workerId: 101n },
    });
    try {
      const current = await resolvePrincipal(signed.headers);
      await expect(
        completeUpload(current, company.uploadId, {
          requestId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await db.actorAccount.update({
        where: { id },
        data: { role: "EMPLOYER", workerId: null, employerId: 1n },
      });
    }
  });
  it("invalidates live reviews of other employments sharing the edited Worker", async () => {
    await db.documentSet.update({
      where: { id: 2040n },
      data: { readinessStatus: "READY" },
    });
    const state = (await snapshot(employer)).data;
    const w = state.workers.find((w) => w.id === "101")!;
    const e = state.employments.find((e) => e.id === "201")!;
    const { id: wid, version: wv, ...profile } = w;
    const { id: eid, version: ev, workerId, employerId, ...employment } = e;
    await command(employer, "saveWorkerEmployment", {
      workerId: w.id,
      employmentId: e.id,
      expectedVersions: { worker: wv, employment: ev },
      profile: { ...profile, name: "ARUN SHARED PROFILE" },
      employment,
    });
    expect(
      (await db.documentSet.findUniqueOrThrow({ where: { id: 2040n } }))
        .readinessStatus,
    ).toBe("AWAITING_REVIEW");
    await expect(
      executeQuery(employer, {
        query: "getPreparationContext",
        input: { employmentId: "201", type: "VISA", documentSetId: "2040" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
