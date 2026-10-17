import type { CaseKind, Stage } from "./model";
export function emptyStage(
  id: string,
  employmentId: string,
  type: CaseKind,
): Stage {
  return {
    id,
    employmentId,
    type,
    caseKey: type === "WORK_PERMIT" ? "AFTER_ENTRY" : "BEFORE_ENTRY",
    country: "อินเดีย",
    authority: "หน่วยงานตัวอย่าง",
    version: 1,
    readinessStatus: "NOT_READY",
    checklistVersion: "DEMO-1",
    items: [
      {
        requirementKey: "passport",
        label: "หนังสือเดินทาง",
        required: true,
        documentId: null,
      },
      {
        requirementKey: "employment",
        label: "สัญญาจ้าง / หนังสือรับเข้าทำงาน",
        required: true,
        documentId: null,
      },
      {
        requirementKey: "company",
        label: "เอกสารบริษัท / หนังสือมอบอำนาจตามกรณี",
        required: true,
        documentId: null,
      },
    ],
    application: {
      id: (BigInt(id) + 1000n).toString(),
      version: 1,
      submissionStatus: "NOT_SUBMITTED",
      decisionStatus: "NOT_DECIDED",
      authority: "",
      receiptNo: "",
      submittedAt: "",
      decidedAt: "",
      reason: "",
      requestedItems: "",
      evidenceDocumentIds: [],
      issuedDocumentId: null,
      history: [],
    },
  };
}
