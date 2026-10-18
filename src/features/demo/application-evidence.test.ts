import { describe, expect, it } from "vitest";
import { createDemoData } from "./fixtures";
import { runOperation } from "./operations";
import { demoDataSchema, type Actor } from "./model";

const employer: Actor = { role: "EMPLOYER", accountId: "11", employerId: "1" };
describe("application evidence history", () => {
  it.each([false, true])(
    "preserves receipt evidence when PENDING has new evidence=%s",
    (withEvidence) => {
      const data = createDemoData();
      const stage = data.stages.find((s) => s.id === "2011");
      if (!stage) throw new Error("Missing fixture");
      stage.application.decisionStatus = "NOT_DECIDED";
      stage.application.evidenceDocumentIds = [];
      const ids = stage.items.flatMap((i) =>
        i.documentId ? [i.documentId] : [],
      );
      const submitted = runOperation(data, employer, "recordSubmission", {
        requestId: "submit",
        documentSetId: stage.id,
        expectedVersion: stage.version,
        expectedApplicationVersion: stage.application.version,
        authority: "หน่วยงานสมมติ",
        receiptNo: "DEMO-RECEIPT",
        submittedAt: "2026-10-18",
        acceptedEvidenceDocumentIds: [ids[0]],
      });
      expect(submitted.result.ok).toBe(true);
      const pending = runOperation(
        submitted.state,
        employer,
        "recordDecision",
        {
          requestId: "pending",
          applicationId: stage.application.id,
          expectedVersion: stage.application.version + 1,
          decision: "PENDING",
          decidedAt: "",
          evidenceDocumentIds: withEvidence ? [ids[1]] : [],
          reason: "ติดตามผล",
          requestedItems: "",
        },
      );
      expect(pending.result.ok).toBe(true);
      const application = pending.state.stages.find(
        (s) => s.id === stage.id,
      )?.application;
      if (!application) throw new Error("Missing application");
      expect(application.evidenceDocumentIds).toEqual(
        withEvidence ? [ids[0], ids[1]] : [ids[0]],
      );
      expect(application.history).toMatchObject([
        {
          eventType: "SUBMISSION",
          evidenceDocumentIds: [ids[0]],
          authority: "หน่วยงานสมมติ",
          receiptNo: "DEMO-RECEIPT",
          eventDate: "2026-10-18",
        },
        {
          eventType: "DECISION",
          evidenceDocumentIds: withEvidence ? [ids[1]] : [],
        },
      ]);
      const approved = runOperation(pending.state, employer, "recordDecision", {
        requestId: "approve",
        applicationId: application.id,
        expectedVersion: application.version,
        decision: "APPROVED",
        decidedAt: "2026-10-18",
        evidenceDocumentIds: [ids[2]],
        reason: "ตามหลักฐาน",
        requestedItems: "",
      });
      expect(approved.result.ok).toBe(true);
      const after = approved.state.stages.find(
        (s) => s.id === stage.id,
      )?.application;
      expect(after?.history.slice(0, 2)).toEqual(application.history);
      expect(after?.history[2]).toMatchObject({
        eventType: "DECISION",
        evidenceDocumentIds: [ids[2]],
      });
      expect(after?.evidenceDocumentIds).toContain(ids[0]);
      expect(demoDataSchema.safeParse(approved.state).success).toBe(true);
      expect(
        submitted.state.stages.find((s) => s.id === stage.id)?.application
          .history,
      ).toHaveLength(1);
    },
  );
});
