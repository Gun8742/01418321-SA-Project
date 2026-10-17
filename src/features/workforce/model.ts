import { z } from "zod";

export const idSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "รหัสข้อมูลไม่ถูกต้อง")
  .max(19)
  .refine(
    (id) => id.length < 19 || (id.length === 19 && id <= "9223372036854775807"),
    "รหัสเกินขอบเขต BIGINT",
  );
export const requiredText = z
  .string()
  .trim()
  .min(1, "กรุณาระบุข้อมูล")
  .max(200);
export const noteSchema = z
  .string()
  .trim()
  .min(1, "กรุณาระบุรายละเอียด")
  .max(2000);
export const dateSchema = z.iso.date("วันที่ไม่ถูกต้อง");
export const kindSchema = z.enum(["PRE_ARRIVAL", "VISA", "WORK_PERMIT"]);
export type CaseKind = z.infer<typeof kindSchema>;
export const targetSchema = z.enum(["VISA", "ENTRY", "WORK_PERMIT"]);
export type TargetType = z.infer<typeof targetSchema>;

export const actorSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("EMPLOYER"),
    accountId: idSchema,
    employerId: idSchema,
  }),
  z.object({
    role: z.literal("WORKER"),
    accountId: idSchema,
    workerId: idSchema,
  }),
]);
export type Actor = z.infer<typeof actorSchema>;
export const profileSchema = z.strictObject({
  name: requiredText,
  nationality: requiredText,
  passportNo: requiredText,
  birthDate: dateSchema,
  passportCountry: requiredText,
  passportIssuedAt: dateSchema,
  passportExpiresAt: dateSchema,
  email: z.email("อีเมลไม่ถูกต้อง").or(z.literal("")),
  phone: z.string().max(40),
  address: z.string().max(2000),
});
export const employmentFieldsSchema = z.strictObject({
  job: requiredText,
  jobDescription: requiredText,
  location: requiredText,
  startDate: dateSchema,
  endDate: dateSchema,
  wage: z.string().regex(/^\d+(\.\d{1,2})?$/, "ระบุค่าจ้างเป็นตัวเลขไม่ติดลบ"),
  wageUnit: requiredText,
  companyName: requiredText,
  registrationNo: requiredText,
  employerAddress: requiredText,
  employerContact: requiredText,
});
export const workerSchema = profileSchema.extend({
  id: idSchema,
  version: z.number().int(),
});
// Read DTO permits redacted company details; writes still use employmentFieldsSchema.
export const employmentSchema = employmentFieldsSchema.extend({
  registrationNo: z.string(),
  employerAddress: z.string(),
  employerContact: z.string(),
  id: idSchema,
  workerId: idSchema,
  employerId: idSchema,
  version: z.number().int(),
});
export type Worker = z.infer<typeof workerSchema>;
export type Employment = z.infer<typeof employmentSchema>;
export const documentSchema = z.object({
  id: idSchema,
  employmentId: idSchema,
  workerId: idSchema,
  title: z.string(),
  type: z.enum([
    "SUPPORTING",
    "APPROVAL_LETTER",
    "VISA",
    "WORK_PERMIT",
    "ENTRY",
    "CERTIFICATE",
  ]),
  fileName: z.string(),
  documentNo: z.string(),
  issuer: z.string(),
  issuedAt: z.string(),
  validFrom: z.string().optional(),
  expiresAt: z.string(),
  availability: z.enum(["DIGITAL_READY", "PHYSICAL_READY"]),
  receivedAt: z.string().nullable(),
  receivedChannel: z.string().nullable(),
});
export type DemoDocument = z.infer<typeof documentSchema>;
export const stageSchema = z.object({
  id: idSchema,
  employmentId: idSchema,
  type: kindSchema,
  caseKey: z.enum(["BEFORE_ENTRY", "AFTER_ENTRY"]),
  country: z.string(),
  authority: z.string(),
  version: z.number().int(),
  readinessStatus: z.enum(["NOT_READY", "AWAITING_REVIEW", "READY"]),
  checklistVersion: requiredText,
  items: z.array(
    z.object({
      requirementKey: z.string(),
      label: z.string(),
      required: z.boolean(),
      documentId: z.string().nullable(),
    }),
  ),
  application: z.object({
    id: idSchema,
    version: z.number().int(),
    submissionStatus: z.enum([
      "NOT_SUBMITTED",
      "AWAITING_SUBMISSION_CONFIRMATION",
      "SUBMITTED",
    ]),
    decisionStatus: z.enum([
      "NOT_DECIDED",
      "PENDING",
      "ADDITIONAL_DOCUMENTS",
      "APPROVED",
      "REJECTED",
    ]),
    authority: z.string(),
    receiptNo: z.string(),
    submittedAt: z.string(),
    decidedAt: z.string(),
    reason: z.string(),
    requestedItems: z.string(),
    evidenceDocumentIds: z.array(idSchema),
    issuedDocumentId: idSchema.nullable(),
    history: z.array(z.object({ label: z.string(), at: z.string() })),
  }),
});
export type Stage = z.infer<typeof stageSchema>;
export const entrySchema = z.object({
  id: idSchema,
  employmentId: idSchema,
  workerId: idSchema,
  visaDocumentId: idSchema,
  version: z.number().int(),
  planStatus: z.enum(["DRAFT", "CONFIRMED"]),
  plannedArrivalAt: z.string(),
  travelMode: z.enum(["AIR", "LAND", "SEA"]),
  port: z.string(),
  flightNo: z.string(),
  travelEvidenceDocumentIds: z.array(idSchema),
  entryResult: z.enum(["PLANNED", "PENDING_VERIFICATION", "ALLOWED", "DENIED"]),
  actualArrivalAt: z.string(),
  permittedUntil: z.string(),
  reason: z.string(),
  evidenceDocumentIds: z.array(idSchema),
});
export type Entry = z.infer<typeof entrySchema>;
export const healthSchema = z.object({
  id: idSchema,
  employmentId: idSchema,
  workerId: idSchema,
  entryId: idSchema,
  version: z.number().int(),
  hospitalName: z.string(),
  examDate: z.string(),
  resultStatus: z.enum(["PENDING", "ADDITIONAL_TESTS", "COMPLETE"]),
  pendingItems: z.string(),
  doctorName: z.string(),
  certificateDocumentId: idSchema.nullable(),
  evidenceDocumentIds: z.array(idSchema),
});
export type Health = z.infer<typeof healthSchema>;
export const correctionSchema = z.object({
  id: idSchema,
  employmentId: idSchema,
  workerId: idSchema,
  targetType: targetSchema,
  targetId: idSchema,
  reason: z.string(),
  evidenceDocumentIds: z.array(idSchema),
  status: z.enum(["OPEN", "RESOLVED"]),
  resolution: z.string(),
  reportedAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedByAccountId: idSchema.nullable(),
  version: z.number().int(),
});
export const demoDataSchema = z.object({
  schemaVersion: z.literal(1),
  nextId: z.union([z.number().int().safe(), idSchema]),
  workers: z.array(workerSchema),
  employments: z.array(employmentSchema),
  stages: z.array(stageSchema),
  documents: z.array(documentSchema),
  entries: z.array(entrySchema),
  healthChecks: z.array(healthSchema),
  corrections: z.array(correctionSchema),
  operationReceipts: z.record(
    z.string(),
    z.object({ digest: z.string(), id: idSchema }),
  ),
});
export type DemoData = z.infer<typeof demoDataSchema>;
export type OperationName =
  | "saveWorkerEmployment"
  | "createDocumentSet"
  | "linkDocument"
  | "unlinkDocument"
  | "addRequestedDocuments"
  | "savePreparation"
  | "reviewDocumentSet"
  | "recordSubmission"
  | "recordDecision"
  | "attachIssuedDocument"
  | "confirmReceipt"
  | "saveTravelPlan"
  | "recordEntryResult"
  | "saveHealthVisit"
  | "recordHealthResult"
  | "confirmMedicalCertificate"
  | "reportCorrection"
  | "resolveCorrection"
  | "addSupportingDocument";
