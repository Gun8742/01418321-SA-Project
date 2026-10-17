"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useDemo } from "@/features/demo/context";
import { statusLabels, type DemoDocument, type OperationResult } from "@/features/demo/model";
import { validateDemoFile } from "@/features/demo/files";

export function Heading({title,description,status}:{title:string;description?:string;status?:string}) {
  return <header className="heading"><h1>{title}</h1>{description&&<p>{description}</p>}{status&&<Badge status={status}/>}</header>;
}
export function Panel({title,children}:{title?:string;children:ReactNode}) {
  return <section className="panel stack-tight">{title&&<h2>{title}</h2>}{children}</section>;
}
export function Badge({status}:{status:string}) {
  const tone=["REJECTED","DENIED","NOT_READY"].includes(status)?"error":["PENDING","AWAITING_SUBMISSION_CONFIRMATION","ADDITIONAL_DOCUMENTS","ADDITIONAL_TESTS","OPEN","AWAITING_REVIEW"].includes(status)?"warning":["NOT_DECIDED","NOT_SUBMITTED","PLANNED","DRAFT","PENDING_VERIFICATION"].includes(status)?"info":"";
  return <span className={"badge "+tone}>{statusLabels[status]??status}</span>;
}
export function Banner({children,tone="info"}:{children:ReactNode;tone?:"info"|"warning"|"error"}) { return <div className={"banner "+tone}>{children}</div>; }
export function Empty({children}:{children:ReactNode}) {return <p className="muted">{children}</p>;}
export function NotFound() {return <Panel title="ไม่พบข้อมูลที่เข้าถึงได้"><p>รายการไม่มีอยู่หรืออยู่นอกขอบเขตบัญชีนี้ กรุณาเลือกจากเมนูใหม่</p></Panel>;}
export function ReadFailure() {
  const {setReadError}=useDemo();
  return <Panel title="โหลดข้อมูลไม่สำเร็จ"><Banner tone="error">กำลังจำลองข้อผิดพลาด ข้อมูลเดิมยังไม่เปลี่ยน</Banner><button className="button" onClick={()=>setReadError(false)}>ลองโหลดอีกครั้ง</button></Panel>;
}
export type FieldSpec={name:string;label:string;value?:string;type?:"text"|"email"|"date"|"textarea"|"select"|"password";options?:{value:string;label:string}[];required?:boolean;errorPath?:string;hint?:string;fullWidth?:boolean;readOnly?:boolean};
export type FormValues=Record<string,string>;
export function OperationForm({fields,submitLabel="บันทึกข้อมูล",onSave,onSuccess,modes,disabled=false,children}:{
  fields:FieldSpec[];submitLabel?:string;onSave:(values:FormValues,mode:string)=>Promise<OperationResult>;
  onSuccess?:(id:string)=>void;modes?:{value:string;label:string}[];disabled?:boolean;children?:ReactNode;
}) {
  const {pending}=useDemo();
  const [feedback,setFeedback]=useState<{message:string;error:boolean}|null>(null);
  const [errors,setErrors]=useState<Record<string,string[]>>({});
  const summary=useRef<HTMLDivElement>(null);
  const formRef=useRef<HTMLFormElement>(null);
  const dirty=useRef(false);
  useEffect(()=>{
    function beforeUnload(event:BeforeUnloadEvent) {if(dirty.current){event.preventDefault();}}
    function guardNavigation(event:MouseEvent) {
      const link=event.target instanceof Element?event.target.closest("a"):null;
      if(dirty.current&&link&&link.href!==window.location.href&&!window.confirm("มีข้อมูลที่ยังไม่บันทึก ต้องการทิ้งข้อมูลและเปลี่ยนหน้าหรือไม่?")){event.preventDefault();event.stopPropagation();}
    }
    window.addEventListener("beforeunload",beforeUnload);document.addEventListener("click",guardNavigation,true);
    return()=>{window.removeEventListener("beforeunload",beforeUnload);document.removeEventListener("click",guardNavigation,true);};
  },[]);
  useEffect(()=>{if(feedback)summary.current?.focus();},[feedback]);
  async function handleSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(pending||disabled)return;
    const form=event.currentTarget;
    const values:FormValues={};for(const [key,value]of new FormData(form))if(typeof value==="string")values[key]=value;
    const submitter=event.nativeEvent instanceof SubmitEvent?event.nativeEvent.submitter:null;
    const mode=submitter instanceof HTMLButtonElement?submitter.value:"SAVE";
    const nextErrors:Record<string,string[]>={};
    for(const field of fields)if(mode!=="DRAFT"&&field.required&&!values[field.name]?.trim())nextErrors[field.name]=["กรุณาระบุ"+field.label.replace(" *","")];
    if(Object.keys(nextErrors).length){setErrors(nextErrors);setFeedback({message:"กรุณาตรวจช่องที่จำเป็นก่อนบันทึก",error:true});return;}
    const result=await onSave(values,mode);
    if(!result.ok) {setErrors(result.error.fieldErrors??{});setFeedback({message:result.error.message,error:true});return;}
    dirty.current=false;setErrors({});setFeedback({message:"บันทึกข้อมูลสมมติแล้ว",error:false});onSuccess?.(result.data.id);
  }
  return <form ref={formRef} className="stack-tight" onSubmit={handleSubmit} noValidate onChange={()=>{dirty.current=true;}}>
    {feedback&&<div ref={summary} role={feedback.error?"alert":"status"} tabIndex={-1} className={"banner "+(feedback.error?"error":"")}>{feedback.message}</div>}
    <div className="form-grid">{fields.map(field=>{
      const fieldErrors=errors[field.name]??errors[field.errorPath??field.name];
      const common={id:field.name,name:field.name,defaultValue:field.value??"",required:field.required,readOnly:field.readOnly,"aria-invalid":!!fieldErrors,"aria-describedby":fieldErrors?field.name+"-error":field.hint?field.name+"-hint":undefined,disabled:disabled||pending};
      return <div className={"field "+(field.fullWidth?"full-width":"")} key={field.name}>
        <label htmlFor={field.name}>{field.label}{field.required?" *":""}</label>
        {field.type==="select"?<select {...common}>{field.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:field.type==="textarea"?<textarea {...common}/>:<input {...common} type={field.type??"text"}/>}
        {field.hint&&<small id={field.name+"-hint"} className="muted">{field.hint}</small>}
        {fieldErrors&&<span className="field-error" id={field.name+"-error"}>{fieldErrors.join(" · ")}</span>}
      </div>;
    })}</div>
    {children}
    <div className="row"><button className="button" type="submit" value="SAVE" disabled={pending||disabled}>{pending?"กำลังบันทึก…":submitLabel}</button>
      {modes?.map(m=><button className="button secondary" type="submit" key={m.value} value={m.value} disabled={pending||disabled}>{m.label}</button>)}
    </div>
  </form>;
}
export function DocumentPreview({doc}:{doc:DemoDocument}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [downloaded,setDownloaded]=useState(false);
  function downloadSample() {
    const blob=new Blob(["SYNTHETIC DEMO ONLY\nSA / WORKFORCE\n"+doc.title+"\n"+doc.documentNo+"\nNot an official document. Downloading does not confirm receipt."],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="SA-DEMO-"+doc.id+".txt";a.click();URL.revokeObjectURL(url);setDownloaded(true);
  }
  return <>
    <button className="button secondary" type="button" onClick={()=>dialog.current?.showModal()}>ดูเอกสาร</button>
    <dialog ref={dialog} aria-labelledby={"preview-"+doc.id}>
      <div className="stack"><h2 id={"preview-"+doc.id}>{doc.title}</h2><Banner>Preview จำลอง · ไม่ใช่เอกสารราชการ ระบบเก็บเฉพาะ metadata ไม่เก็บไฟล์ที่เลือก</Banner>
        <dl className="metadata"><dt>เลขที่เอกสาร</dt><dd>{doc.documentNo||"ไม่มีเลขที่"}</dd><dt>ผู้ออก</dt><dd>{doc.issuer||"ข้อมูลสมมติ"}</dd><dt>ชื่อไฟล์ที่อ้างอิง</dt><dd>{doc.fileName}</dd></dl>
        {downloaded&&<p role="status">ดาวน์โหลดไฟล์ข้อความสาธิตแล้ว ยังไม่ถือว่ายืนยันการรับ</p>}
        <div className="row"><button className="button" onClick={downloadSample}>ดาวน์โหลดตัวอย่างจำลอง</button><button className="button secondary" onClick={()=>dialog.current?.close()}>ปิด</button></div>
      </div>
    </dialog>
  </>;
}
export function DocumentLibrary({employmentId}:{employmentId:string}) {
  const {data,mutate,pending}=useDemo();
  const [message,setMessage]=useState("");
  const [checking,setChecking]=useState(false);
  const docs=data.documents.filter(d=>d.employmentId===employmentId);
  async function handleFile(event:React.ChangeEvent<HTMLInputElement>) {
    const file=event.currentTarget.files?.[0];if(!file)return;
    setChecking(true);
    try {
      const error=await validateDemoFile(file);
      if(error){setMessage(error);return;}
      const result=await mutate("addSupportingDocument",{employmentId,title:file.name,fileName:file.name});
      setMessage(result.ok?"เพิ่มข้อมูลไฟล์ตัวอย่างแล้ว (ไม่อัปโหลดเนื้อหาไฟล์)":result.error.message);
    } catch {setMessage("อ่านไฟล์ไม่ได้ กรุณาเลือกไฟล์ใหม่");}
    finally{setChecking(false);}
  }
  async function addSample() {
    const result=await mutate("addSupportingDocument",{employmentId,title:"หลักฐานตัวอย่างสมมติ",fileName:"DEMO-evidence.pdf"});
    setMessage(result.ok?"เพิ่มหลักฐานตัวอย่างสมมติแล้ว":result.error.message);
  }
  return <Panel title="เอกสารในบริบทการจ้างนี้">
    <p className="muted small">โหมดสาธิต: เลือก PDF / JPEG / PNG ไม่เกิน 5 MiB ตรวจชนิดไฟล์จริง เก็บเฉพาะชื่อและ metadata ใน browser</p>
    <div className="field"><label htmlFor={"upload-"+employmentId}>เพิ่มเอกสารประกอบ</label><input id={"upload-"+employmentId} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} disabled={pending||checking}/></div>
    <button className="button secondary" onClick={addSample} disabled={pending||checking}>เพิ่มหลักฐานสมมติสำหรับทดลอง</button>
    {message&&<p role="status">{message}</p>}
    {checking&&<p role="status">กำลังตรวจไฟล์…</p>}
    {docs.map(d=><div className="document-row" key={d.id}><div><strong>{d.title}</strong><p className="muted small">{d.fileName}</p></div><DocumentPreview doc={d}/></div>)}
    {!docs.length&&<Empty>ยังไม่มีเอกสาร เพิ่มไฟล์หรือใช้หลักฐานสมมติเพื่อทดลอง flow</Empty>}
  </Panel>;
}
export function documentOptions(docs:DemoDocument[],empty="ยังไม่เลือก") {return [{value:"",label:empty},...docs.map(d=>({value:d.id,label:d.title+" · "+d.id}))];}
