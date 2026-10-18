import { describe, expect, it } from "vitest";
import { createDemoData } from "./fixtures";
import { employmentFieldsSchema, profileSchema, type Actor } from "./model";
import { runOperation } from "./operations";

const employer: Actor = { role: "EMPLOYER", accountId: "11", employerId: "1" };

describe("shared Worker review dependencies", () => {
  function fixture() {
    const data = createDemoData();
    const worker = data.workers.find((w) => w.id === "101");
    const employment = data.employments.find((e) => e.id === "201");
    const otherDraft = data.stages.find((s) => s.id === "2040");
    if (!worker || !employment || !otherDraft)
      throw new Error("Missing fixture");
    otherDraft.readinessStatus = "READY";
    return {
      data,
      otherDraft,
      input: {
        requestId: "edit-worker",
        workerId: worker.id,
        employmentId: employment.id,
        expectedVersions: {
          worker: worker.version,
          employment: employment.version,
        },
        profile: profileSchema.strip().parse(worker),
        employment: employmentFieldsSchema.strip().parse(employment),
      },
    };
  }

  it("invalidates reviews across employments after a shared passport change", () => {
    const { data, input, otherDraft } = fixture();
    const out = runOperation(data, employer, "saveWorkerEmployment", {
      ...input,
      profile: { ...input.profile, passportNo: "DEMO-NEW-PASSPORT" },
    });
    expect(out.result.ok).toBe(true);
    expect(out.state.stages.find((s) => s.id === otherDraft.id)).toMatchObject({
      readinessStatus: "AWAITING_REVIEW",
      version: otherDraft.version + 1,
    });
    const submit = runOperation(out.state, employer, "recordSubmission", {
      requestId: "submit-old-review",
      documentSetId: otherDraft.id,
      expectedVersion: otherDraft.version + 1,
      expectedApplicationVersion: otherDraft.application.version,
      authority: "หน่วยงานสมมติ",
      receiptNo: "",
      submittedAt: "",
      acceptedEvidenceDocumentIds: [],
    });
    expect(submit.result.ok).toBe(false);
    expect(submit.state).toBe(out.state);
    for (const original of data.stages.filter(
      (s) =>
        s.employmentId === "203" ||
        s.application.decisionStatus === "APPROVED" ||
        s.application.decisionStatus === "PENDING",
    ))
      expect(out.state.stages.find((s) => s.id === original.id)).toEqual(
        original,
      );
  });

  it("keeps other employment reviews when only this employment changes", () => {
    const { data, input, otherDraft } = fixture();
    const out = runOperation(data, employer, "saveWorkerEmployment", {
      ...input,
      employment: { ...input.employment, job: "ตำแหน่งสมมติใหม่" },
    });
    expect(out.result.ok).toBe(true);
    expect(out.state.stages.find((s) => s.id === otherDraft.id)).toEqual(
      otherDraft,
    );
    expect(out.state.stages.find((s) => s.id === "2012")?.readinessStatus).toBe(
      "AWAITING_REVIEW",
    );
  });
});