export type OperationResult =
  | { ok: true; data: { id: string }; requestId: string }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
        retryable: boolean;
      };
      requestId: string;
    };
export const kindLabels: Record<CaseKind, string> = {
  PRE_ARRIVAL: "คำขอก่อนเดินทาง",
  VISA: "Visa",
  WORK_PERMIT: "Work Permit",
};
export const statusLabels: Record<string, string> = {
  NOT_READY: "เอกสารไม่ครบ",
  AWAITING_REVIEW: "รอตรวจทาน",
  READY: "พร้อมยื่น",
  NOT_SUBMITTED: "ยังไม่ยื่น",
  AWAITING_SUBMISSION_CONFIRMATION: "รอยืนยันการยื่น",
  SUBMITTED: "ยืนยันการยื่นแล้ว",
  NOT_DECIDED: "ยังไม่มีผล",
  PENDING: "รอพิจารณา",
  ADDITIONAL_DOCUMENTS: "ขอเอกสารเพิ่ม",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  DIGITAL_READY: "พร้อมรับ",
  PHYSICAL_READY: "พร้อมรับ",
  RECEIVED: "รับแล้ว",
  PLANNED: "ยังไม่มีผลเข้าเมือง",
  PENDING_VERIFICATION: "รอตรวจสอบ",
  ALLOWED: "อนุญาตเข้าประเทศ",
  DENIED: "ไม่อนุญาตเข้าประเทศ",
  ADDITIONAL_TESTS: "ต้องตรวจเพิ่มเติม",
  COMPLETE: "ผลตรวจครบ",
  OPEN: "รอดำเนินการ",
  RESOLVED: "ปิดเรื่องแล้ว",
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแผนแล้ว",
};
export function stageStatus(stage: Stage, docs: DemoDocument[]) {
  const issued = docs.find((d) => d.id === stage.application.issuedDocumentId);
  if (issued) return issued.receivedAt ? "RECEIVED" : issued.availability;
  if (stage.application.decisionStatus !== "NOT_DECIDED")
    return stage.application.decisionStatus;
  if (stage.application.submissionStatus !== "NOT_SUBMITTED")
    return stage.application.submissionStatus;
  return stage.readinessStatus;
}
export function visibleEmployments(data: DemoData, actor: Actor) {
  return data.employments.filter((e) =>
    actor.role === "EMPLOYER"
      ? e.employerId === actor.employerId
      : e.workerId === actor.workerId,
  );
}
export function employmentPath(e: Employment) {
  return `/employer/workers/${e.workerId}/employments/${e.id}`;
}
export function stagePath(stage: Stage, application = false) {
  const paths: Record<CaseKind, string> = {
    PRE_ARRIVAL: "pre-arrival",
    VISA: "visa",
    WORK_PERMIT: "work-permits",
  };
  return `/employer/${paths[stage.type]}/${stage.id}${application ? "/application" : ""}`;
}
