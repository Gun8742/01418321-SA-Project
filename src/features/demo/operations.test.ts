import { describe, expect, it } from "vitest";
import { createDemoData } from "./fixtures";
import { demoDataSchema, type Actor, type DemoData, type Stage } from "./model";
import {
  preparationBlocker,
  runOperation,
  scopedEmployment,
} from "./operations";

const employer: Actor = { role: "EMPLOYER", accountId: "11", employerId: "1" };
const arun: Actor = { role: "WORKER", accountId: "21", workerId: "101" };
function stage(data: DemoData, type: string): Stage {
  const result = data.stages.find(
    (s) => s.employmentId === "201" && s.type === type,
  );
  if (!result) throw new Error("fixture missing");
  return result;
}
function evidenceIds(data: DemoData) {
  return data.documents
    .filter((d) => d.employmentId === "201")
    .slice(0, 1)
    .map((d) => d.id);
}
function visa(data: DemoData) {
  const result = data.documents.find(
    (d) => d.id === stage(data, "VISA").application.issuedDocumentId,
  );
  if (!result) throw new Error("fixture missing");
  return result;
}
function travelInput(data: DemoData) {
  return {
    requestId: "travel",
    visaDocumentId: visa(data).id,
    mode: "CONFIRM",
    plannedArrivalAt: "2026-10-18",
    travelMode: "AIR",
    port: "ท่าอากาศยานตัวอย่าง",
    flightNo: "DEMO-001",
    travelEvidenceDocumentIds: evidenceIds(data),
  };
}
describe("synthetic fixtures", () => {
  it.each(["initial", "visa-ready", "medical", "permit-ready"] as const)(
    "validates %s",
    (scenario) =>
      expect(demoDataSchema.safeParse(createDemoData(scenario)).success).toBe(
        true,
      ),
  );
});
describe("scope and workflow gates", () => {
  it("rejects a worker/employment mismatch instead of picking latest", () => {
    expect(() =>
      scopedEmployment(createDemoData(), employer, "202", "101"),
    ).toThrow();
  });
  it("does not expose another worker's employment", () => {
    expect(() => scopedEmployment(createDemoData(), arun, "203")).toThrow();
  });
  it("does not require entry/medical for a BEFORE_ENTRY work permit", () => {
    const data = createDemoData();
    expect(
      preparationBlocker(data, "201", "WORK_PERMIT", "BEFORE_ENTRY"),
    ).toBeNull();
    expect(
      preparationBlocker(data, "201", "WORK_PERMIT", "AFTER_ENTRY"),
    ).toBeTruthy();
  });
  it("missing checklist cannot be reviewed", () => {
    const data = createDemoData();
    const s = data.stages.find(
      (s) => s.employmentId === "202" && s.type === "VISA",
    );
    if (!s) throw new Error("fixture missing");
    const out = runOperation(data, employer, "reviewDocumentSet", {
      requestId: "review",
      documentSetId: s.id,
      expectedVersion: s.version,
      checklistVersion: "DEMO-1",
    });
    expect(out.result.ok).toBe(false);
    expect(out.state).toBe(data);
  });
  it("records awaiting submission without accepted evidence", () => {
    const data = createDemoData();
    const s = stage(data, "VISA");
    s.application.decisionStatus = "NOT_DECIDED";
    s.application.submissionStatus = "NOT_SUBMITTED";
    const out = runOperation(data, employer, "recordSubmission", {
      requestId: "submit",
      documentSetId: s.id,
      expectedVersion: s.version,
      expectedApplicationVersion: s.application.version,
      authority: "สถานทูตตัวอย่าง",
      receiptNo: "",
      submittedAt: "",
      acceptedEvidenceDocumentIds: [],
    });
    expect(out.result.ok).toBe(true);
    expect(stage(out.state, "VISA").application.submissionStatus).toBe(
      "AWAITING_SUBMISSION_CONFIRMATION",
    );
    expect(stage(out.state, "VISA").application.decisionStatus).toBe(
      "NOT_DECIDED",
    );
  });
  it("additional docs stays in the same application and requires fresh review", () => {
    const data = createDemoData();
    const s = stage(data, "VISA");
    const out = runOperation(data, employer, "recordDecision", {
      requestId: "decision",
      applicationId: s.application.id,
      expectedVersion: 1,
      decision: "ADDITIONAL_DOCUMENTS",
      reason: "หนังสือรับรอง",
      requestedItems: "หนังสือรับรองใหม่",
      decidedAt: "2026-10-18",
      evidenceDocumentIds: evidenceIds(data),
    });
    expect(out.result.ok).toBe(true);
    expect(stage(out.state, "VISA").application.id).toBe(s.application.id);
    expect(stage(out.state, "VISA").readinessStatus).toBe("AWAITING_REVIEW");
  });
  it("failed writes preserve original state", () => {
    const data = createDemoData("visa-ready");
    const out = runOperation(
      data,
      arun,
      "confirmReceipt",
      {
        requestId: "receipt",
        documentId: visa(data).id,
        receivedAt: "2026-10-17",
        channel: "ไฟล์ตัวอย่าง",
        confirmation: true,
      },
      { fail: true, grants: false },
    );
    expect(out.state).toBe(data);
    expect(visa(out.state).receivedAt).toBeNull();
    expect(out.result).toMatchObject({
      ok: false,
      error: { code: "SAVE_FAILED" },
    });
  });
  it("receipt retry is idempotent and a conflicting request cannot overwrite it", () => {
    const data = createDemoData("visa-ready");
    const input = {
      requestId: "receipt",
      documentId: visa(data).id,
      receivedAt: "2026-10-17",
      channel: "ไฟล์ตัวอย่าง",
      confirmation: true,
    };
    const first = runOperation(data, arun, "confirmReceipt", input);
    const replay = runOperation(first.state, arun, "confirmReceipt", input);
    expect(replay.result).toEqual(first.result);
    expect(replay.state).toBe(first.state);
    const conflict = runOperation(first.state, arun, "confirmReceipt", {
      ...input,
      requestId: "different",
      channel: "อื่น",
    });
    expect(conflict.result).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
  });
  it("plan confirmation does not grant entry; draft cannot record an entry result", () => {
    const data = createDemoData("visa-ready");
    visa(data).receivedAt = "2026-10-17";
    const plan = runOperation(data, arun, "saveTravelPlan", {
      ...travelInput(data),
      mode: "DRAFT",
      flightNo: "",
    });
    expect(plan.result.ok).toBe(true);
    const entry = plan.state.entries.find((e) => e.employmentId === "201");
    if (!entry) throw new Error("Missing Arun entry fixture");
    const result = runOperation(
      plan.state,
      arun,
      "recordEntryResult",
      {
        requestId: "entry",
        entryId: entry.id,
        expectedVersion: entry.version,
        result: "ALLOWED",
        actualArrivalAt: "2026-10-18",
        permittedUntil: "2027-01-01",
        reason: "ตามหลักฐาน",
        evidenceDocumentIds: evidenceIds(data),
      },
      { fail: false, grants: true },
    );
    expect(result.result.ok).toBe(false);
    expect(entry.entryResult).toBe("PLANNED");
  });
  it("AIR confirmation needs a flight number", () => {
    const data = createDemoData("visa-ready");
    visa(data).receivedAt = "2026-10-17";
    expect(
      runOperation(data, arun, "saveTravelPlan", {
        ...travelInput(data),
        flightNo: "",
      }).result.ok,
    ).toBe(false);
  });
  it("entry result requires an explicit scoped simulated capability", () => {
    const data = createDemoData("visa-ready");
    visa(data).receivedAt = "2026-10-17";
    const plan = runOperation(data, arun, "saveTravelPlan", travelInput(data));
    const entry = plan.state.entries.find((e) => e.employmentId === "201");
    if (!entry) throw new Error("Missing Arun entry fixture");
    const out = runOperation(plan.state, arun, "recordEntryResult", {
      requestId: "entry",
      entryId: entry.id,
      expectedVersion: 1,
      result: "ALLOWED",
      actualArrivalAt: "2026-10-18",
      permittedUntil: "",
      reason: "หลักฐาน",
      evidenceDocumentIds: evidenceIds(data),
    });
    expect(out.result).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
  it("DENIED entry does not open a medical visit", () => {
    const data = createDemoData("medical");
    const entry = data.entries.find((e) => e.id === "501");
    if (!entry) throw new Error("Missing Arun entry fixture");
    entry.entryResult = "DENIED";
    const out = runOperation(data, arun, "saveHealthVisit", {
      requestId: "health",
      entryId: "501",
      hospitalName: "โรงพยาบาลตัวอย่าง",
      examDate: "2026-10-18",
    });
    expect(out.result.ok).toBe(false);
  });
  it("additional tests lock the visit instead of resetting the medical result", () => {
    const data = createDemoData("medical");
    const visit = runOperation(data, arun, "saveHealthVisit", {
      requestId: "visit",
      entryId: "501",
      hospitalName: "โรงพยาบาลตัวอย่าง",
      examDate: "2026-10-18",
    });
    const h = visit.state.healthChecks.find((h) => h.entryId === "501");
    if (!h) throw new Error("Missing Arun health fixture");
    h.resultStatus = "ADDITIONAL_TESTS";
    const out = runOperation(visit.state, arun, "saveHealthVisit", {
      requestId: "change",
      entryId: "501",
      healthCheckId: h.id,
      expectedVersion: h.version,
      hospitalName: "อื่น",
      examDate: "2026-10-19",
    });
    expect(out.result.ok).toBe(false);
    expect(out.result).toMatchObject({
      ok: false,
      error: { code: "PRECONDITION_FAILED" },
    });
    expect(
      out.state.healthChecks.find((item) => item.id === h.id)?.resultStatus,
    ).toBe("ADDITIONAL_TESTS");
  });
  it("unknown Correction aliases are rejected", () => {
    const data = createDemoData("visa-ready");
    const out = runOperation(data, arun, "reportCorrection", {
      requestId: "c",
      resourceType: "VISA",
      resourceId: visa(data).id,
      reason: "ไม่ตรง",
      evidenceDocumentIds: [],
    });
    expect(out.result).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });
  it("worker reports and employer resolves once with a visible response", () => {
    const data = createDemoData("visa-ready");
    const report = runOperation(data, arun, "reportCorrection", {
      requestId: "c",
      targetType: "VISA",
      targetId: visa(data).id,
      reason: "ชื่อไม่ตรง",
      evidenceDocumentIds: [],
    });
    const c = report.state.corrections[0];
    expect(c.employmentId).toBe("201");
    const resolve = runOperation(report.state, employer, "resolveCorrection", {
      requestId: "r",
      correctionId: c.id,
      resolution: "ตรวจตามหลักฐานแล้ว",
      expectedVersion: 1,
    });
    expect(resolve.state.corrections[0]).toMatchObject({
      status: "RESOLVED",
      resolution: "ตรวจตามหลักฐานแล้ว",
      resolvedByAccountId: "11",
    });
    const stale = runOperation(resolve.state, employer, "resolveCorrection", {
      requestId: "r2",
      correctionId: c.id,
      resolution: "เปลี่ยน",
      expectedVersion: 1,
    });
    expect(stale.result).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
  });
});
