import type { CaseKind, DemoData, Employment, Stage, Worker } from "./model";
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
      id: String(Number(id) + 1000),
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
function worker(
  id: string,
  name: string,
  nationality: string,
  passportNo: string,
): Worker {
  return {
    id,
    name,
    nationality,
    passportNo,
    birthDate: "1995-01-12",
    passportCountry: nationality,
    passportIssuedAt: "2024-01-01",
    passportExpiresAt: "2034-01-01",
    email: "demo@example.invalid",
    phone: "000-000-0000",
    address: "ที่อยู่ตัวอย่าง",
    version: 1,
  };
}
function employment(id: string, workerId: string, job: string): Employment {
  return {
    id,
    workerId,
    employerId: "1",
    job,
    jobDescription: "งานตามสัญญาจ้างตัวอย่าง",
    location: "สำนักงานตัวอย่าง กรุงเทพฯ",
    startDate: "2026-12-01",
    endDate: "2027-11-30",
    wage: "30000",
    wageUnit: "บาทต่อเดือน",
    companyName: "บริษัทตัวอย่าง จำกัด",
    registrationNo: "DEMO-C001",
    employerAddress: "สำนักงานตัวอย่าง กรุงเทพฯ",
    employerContact: "ฝ่ายบุคคลตัวอย่าง",
    version: 1,
  };
}
export type DemoScenario =
  "initial" | "visa-ready" | "medical" | "permit-ready";
