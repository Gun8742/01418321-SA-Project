import { describe, expect, it } from "vitest";
import { createDemoData } from "./fixtures";
import { runOperation } from "./operations";
import type { Actor, Stage } from "./model";

const employer: Actor = { role: "EMPLOYER", accountId: "11", employerId: "1" };
function submission(stage: Stage) {
  return {
    requestId: "submit",
    documentSetId: stage.id,
    expectedVersion: stage.version,
    expectedApplicationVersion: stage.application.version,
    authority: "หน่วยงานตัวอย่าง",
    receiptNo: "DEMO-1",
    submittedAt: "2026-10-18",
    acceptedEvidenceDocumentIds: stage.items.flatMap((i) =>
      i.documentId ? [i.documentId] : [],
    ),
  };
}
describe("submission rechecks current source evidence", () => {
  it("blocks a reviewed pre-arrival draft after allowed entry", () => {
    const data = createDemoData("medical");
    const stage = data.stages.find((s) => s.id === "2010");
    if (!stage) throw new Error("Missing fixture");
    stage.application.decisionStatus = "NOT_DECIDED";
    stage.application.submissionStatus = "NOT_SUBMITTED";
    stage.readinessStatus = "READY";
    const out = runOperation(
      data,
      employer,
      "recordSubmission",
      submission(stage),
    );
    expect(out.result).toMatchObject({
      ok: false,
      error: { code: "PRECONDITION_FAILED" },
    });
    expect(out.state).toBe(data);
  });
  it.each(["2026-10-17", "2026-10-18"])(
    "rechecks certificate date %s for an old reviewed permit draft",
    (issuedAt) => {
      const data = createDemoData("permit-ready");
      const stage = data.stages.find((s) => s.id === "2012");
      const health = data.healthChecks.find((h) => h.employmentId === "201");
      const certificate = data.documents.find(
        (d) => d.id === health?.certificateDocumentId,
      );
      if (!stage || !certificate) throw new Error("Missing fixture");
      stage.application.decisionStatus = "NOT_DECIDED";
      stage.application.submissionStatus = "NOT_SUBMITTED";
      certificate.issuedAt = issuedAt;
      const out = runOperation(
        data,
        employer,
        "recordSubmission",
        submission(stage),
      );
      expect(out.result.ok).toBe(issuedAt === "2026-10-18");
      if (issuedAt === "2026-10-17") expect(out.state).toBe(data);
    },
  );
});
