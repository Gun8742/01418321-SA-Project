import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { getFile } from "../../server/storage";
import { database } from "../../server/db";
import { assertActivePrincipal, type Principal } from "../../server/auth";
import { applyOperation, OperationError, scopedEmployment } from "./operations";
import {
  clientProjection,
  employmentScope,
  loadWorkforce,
} from "./persistence";
import { persistWorkforce } from "./write";
import type { DemoData, OperationName } from "./model";

export const operationNameSchema = z.enum([
  "linkDocument",
  "unlinkDocument",
  "addRequestedDocuments",
  "saveWorkerEmployment",
  "createDocumentSet",
  "savePreparation",
  "reviewDocumentSet",
  "recordSubmission",
  "recordDecision",
  "attachIssuedDocument",
  "confirmReceipt",
  "saveTravelPlan",
  "recordEntryResult",
  "saveHealthVisit",
  "recordHealthResult",
  "confirmMedicalCertificate",
  "reportCorrection",
  "resolveCorrection",
  "addSupportingDocument",
]);
export const commandSchema = z.strictObject({
  operation: operationNameSchema,
  input: z.record(z.string(), z.unknown()),
});
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => JSON.stringify(key) + ":" + canonical(val))
        .join(",") +
      "}"
    );
  const encoded = JSON.stringify(value);
  if (encoded === undefined)
    throw new OperationError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง");
  return encoded;
}
export async function transaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await database().$transaction(work, {
        isolationLevel: "Serializable",
        maxWait: 10000,
        timeout: 20000,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034" && attempt < 2) continue;
        if (["P2002", "P2025"].includes(error.code))
          throw new OperationError(
            "CONFLICT",
            "ข้อมูลถูกแก้ไขหรือมีรายการนี้แล้ว กรุณาโหลดข้อมูลล่าสุด",
          );
      }
      throw error;
    }
  }
}
export async function allocateIds(tx: Prisma.TransactionClient) {
  const sequence = await tx.idSequence.upsert({
    where: { name: "workforce" },
    create: { name: "workforce", nextValue: 1000064n },
    update: { nextValue: { increment: 64n } },
  });
  return (sequence.nextValue - 64n).toString();
}
function inputEmployment(
  state: DemoData,
  input: Record<string, unknown>,
): string | undefined {
  if (typeof input.employmentId === "string") return input.employmentId;
  const targets = [
    [input.documentSetId, state.stages],
    [
      input.applicationId,
      state.stages.map((s) => ({
        id: s.application.id,
        employmentId: s.employmentId,
      })),
    ],
    [input.documentId ?? input.visaDocumentId, state.documents],
    [input.entryId, state.entries],
    [input.healthCheckId, state.healthChecks],
    [input.correctionId, state.corrections],
    [
      input.targetId,
      input.targetType === "ENTRY" ? state.entries : state.documents,
    ],
  ] as const;
  for (const [id, rows] of targets) {
    if (typeof id === "string") {
      const row = rows.find((row) => row.id === id);
      if (!row) throw new OperationError("NOT_FOUND", "ไม่พบรายการ");
      return row.employmentId;
    }
  }
}
export function resultEmployment(
  state: DemoData,
  name: OperationName,
  id: string,
) {
  let employmentId: string | undefined;
  if (name === "saveWorkerEmployment")
    employmentId = state.employments.find((e) => e.id === id)?.id;
  else if (
    [
      "linkDocument",
      "unlinkDocument",
      "createDocumentSet",
      "savePreparation",
      "reviewDocumentSet",
    ].includes(name)
  )
    employmentId = state.stages.find((s) => s.id === id)?.employmentId;
  else if (
    ["addRequestedDocuments", "recordSubmission", "recordDecision"].includes(
      name,
    )
  )
    employmentId = state.stages.find(
      (s) => s.application.id === id,
    )?.employmentId;
  else if (
    [
      "attachIssuedDocument",
      "confirmMedicalCertificate",
      "confirmReceipt",
      "addSupportingDocument",
    ].includes(name)
  )
    employmentId = state.documents.find((d) => d.id === id)?.employmentId;
  else if (["saveTravelPlan", "recordEntryResult"].includes(name))
    employmentId = state.entries.find((e) => e.id === id)?.employmentId;
  else if (["saveHealthVisit", "recordHealthResult"].includes(name))
    employmentId = state.healthChecks.find((h) => h.id === id)?.employmentId;
  else employmentId = state.corrections.find((c) => c.id === id)?.employmentId;
  if (!employmentId) throw new Error("Operation resource is missing");
  return employmentId;
}
async function capabilities(
  tx: Prisma.TransactionClient,
  principal: Principal,
  employmentId?: string,
) {
  if (!employmentId) return { entry: false, medical: false };
  const grants = await tx.capabilityGrant.findMany({
    where: {
      actorId: BigInt(principal.actor.accountId),
      employmentId: BigInt(employmentId),
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  return {
    entry: grants.some((g) => g.capability === "entry:record-evidence"),
    medical: grants.some((g) => g.capability === "medical:record-evidence"),
  };
}
export async function executeCommand(principal: Principal, raw: unknown) {
  const { operation, input } = commandSchema.parse(raw);
  const requestId = z.uuid().parse(input.requestId);
  z.json().parse(input);
  const digest = createHash("sha256").update(canonical(input)).digest("hex");
  return transaction(async (tx) => {
    await assertActivePrincipal(tx, principal);
    const nextId = await allocateIds(tx);
    const before = await loadWorkforce(tx, principal.actor);
    before.nextId = nextId;
    const previous = await tx.operationReceipt.findUnique({
      where: {
        actorId_operation_requestId: {
          actorId: BigInt(principal.actor.accountId),
          operation,
          requestId,
        },
      },
    });
    const employmentId =
      previous?.employmentId.toString() ?? inputEmployment(before, input);
    if (employmentId) scopedEmployment(before, principal.actor, employmentId);
    const grants = await capabilities(tx, principal, employmentId);
    if (
      (operation === "recordEntryResult" && !grants.entry) ||
      (["recordHealthResult", "confirmMedicalCertificate"].includes(
        operation,
      ) &&
        !grants.medical)
    )
      throw new OperationError("FORBIDDEN", "ไม่มีสิทธิ์บันทึกหลักฐานนี้");
    if (previous) {
      if (previous.digest !== digest)
        throw new OperationError("CONFLICT", "requestId เดิมมีข้อมูลต่างกัน");
      return {
        ok: true,
        data: { id: previous.resourceId.toString() },
        requestId,
      };
    }
    if (operation === "addSupportingDocument")
      throw new OperationError(
        "PRECONDITION_FAILED",
        "กรุณาอัปโหลดไฟล์จริงผ่านช่องทางเอกสาร",
      );
    if (
      operation === "saveWorkerEmployment" &&
      typeof input.workerId === "string" &&
      principal.actor.role === "EMPLOYER"
    ) {
      const shared = await tx.employment.count({
        where: {
          workerId: BigInt(input.workerId),
          employerId: { not: BigInt(principal.actor.employerId) },
        },
      });
      if (shared)
        throw new OperationError(
          "PRECONDITION_FAILED",
          "ข้อมูลบุคคลใช้ร่วมหลายบริษัท ต้องยืนยันนโยบายแก้ข้อมูลก่อน",
        );
    }
    let sourceFileId: string | undefined;
    if (
      operation === "attachIssuedDocument" ||
      operation === "confirmMedicalCertificate"
    ) {
      const sourceDocumentId = z
        .string()
        .regex(/^[1-9]\d*$/)
        .parse(input.sourceDocumentId);
      const source = await tx.document.findFirst({
        where: {
          id: BigInt(sourceDocumentId),
          employmentId: employmentId ? BigInt(employmentId) : undefined,
          employment: employmentScope(principal.actor),
          workerId: employmentId
            ? BigInt(
                before.employments.find((e) => e.id === employmentId)
                  ?.workerId ?? "0",
              )
            : undefined,
          file: { status: "COMPLETE" },
        },
        include: { file: true },
      });
      if (!source || !employmentId)
        throw new OperationError("NOT_FOUND", "ไม่พบไฟล์ที่มีสิทธิ์");
      try {
        const bytes = await getFile(source.file.objectKey);
        if (
          createHash("sha256").update(bytes).digest("hex") !==
          source.file.checksum
        )
          throw new Error("File integrity failure");
      } catch {
        throw new OperationError(
          "FILE_UNAVAILABLE",
          "ไฟล์หลักฐานยังไม่พร้อมใช้งาน",
        );
      }
      sourceFileId = source.fileId;
      input.fileName = source.file.originalName;
    }
    const after = structuredClone(before);
    const id = applyOperation(after, principal.actor, operation, input, grants);
    if (BigInt(after.nextId) - BigInt(nextId) > 64n)
      throw new Error("ID allocation exhausted");
    if (operation === "createDocumentSet") {
      const policy = await tx.casePolicy.findUnique({
        where: { version: "DEMO-1" },
      });
      if (
        !policy?.approved ||
        (policy.synthetic && process.env.ALLOW_SYNTHETIC_POLICY !== "true")
      )
        throw new OperationError(
          "PRECONDITION_FAILED",
          "ยังไม่มี Checklist ที่อนุมัติสำหรับกรณีนี้",
        );
      const items = z
        .array(
          z.object({
            requirementKey: z.string(),
            label: z.string(),
            required: z.boolean(),
          }),
        )
        .parse(policy.requirements);
      const set = after.stages.find((s) => s.id === id);
      if (!set) throw new Error("DocumentSet missing");
      set.items = items.map((item) => ({ ...item, documentId: null }));
      set.checklistVersion = policy.version;
      set.country = "";
      set.authority = "";
    }
    if (operation === "reviewDocumentSet") {
      const set = after.stages.find((s) => s.id === id);
      const policy = await tx.casePolicy.findUnique({
        where: { version: set?.checklistVersion ?? "" },
      });
      if (
        !policy?.approved ||
        (policy.synthetic && process.env.ALLOW_SYNTHETIC_POLICY !== "true")
      )
        throw new OperationError(
          "PRECONDITION_FAILED",
          "Checklist ไม่พร้อมใช้งาน",
        );
    }
    const resultScope = resultEmployment(after, operation, id);
    await persistWorkforce(
      tx,
      before,
      after,
      principal.actor,
      operation,
      sourceFileId,
    );
    await tx.operationReceipt.create({
      data: {
        actorId: BigInt(principal.actor.accountId),
        operation,
        requestId,
        digest,
        resourceId: BigInt(id),
        employmentId: BigInt(resultScope),
      },
    });
    return { ok: true, data: { id }, requestId };
  });
}
export async function snapshot(principal: Principal) {
  return transaction(async (tx) => {
    await assertActivePrincipal(tx, principal);
    const grants = await tx.capabilityGrant.findMany({
      where: {
        actorId: BigInt(principal.actor.accountId),
        employment: employmentScope(principal.actor),
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { employmentId: true, capability: true },
    });
    return {
      actor: principal.actor,
      data: clientProjection(
        await loadWorkforce(tx, principal.actor),
        principal.actor,
      ),
      capabilities: grants.map((g) => ({
        employmentId: g.employmentId.toString(),
        capability: g.capability,
      })),
    };
  });
}