export function createDemoData(scenario: DemoScenario = "initial"): DemoData {
  const data: DemoData = {
    schemaVersion: 1,
    nextId: 10000,
    workers: [
      worker("101", "ARUN SAMPLE", "อินเดีย", "DEMO-P001"),
      worker("102", "MAYA SAMPLE", "เนปาล", "DEMO-P002"),
      worker("103", "LIN SAMPLE", "จีน", "DEMO-P003"),
    ],
    employments: [
      employment("201", "101", "เจ้าหน้าที่เทคนิค"),
      employment("202", "102", "นักวิเคราะห์"),
      employment("203", "103", "วิศวกร"),
      {
        ...employment("204", "101", "ผู้ช่วยโครงการ (ประวัติเดิม)"),
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      },
    ],
    stages: [],
    documents: [],
    entries: [],
    healthChecks: [],
    corrections: [],
    operationReceipts: {},
  };
  for (const e of data.employments) {
    for (const [index, type] of [
      "PRE_ARRIVAL",
      "VISA",
      "WORK_PERMIT",
    ].entries()) {
      if (type !== "PRE_ARRIVAL" && type !== "VISA" && type !== "WORK_PERMIT")
        continue;
      const stage = emptyStage(String(Number(e.id) * 10 + index), e.id, type);
      data.stages.push(stage);
      if (e.id === "202" || e.id === "204") continue;
      if (
        e.id === "201" &&
        type === "WORK_PERMIT" &&
        scenario !== "permit-ready"
      )
        continue;
      for (const item of stage.items) {
        const id = String(data.nextId++);
        data.documents.push({
          id,
          employmentId: e.id,
          workerId: e.workerId,
          type: "SUPPORTING",
          title: item.label,
          fileName: "demo-document.pdf",
          documentNo: "",
          issuer: "",
          issuedAt: "",
          expiresAt: "",
          availability: "DIGITAL_READY",
          receivedAt: null,
          receivedChannel: null,
        });
        item.documentId = id;
      }
      stage.readinessStatus = "READY";
      stage.application.submissionStatus = "SUBMITTED";
      stage.application.decisionStatus = "PENDING";
      stage.application.authority = "หน่วยงานตัวอย่าง";
      stage.application.receiptNo = "DEMO-R001";
      stage.application.submittedAt = "2026-10-17";
      stage.application.evidenceDocumentIds = stage.items.flatMap((i) =>
        i.documentId ? [i.documentId] : [],
      );
      if (type === "PRE_ARRIVAL" || e.id === "203" || scenario !== "initial") {
        stage.application.decisionStatus = "APPROVED";
        stage.application.decidedAt = "2026-10-17";
        if (
          type === "WORK_PERMIT" &&
          e.id !== "203" &&
          scenario !== "permit-ready"
        ) {
          stage.application.decisionStatus = "NOT_DECIDED";
          stage.application.submissionStatus = "NOT_SUBMITTED";
          continue;
        }
        const id = String(data.nextId++);
        const received =
          (e.id === "203" ||
            scenario === "medical" ||
            scenario === "permit-ready") &&
          type === "VISA";
        data.documents.push({
          id,
          employmentId: e.id,
          workerId: e.workerId,
          type: type === "PRE_ARRIVAL" ? "APPROVAL_LETTER" : type,
          title:
            type === "PRE_ARRIVAL"
              ? "หนังสืออนุมัติก่อนเดินทาง"
              : type === "VISA"
                ? "Visa ตัวอย่าง"
                : "Work Permit ตัวอย่าง",
          fileName: "demo-document.pdf",
          documentNo: "DEMO-" + id,
          issuer: "หน่วยงานตัวอย่าง",
          issuedAt: "2026-10-17",
          expiresAt: "2027-12-31",
          availability: "DIGITAL_READY",
          receivedAt: received ? "2026-10-17" : null,
          receivedChannel: received ? "ช่องทางตัวอย่าง" : null,
        });
        stage.application.issuedDocumentId = id;
      }
    }
  }
  if (scenario === "medical" || scenario === "permit-ready") {
    const visa = data.stages.find(
      (s) => s.employmentId === "201" && s.type === "VISA",
    )?.application.issuedDocumentId;
    if (visa)
      data.entries.push({
        id: "501",
        employmentId: "201",
        workerId: "101",
        visaDocumentId: visa,
        version: 1,
        planStatus: "CONFIRMED",
        plannedArrivalAt: "2026-10-18",
        travelMode: "AIR",
        port: "ท่าอากาศยานตัวอย่าง",
        flightNo: "DEMO-001",
        travelEvidenceDocumentIds: [visa],
        entryResult: "ALLOWED",
        actualArrivalAt: "2026-10-18",
        permittedUntil: "2027-01-15",
        reason: "ตามหลักฐานตัวอย่าง",
        evidenceDocumentIds: [visa],
      });
  }
  for (const e of data.employments.filter(
    (e) => e.id === "203" || (e.id === "201" && scenario === "permit-ready"),
  )) {
    const visa = data.stages.find(
      (s) => s.employmentId === e.id && s.type === "VISA",
    )?.application.issuedDocumentId;
    if (!visa) continue;
    let entry = data.entries.find((t) => t.employmentId === e.id);
    if (!entry) {
      entry = {
        id: String(data.nextId++),
        employmentId: e.id,
        workerId: e.workerId,
        visaDocumentId: visa,
        version: 1,
        planStatus: "CONFIRMED",
        plannedArrivalAt: "2026-10-17",
        travelMode: "AIR",
        port: "ท่าอากาศยานตัวอย่าง",
        flightNo: "DEMO-001",
        travelEvidenceDocumentIds: [visa],
        entryResult: "ALLOWED",
        actualArrivalAt: "2026-10-17",
        permittedUntil: "2027-01-15",
        reason: "หลักฐานสมมติ",
        evidenceDocumentIds: [visa],
      };
      data.entries.push(entry);
    }
    const certificateId = String(data.nextId++);
    data.documents.push({
      id: certificateId,
      employmentId: e.id,
      workerId: e.workerId,
      type: "CERTIFICATE",
      title: "ใบรับรองแพทย์ตัวอย่าง",
      fileName: "demo-certificate.pdf",
      documentNo: "DEMO-H" + e.id,
      issuer: "โรงพยาบาลตัวอย่าง",
      issuedAt: entry.actualArrivalAt,
      expiresAt: "",
      availability: "DIGITAL_READY",
      receivedAt: null,
      receivedChannel: null,
    });
    data.healthChecks.push({
      id: String(data.nextId++),
      employmentId: e.id,
      workerId: e.workerId,
      entryId: entry.id,
      version: 1,
      hospitalName: "โรงพยาบาลตัวอย่าง",
      examDate: entry.actualArrivalAt,
      resultStatus: "COMPLETE",
      pendingItems: "",
      doctorName: "แพทย์ตัวอย่าง",
      certificateDocumentId: certificateId,
      evidenceDocumentIds: [certificateId],
    });
  }
  return data;
}
