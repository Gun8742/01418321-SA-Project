import { z } from "zod";
import { emptyStage } from "./fixtures";
import {
  dateSchema, employmentFieldsSchema, idSchema, kindSchema, noteSchema, profileSchema, requiredText, targetSchema,
  type Actor, type CaseKind, type DemoData, type Employment, type OperationName, type OperationResult, type Stage,
} from "./model";

class OperationError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
function requireRule(condition: unknown, message: string, code="PRECONDITION_FAILED"): asserts condition {
  if(!condition) throw new OperationError(code,message);
}
export function scopedEmployment(data: DemoData, actor: Actor, employmentId: string, workerId?:string): Employment {
  const employment=data.employments.find(e=>e.id===employmentId);
  requireRule(employment && (!workerId || employment.workerId===workerId) &&
    (actor.role==="EMPLOYER" ? employment.employerId===actor.employerId : employment.workerId===actor.workerId),
    "ไม่พบข้อมูลในขอบเขตที่คุณมีสิทธิ์","NOT_FOUND");
  return employment;
}
function employer(actor: Actor) { requireRule(actor.role==="EMPLOYER","บัญชีนี้ไม่มีสิทธิ์ดำเนินการ","FORBIDDEN"); }
function worker(actor: Actor) { requireRule(actor.role==="WORKER","ต้องยืนยันด้วยบัญชีลูกจ้างเจ้าของเอกสาร","FORBIDDEN"); }
function currentVersion(actual:number,expected:number) { requireRule(actual===expected,"ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนลองใหม่","CONFLICT"); }
function allocate(data:DemoData) { return String(data.nextId++); }
function findStage(data:DemoData,actor:Actor,id:string) {
  const stage=data.stages.find(s=>s.id===id);
  requireRule(stage,"ไม่พบชุดเอกสาร","NOT_FOUND");scopedEmployment(data,actor,stage.employmentId);return stage;
}
function findByKind(data:DemoData,employmentId:string,type:CaseKind) {
  return data.stages.find(s=>s.employmentId===employmentId&&s.type===type&&s.application.decisionStatus==="APPROVED"&&s.application.issuedDocumentId);
}
export function preparationBlocker(data:DemoData,employmentId:string,type:CaseKind,caseKey="AFTER_ENTRY"): string | null {
  if(type==="VISA"&&!findByKind(data,employmentId,"PRE_ARRIVAL")) return "ต้องมีผลอนุมัติและหนังสืออนุมัติจากคำขอก่อนเดินทาง";
  if(type==="WORK_PERMIT"&&caseKey==="AFTER_ENTRY") {
    const entry=data.entries.find(e=>e.employmentId===employmentId&&e.entryResult==="ALLOWED");
    const health=data.healthChecks.find(h=>h.entryId===entry?.id&&h.resultStatus==="COMPLETE"&&h.certificateDocumentId);
    if(!entry||!health) return "กรณีหลังเข้าประเทศ ต้องมีผลอนุญาตเข้าเมืองและใบรับรองแพทย์ที่ยืนยันแล้ว";
  }
  return null;
}
function evidence(data:DemoData,employmentId:string,ids:string[],required=true) {
  requireRule(!required||ids.length>0,"กรุณาเลือกหลักฐานประกอบ");
  for(const id of ids) requireRule(data.documents.some(d=>d.id===id&&d.employmentId===employmentId),"หลักฐานไม่ตรงการจ้างหรือไม่มีสิทธิ์","NOT_FOUND");
}
const requestFields={requestId:z.string().min(1).max(100)};
const updateFields={...requestFields,expectedVersion:z.number().int().positive()};
const saveWorkerSchema=z.strictObject({
  ...requestFields,workerId:idSchema.optional(),employmentId:idSchema.optional(),
  expectedVersions:z.strictObject({worker:z.number().int(),employment:z.number().int()}).optional(),
  profile:profileSchema,employment:employmentFieldsSchema,
});
function saveWorkerEmployment(data:DemoData,actor:Actor,raw:unknown) {
  employer(actor);const input=saveWorkerSchema.parse(raw);
  requireRule(input.profile.passportIssuedAt<=input.profile.passportExpiresAt,"วันที่ออกหนังสือเดินทางต้องไม่หลังวันหมดอายุ");
  requireRule(input.employment.startDate<=input.employment.endDate,"วันสิ้นสุดการจ้างต้องไม่ก่อนวันเริ่ม");
  if(input.employmentId) {
    requireRule(input.workerId&&input.expectedVersions,"ต้องระบุบริบท Worker/Employment และ versions");
    const e=scopedEmployment(data,actor,input.employmentId,input.workerId);
    const w=data.workers.find(w=>w.id===e.workerId);requireRule(w,"ไม่พบลูกจ้าง","NOT_FOUND");
    currentVersion(e.version,input.expectedVersions.employment);currentVersion(w.version,input.expectedVersions.worker);
    Object.assign(w,input.profile,{version:w.version+1});Object.assign(e,input.employment,{version:e.version+1});
    for(const stage of data.stages.filter(s=>s.employmentId===e.id)) {
      stage.readinessStatus="AWAITING_REVIEW";stage.version++;
    }
    return e.id;
  }
  requireRule(!input.workerId,"การเพิ่มการจ้างให้คนเดิมต้องผ่าน duplicate policy ก่อน","PRECONDITION_FAILED");
  requireRule(!data.workers.some(w=>w.passportNo===input.profile.passportNo&&w.nationality===input.profile.nationality),
    "พบข้อมูลเดิม กรุณาเปิดรายการและตรวจสอบก่อนเพิ่ม","CONFLICT");
  const workerId=allocate(data),employmentId=allocate(data);
  data.workers.push({...input.profile,id:workerId,version:1});
  requireRule(actor.role==="EMPLOYER","ไม่มีสิทธิ์","FORBIDDEN");
  data.employments.push({...input.employment,id:employmentId,workerId,employerId:actor.employerId,version:1});
  return employmentId;
}
function createDocumentSet(data:DemoData,actor:Actor,raw:unknown) {
  employer(actor);
  const input=z.strictObject({...requestFields,employmentId:idSchema,type:kindSchema,caseKey:z.enum(["BEFORE_ENTRY","AFTER_ENTRY"])}).parse(raw);
  scopedEmployment(data,actor,input.employmentId);
  const blocker=preparationBlocker(data,input.employmentId,input.type,input.caseKey);requireRule(!blocker,blocker??"");
  const stage=emptyStage(allocate(data),input.employmentId,input.type);stage.application.id=allocate(data);stage.caseKey=input.caseKey;
  data.stages.push(stage);return stage.id;
}
function savePreparation(data:DemoData,actor:Actor,raw:unknown) {
  employer(actor);const input=z.strictObject({...updateFields,documentSetId:idSchema,country:requiredText,authority:requiredText,caseKey:z.enum(["BEFORE_ENTRY","AFTER_ENTRY"]),
    items:z.array(z.strictObject({requirementKey:z.string(),documentId:idSchema.nullable()}))}).parse(raw);
  const stage=findStage(data,actor,input.documentSetId);currentVersion(stage.version,input.expectedVersion);
  const blocker=preparationBlocker(data,stage.employmentId,stage.type,input.caseKey);requireRule(!blocker,blocker??"");
  requireRule(["NOT_DECIDED","ADDITIONAL_DOCUMENTS"].includes(stage.application.decisionStatus),"คำขอนี้ไม่เปิดแก้ชุดเอกสาร ต้องใช้ correction หรือคำขอใหม่");
  requireRule(input.items.length===stage.items.length&&new Set(input.items.map(i=>i.requirementKey)).size===stage.items.length,"Checklist ไม่ตรงเวอร์ชัน");
  for(const item of input.items) {
    const target=stage.items.find(i=>i.requirementKey===item.requirementKey);requireRule(target,"Checklist ไม่ตรงเวอร์ชัน");
    if(item.documentId)evidence(data,stage.employmentId,[item.documentId]);
    target.documentId=item.documentId;
  }
  stage.country=input.country;stage.authority=input.authority;stage.caseKey=input.caseKey;
  stage.readinessStatus=stage.items.some(i=>i.required&&!i.documentId)?"NOT_READY":"AWAITING_REVIEW";stage.version++;return stage.id;
}
function reviewDocumentSet(data:DemoData,actor:Actor,raw:unknown) {
  employer(actor);const input=z.strictObject({...updateFields,documentSetId:idSchema,checklistVersion:z.literal("DEMO-1")}).parse(raw);
  const stage=findStage(data,actor,input.documentSetId);currentVersion(stage.version,input.expectedVersion);
  const blocker=preparationBlocker(data,stage.employmentId,stage.type,stage.caseKey);requireRule(!blocker,blocker??"");
  requireRule(stage.items.every(i=>!i.required||i.documentId),"เอกสารไม่ครบ กรุณาเพิ่มรายการที่ขาดก่อนตรวจทาน");
  evidence(data,stage.employmentId,stage.items.flatMap(i=>i.documentId?[i.documentId]:[]));
  stage.readinessStatus="READY";stage.version++;return stage.id;
}
function recordSubmission(data:DemoData,actor:Actor,raw:unknown) {
  employer(actor);const input=z.strictObject({...updateFields,documentSetId:idSchema,expectedApplicationVersion:z.number().int(),
    authority:requiredText,receiptNo:z.string(),submittedAt:dateSchema.or(z.literal("")),acceptedEvidenceDocumentIds:z.array(idSchema)}).parse(raw);
  const stage=findStage(data,actor,input.documentSetId);currentVersion(stage.version,input.expectedVersion);currentVersion(stage.application.version,input.expectedApplicationVersion);
  requireRule(stage.readinessStatus==="READY","ชุดเอกสารยังไม่ผ่านการตรวจทาน");
  requireRule(["NOT_DECIDED","ADDITIONAL_DOCUMENTS"].includes(stage.application.decisionStatus),"คำร้องอยู่ระหว่างพิจารณาหรือมีผลแล้ว ไม่ยื่นซ้ำ");
  evidence(data,stage.employmentId,input.acceptedEvidenceDocumentIds,false);
  const confirmed=!!(input.receiptNo.trim()&&input.submittedAt&&input.acceptedEvidenceDocumentIds.length);
  const a=stage.application;a.authority=input.authority;a.receiptNo=input.receiptNo;a.submittedAt=input.submittedAt;
  a.evidenceDocumentIds=input.acceptedEvidenceDocumentIds;a.submissionStatus=confirmed?"SUBMITTED":"AWAITING_SUBMISSION_CONFIRMATION";
  a.decisionStatus=confirmed?"PENDING":"NOT_DECIDED";a.version++;stage.version++;
  a.history.push({label:confirmed?"บันทึกหลักฐานรับคำขอ / รอพิจารณา":"รอยืนยันหลักฐานรับคำขอ",at:new Date().toISOString()});return a.id;
}
function recordDecision(data:DemoData,actor:Actor,raw:unknown) {
  employer(actor);const input=z.strictObject({...updateFields,applicationId:idSchema,decision:z.enum(["PENDING","ADDITIONAL_DOCUMENTS","APPROVED","REJECTED"]),
    decidedAt:dateSchema.or(z.literal("")),evidenceDocumentIds:z.array(idSchema),reason:z.string().max(2000),requestedItems:z.string().max(2000)}).parse(raw);
  const stage=data.stages.find(s=>s.application.id===input.applicationId);requireRule(stage,"ไม่พบคำร้อง","NOT_FOUND");scopedEmployment(data,actor,stage.employmentId);
  const a=stage.application;currentVersion(a.version,input.expectedVersion);
  requireRule(a.submissionStatus==="SUBMITTED","ยังไม่มีหลักฐานยืนยันการยื่น");
  requireRule(!["APPROVED","REJECTED"].includes(a.decisionStatus),"ผลปลายทางแก้ผ่าน correction ตามสิทธิ์เท่านั้น");
  evidence(data,stage.employmentId,input.evidenceDocumentIds,input.decision!=="PENDING");
  requireRule(input.decision==="PENDING"||input.decidedAt,"กรุณาระบุวันที่ตามหลักฐาน");
  requireRule(!["REJECTED","ADDITIONAL_DOCUMENTS"].includes(input.decision)||input.reason.trim(),"กรุณาระบุเหตุผลตามหลักฐาน");
  requireRule(input.decision!=="ADDITIONAL_DOCUMENTS"||input.requestedItems.trim(),"กรุณาระบุเอกสารที่ขอเพิ่ม");
  a.decisionStatus=input.decision;a.reason=input.reason;a.requestedItems=input.requestedItems;a.decidedAt=input.decision==="PENDING"?"":input.decidedAt;
  a.evidenceDocumentIds=input.evidenceDocumentIds;a.version++;stage.version++;
  if(input.decision==="ADDITIONAL_DOCUMENTS") {
    stage.readinessStatus="AWAITING_REVIEW";
    stage.items.push({requirementKey:"additional-"+a.version,label:input.requestedItems,required:true,documentId:null});
  }
  a.history.push({label:input.decision+(input.reason?": "+input.reason:""),at:new Date().toISOString()});return a.id;
}
function addSupportingDocument(data:DemoData,actor:Actor,raw:unknown) {
  const input=z.strictObject({...requestFields,employmentId:idSchema,title:requiredText,fileName:requiredText}).parse(raw);
  const e=scopedEmployment(data,actor,input.employmentId);
  const id=allocate(data);data.documents.push({id,employmentId:e.id,workerId:e.workerId,title:input.title,type:"SUPPORTING",fileName:input.fileName,
    documentNo:"",issuer:"",issuedAt:"",expiresAt:"",availability:"DIGITAL_READY",receivedAt:null,receivedChannel:null});return id;
}
function attachIssuedDocument(data:DemoData,actor:Actor,raw:unknown) {
  employer(actor);const input=z.strictObject({...updateFields,applicationId:idSchema,documentNo:requiredText,issuer:requiredText,issuedAt:dateSchema,expiresAt:dateSchema.or(z.literal("")),fileName:requiredText}).parse(raw);
  const stage=data.stages.find(s=>s.application.id===input.applicationId);requireRule(stage,"ไม่พบคำร้อง","NOT_FOUND");const e=scopedEmployment(data,actor,stage.employmentId);
  currentVersion(stage.application.version,input.expectedVersion);requireRule(stage.application.decisionStatus==="APPROVED","ต้องมีผลอนุมัติก่อนแนบเอกสารออกจริง");
  requireRule(!stage.application.issuedDocumentId,"มีเอกสารออกจริงแล้ว ต้องใช้ correction/reissue policy","CONFLICT");
  requireRule(!input.expiresAt||input.issuedAt<=input.expiresAt,"วันหมดอายุต้องไม่ก่อนวันที่ออก");
  const id=allocate(data);data.documents.push({id,employmentId:e.id,workerId:e.workerId,title:stage.type==="PRE_ARRIVAL"?"หนังสืออนุมัติก่อนเดินทาง":stage.type,type:stage.type==="PRE_ARRIVAL"?"APPROVAL_LETTER":stage.type,fileName:input.fileName,
    documentNo:input.documentNo,issuer:input.issuer,issuedAt:input.issuedAt,expiresAt:input.expiresAt,availability:"DIGITAL_READY",receivedAt:null,receivedChannel:null});
  stage.application.issuedDocumentId=id;stage.application.version++;stage.version++;return id;
}
function confirmReceipt(data:DemoData,actor:Actor,raw:unknown) {
  worker(actor);const input=z.strictObject({...requestFields,documentId:idSchema,receivedAt:dateSchema,channel:requiredText,confirmation:z.literal(true)}).parse(raw);
  const doc=data.documents.find(d=>d.id===input.documentId);requireRule(doc,"ไม่พบเอกสาร","NOT_FOUND");scopedEmployment(data,actor,doc.employmentId);
  requireRule(doc.workerId=== (actor.role==="WORKER"?actor.workerId:"")&&["VISA","WORK_PERMIT"].includes(doc.type),"ไม่มีสิทธิ์รับเอกสารนี้","FORBIDDEN");
  requireRule(data.stages.some(s=>s.application.issuedDocumentId===doc.id&&s.application.decisionStatus==="APPROVED"),"ยังไม่มีผลอนุมัติหรือเอกสารพร้อมรับ");
  requireRule(input.receivedAt<=new Date().toISOString().slice(0,10),"วันที่รับต้องไม่อยู่ในอนาคต");
  if(doc.receivedAt) { requireRule(doc.receivedAt===input.receivedAt&&doc.receivedChannel===input.channel,"มีการยืนยันการรับแล้ว","CONFLICT");return doc.id; }
  doc.receivedAt=input.receivedAt;doc.receivedChannel=input.channel;return doc.id;
}
function saveTravelPlan(data:DemoData,actor:Actor,raw:unknown) {
  worker(actor);const input=z.strictObject({...requestFields,visaDocumentId:idSchema,entryId:idSchema.optional(),expectedVersion:z.number().int().optional(),
    mode:z.enum(["DRAFT","CONFIRM"]),plannedArrivalAt:dateSchema.or(z.literal("")),travelMode:z.enum(["AIR","LAND","SEA"]),port:z.string(),flightNo:z.string(),travelEvidenceDocumentIds:z.array(idSchema)}).parse(raw);
  const visa=data.documents.find(d=>d.id===input.visaDocumentId&&d.type==="VISA");requireRule(visa,"ไม่พบ Visa","NOT_FOUND");const e=scopedEmployment(data,actor,visa.employmentId);
  requireRule(visa.receivedAt,"ต้องยืนยันรับ Visa จริงก่อน");requireRule(!visa.expiresAt||visa.expiresAt>=input.plannedArrivalAt,"Visa หมดอายุก่อนวันที่เดินทาง");
  evidence(data,e.id,input.travelEvidenceDocumentIds,input.mode==="CONFIRM");
  if(input.mode==="CONFIRM") requireRule(input.plannedArrivalAt&&input.port.trim()&&(input.travelMode!=="AIR"||input.flightNo.trim()),"กรุณาระบุวันที่เดินทาง จุดผ่านแดน และเลขเที่ยวบินเมื่อเดินทางทางอากาศ");
  let entry=data.entries.find(t=>t.id===input.entryId);
  if(input.entryId) {requireRule(entry&&entry.employmentId===e.id,"ไม่พบรายการเดินทาง","NOT_FOUND");currentVersion(entry.version,input.expectedVersion??0);requireRule(entry.entryResult==="PLANNED","บันทึกผลเข้าเมืองแล้ว ไม่แก้แผนย้อนหลัง");}
  else {requireRule(!data.entries.some(t=>t.visaDocumentId===visa.id),"มีแผนของ Visa นี้แล้ว กรุณาเปิดรายการเดิม","CONFLICT");entry={id:allocate(data),employmentId:e.id,workerId:e.workerId,visaDocumentId:visa.id,version:0,planStatus:"DRAFT",plannedArrivalAt:"",travelMode:"AIR",port:"",flightNo:"",travelEvidenceDocumentIds:[],entryResult:"PLANNED",actualArrivalAt:"",permittedUntil:"",reason:"",evidenceDocumentIds:[]};data.entries.push(entry);}
  requireRule(entry,"ไม่พบข้อมูล","NOT_FOUND");
  requireRule(entry.planStatus!=="CONFIRMED"||input.mode==="CONFIRM","แผนยืนยันแล้วไม่เปลี่ยนกลับเป็น draft");
  Object.assign(entry,{plannedArrivalAt:input.plannedArrivalAt,travelMode:input.travelMode,port:input.port,flightNo:input.flightNo,travelEvidenceDocumentIds:input.travelEvidenceDocumentIds,planStatus:input.mode==="CONFIRM"?"CONFIRMED":"DRAFT",version:entry.version+1});
  return entry.id;
}
function recordEntryResult(data:DemoData,actor:Actor,raw:unknown,grants:boolean) {
  requireRule(grants,"ต้องมี capability entry:record-evidence (จำลอง)","FORBIDDEN");
  const input=z.strictObject({...updateFields,entryId:idSchema,result:z.enum(["PENDING_VERIFICATION","ALLOWED","DENIED"]),actualArrivalAt:dateSchema.or(z.literal("")),permittedUntil:dateSchema.or(z.literal("")),reason:z.string(),evidenceDocumentIds:z.array(idSchema)}).parse(raw);
  const entry=data.entries.find(e=>e.id===input.entryId);requireRule(entry,"ไม่พบรายการ","NOT_FOUND");scopedEmployment(data,actor,entry.employmentId);currentVersion(entry.version,input.expectedVersion);
  requireRule(entry.planStatus==="CONFIRMED","ต้องยืนยันแผนเดินทางก่อน");requireRule(!["ALLOWED","DENIED"].includes(entry.entryResult),"ผลสุดท้ายแก้ผ่าน correction policy");
  evidence(data,entry.employmentId,input.evidenceDocumentIds,input.result!=="PENDING_VERIFICATION");
  requireRule(input.result==="PENDING_VERIFICATION"||(input.actualArrivalAt&&input.reason.trim()),"กรุณาระบุวันและเหตุผลตามหลักฐาน");
  entry.entryResult=input.result;entry.actualArrivalAt=input.actualArrivalAt;entry.permittedUntil=input.permittedUntil;entry.reason=input.reason;entry.evidenceDocumentIds=input.evidenceDocumentIds;entry.version++;return entry.id;
}
function saveHealthVisit(data:DemoData,actor:Actor,raw:unknown) {
  worker(actor);const input=z.strictObject({...requestFields,entryId:idSchema,healthCheckId:idSchema.optional(),expectedVersion:z.number().int().optional(),hospitalName:requiredText,examDate:dateSchema}).parse(raw);
  const entry=data.entries.find(e=>e.id===input.entryId);requireRule(entry,"ไม่พบผลเข้าเมือง","NOT_FOUND");scopedEmployment(data,actor,entry.employmentId);requireRule(entry.entryResult==="ALLOWED","ต้องมีผลอนุญาตเข้าประเทศก่อน");
  const existing=data.healthChecks.find(h=>h.id===input.healthCheckId);
  if(input.healthCheckId) {
    requireRule(existing&&existing.entryId===entry.id,"ไม่พบรายการตรวจ","NOT_FOUND");currentVersion(existing.version,input.expectedVersion??0);
    requireRule(existing.resultStatus==="PENDING"&&!existing.certificateDocumentId&&!existing.evidenceDocumentIds.length,"HEALTH_VISIT_LOCKED: มีผลหรือใบรับรองแล้ว ไม่เปิดให้ reset");
    existing.hospitalName=input.hospitalName;existing.examDate=input.examDate;existing.version++;return existing.id;
  }
  requireRule(!data.healthChecks.some(h=>h.entryId===entry.id),"มีรายการตรวจเดิม กรุณาเปิดรายการเดิม","CONFLICT");
  const id=allocate(data);data.healthChecks.push({id,entryId:entry.id,employmentId:entry.employmentId,workerId:entry.workerId,version:1,hospitalName:input.hospitalName,examDate:input.examDate,resultStatus:"PENDING",pendingItems:"",doctorName:"",certificateDocumentId:null,evidenceDocumentIds:[]});return id;
}
function recordHealthResult(data:DemoData,actor:Actor,raw:unknown,grants:boolean) {
  requireRule(grants,"ต้องมี capability medical:record-evidence (จำลอง)","FORBIDDEN");
  const input=z.strictObject({...updateFields,healthCheckId:idSchema,result:z.enum(["PENDING","ADDITIONAL_TESTS","COMPLETE"]),pendingItems:z.string().max(2000),evidenceDocumentIds:z.array(idSchema)}).parse(raw);
  const health=data.healthChecks.find(h=>h.id===input.healthCheckId);requireRule(health,"ไม่พบรายการตรวจ","NOT_FOUND");scopedEmployment(data,actor,health.employmentId);currentVersion(health.version,input.expectedVersion);
  requireRule(!health.certificateDocumentId,"ยืนยันใบรับรองแล้ว ต้องใช้ correction policy");evidence(data,health.employmentId,input.evidenceDocumentIds);
  requireRule(input.result!=="ADDITIONAL_TESTS"||input.pendingItems.trim(),"ระบุรายการตรวจเพิ่มตามโรงพยาบาล");
  health.resultStatus=input.result;health.pendingItems=input.pendingItems;health.evidenceDocumentIds=input.evidenceDocumentIds;health.version++;return health.id;
}
function confirmMedicalCertificate(data:DemoData,actor:Actor,raw:unknown,grants:boolean) {
  requireRule(grants,"ต้องมี capability medical:record-evidence (จำลอง)","FORBIDDEN");
  const input=z.strictObject({...updateFields,healthCheckId:idSchema,doctorName:requiredText,issuedAt:dateSchema,certificateNo:z.string(),fileName:requiredText}).parse(raw);
  const health=data.healthChecks.find(h=>h.id===input.healthCheckId);requireRule(health,"ไม่พบรายการตรวจ","NOT_FOUND");scopedEmployment(data,actor,health.employmentId);currentVersion(health.version,input.expectedVersion);
  requireRule(health.resultStatus==="COMPLETE"&&!health.pendingItems,"ยังมีผลตรวจคงค้าง");requireRule(!health.certificateDocumentId,"มีใบรับรองแล้ว","CONFLICT");
  const id=allocate(data);data.documents.push({id,employmentId:health.employmentId,workerId:health.workerId,type:"CERTIFICATE",title:"ใบรับรองแพทย์ตัวอย่าง",fileName:input.fileName,documentNo:input.certificateNo,issuer:health.hospitalName,issuedAt:input.issuedAt,expiresAt:"",availability:"DIGITAL_READY",receivedAt:null,receivedChannel:null});
  health.certificateDocumentId=id;health.doctorName=input.doctorName;health.version++;return id;
}
function reportCorrection(data:DemoData,actor:Actor,raw:unknown) {
  worker(actor);const input=z.strictObject({...requestFields,targetType:targetSchema,targetId:idSchema,reason:noteSchema,evidenceDocumentIds:z.array(idSchema)}).parse(raw);
  const target=input.targetType==="ENTRY"?data.entries.find(e=>e.id===input.targetId):data.documents.find(d=>d.id===input.targetId&&d.type===input.targetType);
  requireRule(target,"ไม่พบข้อมูล","NOT_FOUND");const e=scopedEmployment(data,actor,target.employmentId);evidence(data,e.id,input.evidenceDocumentIds,false);
  const id=allocate(data);data.corrections.push({id,employmentId:e.id,workerId:e.workerId,targetType:input.targetType,targetId:input.targetId,reason:input.reason,evidenceDocumentIds:input.evidenceDocumentIds,status:"OPEN",resolution:"",reportedAt:new Date().toISOString(),resolvedAt:null,resolvedByAccountId:null,version:1});return id;
}
function resolveCorrection(data:DemoData,actor:Actor,raw:unknown) {
  employer(actor);const input=z.strictObject({...updateFields,correctionId:idSchema,resolution:noteSchema}).parse(raw);
  const correction=data.corrections.find(c=>c.id===input.correctionId);requireRule(correction,"ไม่พบคำแจ้ง","NOT_FOUND");scopedEmployment(data,actor,correction.employmentId);currentVersion(correction.version,input.expectedVersion);
  requireRule(correction.status==="OPEN","ปิดเรื่องแล้ว ไม่เปิดแก้คำตอบเดิม","CONFLICT");
  correction.status="RESOLVED";correction.resolution=input.resolution;correction.resolvedAt=new Date().toISOString();correction.resolvedByAccountId=actor.accountId;correction.version++;return correction.id;
}
function dispatch(data:DemoData,actor:Actor,name:OperationName,input:unknown,grants:boolean) {
  switch(name) {
    case "saveWorkerEmployment":return saveWorkerEmployment(data,actor,input);
    case "createDocumentSet":return createDocumentSet(data,actor,input);
    case "savePreparation":return savePreparation(data,actor,input);
    case "reviewDocumentSet":return reviewDocumentSet(data,actor,input);
    case "recordSubmission":return recordSubmission(data,actor,input);
    case "recordDecision":return recordDecision(data,actor,input);
    case "addSupportingDocument":return addSupportingDocument(data,actor,input);
    case "attachIssuedDocument":return attachIssuedDocument(data,actor,input);
    case "confirmReceipt":return confirmReceipt(data,actor,input);
    case "saveTravelPlan":return saveTravelPlan(data,actor,input);
    case "recordEntryResult":return recordEntryResult(data,actor,input,grants);
    case "saveHealthVisit":return saveHealthVisit(data,actor,input);
    case "recordHealthResult":return recordHealthResult(data,actor,input,grants);
    case "confirmMedicalCertificate":return confirmMedicalCertificate(data,actor,input,grants);
    case "reportCorrection":return reportCorrection(data,actor,input);
    case "resolveCorrection":return resolveCorrection(data,actor,input);
  }
}
// shortcut: browser-only simulation, replace with Server operations before using real data.
export function runOperation(original:DemoData,actor:Actor,name:OperationName,input:unknown,options={fail:false,grants:false}): {state:DemoData;result:OperationResult} {
  const parsed=z.object(requestFields).safeParse(input);
  const requestId=parsed.success?parsed.data.requestId:"invalid";
  try {
    requireRule(parsed.success,"คำขอไม่มี requestId","VALIDATION_ERROR");
    const key=actor.accountId+":"+name+":"+requestId;const digest=JSON.stringify(input);
    const previous=original.operationReceipts[key];
    if(previous) {requireRule(previous.digest===digest,"requestId เดิมมี payload ต่างกัน","CONFLICT");return {state:original,result:{ok:true,data:{id:previous.id},requestId}};}
    requireRule(!options.fail,"จำลองการบันทึกล้มเหลว ข้อมูลและสถานะยังเหมือนเดิม","SAVE_FAILED");
    const state=structuredClone(original);const id=dispatch(state,actor,name,input,options.grants);
    state.operationReceipts[key]={digest,id};
    return {state,result:{ok:true,data:{id},requestId}};
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors: Record<string,string[]>={};
      for(const issue of error.issues) {const key=issue.path.join(".")||"_form";(fieldErrors[key]??=[]).push(issue.message);}
      return {state:original,result:{ok:false,error:{code:"VALIDATION_ERROR",message:"ข้อมูลไม่ถูกต้อง กรุณาตรวจช่องที่ระบุ",fieldErrors,retryable:false},requestId}};
    }
    if(error instanceof OperationError) return {state:original,result:{ok:false,error:{code:error.code,message:error.message,retryable:error.code==="SAVE_FAILED"},requestId}};
    throw error;
  }
}
