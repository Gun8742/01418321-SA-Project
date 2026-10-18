"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo } from "@/features/demo/context";
import {
  kindLabels,
  employmentPath,
  stagePath,
  stageStatus,
  visibleEmployments,
  type CaseKind,
  type Stage,
} from "@/features/demo/model";
import { preparationBlocker } from "@/features/demo/operations";
import {
  Badge,
  Banner,
  DocumentLibrary,
  DocumentPreview,
  Empty,
  Heading,
  NotFound,
  OperationForm,
  Panel,
  documentOptions,
  type FieldSpec,
} from "@/components/ui/primitives";

function CaseList({
  kind,
  applications,
}: {
  kind: CaseKind;
  applications: boolean;
}) {
  const { data, actor, mutate } = useDemo();
  const router = useRouter();
  if (!actor) return null;
  const employments = visibleEmployments(data, actor);
  const stages = data.stages.filter(
    (s) => s.type === kind && employments.some((e) => e.id === s.employmentId),
  );
  return (
    <>
      <Heading
        title={
          (applications ? "การยื่นและผล " : "จัดชุดเอกสาร ") + kindLabels[kind]
        }
        description="เลือกคำร้องและการจ้างให้ตรงกัน ติดตามเอกสารเพิ่มในคำร้องเดิม"
      />
      <Panel title="รายการชุดเอกสาร">
        {stages.map((s) => {
          const e = employments.find((e) => e.id === s.employmentId);
          const w = data.workers.find((w) => w.id === e?.workerId);
          return (
            <div className="document-row" key={s.id}>
              <div>
                <strong>
                  {w?.name} · การจ้าง {s.employmentId}
                </strong>
                <p className="muted small">
                  {e?.job} · ชุด {s.id} · คำร้อง {s.application.id}
                </p>
                <Link href={stagePath(s, applications)}>
                  เปิด{applications ? "การยื่นและผล" : "ชุดเอกสาร"}
                </Link>
              </div>
              <Badge status={stageStatus(s, data.documents)} />
            </div>
          );
        })}
        {!stages.length && (
          <Empty>ยังไม่มีชุดเอกสาร เริ่มคำขอใหม่ด้านล่าง</Empty>
        )}
      </Panel>
      {!applications && (
        <Panel title="สร้างชุดสำหรับคำขอใหม่">
          <Banner>
            คำร้องเดิมที่ขอเอกสารเพิ่ม ให้เปิดรายการเดิม ไม่สร้างคำร้องซ้ำ
          </Banner>
          <OperationForm
            fields={[
              {
                name: "employmentId",
                label: "ลูกจ้าง / การจ้าง",
                type: "select",
                required: true,
                options: [
                  { value: "", label: "เลือกการจ้าง" },
                  ...employments.map((e) => ({
                    value: e.id,
                    label:
                      data.workers.find((w) => w.id === e.workerId)?.name +
                      " · " +
                      e.job +
                      " · " +
                      e.id,
                  })),
                ],
              },
              ...(kind === "WORK_PERMIT"
                ? [
                    {
                      name: "caseKey",
                      label: "กรณีคำขอ",
                      type: "select" as const,
                      value: "AFTER_ENTRY",
                      options: [
                        { value: "AFTER_ENTRY", label: "หลังเข้าประเทศ" },
                        { value: "BEFORE_ENTRY", label: "ยื่นแทนก่อนเดินทาง" },
                      ],
                    },
                  ]
                : []),
            ]}
            submitLabel="สร้างชุดคำขอใหม่"
            onSave={(v) =>
              mutate("createDocumentSet", {
                employmentId: v.employmentId,
                type: kind,
                caseKey: v.caseKey ?? "BEFORE_ENTRY",
              })
            }
            onSuccess={(id) =>
              router.push(
                "/employer/" +
                  (kind === "PRE_ARRIVAL"
                    ? "pre-arrival"
                    : kind === "VISA"
                      ? "visa"
                      : "work-permits") +
                  "/" +
                  id,
              )
            }
          />
        </Panel>
      )}
    </>
  );
}
function CasePreparation({ stage }: { stage: Stage }) {
  const { data, mutate } = useDemo();
  const docs = data.documents.filter(
    (d) => d.employmentId === stage.employmentId,
  );
  const blocker = preparationBlocker(
    data,
    stage.employmentId,
    stage.type,
    stage.caseKey,
  );
  const locked = !["NOT_DECIDED", "ADDITIONAL_DOCUMENTS"].includes(
    stage.application.decisionStatus,
  );
  const fields: FieldSpec[] = [
    {
      name: "country",
      label: "ประเทศพำนัก / สัญชาติที่ใช้เลือกกรณี",
      value: stage.country,
      required: true,
    },
    {
      name: "authority",
      label: "หน่วยงาน / สถานทูตที่รับคำขอ",
      value: stage.authority,
      required: true,
    },
    ...(stage.type === "VISA"
      ? [
          {
            name: "visaType",
            label: "ประเภท Visa",
            value: stage.visaType,
            required: true,
          },
          {
            name: "workHistory",
            label: "เคยทำงานในประเทศไทยหรือไม่",
            type: "select" as const,
            value:
              stage.workHistory === null
                ? "UNKNOWN"
                : stage.workHistory
                  ? "YES"
                  : "NO",
            options: [
              { value: "UNKNOWN", label: "ยังไม่ระบุ" },
              { value: "YES", label: "เคยทำงานในไทย" },
              { value: "NO", label: "ไม่เคยทำงานในไทย" },
            ],
          },
          ...(stage.workHistory === true
            ? [
                {
                  name: "taxEvidenceRequired",
                  label: "คำร้องนี้เข้าเงื่อนไขต้องใช้ ภ.ง.ด.91 หรือไม่",
                  type: "select" as const,
                  value:
                    stage.taxEvidenceRequired === null
                      ? "UNKNOWN"
                      : stage.taxEvidenceRequired
                        ? "YES"
                        : "NO",
                  options: [
                    { value: "UNKNOWN", label: "ยังไม่ได้ตรวจรายการของคำร้อง" },
                    {
                      value: "YES",
                      label: "ต้องใช้ตามรายการของคำร้อง (สาธิต)",
                    },
                    { value: "NO", label: "ไม่เข้าเงื่อนไข (สาธิต)" },
                  ],
                },
              ]
            : []),
        ]
      : []),
    ...(stage.type === "WORK_PERMIT"
      ? [
          {
            name: "caseKey",
            label: "สถานะการเดินทาง / ประเภทคำขอ",
            type: "select" as const,
            value: stage.caseKey,
            options: [
              { value: "AFTER_ENTRY", label: "เข้าประเทศแล้ว · บต.25 ตามกรณี" },
              {
                value: "BEFORE_ENTRY",
                label: "ยื่นแทนก่อนเดินทาง · บต.32 ตามกรณี",
              },
            ],
          },
        ]
      : []),
    ...stage.items.map((i) => ({
      name: i.requirementKey,
      label: i.label + (i.required ? " (จำเป็น)" : " (ตามกรณี)"),
      type: "select" as const,
      value: i.documentId ?? "",
      options: documentOptions(docs, "ยังขาด / ไม่ได้เลือก"),
    })),
  ];
  return (
    <>
      {blocker && (
        <Banner tone="warning">
          {blocker} · หากเลือกกรณีไม่ตรง ให้ปรับกรณีและบันทึกก่อนตรวจทาน
        </Banner>
      )}
      <Banner>
        Checklist DEMO-1 เป็นตัวอย่างตามกรณี
        ไม่ใช่รายการเอกสารราชการที่ยืนยันแล้ว (O-03)
      </Banner>
      {stage.type === "VISA" && (
        <Banner>
          เลือกประเภท Visa สถานทูต ประเทศ และประวัติทำงาน แล้วบันทึกเพื่อปรับ
          Checklist ก่อนเลือกเอกสารเพิ่ม หากเคยทำงาน ต้องมีใบอนุญาตเดิม;
          ภ.ง.ด.91 ใช้เมื่อเข้าเงื่อนไขของคำร้องที่ตรวจแล้วเท่านั้น
          การเลือกเงื่อนไขนี้เป็นการจำลอง ยังไม่มี catalog สถานทูตที่ยืนยัน
          (O-03)
        </Banner>
      )}
      <Panel title="ข้อมูลและเอกสารประกอบตามกรณี">
        {locked && (
          <Banner>
            คำขอนี้อยู่ระหว่างพิจารณาหรือมีผลแล้ว เปิดดูได้;
            เอกสารเพิ่มต้องรอผลขอเพิ่มในคำร้องเดิม
          </Banner>
        )}
        <OperationForm
          key={stage.version}
          fields={fields}
          disabled={locked}
          submitLabel="บันทึกชุดเอกสาร"
          onSave={(v) =>
            mutate("savePreparation", {
              documentSetId: stage.id,
              expectedVersion: stage.version,
              country: v.country,
              authority: v.authority,
              caseKey: v.caseKey ?? stage.caseKey,
              ...(stage.type === "VISA"
                ? {
                    visaType: v.visaType,
                    workHistory:
                      v.workHistory === "UNKNOWN"
                        ? null
                        : v.workHistory === "YES",
                    taxEvidenceRequired:
                      v.taxEvidenceRequired === undefined ||
                      v.taxEvidenceRequired === "UNKNOWN"
                        ? null
                        : v.taxEvidenceRequired === "YES",
                  }
                : {}),
              items: stage.items.map((i) => ({
                requirementKey: i.requirementKey,
                documentId: v[i.requirementKey] || null,
              })),
            })
          }
        />
      </Panel>
      <Panel title="ตรวจทานชุดเอกสาร">
        <div className="row readiness-status">
          <span>สถานะชุดเอกสาร</span>
          <Badge status={stage.readinessStatus} />
        </div>
        <p>
          ต้องตรวจข้อมูลและเอกสารที่ใช้ยื่นตรงกัน
          เมื่อแก้ไขหลังตรวจผ่านต้องตรวจใหม่
        </p>
        {stage.items.map((i) => (
          <div key={i.requirementKey} className="document-row">
            <div>
              <strong>{i.label}</strong>
              <p className="muted small">
                {docs.find((d) => d.id === i.documentId)?.fileName ??
                  "กรุณาเลือกเอกสารในแบบฟอร์ม"}
              </p>
            </div>
            <Badge status={i.documentId ? "READY" : "NOT_READY"} />
          </div>
        ))}
        <OperationForm
          key={"review-" + stage.version}
          fields={[]}
          submitLabel="ตรวจทานและยืนยันความครบถ้วน"
          disabled={locked || !!blocker}
          onSave={() =>
            mutate("reviewDocumentSet", {
              documentSetId: stage.id,
              expectedVersion: stage.version,
              checklistVersion: stage.checklistVersion,
            })
          }
        />
        <Link className="button secondary" href={stagePath(stage, true)}>
          ไปการยื่นและติดตามผล
        </Link>
      </Panel>
      <DocumentLibrary employmentId={stage.employmentId} />
    </>
  );
}
function ApplicationView({ stage }: { stage: Stage }) {
  const { data, mutate } = useDemo();
  const a = stage.application;
  const docs = data.documents.filter(
    (d) => d.employmentId === stage.employmentId,
  );
  const options = documentOptions(docs, "ยังไม่มีหลักฐาน");
  const issued = docs.find((d) => d.id === a.issuedDocumentId);
  const canSubmit = ["NOT_DECIDED", "ADDITIONAL_DOCUMENTS"].includes(
    a.decisionStatus,
  );
  const canRecord =
    a.submissionStatus === "SUBMITTED" &&
    !["APPROVED", "REJECTED"].includes(a.decisionStatus);
  return (
    <>
      <Banner>
        การยื่น พิจารณา และออกเอกสารเกิดภายนอก
        ระบบนี้จำลองการบันทึกหลักฐานเท่านั้น
      </Banner>
      <Panel title="ข้อมูลการยื่นคำร้อง">
        <p>
          คำร้อง {a.id} · ชุดเอกสาร {stage.id}
        </p>
        <div className="row">
          <Badge status={a.submissionStatus} />
          <Badge status={a.decisionStatus} />
        </div>
        {canSubmit ? (
          <OperationForm
            key={"submit-" + a.version}
            fields={[
              {
                name: "authority",
                label: "หน่วยงานที่รับคำขอ",
                value: a.authority || stage.authority,
                required: true,
              },
              {
                name: "submittedAt",
                label: "วันที่รับคำขอ (เมื่อมีหลักฐาน)",
                value: a.submittedAt,
                type: "date",
              },
              {
                name: "receiptNo",
                label: "เลขรับคำขอ / เลขอ้างอิง",
                value: a.receiptNo,
              },
              {
                name: "evidence",
                label: "หลักฐานรับคำขอ",
                value: a.evidenceDocumentIds[0] ?? "",
                type: "select",
                options,
              },
            ]}
            submitLabel="บันทึกการยื่นตามหลักฐาน"
            onSave={(v) =>
              mutate("recordSubmission", {
                documentSetId: stage.id,
                expectedVersion: stage.version,
                expectedApplicationVersion: a.version,
                authority: v.authority,
                receiptNo: v.receiptNo,
                submittedAt: v.submittedAt,
                acceptedEvidenceDocumentIds: v.evidence ? [v.evidence] : [],
              })
            }
          />
        ) : (
          <p className="muted">
            บันทึกการยื่นแล้ว ติดตามผลด้านล่าง; ไม่ยื่นซ้ำเป็นคำร้องใหม่
          </p>
        )}
        <p className="small muted">
          ยังไม่มีเลขรับ / วันที่ / หลักฐานรับ จะคง “รอยืนยันการยื่น”
          ไม่แสดงว่ารอพิจารณาแล้ว
        </p>
      </Panel>
      <Panel title="บันทึกผลที่ได้รับ">
        {canRecord ? (
          <OperationForm
            key={"decision-" + a.version}
            fields={[
              {
                name: "decision",
                label: "ผลตามหลักฐาน",
                type: "select",
                value: "PENDING",
                options: [
                  { value: "PENDING", label: "รอพิจารณา" },
                  { value: "ADDITIONAL_DOCUMENTS", label: "ขอเอกสารเพิ่ม" },
                  { value: "REJECTED", label: "ไม่อนุมัติ" },
                  { value: "APPROVED", label: "อนุมัติ" },
                ],
              },
              {
                name: "decidedAt",
                label: "วันที่แจ้งผล (ผลตัดสิน)",
                type: "date",
              },
              { name: "reason", label: "เหตุผลตามหลักฐาน", type: "textarea" },
              {
                name: "requestedItems",
                label: "รายการเอกสารที่ขอเพิ่ม",
                type: "textarea",
              },
              {
                name: "evidence",
                label: "หลักฐานผลพิจารณา",
                type: "select",
                options,
              },
            ]}
            submitLabel="บันทึกผลตามหลักฐาน"
            onSave={(v) =>
              mutate("recordDecision", {
                applicationId: a.id,
                expectedVersion: a.version,
                decision: v.decision,
                decidedAt: v.decidedAt,
                reason: v.reason,
                requestedItems: v.requestedItems,
                evidenceDocumentIds: v.evidence ? [v.evidence] : [],
              })
            }
          />
        ) : (
          <p>
            {a.reason ||
              "ยังไม่มีผลที่แก้ไขได้ ผลสุดท้ายต้องดำเนินการผ่าน correction policy ตามสิทธิ์"}
          </p>
        )}
        {a.decisionStatus === "ADDITIONAL_DOCUMENTS" && (
          <Banner tone="warning">
            รายการที่ขอเพิ่ม: {a.requestedItems} ·
            กลับแก้เอกสารและตรวจทานใหม่ในคำร้องเดิม
          </Banner>
        )}
        {a.decisionStatus === "ADDITIONAL_DOCUMENTS" && (
          <Link className="button secondary" href={stagePath(stage)}>
            เพิ่มเอกสารและตรวจทานใหม่
          </Link>
        )}
      </Panel>
      {a.decisionStatus === "APPROVED" && (
        <Panel
          title={
            stage.type === "PRE_ARRIVAL"
              ? "หนังสืออนุมัติประกอบ Visa"
              : "เอกสารที่ออกแล้ว / พร้อมรับ"
          }
        >
          {issued ? (
            <>
              <div className="document-row">
                <div>
                  <strong>
                    {issued.title} · {issued.documentNo}
                  </strong>
                  <p className="muted">{issued.issuer}</p>
                </div>
                <Badge
                  status={issued.receivedAt ? "RECEIVED" : issued.availability}
                />
              </div>
              <DocumentPreview doc={issued} />
            </>
          ) : (
            <>
              <Banner tone="warning">
                ผลอนุมัติยังไม่เท่ากับมีเอกสารพร้อมรับ ต้องแนบเอกสารที่ออกจริง
                (จำลอง)
              </Banner>
              <OperationForm
                fields={[
                  { name: "documentNo", label: "เลขที่เอกสาร", required: true },
                  { name: "issuer", label: "หน่วยงานผู้ออก", required: true },
                  {
                    name: "issuedAt",
                    label: "วันที่ออก",
                    type: "date",
                    required: true,
                  },
                  {
                    name: "expiresAt",
                    label: "วันหมดอายุ (เมื่อมี)",
                    type: "date",
                  },
                  {
                    name: "validFrom",
                    label: "วันเริ่มมีผล (เมื่อมีในเอกสาร)",
                    type: "date",
                  },
                  {
                    name: "sourceDocument",
                    label: "ไฟล์เอกสารที่ออกแล้ว (ตัวอย่าง)",
                    type: "select",
                    options: documentOptions(docs),
                    required: true,
                  },
                ]}
                submitLabel="จัดเก็บเอกสารที่ออกแล้ว (จำลอง)"
                onSave={(v) =>
                  mutate("attachIssuedDocument", {
                    applicationId: a.id,
                    expectedVersion: a.version,
                    documentNo: v.documentNo,
                    issuer: v.issuer,
                    issuedAt: v.issuedAt,
                    validFrom: v.validFrom,
                    expiresAt: v.expiresAt,
                    fileName:
                      docs.find((d) => d.id === v.sourceDocument)?.fileName ??
                      "",
                  })
                }
              />
            </>
          )}
        </Panel>
      )}
      <Panel title="ประวัติการติดตามคำร้อง">
        {a.history.length ? (
          a.history.map((h, i) => (
            <div key={i} className="document-row">
              <div className="stack-tight">
                <strong>{h.label}</strong>
                {h.receiptNo && (
                  <p className="muted small">
                    เลขรับ {h.receiptNo} · {h.authority} · {h.eventDate}
                  </p>
                )}
                {h.evidenceDocumentIds?.map((id) => {
                  const document = docs.find((d) => d.id === id);
                  return document ? (
                    <DocumentPreview key={id} doc={document} />
                  ) : null;
                })}
              </div>
              <span className="muted small">
                {new Date(h.at).toLocaleString("th-TH")}
              </span>
            </div>
          ))
        ) : (
          <Empty>ยังไม่มีการอัปเดตในรอบสาธิตนี้</Empty>
        )}
      </Panel>
      <DocumentLibrary employmentId={stage.employmentId} />
    </>
  );
}
export function CaseView({
  kind,
  stageId,
  application = false,
}: {
  kind: CaseKind;
  stageId?: string;
  application?: boolean;
}) {
  const { data, actor } = useDemo();
  if (!actor) return null;
  if (!stageId) return <CaseList kind={kind} applications={application} />;
  const employmentIds = visibleEmployments(data, actor).map((e) => e.id);
  const stage = data.stages.find(
    (s) =>
      s.id === stageId &&
      s.type === kind &&
      employmentIds.includes(s.employmentId),
  );
  if (!stage) return <NotFound />;
  const e = data.employments.find((e) => e.id === stage.employmentId);
  const w = data.workers.find((w) => w.id === e?.workerId);
  return (
    <>
      <Heading
        title={
          (application ? "การยื่นและผล " : "จัดชุดเอกสาร ") + kindLabels[kind]
        }
        description={
          w?.name +
          " · การจ้าง " +
          stage.employmentId +
          " · " +
          (kind === "VISA"
            ? "UC-05 / UC-06 / UC-11"
            : kind === "PRE_ARRIVAL"
              ? "UC-01"
              : "UC-02 / UC-03")
        }
        status={stageStatus(stage, data.documents)}
      />
      <div className="row">
        {e && <Link href={employmentPath(e)}>กลับข้อมูลการจ้าง / คำแจ้ง</Link>}
      </div>
      <nav className="tabs" aria-label="ขั้นตอนคำขอ">
        <Link
          href={stagePath(stage)}
          aria-current={!application ? "page" : undefined}
        >
          เตรียมและตรวจทาน
        </Link>
        <Link
          href={stagePath(stage, true)}
          aria-current={application ? "page" : undefined}
        >
          การยื่นและติดตามผล
        </Link>
      </nav>
      {application ? (
        <ApplicationView stage={stage} />
      ) : (
        <CasePreparation stage={stage} />
      )}
    </>
  );
}
