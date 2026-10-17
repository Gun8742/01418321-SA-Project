"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDemo } from "./context";
import { visibleEmployments } from "./model";
import { Heading, NotFound, Panel, ReadFailure } from "@/components/ui/primitives";
import { WorkerOverview, WorkerDocument, StageSelector } from "@/features/documents/components/worker-documents";
import { TravelView } from "@/features/travel/components/travel-view";
import { MedicalView } from "@/features/medical/components/medical-view";
export function WorkerRouter({section="overview"}:{section?:string}) {
  const {data,actor,readError}=useDemo();const query=useSearchParams();if(readError)return <ReadFailure/>;
  if(!actor||actor.role!=="WORKER")return <NotFound/>;
  if(!["overview","visa","travel","medical","work-permit"].includes(section))return <NotFound/>;
  const items=visibleEmployments(data,actor);const employmentId=query.get("employmentId");
  const employment=employmentId?items.find(e=>e.id===employmentId):items.length===1?items[0]:undefined;
  const path="/worker"+(section==="overview"?"":"/"+section);
  if(employmentId&&!employment)return <NotFound/>;
  if(!employment)return <><Heading title="เลือกบริบทการจ้างของฉัน" description="แต่ละการจ้างมีคำขอและเอกสารแยกกัน โปรดเลือกเพื่อดูข้อมูลให้ตรงรายการ"/>
    <Panel title="การจ้างที่เข้าถึงได้">{items.map(e=><div className="document-row" key={e.id}><div><strong>{e.job}</strong><p className="muted">{e.startDate} ถึง {e.endDate} · การจ้าง {e.id}</p></div><Link className="button secondary" href={path+"?employmentId="+e.id}>เลือกการจ้าง {e.id}</Link></div>)}</Panel></>;
  let content;
  if(section==="overview")content=<WorkerOverview employment={employment}/>;
  else if(section==="travel")content=<TravelView employment={employment} entryId={query.get("entryId")??undefined} visaDocumentId={query.get("visaDocumentId")??undefined}/>;
  else if(section==="medical")content=<MedicalView employment={employment} entryId={query.get("entryId")??undefined}/>;
  else {
    const kind=section==="visa"?"VISA":"WORK_PERMIT";
    const stages=data.stages.filter(s=>s.employmentId===employment.id&&s.type===kind);
    const applicationId=query.get("applicationId");const stage=applicationId?stages.find(s=>s.application.id===applicationId):stages.length===1?stages[0]:undefined;
    content=applicationId&&!stage?<NotFound/>:stage?<WorkerDocument key={stage.id} stage={stage} employment={employment}/>:<StageSelector employment={employment} kind={kind}/>;
  }
  return <><div className="row small"><span>การจ้าง {employment.id} · {employment.job}</span><Link href={path}>เปลี่ยนการจ้าง</Link></div>{content}</>;
}
