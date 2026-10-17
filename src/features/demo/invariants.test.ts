import { describe, expect, it } from "vitest";
import { createDemoData } from "./fixtures";
import { preparationBlocker, runOperation } from "./operations";
import type { Actor } from "./model";
import { businessDate } from "../../lib/date";

const employer: Actor = { role: "EMPLOYER", accountId: "11", employerId: "1" };
const arun: Actor = { role: "WORKER", accountId: "21", workerId: "101" };
describe("fixture and version invariants", () => {
  it("blocks a before-entry case after recorded allowed entry", () => {
    const data = createDemoData("medical");
    expect(preparationBlocker(data, "201", "PRE_ARRIVAL")).toBeTruthy();
    expect(
      preparationBlocker(data, "201", "WORK_PERMIT", "BEFORE_ENTRY"),
    ).toBeTruthy();
  });
  it.each(["initial", "visa-ready", "medical", "permit-ready"] as const)(
    "issued work permits have entry and medical evidence in %s",
    (scenario) => {
      const data = createDemoData(scenario);
      for (const s of data.stages.filter(
        (s) => s.type === "WORK_PERMIT" && s.application.issuedDocumentId,
      ))
        expect(
          preparationBlocker(data, s.employmentId, s.type, s.caseKey),
        ).toBeNull();
    },
  );
  it("stale document-set writes cannot overwrite a new review", () => {
    const data = createDemoData();
    const s = data.stages.find(
      (s) => s.employmentId === "201" && s.type === "VISA",
    );
    if (!s) throw new Error("Missing fixture");
    const input = {
      requestId: "review-1",
      documentSetId: s.id,
      expectedVersion: s.version,
      checklistVersion: "DEMO-1",
    };
    const first = runOperation(data, employer, "reviewDocumentSet", input);
    const stale = runOperation(first.state, employer, "reviewDocumentSet", {
      ...input,
      requestId: "review-2",
    });
    expect(stale.result).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    expect(stale.state).toBe(first.state);
  });
  it("an issued Visa cannot be used before its validity start", () => {
    const data = createDemoData("visa-ready");
    const doc = data.documents.find(
      (d) => d.employmentId === "201" && d.type === "VISA",
    );
    if (!doc) throw new Error("Missing fixture");
    doc.receivedAt = "2026-10-17";
    doc.validFrom = "2026-11-01";
    const result = runOperation(data, arun, "saveTravelPlan", {
      requestId: "early-travel",
      visaDocumentId: doc.id,
      mode: "CONFIRM",
      plannedArrivalAt: "2026-10-18",
      travelMode: "AIR",
      port: "ท่าอากาศยานตัวอย่าง",
      flightNo: "DEMO-1",
      travelEvidenceDocumentIds: [doc.id],
    });
    expect(result.result.ok).toBe(false);
  });
  it("uses the Bangkok calendar date at the UTC day boundary", () => {
    expect(businessDate(new Date("2026-10-17T18:00:00Z"))).toBe("2026-10-18");
  });
});
