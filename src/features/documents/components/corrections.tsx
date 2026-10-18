"use client";
import { useState } from "react";
import { useDemo } from "@/features/demo/context";
import {
  Banner,
  Badge,
  Empty,
  OperationForm,
  Panel,
  documentOptions,
  type FieldSpec,
} from "@/components/ui/primitives";
import type { TargetType } from "@/features/demo/model";

export function CorrectionPanel({
  employmentId,
  targetType,
  targetId,
}: {
  employmentId: string;
  targetType?: TargetType;
  targetId?: string;
}) {
  const { data, actor, mutate } = useDemo();
  const [status, setStatus] = useState("ALL");
  if (!actor) return null;
  const docs = data.documents.filter((d) => d.employmentId === employmentId);
  const isEmployer = actor.role === "EMPLOYER";
  const corrections = data.corrections.filter(
    (c) =>
      c.employmentId === employmentId &&
      (isEmployer || c.workerId === actor.workerId) &&
      (!targetId || c.targetId === targetId) &&
      (!targetType || c.targetType === targetType) &&
      (status === "ALL" || c.status === status),
  );
  const reportFields: FieldSpec[] = [
    {
      name: "reason",
      label: "รายการที่ไม่ตรงและรายละเอียดที่ต้องตรวจ",
      type: "textarea",
      required: true,
      fullWidth: true,
    },
    {
      name: "evidence",
      label: "เอกสารประกอบ (เมื่อมี)",
      type: "select",
      options: documentOptions(docs),
    },
  ];
  return (
    <Panel title="คำแจ้งข้อมูลไม่ตรง">
      <p className="muted">
        แจ้งตรวจข้อมูลที่บันทึก ไม่แก้เอกสารหรือผลตัดสินของหน่วยงานต้นฉบับ
      </p>
      {!isEmployer && targetId && targetType && (
        <OperationForm
          fields={reportFields}
          submitLabel="ส่งคำแจ้งข้อมูลไม่ตรง"
          onSave={(v) =>
            mutate("reportCorrection", {
              targetType,
              targetId,
              reason: v.reason,
              evidenceDocumentIds: v.evidence ? [v.evidence] : [],
            })
          }
        />
      )}
      <div className="field">
        <label htmlFor="correction-status">สถานะคำแจ้ง</label>
        <select
          id="correction-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ALL">ทุกสถานะ</option>
          <option value="OPEN">รอดำเนินการ</option>
          <option value="RESOLVED">ปิดเรื่องแล้ว</option>
        </select>
      </div>
      {!corrections.length && <Empty>ยังไม่มีคำแจ้งในรายการที่เลือก</Empty>}
      {corrections.map((c) => (
        <details key={c.id} className="correction">
          <summary>
            <span>{c.reason}</span> <Badge status={c.status} />
          </summary>
          <div className="stack-tight">
            <p className="small muted">
              {c.targetType} · {c.targetId} · แจ้งเมื่อ{" "}
              {new Date(c.reportedAt).toLocaleString("th-TH")}
            </p>
            <p>{c.reason}</p>
            <p className="small">
              หลักฐาน:{" "}
              {c.evidenceDocumentIds
                .map(
                  (id) => docs.find((d) => d.id === id)?.title ?? "ไม่พบข้อมูล",
                )
                .join(", ") || "ไม่ได้แนบ"}
            </p>
            {isEmployer && c.status === "OPEN" && (
              <>
                <Banner>
                  ตรวจหลักฐานและดำเนินการตามสิทธิ์ก่อนตอบปิดเรื่อง
                  การปิดคำแจ้งไม่เปลี่ยนผลภายนอก
                </Banner>
                <OperationForm
                  key={c.version}
                  fields={[
                    {
                      name: "resolution",
                      label: "คำตอบและผลการตรวจสอบ",
                      type: "textarea",
                      required: true,
                      fullWidth: true,
                    },
                  ]}
                  submitLabel="ตอบกลับและปิดเรื่อง"
                  onSave={(v) =>
                    mutate("resolveCorrection", {
                      correctionId: c.id,
                      resolution: v.resolution,
                      expectedVersion: c.version,
                    })
                  }
                />
              </>
            )}
            {c.status === "RESOLVED" && (
              <div className="banner">
                <p>
                  <strong>คำตอบ: </strong>
                  {c.resolution}
                </p>
                <p className="small">
                  ผู้ตอบบัญชี {c.resolvedByAccountId} ·{" "}
                  {c.resolvedAt
                    ? new Date(c.resolvedAt).toLocaleString("th-TH")
                    : ""}
                </p>
              </div>
            )}
          </div>
        </details>
      ))}
    </Panel>
  );
}
