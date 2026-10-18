import { describe, expect, it } from "vitest";
import { createDemoData } from "./fixtures";
import { demoDataSchema, type Actor, type Stage } from "./model";
import { runOperation } from "./operations";

const employer: Actor = { role: "EMPLOYER", accountId: "11", employerId: "1" };
function fixture() {
  const data = createDemoData();
  const stage = data.stages.find((s) => s.id === "2011");
  if (!stage) throw new Error("Missing Visa fixture");
  stage.application.decisionStatus = "NOT_DECIDED";
  stage.application.submissionStatus = "NOT_SUBMITTED";
  return { data, stage };
}
function preparation(stage: Stage) {
  return {
    requestId: "save",
    documentSetId: stage.id,
    expectedVersion: stage.version,
    country: stage.country,
    authority: stage.authority,
    caseKey: stage.caseKey,
    visaType: stage.visaType,
    workHistory: stage.workHistory,
    taxEvidenceRequired: stage.taxEvidenceRequired,
    items: stage.items.map(({ requirementKey, documentId }) => ({
      requirementKey,
      documentId,
    })),
  };
}
function review(stage: Stage) {
  return {
    requestId: "review",
    documentSetId: stage.id,
    expectedVersion: stage.version,
    checklistVersion: "DEMO-1",
  };
}
describe("UC05 Visa case checklist", () => {
  it.each(["visaType", "workHistory", "taxEvidenceRequired"] as const)(
    "blocks review with unresolved %s",
    (field) => {
      const { data, stage } = fixture();
      stage.workHistory = true;
      stage.taxEvidenceRequired = false;
      if (field === "visaType") stage.visaType = "";
      else stage[field] = null;
      const out = runOperation(
        data,
        employer,
        "reviewDocumentSet",
        review(stage),
      );
      expect(out.result.ok).toBe(false);
      expect(out.state).toBe(data);
    },
  );

  it.each([true, false])(
    "adds historical documents for applicable tax=%s",
    (taxEvidenceRequired) => {
      const { data, stage } = fixture();
      const saved = runOperation(data, employer, "savePreparation", {
        ...preparation(stage),
        workHistory: true,
        taxEvidenceRequired,
      });
      expect(saved.result.ok).toBe(true);
      const next = saved.state.stages.find((s) => s.id === stage.id);
      if (!next) throw new Error("Missing saved Visa");
      expect(next.readinessStatus).toBe("NOT_READY");
      expect(
        next.items.some((i) => i.requirementKey === "previousWorkPermit"),
      ).toBe(true);
      expect(next.items.some((i) => i.requirementKey === "taxReturn91")).toBe(
        taxEvidenceRequired,
      );
      expect(
        runOperation(saved.state, employer, "reviewDocumentSet", review(next))
          .result.ok,
      ).toBe(false);
      const linked = runOperation(saved.state, employer, "savePreparation", {
        ...preparation(next),
        requestId: "link",
        items: next.items.map((i) => ({
          requirementKey: i.requirementKey,
          documentId: i.documentId ?? stage.items[0].documentId,
        })),
      });
      const complete = linked.state.stages.find((s) => s.id === stage.id);
      if (!complete) throw new Error("Missing linked Visa");
      expect(
        runOperation(
          linked.state,
          employer,
          "reviewDocumentSet",
          review(complete),
        ).result.ok,
      ).toBe(true);
      const changed = runOperation(linked.state, employer, "savePreparation", {
        ...preparation(complete),
        requestId: "no-history",
        workHistory: false,
      });
      expect(changed.state.stages.find((s) => s.id === stage.id)).toMatchObject(
        {
          workHistory: false,
          taxEvidenceRequired: null,
          readinessStatus: "AWAITING_REVIEW",
        },
      );
      expect(
        changed.state.stages.find((s) => s.id === stage.id)?.items,
      ).toHaveLength(3);
      expect(changed.state.documents).toEqual(linked.state.documents);
    },
  );

  it("preserves legacy browser data but blocks its incomplete Visa review at submission", () => {
    const { data, stage } = fixture();
    const legacy = JSON.parse(JSON.stringify(data));
    for (const s of legacy.stages) {
      delete s.visaType;
      delete s.workHistory;
      delete s.taxEvidenceRequired;
    }
    const restored = demoDataSchema.parse(legacy);
    expect(restored.documents).toEqual(data.documents);
    const out = runOperation(restored, employer, "recordSubmission", {
      requestId: "legacy-submit",
      documentSetId: stage.id,
      expectedVersion: stage.version,
      expectedApplicationVersion: stage.application.version,
      authority: "สถานทูตสมมติ",
      receiptNo: "",
      submittedAt: "",
      acceptedEvidenceDocumentIds: [],
    });
    expect(out.result.ok).toBe(false);
    expect(out.state).toBe(restored);
  });
});
