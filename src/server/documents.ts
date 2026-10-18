import "server-only";
import { z } from "zod";
import { createHash } from "node:crypto";
import { database } from "./db";
import { assertActivePrincipal, type Principal } from "./auth";
import {
  getFile,
  putFile,
  deleteFile,
  validateFile,
  MAX_FILE_SIZE,
} from "./storage";
import { employmentScope } from "../features/workforce/persistence";
import { allocateIds, transaction } from "../features/workforce/service";
import { idSchema } from "../features/workforce/model";
import { OperationError } from "../features/workforce/operations";

const uploadInput = z.strictObject({
  employmentId: idSchema,
  ownerKind: z.enum(["WORKER", "EMPLOYER"]).default("WORKER"),
  originalName: z
    .string()
    .min(1)
    .max(200)
    .refine((s) => !/[\x00-\x1f\x7f/\\]/.test(s), "ชื่อไฟล์ไม่ถูกต้อง"),
  declaredMime: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  declaredSize: z.number().int().positive().max(MAX_FILE_SIZE),
  requestId: z.uuid(),
});
async function scopedUpload(principal: Principal, id: string) {
  const row = await database().fileUpload.findFirst({
    where: {
      id: z.uuid().parse(id),
      actorId: BigInt(principal.actor.accountId),
      employment: employmentScope(principal.actor),
    },
    include: { employment: true },
  });
  if (!row) throw new OperationError("NOT_FOUND", "ไม่พบรายการอัปโหลด");
  if (row.ownerKind === "EMPLOYER" && principal.actor.role !== "EMPLOYER")
    throw new OperationError("FORBIDDEN", "ไม่มีสิทธิ์แนบเอกสารบริษัท");
  return row;
}
export async function initiateUpload(principal: Principal, raw: unknown) {
  const input = uploadInput.parse(raw);
  return transaction(async (tx) => {
    await assertActivePrincipal(tx, principal);
    const employment = await tx.employment.findFirst({
      where: {
        ...employmentScope(principal.actor),
        id: BigInt(input.employmentId),
      },
    });
    if (!employment) throw new OperationError("NOT_FOUND", "ไม่พบการจ้าง");
    if (input.ownerKind === "EMPLOYER" && principal.actor.role !== "EMPLOYER")
      throw new OperationError("FORBIDDEN", "ไม่มีสิทธิ์แนบเอกสารบริษัท");
    const previous = await tx.fileUpload.findUnique({
      where: {
        actorId_requestId: {
          actorId: BigInt(principal.actor.accountId),
          requestId: input.requestId,
        },
      },
    });
    if (previous) {
      if (
        previous.employmentId.toString() !== input.employmentId ||
        previous.ownerKind !== input.ownerKind ||
        previous.originalName !== input.originalName ||
        previous.mime !== input.declaredMime ||
        previous.size !== input.declaredSize
      )
        throw new OperationError("CONFLICT", "requestId เดิมมีไฟล์ต่างกัน");
      if (previous.expiresAt <= new Date())
        throw new OperationError("CONFLICT", "รายการอัปโหลดหมดอายุ");
      return {
        uploadId: previous.id,
        expiresAt: previous.expiresAt.toISOString(),
        uploadUrl: "/api/documents/uploads/" + previous.id,
      };
    }
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await tx.fileUpload.create({
      data: {
        id,
        actorId: BigInt(principal.actor.accountId),
        employmentId: employment.id,
        requestId: input.requestId,
        ownerKind: input.ownerKind,
        objectKey: "documents/" + id,
        originalName: input.originalName,
        mime: input.declaredMime,
        size: input.declaredSize,
        expiresAt,
      },
    });
    return {
      uploadId: id,
      expiresAt: expiresAt.toISOString(),
      uploadUrl: "/api/documents/uploads/" + id,
    };
  });
}
export async function uploadBytes(
  principal: Principal,
  id: string,
  bytes: Uint8Array,
  mime: string | null,
) {
  const upload = await scopedUpload(principal, id);
  if (upload.expiresAt <= new Date() || upload.status === "DELETING")
    throw new OperationError("CONFLICT", "รายการหมดอายุ");
  if (mime !== upload.mime || bytes.length !== upload.size)
    throw new OperationError(
      "VALIDATION_ERROR",
      "ชนิดหรือขนาดไฟล์ไม่ตรงกับรายการอัปโหลด",
    );
  const checksum = await validateFile(bytes, upload.originalName, upload.mime);
  await transaction(async (tx) => {
    await assertActivePrincipal(tx, principal);
    const current = await tx.fileUpload.findUniqueOrThrow({ where: { id } });
    if (current.checksum && current.checksum !== checksum)
      throw new OperationError("CONFLICT", "ไฟล์นี้ถูกผูกกับเนื้อหาอื่นแล้ว");
    if (current.status === "PENDING")
      await tx.fileUpload.update({
        where: { id, status: "PENDING" },
        data: { status: "UPLOADING", checksum },
      });
    else if (!["UPLOADING", "UPLOADED", "COMPLETE"].includes(current.status))
      throw new OperationError("CONFLICT", "รายการนี้ไม่รับไฟล์แล้ว");
  });
  try {
    await putFile(upload.objectKey, bytes, mime);
  } catch {
    try {
      const existing = await getFile(upload.objectKey);
      if (createHash("sha256").update(existing).digest("hex") !== checksum)
        throw new Error("Object mismatch");
    } catch {
      throw new OperationError(
        "FILE_UNAVAILABLE",
        "อัปโหลดไม่สำเร็จ กรุณาลองใหม่ด้วยไฟล์เดิม",
      );
    }
  }
  await database().fileUpload.updateMany({
    where: { id, status: "UPLOADING" },
    data: { status: "UPLOADED" },
  });
}
export async function completeUpload(
  principal: Principal,
  id: string,
  raw: unknown,
) {
  const input = z.strictObject({ requestId: z.uuid() }).parse(raw);
  const upload = await scopedUpload(principal, id);
  if (upload.status !== "COMPLETE") {
    if (upload.status !== "UPLOADED" || upload.expiresAt <= new Date())
      throw new OperationError(
        "PRECONDITION_FAILED",
        "ไฟล์ยังไม่พร้อมหรือหมดอายุ",
      );
    const bytes = await getFile(upload.objectKey);
    if (
      (await validateFile(bytes, upload.originalName, upload.mime)) !==
        upload.checksum ||
      bytes.length !== upload.size
    )
      throw new OperationError("FILE_UNAVAILABLE", "ไฟล์ไม่ตรงกับที่ตรวจไว้");
  }
  return transaction(async (tx) => {
    await assertActivePrincipal(tx, principal);
    const allocated = await allocateIds(tx);
    const current = await tx.fileUpload.findFirst({
      where: {
        id,
        actorId: BigInt(principal.actor.accountId),
        employment: employmentScope(principal.actor),
      },
      include: { employment: true },
    });
    if (!current) throw new OperationError("NOT_FOUND", "ไม่พบรายการ");
    if (current.ownerKind === "EMPLOYER" && principal.actor.role !== "EMPLOYER")
      throw new OperationError("FORBIDDEN", "ไม่มีสิทธิ์แนบเอกสารบริษัท");
    const digest = createHash("sha256").update(id).digest("hex");
    const previous = await tx.operationReceipt.findUnique({
      where: {
        actorId_operation_requestId: {
          actorId: BigInt(principal.actor.accountId),
          operation: "completeUpload",
          requestId: input.requestId,
        },
      },
    });
    if (previous && previous.digest !== digest)
      throw new OperationError("CONFLICT", "requestId เดิมมีข้อมูลต่างกัน");
    if (current.status === "COMPLETE") {
      const document = await tx.document.findFirstOrThrow({
        where: { fileId: id, type: "SUPPORTING" },
      });
      if (!previous)
        await tx.operationReceipt.create({
          data: {
            actorId: BigInt(principal.actor.accountId),
            operation: "completeUpload",
            requestId: input.requestId,
            digest,
            resourceId: document.id,
            employmentId: document.employmentId,
          },
        });
      return {
        ok: true,
        data: { id: document.id.toString() },
        requestId: input.requestId,
      };
    }
    if (current.status !== "UPLOADED" || current.expiresAt <= new Date())
      throw new OperationError("CONFLICT", "รายการอัปโหลดเปลี่ยนแล้ว");
    const document = await tx.document.create({
      data: {
        id: BigInt(allocated),
        employmentId: current.employmentId,
        employerId:
          current.ownerKind === "EMPLOYER"
            ? current.employment.employerId
            : null,
        workerId:
          current.ownerKind === "WORKER" ? current.employment.workerId : null,
        fileId: id,
        type: "SUPPORTING",
        title: current.originalName,
      },
    });
    await tx.fileUpload.update({
      where: { id, status: "UPLOADED" },
      data: { status: "COMPLETE" },
    });
    await tx.operationReceipt.create({
      data: {
        actorId: BigInt(principal.actor.accountId),
        operation: "completeUpload",
        requestId: input.requestId,
        digest,
        resourceId: document.id,
        employmentId: document.employmentId,
      },
    });
    return {
      ok: true,
      data: { id: document.id.toString() },
      requestId: input.requestId,
    };
  });
}
export async function authorizeDownload(principal: Principal, id: string) {
  idSchema.parse(id);
  const document = await database().document.findFirst({
    where: {
      id: BigInt(id),
      employment: employmentScope(principal.actor),
      ...(principal.actor.role === "WORKER"
        ? { workerId: BigInt(principal.actor.workerId) }
        : {}),
      file: { status: "COMPLETE" },
    },
    include: { file: true },
  });
  if (!document) throw new OperationError("NOT_FOUND", "ไม่พบเอกสาร");
  const bytes = await getFile(document.file.objectKey);
  if (
    createHash("sha256").update(bytes).digest("hex") !== document.file.checksum
  )
    throw new OperationError("FILE_UNAVAILABLE", "ไฟล์ไม่ตรงกับที่จัดเก็บ");
  return { bytes, mime: document.file.mime, name: document.file.originalName };
}
export async function cleanupTemporaryUploads() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const candidates = await database().fileUpload.findMany({
    where: {
      status: { not: "COMPLETE" },
      createdAt: { lt: cutoff },
      documents: { none: {} },
    },
    take: 100,
  });
  let removed = 0;
  for (const upload of candidates) {
    const claimed = await database().fileUpload.updateMany({
      where: {
        id: upload.id,
        status: { not: "COMPLETE" },
        documents: { none: {} },
        createdAt: { lt: cutoff },
      },
      data: { status: "DELETING" },
    });
    if (!claimed.count) continue;
    await deleteFile(upload.objectKey);
    await database().fileUpload.deleteMany({
      where: { id: upload.id, status: "DELETING", documents: { none: {} } },
    });
    removed++;
  }
  return removed;
}
