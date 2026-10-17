"use client";
import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/features/demo/context";
import { Badge, Banner, DocumentPreview, Empty, Heading, OperationForm, Panel } from "@/components/ui/primitives";
import { CorrectionPanel } from "@/features/documents/components/corrections";
import { kindLabels, stageStatus, type CaseKind, type Employment, type Stage } from "@/features/demo/model";
import { businessDate } from "@/lib/date";

export function WorkerOverview({employment}:{employment:Employment}) {
  const {data}=useDemo();const worker=data.workers.find(w=>w.id===employment.workerId);
  const stages=data.stages.filter(s=>s.employmentId===employment.id);
  const entry=data.entries.find(e=>e.employmentId===employment.id);
  const health=data.healthChecks.find(h=>h.employmentId===employment.id);
  const visa=stages.find(s=>s.type==="VISA");const permit=stages.find(s=>s.type==="WORK_PERMIT");
  const suffix="?employmentId="+employment.id;
  const rows=[
    {title:"Visa ของฉัน · UC-07",detail:"ตรวจข้อมูลและยืนยันเมื่อได้รับจริง",href:"/worker/visa"+suffix,status:visa?stageStatus(visa,data.documents):"NOT_SUBMITTED"},
    {title:"การเดินทาง · UC-08",detail:"บันทึกแผนเดินทางและหลักฐานตามสิทธิ์",href:"/worker/travel"+suffix,status:entry?.entryResult??"PLANNED"},
    {title:"การตรวจสุขภาพ · UC-09",detail:"ดำเนินการเมื่อมีผลอนุญาตเข้าประเทศ",href:"/worker/medical"+suffix,status:health?.certificateDocumentId?"READY":health?.resultStatus??"PENDING"},
    {title:"Work Permit · UC-10",detail:"เปิดรับเมื่ออนุมัติและมีเอกสารจริง",href:"/worker/work-permit"+suffix,status:permit?stageStatus(permit,data.documents):"NOT_SUBMITTED"},
  ];
  return <><Heading title="ภาพรวมของฉัน" description={worker?.name+" · "+worker?.passportNo+" · การจ้าง "+employment.id}/>
    <Panel title="งานที่ต้องดำเนินการ">{rows.map(row=><div className="document-row" key={row.href}><div><h3>{row.title}</h3><p className="muted small">{row.detail}</p><Link href={row.href}>เปิดข้อมูล</Link></div><Badge status={row.status}/></div>)}</Panel>
    <Banner>Visa, การเข้าเมือง และใบอนุญาตทำงานเป็นคนละผลพิจารณา การมี Visa ไม่ใช่สิทธิ์เริ่มทำงาน</Banner>
  </>;
}
export function WorkerDocument({stage,employment}:{stage:Stage;employment:Employment}) {
  const {data,mutate}=useDemo();const [confirmed,setConfirmed]=useState(false);
  const doc=data.documents.find(d=>d.id===stage.application.issuedDocumentId);
  const type:CaseKind=stage.type;
  return <><Heading title={kindLabels[type]+" ของฉัน"} description={(type==="VISA"?"UC-07":"UC-10")+" · การจ้าง "+employment.id+" · คำร้อง "+stage.application.id} status={stageStatus(stage,data.documents)}/>
    <Banner>ตรวจเอกสารและยืนยันเฉพาะเมื่อได้รับจริง การเปิด Preview หรือดาวน์โหลดไม่ถือว่ารับเอกสาร</Banner>
    {!doc?<Panel title="ยังไม่มีเอกสารพร้อมรับ"><p>ผลปัจจุบัน: <Badge status={stage.application.decisionStatus}/></p><p className="muted">{stage.application.reason||"รอผลและเอกสารที่ออกจากหน่วยงาน นายจ้างจะบันทึกตามหลักฐาน"}</p></Panel>:<>
      <Panel title={doc.title}><dl className="metadata"><dt>เลขที่เอกสาร</dt><dd>{doc.documentNo}</dd><dt>ผู้ออก</dt><dd>{doc.issuer}</dd><dt>วันที่ออก</dt><dd>{doc.issuedAt}</dd><dt>หมดอายุ</dt><dd>{doc.expiresAt||"ไม่ได้ระบุ"}</dd></dl><DocumentPreview doc={doc}/></Panel>
      <Panel title="ยืนยันการรับเอกสาร">{doc.receivedAt?<><Badge status="RECEIVED"/><p>รับเมื่อ {doc.receivedAt} · {doc.receivedChannel||"ข้อมูลตัวอย่าง"}</p></>:<>
        <label className="row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>ฉันได้รับเอกสารนี้จริงแล้ว (จำลอง)</label>
        <OperationForm fields={[{name:"receivedAt",label:"วันที่รับจริง",type:"date",value:businessDate(),required:true},{name:"channel",label:"ช่องทางรับ",value:"ไฟล์ตัวอย่างในระบบ",required:true}]} submitLabel="ยืนยันว่าได้รับเอกสารแล้ว" disabled={!confirmed||stage.application.decisionStatus!=="APPROVED"} onSave={v=>mutate("confirmReceipt",{documentId:doc.id,receivedAt:v.receivedAt,channel:v.channel,confirmation:confirmed})}/>
      </>}</Panel>
      <CorrectionPanel employmentId={employment.id} targetType={type==="VISA"?"VISA":"WORK_PERMIT"} targetId={doc.id}/>
    </>}
    {type==="VISA"&&doc?.receivedAt&&<Link className="button" href={"/worker/travel?employmentId="+employment.id}>ดำเนินการแผนเดินทาง</Link>}
  </>;
}
export function StageSelector({employment,kind}:{employment:Employment;kind:"VISA"|"WORK_PERMIT"}) {
  const {data}=useDemo();const stages=data.stages.filter(s=>s.employmentId===employment.id&&s.type===kind);
  return <Panel title="เลือกคำร้องที่ต้องการดู">{stages.map(s=><div className="document-row" key={s.id}><Link href={"/worker/"+(kind==="VISA"?"visa":"work-permit")+"?employmentId="+employment.id+"&applicationId="+s.application.id}>คำร้อง {s.application.id} · ชุด {s.id}</Link><Badge status={stageStatus(s,data.documents)}/></div>)}{!stages.length&&<Empty>ยังไม่มีคำร้องประเภทนี้</Empty>}</Panel>;
}
