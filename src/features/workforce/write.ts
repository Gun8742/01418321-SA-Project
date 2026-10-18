import "server-only";
import type { Prisma } from "../../generated/prisma/client";
import type { Actor, DemoData, OperationName } from "./model";
import { date, json } from "./persistence";
import { OperationError } from "./operations";

function changed<T extends { id: string }>(before: T[], after: T[]) {
  return after.filter(
    (row) =>
      JSON.stringify(row) !==
      JSON.stringify(before.find((old) => old.id === row.id)),
  );
}
function requiredDate(value: string) {
  return new Date(value + "T00:00:00.000Z");
}
const links = (ids: string[]) => ids.map((id) => ({ id: BigInt(id) }));
export async function persistWorkforce(
  tx: Prisma.TransactionClient,
  before: DemoData,
  after: DemoData,
  actor: Actor,
  operation: OperationName,
  sourceFileId?: string,
  sourceFiles?: ReadonlyMap<string, string>,
) {
  for (const w of changed(before.workers, after.workers)) {
    const fields = {
      name: w.name,
      nationality: w.nationality,
      passportNo: w.passportNo,
      birthDate: requiredDate(w.birthDate),
      passportCountry: w.passportCountry,
      passportIssuedAt: requiredDate(w.passportIssuedAt),
      passportExpiresAt: requiredDate(w.passportExpiresAt),
      email: w.email,
      phone: w.phone,
      address: w.address,
      version: w.version,
    };
    const old = before.workers.find((row) => row.id === w.id);
    if (old) {
      await tx.worker.update({
        where: { id: BigInt(w.id), version: old.version },
        data: fields,
      });
      await tx.documentSet.updateMany({
        where: {
          employment: { workerId: BigInt(w.id) },
          id: {
            notIn: changed(before.stages, after.stages).map((s) =>
              BigInt(s.id),
            ),
          },
        },
        data: { readinessStatus: "AWAITING_REVIEW", version: { increment: 1 } },
      });
    } else await tx.worker.create({ data: { id: BigInt(w.id), ...fields } });
  }
  for (const e of changed(before.employments, after.employments)) {
    const old = before.employments.find((row) => row.id === e.id);
    const employer = await tx.employer.findUniqueOrThrow({
      where: { id: BigInt(e.employerId) },
    });
    if (
      employer.name !== e.companyName ||
      employer.registrationNo !== e.registrationNo ||
      employer.address !== e.employerAddress ||
      employer.contact !== e.employerContact
    ) {
      if (actor.role !== "EMPLOYER" || actor.employerId !== e.employerId)
        throw new OperationError("FORBIDDEN", "ไม่มีสิทธิ์แก้นายจ้าง");
      await tx.employer.update({
        where: {
          id: employer.id,
          version: before.employer?.version ?? employer.version,
        },
        data: {
          name: e.companyName,
          registrationNo: e.registrationNo,
          address: e.employerAddress,
          contact: e.employerContact,
          version: { increment: 1 },
        },
      });
      await tx.employment.updateMany({
        where: { employerId: employer.id, id: { not: BigInt(e.id) } },
        data: { version: { increment: 1 } },
      });
      await tx.documentSet.updateMany({
        where: {
          employment: { employerId: employer.id },
          employmentId: { not: BigInt(e.id) },
        },
        data: { readinessStatus: "AWAITING_REVIEW", version: { increment: 1 } },
      });
    }
    const fields = {
      workerId: BigInt(e.workerId),
      employerId: BigInt(e.employerId),
      version: e.version,
      job: e.job,
      jobDescription: e.jobDescription,
      location: e.location,
      startDate: requiredDate(e.startDate),
      endDate: requiredDate(e.endDate),
      wage: e.wage,
      wageUnit: e.wageUnit,
    };
    if (old)
      await tx.employment.update({
        where: { id: BigInt(e.id), version: old.version },
        data: fields,
      });
    else await tx.employment.create({ data: { id: BigInt(e.id), ...fields } });
  }
  // File identities come only from complete, scoped uploads checked by the Server.
  for (const d of changed(before.documents, after.documents)) {
    const old = before.documents.find((row) => row.id === d.id);
    if (!old) {
      const fileId = sourceFiles?.get(d.id) ?? sourceFileId;
      if (!fileId)
        throw new OperationError(
          "PRECONDITION_FAILED",
          "ต้องมีไฟล์ที่ตรวจแล้ว",
        );
      await tx.document.create({
        data: {
          id: BigInt(d.id),
          employmentId: BigInt(d.employmentId),
          workerId: BigInt(d.workerId),
          fileId,
          type: d.type,
          title: d.title,
          documentNo: d.documentNo || null,
          issuer: d.issuer || null,
          issuedAt: date(d.issuedAt),
          validFrom: date(d.validFrom),
          expiresAt: date(d.expiresAt),
        },
      });
    }
    if (d.receivedAt && !old?.receivedAt)
      await tx.documentReceipt.create({
        data: {
          documentId: BigInt(d.id),
          actorId: BigInt(actor.accountId),
          receivedAt: requiredDate(d.receivedAt),
          channel: d.receivedChannel ?? "",
        },
      });
  }
  for (const s of changed(before.stages, after.stages)) {
    const old = before.stages.find((row) => row.id === s.id);
    const fields = {
      employmentId: BigInt(s.employmentId),
      type: s.type,
      caseKey: s.caseKey,
      country: s.country,
      authority: s.authority,
      version: s.version,
      readinessStatus: s.readinessStatus,
      checklistVersion: s.checklistVersion,
      ...(operation === "reviewDocumentSet"
        ? {
            reviewedAt: new Date(),
            reviewedBy: BigInt(actor.accountId),
            reviewedSnapshot: json({
              items: s.items,
              version: s.version,
              worker: after.workers.find(
                (w) =>
                  w.id ===
                  after.employments.find((e) => e.id === s.employmentId)
                    ?.workerId,
              ),
            }),
          }
        : {}),
    };
    if (old)
      await tx.documentSet.update({
        where: { id: BigInt(s.id), version: old.version },
        data: fields,
      });
    else await tx.documentSet.create({ data: { id: BigInt(s.id), ...fields } });
    for (const item of s.items) {
      const itemFields = {
        label: item.label,
        required: item.required,
        documentId: item.documentId ? BigInt(item.documentId) : null,
        ...(operation === "reviewDocumentSet"
          ? {
              checkResult: item.documentId ? "PASS" : "MISSING",
              checkedAt: new Date(),
            }
          : {}),
      };
      await tx.checklistItem.upsert({
        where: {
          documentSetId_requirementKey: {
            documentSetId: BigInt(s.id),
            requirementKey: item.requirementKey,
          },
        },
        create: {
          documentSetId: BigInt(s.id),
          requirementKey: item.requirementKey,
          ...itemFields,
        },
        update: itemFields,
      });
    }
    await tx.documentSetDocument.deleteMany({
      where: { documentSetId: BigInt(s.id) },
    });
    for (const documentId of new Set(
      s.items.flatMap((item) => (item.documentId ? [item.documentId] : [])),
    ))
      await tx.documentSetDocument.create({
        data: { documentSetId: BigInt(s.id), documentId: BigInt(documentId) },
      });
    const a = s.application;
    const applicationFields = {
      documentSetId: BigInt(s.id),
      version: a.version,
      submissionStatus: a.submissionStatus,
      decisionStatus: a.decisionStatus,
      authority: a.authority,
      receiptNo: a.receiptNo || null,
      submittedAt: date(a.submittedAt),
      decidedAt: date(a.decidedAt),
      reason: a.reason,
      requestedItems: a.requestedItems,
      evidence: { set: links(a.evidenceDocumentIds) },
    };
    if (old)
      await tx.application.update({
        where: { id: BigInt(a.id), version: old.application.version },
        data: applicationFields,
      });
    else
      await tx.application.create({
        data: {
          id: BigInt(a.id),
          ...applicationFields,
          evidence: { connect: links(a.evidenceDocumentIds) },
        },
      });
    for (const event of a.history.slice(old?.application.history.length ?? 0))
      await tx.applicationEvent.create({
        data: {
          applicationId: BigInt(a.id),
          actorId: BigInt(actor.accountId),
          label: event.label,
          at: new Date(event.at),
          snapshot: json({
            ...s,
            documents: after.documents.filter(
              (d) => d.employmentId === s.employmentId,
            ),
          }),
        },
      });
    if (a.issuedDocumentId && !old?.application.issuedDocumentId) {
      const issued = after.documents.find((d) => d.id === a.issuedDocumentId);
      if (!issued) throw new Error("Issued document missing");
      await tx.applicationIssuedDocument.create({
        data: {
          applicationId: BigInt(a.id),
          documentId: BigInt(issued.id),
          type: issued.type,
        },
      });
    }
  }
  for (const e of changed(before.entries, after.entries)) {
    const old = before.entries.find((row) => row.id === e.id);
    const fields = {
      employmentId: BigInt(e.employmentId),
      visaDocumentId: BigInt(e.visaDocumentId),
      version: e.version,
      planStatus: e.planStatus,
      plannedArrivalAt: date(e.plannedArrivalAt),
      travelMode: e.travelMode,
      port: e.port,
      flightNo: e.flightNo,
      entryResult: e.entryResult,
      actualArrivalAt: date(e.actualArrivalAt),
      permittedUntil: date(e.permittedUntil),
      reason: e.reason,
    };
    if (old)
      await tx.entryRecord.update({
        where: { id: BigInt(e.id), version: old.version },
        data: {
          ...fields,
          evidence: { set: links(e.evidenceDocumentIds) },
          travelEvidence: { set: links(e.travelEvidenceDocumentIds) },
        },
      });
    else
      await tx.entryRecord.create({
        data: {
          id: BigInt(e.id),
          ...fields,
          evidence: { connect: links(e.evidenceDocumentIds) },
          travelEvidence: { connect: links(e.travelEvidenceDocumentIds) },
        },
      });
  }
  for (const h of changed(before.healthChecks, after.healthChecks)) {
    const old = before.healthChecks.find((row) => row.id === h.id);
    const fields = {
      employmentId: BigInt(h.employmentId),
      entryId: BigInt(h.entryId),
      version: h.version,
      hospitalName: h.hospitalName,
      examDate: requiredDate(h.examDate),
      resultStatus: h.resultStatus,
      pendingItems: h.pendingItems,
      doctorName: h.doctorName,
      certificateDocumentId: h.certificateDocumentId
        ? BigInt(h.certificateDocumentId)
        : null,
      ...(h.certificateDocumentId && !old?.certificateDocumentId
        ? { verifiedAt: new Date(), verifiedBy: BigInt(actor.accountId) }
        : {}),
    };
    if (old)
      await tx.healthCheck.update({
        where: { id: BigInt(h.id), version: old.version },
        data: { ...fields, evidence: { set: links(h.evidenceDocumentIds) } },
      });
    else
      await tx.healthCheck.create({
        data: {
          id: BigInt(h.id),
          ...fields,
          evidence: { connect: links(h.evidenceDocumentIds) },
        },
      });
  }
  for (const c of changed(before.corrections, after.corrections)) {
    const old = before.corrections.find((row) => row.id === c.id);
    const fields = {
      version: c.version,
      resolution: c.resolution,
      status: c.status,
      resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : null,
      resolvedByAccountId: c.resolvedByAccountId
        ? BigInt(c.resolvedByAccountId)
        : null,
    };
    if (old)
      await tx.correctionRequest.update({
        where: { id: BigInt(c.id), version: old.version },
        data: fields,
      });
    else
      await tx.correctionRequest.create({
        data: {
          id: BigInt(c.id),
          ...fields,
          employmentId: BigInt(c.employmentId),
          reporterId: BigInt(actor.accountId),
          targetType: c.targetType,
          targetId: BigInt(c.targetId),
          documentId: c.targetType !== "ENTRY" ? BigInt(c.targetId) : null,
          entryId: c.targetType === "ENTRY" ? BigInt(c.targetId) : null,
          reason: c.reason,
          reportedAt: new Date(c.reportedAt),
          evidence: { connect: links(c.evidenceDocumentIds) },
        },
      });
  }
}
