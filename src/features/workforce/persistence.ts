import "server-only";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { demoDataSchema, type Actor, type DemoData } from "./model";

export function employmentScope(actor: Actor): Prisma.EmploymentWhereInput {
  return actor.role === "EMPLOYER"
    ? { employerId: BigInt(actor.employerId) }
    : { workerId: BigInt(actor.workerId) };
}
export function day(date: Date | null | undefined) {
  return date?.toISOString().slice(0, 10) ?? "";
}
export function date(value: string | undefined | null) {
  return value ? new Date(value + "T00:00:00.000Z") : null;
}
export async function loadWorkforce(
  tx: Prisma.TransactionClient,
  actor: Actor,
): Promise<DemoData> {
  const scope = employmentScope(actor);
  const employments = await tx.employment.findMany({
    where: scope,
    include: { employer: true, worker: true },
    orderBy: { id: "asc" },
  });
  const ids = employments.map((e) => e.id);
  const sets = await tx.documentSet.findMany({
    where: { employmentId: { in: ids } },
    include: {
      items: { orderBy: { requirementKey: "asc" } },
      application: {
        include: {
          evidence: { select: { id: true } },
          issued: true,
          events: { orderBy: { id: "asc" } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  const documents = await tx.document.findMany({
    where: {
      employmentId: { in: ids },
      file: { status: "COMPLETE" },
      ...(actor.role === "WORKER" ? { workerId: BigInt(actor.workerId) } : {}),
    },
    include: { file: true, receipt: true },
  });
  const entries = await tx.entryRecord.findMany({
    where: { employmentId: { in: ids } },
    include: {
      evidence: { select: { id: true } },
      travelEvidence: { select: { id: true } },
    },
  });
  const healthChecks = await tx.healthCheck.findMany({
    where: { employmentId: { in: ids } },
    include: { evidence: { select: { id: true } } },
  });
  const corrections = await tx.correctionRequest.findMany({
    where: {
      employmentId: { in: ids },
      ...(actor.role === "WORKER"
        ? { reporter: { workerId: BigInt(actor.workerId) } }
        : {}),
    },
    include: { evidence: { select: { id: true } } },
  });
  const workerIds = new Set<string>();
  const workers = employments.flatMap((e) => {
    if (workerIds.has(e.workerId.toString())) return [];
    workerIds.add(e.workerId.toString());
    const w = e.worker;
    return [
      {
        id: w.id.toString(),
        version: w.version,
        name: w.name,
        nationality: w.nationality,
        passportNo: w.passportNo,
        birthDate: day(w.birthDate),
        passportCountry: w.passportCountry,
        passportIssuedAt: day(w.passportIssuedAt),
        passportExpiresAt: day(w.passportExpiresAt),
        email: w.email,
        phone: w.phone,
        address: w.address,
      },
    ];
  });
  const workerFor = (id: bigint) =>
    employments.find((e) => e.id === id)?.workerId.toString();
  return demoDataSchema.parse({
    schemaVersion: 1,
    nextId: "1",
    workers,
    employments: employments.map((e) => ({
      id: e.id.toString(),
      workerId: e.workerId.toString(),
      employerId: e.employerId.toString(),
      version: e.version,
      job: e.job,
      jobDescription: e.jobDescription,
      location: e.location,
      startDate: day(e.startDate),
      endDate: day(e.endDate),
      wage: e.wage.toFixed(2),
      wageUnit: e.wageUnit,
      companyName: e.employer.name,
      registrationNo: e.employer.registrationNo,
      employerAddress: e.employer.address,
      employerContact: e.employer.contact,
    })),
    stages: sets.map((s) => {
      const a = s.application;
      if (!a) throw new Error("DocumentSet application is missing");
      return {
        id: s.id.toString(),
        employmentId: s.employmentId.toString(),
        type: s.type,
        caseKey: s.caseKey,
        country: s.country,
        authority: s.authority,
        version: s.version,
        readinessStatus: s.readinessStatus,
        checklistVersion: s.checklistVersion,
        items: s.items.map((i) => ({
          requirementKey: i.requirementKey,
          label: i.label,
          required: i.required,
          documentId: i.documentId?.toString() ?? null,
        })),
        application: {
          id: a.id.toString(),
          version: a.version,
          submissionStatus: a.submissionStatus,
          decisionStatus: a.decisionStatus,
          authority: a.authority,
          receiptNo: a.receiptNo ?? "",
          submittedAt: day(a.submittedAt),
          decidedAt: day(a.decidedAt),
          reason: a.reason,
          requestedItems: a.requestedItems,
          evidenceDocumentIds: a.evidence.map((d) => d.id.toString()),
          issuedDocumentId: a.issued?.documentId.toString() ?? null,
          history: a.events.map((e) => ({
            label: e.label,
            at: e.at.toISOString(),
          })),
        },
      };
    }),
    documents: documents.map((d) => ({
      id: d.id.toString(),
      employmentId: d.employmentId.toString(),
      workerId: workerFor(d.employmentId),
      title: d.title,
      type: d.type,
      fileName: d.file.originalName,
      documentNo: d.documentNo ?? "",
      issuer: d.issuer ?? "",
      issuedAt: day(d.issuedAt),
      validFrom: day(d.validFrom),
      expiresAt: day(d.expiresAt),
      availability: "DIGITAL_READY",
      receivedAt: day(d.receipt?.receivedAt) || null,
      receivedChannel: d.receipt?.channel ?? null,
    })),
    entries: entries.map((e) => ({
      id: e.id.toString(),
      employmentId: e.employmentId.toString(),
      workerId: workerFor(e.employmentId),
      visaDocumentId: e.visaDocumentId.toString(),
      version: e.version,
      planStatus: e.planStatus,
      plannedArrivalAt: day(e.plannedArrivalAt),
      travelMode: e.travelMode ?? "AIR",
      port: e.port ?? "",
      flightNo: e.flightNo ?? "",
      travelEvidenceDocumentIds: e.travelEvidence.map((d) => d.id.toString()),
      entryResult: e.entryResult,
      actualArrivalAt: day(e.actualArrivalAt),
      permittedUntil: day(e.permittedUntil),
      reason: e.reason ?? "",
      evidenceDocumentIds: e.evidence.map((d) => d.id.toString()),
    })),
    healthChecks: healthChecks.map((h) => ({
      id: h.id.toString(),
      employmentId: h.employmentId.toString(),
      workerId: workerFor(h.employmentId),
      entryId: h.entryId.toString(),
      version: h.version,
      hospitalName: h.hospitalName,
      examDate: day(h.examDate),
      resultStatus: h.resultStatus,
      pendingItems: h.pendingItems,
      doctorName: h.doctorName,
      certificateDocumentId: h.certificateDocumentId?.toString() ?? null,
      evidenceDocumentIds: h.evidence.map((d) => d.id.toString()),
    })),
    corrections: corrections.map((c) => ({
      id: c.id.toString(),
      employmentId: c.employmentId.toString(),
      workerId: workerFor(c.employmentId),
      targetType: c.targetType,
      targetId: c.targetId.toString(),
      reason: c.reason,
      evidenceDocumentIds: c.evidence.map((d) => d.id.toString()),
      status: c.status,
      resolution: c.resolution,
      reportedAt: c.reportedAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      resolvedByAccountId: c.resolvedByAccountId?.toString() ?? null,
      version: c.version,
    })),
    operationReceipts: {},
  });
}
export function clientProjection(data: DemoData, actor: Actor): DemoData {
  // A snapshot is a UI projection only: it never includes credentials, private keys, or receipts used for replay.
  const state = structuredClone(data);
  if (actor.role === "WORKER") {
    const worker = state.workers.find((w) => w.id === actor.workerId);
    state.workers = worker ? [worker] : [];
    state.employments = state.employments.map((e) => ({
      ...e,
      registrationNo: "",
      employerAddress: "",
      employerContact: "",
    }));
  }
  if (actor.role === "WORKER") {
    const visibleIds = new Set(state.documents.map((d) => d.id));
    state.stages = state.stages.map((s) => ({
      ...s,
      items: [],
      country: "",
      authority: "",
      application: {
        ...s.application,
        history: [],
        evidenceDocumentIds: s.application.evidenceDocumentIds.filter((id) =>
          visibleIds.has(id),
        ),
      },
    }));
  }
  state.operationReceipts = {};
  return state;
}
export function json(value: unknown): Prisma.InputJsonValue {
  const parsed = z.json().parse(value);
  if (parsed === null) throw new Error("JSON snapshot cannot be null");
  return parsed;
}
