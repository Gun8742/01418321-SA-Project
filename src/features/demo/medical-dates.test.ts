import { describe, expect, it } from "vitest";
import { createDemoData } from "./fixtures";
import { preparationBlocker, runOperation } from "./operations";
import type { Actor } from "./model";

const arun: Actor = { role: "WORKER", accountId: "21", workerId: "101" };
function visitInput(examDate: string) {
  return {
    requestId: "visit",
    entryId: "501",
    hospitalName: "โรงพยาบาลสมมติ",
    examDate,
  };
}

describe("medical chronology", () => {
  it("rejects an exam before arrival without changing state", () => {
    const data = createDemoData("medical");
    const out = runOperation(
      data,
      arun,
      "saveHealthVisit",
      visitInput("2026-10-17"),
    );
    expect(out.result).toMatchObject({
      ok: false,
      error: { message: "วันที่ตรวจต้องไม่ก่อนวันที่เข้าประเทศตามหลักฐาน" },
    });
    expect(out.state).toBe(data);
  });

  it("checks chronology when editing an existing visit too", () => {
    const first = runOperation(
      createDemoData("medical"),
      arun,
      "saveHealthVisit",
      visitInput("2026-10-18"),
    );
    expect(first.result.ok).toBe(true);
    const health = first.state.healthChecks.find((h) => h.entryId === "501");
    if (!health) throw new Error("Missing visit");
    const out = runOperation(first.state, arun, "saveHealthVisit", {
      ...visitInput("2026-10-17"),
      requestId: "edit",
      healthCheckId: health.id,
      expectedVersion: health.version,
    });
    expect(out.result.ok).toBe(false);
    expect(out.state).toBe(first.state);
  });

  it.each(["2026-10-17", "2026-10-18"])(
    "certificate issued %s must not predate the exam",
    (issuedAt) => {
      const first = runOperation(
        createDemoData("medical"),
        arun,
        "saveHealthVisit",
        visitInput("2026-10-18"),
      );
      const health = first.state.healthChecks.find((h) => h.entryId === "501");
      if (!health) throw new Error("Missing visit");
      health.resultStatus = "COMPLETE";
      const out = runOperation(
        first.state,
        arun,
        "confirmMedicalCertificate",
        {
          requestId: "certificate",
          healthCheckId: health.id,
          expectedVersion: health.version,
          doctorName: "แพทย์สมมติ",
          issuedAt,
          certificateNo: "DEMO-1",
          fileName: "demo.pdf",
        },
        { fail: false, grants: true },
      );
      expect(out.result.ok).toBe(issuedAt === health.examDate);
      if (issuedAt < health.examDate) {
        expect(out.state).toBe(first.state);
        expect(
          preparationBlocker(out.state, "201", "WORK_PERMIT", "AFTER_ENTRY"),
        ).toBeTruthy();
      } else
        expect(
          preparationBlocker(out.state, "201", "WORK_PERMIT", "AFTER_ENTRY"),
        ).toBeNull();
    },
  );

  it("does not open Work Permit for cached evidence with invalid dates", () => {
    const data = createDemoData("permit-ready");
    const health = data.healthChecks.find((h) => h.employmentId === "201");
    const certificate = data.documents.find(
      (d) => d.id === health?.certificateDocumentId,
    );
    if (!health || !certificate) throw new Error("Missing fixture");
    expect(
      preparationBlocker(data, "201", "WORK_PERMIT", "AFTER_ENTRY"),
    ).toBeNull();
    certificate.issuedAt = "2026-10-17";
    expect(
      preparationBlocker(data, "201", "WORK_PERMIT", "AFTER_ENTRY"),
    ).toBeTruthy();
    certificate.issuedAt = "2026-10-18";
    health.examDate = "2026-10-17";
    expect(
      preparationBlocker(data, "201", "WORK_PERMIT", "AFTER_ENTRY"),
    ).toBeTruthy();
  });
});
