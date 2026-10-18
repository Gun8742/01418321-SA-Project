import "server-only";
import { z } from "zod";
import { idSchema } from "./model";
import { OperationError, scopedEmployment } from "./operations";
import { snapshot } from "./service";
import { database } from "../../server/db";
import { employmentScope } from "./persistence";
import type { Principal } from "../../server/auth";

export const queryNameSchema = z.enum([
  "listWorkers",
  "listWorkerEmployments",
  "getWorkerEmployment",
  "getPreparationContext",
  "getCaseChecklist",
  "getApplicationDetail",
  "getReceiptContext",
  "getOwnOverview",
  "getOwnDocument",
  "getTravelContext",
  "getEntryResult",
  "getHealthCheckContext",
  "listCorrections",
  "getCorrection",
  "getMutationOutcome",
]);
const paging = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});
const pageInput = {
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
};
const queryInputs: Record<z.infer<typeof queryNameSchema>, z.ZodType> = {
  listWorkers: z.strictObject({
    ...pageInput,
    q: z.string().max(100).optional(),
    sort: z.enum(["name", "updatedAt"]).optional(),
  }),
  listWorkerEmployments: z.strictObject({ workerId: idSchema }),
  getWorkerEmployment: z.strictObject({
    workerId: idSchema,
    employmentId: idSchema,
  }),
  getPreparationContext: z.strictObject({
    employmentId: idSchema,
    type: z.enum(["PRE_ARRIVAL", "VISA", "WORK_PERMIT"]).optional(),
    documentSetId: idSchema.optional(),
  }),
  getCaseChecklist: z.strictObject({
    employmentId: idSchema,
    type: z.enum(["PRE_ARRIVAL", "VISA", "WORK_PERMIT"]).optional(),
    caseKey: z.string().optional(),
    visaType: z.string().optional(),
    targetAuthority: z.string().optional(),
    country: z.string().optional(),
    travelStatus: z.string().optional(),
    workHistory: z.boolean().optional(),
  }),
  getApplicationDetail: z
    .strictObject({
      applicationId: idSchema.optional(),
      documentSetId: idSchema.optional(),
    })
    .refine((v) => !!v.applicationId !== !!v.documentSetId),
  getReceiptContext: z.strictObject({
    applicationId: idSchema,
    documentType: z.enum(["VISA", "WORK_PERMIT"]).optional(),
  }),
  getOwnOverview: z.strictObject({ employmentId: idSchema.optional() }),
  getOwnDocument: z.strictObject({ documentId: idSchema }),
  getTravelContext: z.strictObject({
    visaDocumentId: idSchema,
    entryId: idSchema.optional(),
  }),
  getEntryResult: z.strictObject({ entryId: idSchema }),
  getHealthCheckContext: z.strictObject({
    entryId: idSchema,
    healthCheckId: idSchema.optional(),
  }),
  listCorrections: z
    .strictObject({
      ...pageInput,
      employmentId: idSchema.optional(),
      targetType: z.enum(["VISA", "ENTRY", "WORK_PERMIT"]).optional(),
      targetId: idSchema.optional(),
      status: z.enum(["OPEN", "RESOLVED"]).optional(),
    })
    .refine((v) => !!v.employmentId || (!!v.targetType && !!v.targetId)),
  getCorrection: z.strictObject({ correctionId: idSchema }),
  getMutationOutcome: z.strictObject({
    operation: z.string().min(1).max(100),
    requestId: z.uuid(),
  }),
};
function page<T>(rows: T[], input: unknown) {
  const { page, pageSize } = paging.parse(input);
  return {
    items: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    page,
    pageSize,
    hasNext: page * pageSize < rows.length,
  };
}
function found<T>(value: T | undefined | null): T {
  if (!value) throw new OperationError("NOT_FOUND", "ไม่พบรายการ");
  return value;
}
export async function executeQuery(
  principal: Principal,
  raw: unknown,
): Promise<unknown> {
  const { query, input } = z
    .strictObject({
      query: queryNameSchema,
      input: z.record(z.string(), z.unknown()).default({}),
    })
    .parse(raw);
  queryInputs[query].parse(input);
  const { actor, data } = await snapshot(principal);
  if (
    [
      "listWorkers",
      "listWorkerEmployments",
      "getWorkerEmployment",
      "getPreparationContext",
      "getCaseChecklist",
    ].includes(query) &&
    actor.role !== "EMPLOYER"
  )
    throw new OperationError("FORBIDDEN", "ไม่มีสิทธิ์อ่านงานนายจ้าง");
  switch (query) {
    case "listWorkers": {
      const q = z
        .string()
        .max(100)
        .default("")
        .parse(input.q)
        .toLocaleLowerCase();
      const { page: currentPage, pageSize } = paging.parse(input);
      const where = {
        employments: { some: employmentScope(actor) },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { passportNo: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const [rows, total] = await database().$transaction([
        database().worker.findMany({
          where,
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
          orderBy:
            input.sort === "updatedAt"
              ? [{ updatedAt: "desc" }, { id: "asc" }]
              : [{ name: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            nationality: true,
            passportNo: true,
            version: true,
          },
        }),
        database().worker.count({ where }),
      ]);
      return {
        items: rows.map((w) => ({
          id: w.id.toString(),
          workerId: w.id.toString(),
          displayName: w.name,
          nationality: w.nationality,
          maskedPassportNo: w.passportNo
            .slice(-4)
            .padStart(w.passportNo.length, "*"),
          version: w.version,
        })),
        total,
        page: currentPage,
        pageSize,
        hasNext: currentPage * pageSize < total,
      };
    }
    case "listWorkerEmployments": {
      const workerId = idSchema.parse(input.workerId);
      found(data.workers.find((w) => w.id === workerId));
      return data.employments.filter((e) => e.workerId === workerId);
    }
    case "getWorkerEmployment": {
      const args = z
        .object({ workerId: idSchema, employmentId: idSchema })
        .parse(input);
      const employment = scopedEmployment(
        data,
        actor,
        args.employmentId,
        args.workerId,
      );
      return {
        worker: found(data.workers.find((w) => w.id === args.workerId)),
        employment,
        documents: data.documents.filter(
          (d) => d.employmentId === employment.id,
        ),
        stages: data.stages.filter((s) => s.employmentId === employment.id),
      };
    }
    case "getPreparationContext": {
      const employmentId = idSchema.parse(input.employmentId);
      const employment = scopedEmployment(data, actor, employmentId);
      const stages = data.stages.filter(
        (s) =>
          s.employmentId === employmentId &&
          (!input.type || s.type === input.type) &&
          (!input.documentSetId || s.id === input.documentSetId),
      );
      if (input.documentSetId) found(stages[0]);
      return {
        employment,
        stages,
        documents: data.documents.filter(
          (d) => d.employmentId === employmentId,
        ),
      };
    }
    case "getCaseChecklist": {
      scopedEmployment(data, actor, idSchema.parse(input.employmentId));
      const policy = await database().casePolicy.findUnique({
        where: { version: "DEMO-1" },
      });
      if (
        !policy?.approved ||
        (policy.synthetic && process.env.ALLOW_SYNTHETIC_POLICY !== "true")
      )
        throw new OperationError(
          "PRECONDITION_FAILED",
          "ยังไม่มี Checklist ที่พร้อมใช้",
        );
      return {
        checklistVersion: policy.version,
        synthetic: policy.synthetic,
        requirements: policy.requirements,
      };
    }
    case "getApplicationDetail":
    case "getReceiptContext": {
      const stage = input.applicationId
        ? found(
            data.stages.find(
              (s) => s.application.id === idSchema.parse(input.applicationId),
            ),
          )
        : found(
            data.stages.find(
              (s) => s.id === idSchema.parse(input.documentSetId),
            ),
          );
      if (input.documentType && stage.type !== input.documentType)
        throw new OperationError("NOT_FOUND", "ไม่พบเอกสารประเภทนี้ในคำขอ");
      return {
        application: stage.application,
        documentSet: stage,
        issuedDocument:
          data.documents.find(
            (d) => d.id === stage.application.issuedDocumentId,
          ) ?? null,
      };
    }
    case "getOwnOverview": {
      if (actor.role !== "WORKER")
        throw new OperationError("FORBIDDEN", "เฉพาะบัญชีลูกจ้าง");
      return data;
    }
    case "getOwnDocument":
      return found(
        data.documents.find((d) => d.id === idSchema.parse(input.documentId)),
      );
    case "getTravelContext": {
      const visa = found(
        data.documents.find(
          (d) =>
            d.id === idSchema.parse(input.visaDocumentId) && d.type === "VISA",
        ),
      );
      const entries = data.entries.filter(
        (e) =>
          e.visaDocumentId === visa.id &&
          (!input.entryId || e.id === input.entryId),
      );
      if (input.entryId) found(entries[0]);
      return { visa, entries };
    }
    case "getEntryResult":
      return found(
        data.entries.find((e) => e.id === idSchema.parse(input.entryId)),
      );
    case "getHealthCheckContext": {
      const entry = found(
        data.entries.find((e) => e.id === idSchema.parse(input.entryId)),
      );
      const health =
        data.healthChecks.find(
          (h) =>
            h.entryId === entry.id &&
            (!input.healthCheckId || h.id === input.healthCheckId),
        ) ?? null;
      if (input.healthCheckId) found(health);
      return { entry, health };
    }
    case "listCorrections": {
      if (input.employmentId)
        scopedEmployment(data, actor, idSchema.parse(input.employmentId));
      if (input.targetId)
        found(
          input.targetType === "ENTRY"
            ? data.entries.find((e) => e.id === input.targetId)
            : data.documents.find(
                (d) => d.id === input.targetId && d.type === input.targetType,
              ),
        );
      return page(
        data.corrections
          .filter(
            (c) =>
              (!input.employmentId || c.employmentId === input.employmentId) &&
              (!input.targetType || c.targetType === input.targetType) &&
              (!input.targetId || c.targetId === input.targetId) &&
              (!input.status || c.status === input.status),
          )
          .sort(
            (a, b) =>
              b.reportedAt.localeCompare(a.reportedAt) ||
              a.id.localeCompare(b.id),
          ),
        input,
      );
    }
    case "getCorrection":
      return found(
        data.corrections.find(
          (c) => c.id === idSchema.parse(input.correctionId),
        ),
      );
    case "getMutationOutcome": {
      const args = z
        .object({ operation: z.string().min(1).max(100), requestId: z.uuid() })
        .parse(input);
      const receipt = await database().operationReceipt.findUnique({
        where: {
          actorId_operation_requestId: {
            actorId: BigInt(actor.accountId),
            operation: args.operation,
            requestId: args.requestId,
          },
        },
      });
      if (!receipt) return { status: "NOT_RECORDED" };
      const employment = await database().employment.findFirst({
        where: { id: receipt.employmentId, ...employmentScope(actor) },
      });
      found(employment);
      return { status: "COMMITTED", resourceId: receipt.resourceId.toString() };
    }
  }
}
