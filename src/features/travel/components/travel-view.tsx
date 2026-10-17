"use client";
import Link from "next/link";
import { useDemo } from "@/features/demo/context";
import {
  Banner,
  Badge,
  DocumentLibrary,
  Heading,
  NotFound,
  OperationForm,
  Panel,
  documentOptions,
} from "@/components/ui/primitives";
import { CorrectionPanel } from "@/features/documents/components/corrections";
import type { Employment } from "@/features/demo/model";

export function TravelView({
  employment,
  entryId,
  visaDocumentId,
}: {
  employment: Employment;
  entryId?: string;
  visaDocumentId?: string;
}) {
  const { data, mutate, grants } = useDemo();
  const entries = data.entries.filter((e) => e.employmentId === employment.id);
  const docs = data.documents.filter((d) => d.employmentId === employment.id);
  const visas = docs.filter((d) => d.type === "VISA");
  const entry = entryId
    ? entries.find((e) => e.id === entryId)
    : visaDocumentId
      ? entries.find((e) => e.visaDocumentId === visaDocumentId)
      : entries.length === 1
        ? entries[0]
        : undefined;
  if (entryId && !entry) return <NotFound />;
  const visa =
    visas.find((d) => d.id === (visaDocumentId ?? entry?.visaDocumentId)) ??
    (!visaDocumentId && !entry && visas.length === 1 ? visas[0] : undefined);
  if (
    (entries.length > 1 && !entryId && !visaDocumentId) ||
    (visas.length > 1 && !visa)
  )
    return (
      <>
        <Heading title="เลือกการเดินทาง / Visa" />
        <Panel title="รายการของการจ้างนี้">
          {visas.map((v) => (
            <div className="document-row" key={v.id}>
              <Link
                href={
                  "/worker/travel?employmentId=" +
                  employment.id +
                  "&visaDocumentId=" +
                  v.id
                }
              >
                {v.documentNo} · Visa {v.id}
              </Link>
            </div>
          ))}
        </Panel>
      </>
    );
  if (!visa || !visa.receivedAt)
    return (
      <>
        <Heading title="ข้อมูลการเดินทางเข้าประเทศ" description="UC-08" />
        <Banner tone="warning">
          ต้องมี Visa และยืนยันรับเอกสารจริงก่อนบันทึกแผนเดินทาง
        </Banner>
        <Link
          className="button"
          href={"/worker/visa?employmentId=" + employment.id}
        >
          ไป Visa ของฉัน
        </Link>
      </>
    );
  const canEdit = !entry || entry.entryResult === "PLANNED";
  return (
    <>
      <Heading
        title="ข้อมูลการเดินทางเข้าประเทศ"
        description={
          "UC-08 · Visa " + visa.documentNo + " · การจ้าง " + employment.id
        }
        status={entry?.entryResult ?? "PLANNED"}
      />
      <Banner>
        การบันทึกแผนเดินทางไม่ใช่การอนุญาตเข้าประเทศ
        การตรวจเกิดที่ด่านของเจ้าหน้าที่
      </Banner>
      <Panel title="แผนเดินทาง">
        {entry && <Badge status={entry.planStatus} />}
        {canEdit ? (
          <OperationForm
            key={entry?.version ?? "new"}
            fields={[
              {
                name: "plannedArrivalAt",
                label: "วันที่คาดว่าจะเดินทาง",
                type: "date",
                value: entry?.plannedArrivalAt,
                required: true,
              },
              {
                name: "travelMode",
                label: "ช่องทางเดินทาง",
                type: "select",
                value: entry?.travelMode ?? "AIR",
                options: [
                  { value: "AIR", label: "เครื่องบิน" },
                  { value: "LAND", label: "ทางบก" },
                  { value: "SEA", label: "ทางเรือ" },
                ],
              },
              {
                name: "port",
                label: "จุดผ่านแดน / ท่าอากาศยาน",
                value: entry?.port,
                required: true,
              },
              {
                name: "flightNo",
                label: "เลขเที่ยวบิน (เมื่อเดินทางโดยเครื่องบิน)",
                value: entry?.flightNo,
              },
              {
                name: "evidence",
                label: "หลักฐานการเดินทาง",
                type: "select",
                options: documentOptions(docs),
                value: entry?.travelEvidenceDocumentIds[0],
                required: true,
              },
            ]}
            submitLabel="ยืนยันข้อมูลก่อนเดินทาง"
            modes={
              entry?.planStatus === "CONFIRMED"
                ? []
                : [{ value: "DRAFT", label: "บันทึกแผนร่าง" }]
            }
            onSave={async (v, mode) => {
              if (
                mode !== "DRAFT" &&
                v.travelMode === "AIR" &&
                !v.flightNo.trim()
              )
                return {
                  ok: false,
                  error: {
                    code: "VALIDATION_ERROR",
                    message: "กรุณาระบุเลขเที่ยวบิน",
                    fieldErrors: {
                      flightNo: ["ต้องระบุเมื่อเดินทางโดยเครื่องบิน"],
                    },
                    retryable: false,
                  },
                  requestId: crypto.randomUUID(),
                };
              return mutate("saveTravelPlan", {
                visaDocumentId: visa.id,
                ...(entry
                  ? { entryId: entry.id, expectedVersion: entry.version }
                  : {}),
                mode: mode === "DRAFT" ? "DRAFT" : "CONFIRM",
                plannedArrivalAt: v.plannedArrivalAt,
                travelMode: v.travelMode,
                port: v.port,
                flightNo: v.flightNo,
                travelEvidenceDocumentIds: v.evidence ? [v.evidence] : [],
              });
            }}
          />
        ) : (
          <p className="muted">
            มีผลตรวจเข้าเมืองแล้ว
            แผนเดิมแสดงเพื่ออ้างอิงและไม่เปิดให้แก้ย้อนหลัง
          </p>
        )}
        <p className="small muted">
          Visa ที่ใช้: {visa.documentNo} · วันหมดอายุ{" "}
          {visa.expiresAt || "ตามเอกสาร"}
        </p>
      </Panel>
      {entry && (
        <Panel title="ผลการตรวจเข้าเมือง">
          <Badge status={entry.entryResult} />
          {entry.reason && <p>เหตุผล: {entry.reason}</p>}
          {["ALLOWED", "DENIED"].includes(entry.entryResult) ? (
            <>
              <p>
                วันที่จริง: {entry.actualArrivalAt} · อนุญาตให้อยู่ถึง:{" "}
                {entry.permittedUntil || "ตามหลักฐาน"}
              </p>
              {entry.entryResult === "DENIED" && (
                <Banner tone="error">
                  ยุติเส้นทางนี้ ไม่เปิดขั้นตอนตรวจสุขภาพ
                </Banner>
              )}
            </>
          ) : !grants ? (
            <Banner tone="warning">
              ผู้มี capability เท่านั้นที่บันทึกผลได้ ทดลองได้โดยเปิด “จำลอง
              capability” ในเครื่องมือสาธิตด้านล่าง
            </Banner>
          ) : (
            <OperationForm
              key={"result-" + entry.version}
              disabled={entry.planStatus !== "CONFIRMED"}
              fields={[
                {
                  name: "result",
                  label: "ผลตามหลักฐาน",
                  type: "select",
                  value: "PENDING_VERIFICATION",
                  options: [
                    {
                      value: "PENDING_VERIFICATION",
                      label: "รอตรวจสอบ / ยังไม่มีหลักฐาน",
                    },
                    { value: "ALLOWED", label: "อนุญาตเข้าประเทศ" },
                    { value: "DENIED", label: "ไม่อนุญาตเข้าประเทศ" },
                  ],
                },
                {
                  name: "actualArrivalAt",
                  label: "วันที่เข้าประเทศจริง",
                  type: "date",
                },
                {
                  name: "permittedUntil",
                  label: "วันอนุญาตให้อยู่ถึง (เมื่อมี)",
                  type: "date",
                },
                { name: "reason", label: "เหตุผลตามหลักฐาน", type: "textarea" },
                {
                  name: "evidence",
                  label: "หลักฐานผลตรวจ",
                  type: "select",
                  options: documentOptions(docs),
                },
              ]}
              submitLabel="บันทึกผลตามหลักฐาน (จำลอง)"
              onSave={(v) =>
                mutate("recordEntryResult", {
                  entryId: entry.id,
                  expectedVersion: entry.version,
                  result: v.result,
                  actualArrivalAt: v.actualArrivalAt,
                  permittedUntil: v.permittedUntil,
                  reason: v.reason,
                  evidenceDocumentIds: v.evidence ? [v.evidence] : [],
                })
              }
            />
          )}
          {entry.entryResult === "ALLOWED" && (
            <Link
              className="button"
              href={
                "/worker/medical?employmentId=" +
                employment.id +
                "&entryId=" +
                entry.id
              }
            >
              ดำเนินการตรวจสุขภาพ
            </Link>
          )}
        </Panel>
      )}
      {entry && (
        <CorrectionPanel
          employmentId={employment.id}
          targetType="ENTRY"
          targetId={entry.id}
        />
      )}
      <DocumentLibrary employmentId={employment.id} />
    </>
  );
}
