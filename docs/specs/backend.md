# Backend specification

สถานะ: Proposed implementation บน Modular Monolith ตาม [Architecture](../architecture.md)
ยังไม่เลือกรุ่น dependencies และไม่ได้ยืนยัน library APIs; Spec กำหนดพฤติกรรม ไม่ใช่โค้ดที่รันแล้ว

## Boundary และ Dependency

Route/Server Action ทำหน้าที่ parse request → เรียก named application operation → map response
Operation รับ ActorContext จาก trusted session, validate input, ตรวจ ownership/transition, persistence และคืน safe DTO
Business rules ไม่ผูก React/HTTP; persistence และ private storage อยู่ฝั่ง Server เท่านั้น ไม่ expose ORM record ให้ Client
Shared schema/DTO เป็น pure types/validation; module อื่นเรียก operation แทนเข้าตารางของกันเองจาก UI

ใช้ Server Actions สำหรับ first-party form mutations เป็นข้อเสนอ; Auth callback และไฟล์ใช้ HTTP handlers ตาม integration ที่เลือก
ทุกช่องทางต้องเรียก policy/operation เดียวกัน ไม่ถือว่า Server Actions ปลอดภัยจากการเป็น internal function
ไม่สร้าง REST API ครบทุก UC หรือแยก Go service จนกว่าจะมี consumer ที่ต้องใช้

## Operation catalog

ชื่อเป็น application contract ที่เสนอ ไม่ใช่ API ของ framework; errors และ envelope ตาม [Data Contract](data-contract.md)

| Operation | UC / Module | Input สำคัญ | Output / invariant |
|---|---|---|---|
| listWorkers, getWorkerEmployment | UC-04 workers/employment | query/page หรือ workerId/employmentId | เฉพาะ Employer scope; count ไม่รวมผู้อื่น |
| saveWorkerEmployment | UC-04 workers/employment | worker draft, employment draft, expectedVersion, requestId | Worker + Employment บันทึก atomic; ไม่ซ้ำเมื่อ request retry |
| createDocumentSet, savePreparation | UC-01/02/05 documents + business module | employmentId/type/caseKey หรือ setId/fields, expectedVersion | draft ชุดใหม่; ไม่แทน set ของคำร้องเก่า |
| linkDocument, unlinkDocument | UC-01/02/05 documents | setId/documentId, expectedVersion | ownership ถูกต้อง; เปลี่ยนหลัง review ต้อง reset readiness |
| reviewDocumentSet | UC-01/02/06 documents + business module | setId/checklistVersion, expectedVersion | Server ตรวจ required fields/files; READY เฉพาะเมื่อครบ |
| recordSubmission | UC-01/03/11 | setId, submission draft/evidence, expectedVersion, requestId | application เดียวต่อ set; evidence ไม่ครบคง awaiting confirmation |
| recordDecision | UC-01/03/11 | applicationId/decision/evidence/reason, expectedVersion, requestId | ต้อง SUBMITTED; หลักฐานกับผลต้องเป็นคำร้องเดียวกัน |
| addRequestedDocuments | UC-01/03/11 | applicationId, requestedItemIds/documentIds, expectedVersion | คำร้องเดิม; review การแก้ก่อนบันทึก resubmission; เก็บ previous decision evidence |
| attachIssuedDocument | UC-03/11 | applicationId, metadata, ready evidence, expectedVersion | APPROVED และเอกสารของ Worker เดียวกัน; ยังไม่สร้าง receipt |
| getOwnOverview, getOwnDocument | UC-07/10 + Summary | active employment/application context | own-safe DTO และ availableActions |
| confirmReceipt | UC-07/10 documents | documentId/receivedAt/channel/confirmation, requestId | unique receipt/document; actual confirmation เท่านั้น |
| saveTravelPlan | UC-08 travel | visaDocumentId, plan, expectedVersion | PLANNED; ไม่สร้างผล ALLOWED |
| recordEntryResult | UC-08 travel | entryId/result/decisionAt/evidence, expectedVersion | scope + entry:record-evidence capability; DENIED ปิดเส้นทาง |
| saveHealthVisit | UC-09 medical | entryId/hospital/visit, expectedVersion | ALLOWED evidence gate; บันทึกนัด/visit ไม่ยืนยันใบรับรอง |
| recordHealthResult, confirmMedicalCertificate | UC-09 medical | healthCheckId/result/evidence หรือ certificate, expectedVersion | medical:record-evidence capability; ไม่วินิจฉัยเอง |
| reportCorrection, resolveCorrection | Supporting | target/reason/evidence หรือ correctionId/resolution, expectedVersion | worker แจ้งตนเอง; Employer แก้เฉพาะ scope; ไม่แก้ issued metadata เงียบ ๆ |
| initiateUpload, completeUpload, authorizeDownload | Shared documents | purpose/size/type/owner context หรือ uploadId/documentId | ตรวจ session/scope/bytes; private file; URL อายุจำกัด |
| signIn, signOut, resolveActor | Supporting auth | credentials หรือ trusted session | Auth library integration หลังตัดสิน O-01; คืน session-safe context |

Read queries สำหรับชุด/คำขอ/entry/medical คืน detail DTO กับ permissions/blockers ตาม scope เดียวกับ mutation
Status update ทั่วไปแบบ setStatus(any string) ไม่อยู่ใน public contract

## Mutation และ Concurrency

1. Authenticate, parse/validate, load resource ภายใน scope; check expectedVersion
2. ตรวจ prerequisites และ evidence ปัจจุบันจาก DB; ไม่เชื่อ status/Actor/owner ที่ Client ส่งมา
3. ใน transaction เขียน records ที่ต้องสอดคล้องกัน, transition, version increment และ operation receipt สำหรับ retry
4. Commit แล้วคืน DTO ใหม่; invalidate cache ที่เกี่ยวข้องหลัง commit; failure ไม่ส่ง success

ใช้ optimistic version ต่อ aggregate (Worker/Employment/DocumentSet/Application/EntryRecord/HealthCheck/Correction)
เมื่อเปลี่ยน child ที่กระทบ readiness ให้เพิ่ม version ของ DocumentSet ใน transaction เดียวกัน
Conflict คืน CONFLICT กับคำแนะนำ reload; ไม่ overwrite ข้อมูลใหม่ด้วย form เก่า
requestId ใช้ป้องกัน retry หลัง network timeout: key ผูก actor + operation + requestId, เก็บ payload digest และ result reference ใน transaction
payload เดิมคืนผลเดิม; reuse key กับ payload ต่างคืน CONFLICT; ยังตรวจสิทธิ์ปัจจุบันก่อนคืนผล
Unique constraints ยังเป็น backstop แม้ UI disable submit แล้ว
รายละเอียด operation receipt เป็น schema extension ข้อเสนอใน [Database](database.md); ไม่ต้องสร้าง workflow engine/queue ทั่วไป

Atomicity: review+checklist outcome, submission+evidence links, decision+history, issued document+links, receipt, entry result+evidence และ medical certificate+links ต้องสำเร็จพร้อมกันตาม operation
การแจ้งผลสำเร็จหมายถึง commit สำเร็จ; timeout หลัง commit ต้อง reconcile ด้วย requestId ก่อนทำซ้ำ

## File lifecycle

ข้อเสนอ PDF/JPEG/PNG ไม่เกิน 5 MiB ต่อไฟล์; ตรวจ extension, declared MIME, signature/decoded type และขนาดจริง ห้าม HTML/SVG/executable
กรณีชนิดไม่ชัด/ตรวจไม่ได้ให้ reject; เอกสารใหญ่กว่านี้เป็น open capacity decision ไม่ bypass validation
initiateUpload ตรวจ scope/purpose → temporary private object → completeUpload ตรวจ bytes และ owner → สร้าง Document/link ใน transaction
Client ไม่กำหนด storage key และใช้ documentId ของคนอื่นไม่ได้; ไฟล์ temporary ไม่ปรากฏในชุดเอกสาร
DB rollback ทิ้ง upload เป็น orphan ที่ cleanup ได้; ห้ามลบ object ที่ยังมี Document/reference ใช้
เสนอ cleanup temporary ที่ไม่อ้างอิงเกิน 24 ชั่วโมง; recheck reference ก่อนลบ; retention ของไฟล์ถาวรรอ O-04
Downloads ตรวจสิทธิ์ทุกครั้งแล้ว stream หรือ signed URL อายุ 60 วินาที, attachment filename ปลอดภัย, private/no-store; ไม่ log URL
การดาวน์โหลดไม่สร้าง DocumentReceipt; upload failure ไม่เปลี่ยน readiness/decision

## Failure และ Operational boundary

Validation → VALIDATION_ERROR; session หมด → UNAUTHENTICATED; scope ไม่ตรง → NOT_FOUND; action ไม่อนุญาต → FORBIDDEN
Missing prerequisite → PRECONDITION_FAILED; stale version/duplicate different payload → CONFLICT
Storage/DB failure → SAVE_FAILED/FILE_UNAVAILABLE ตามกรณี; ส่ง reference ที่ติดตามได้ ไม่ส่ง stack trace/SQL
Logs เก็บ requestId, operation, actor ID ที่จำเป็น, outcome, duration โดยไม่เก็บ credentials, เอกสารหรือ form body
เสนอ health check ของ process/DB/storage สำหรับ deployment; รายละเอียด host, backup/restore, retention และ SLO ต้องอนุมัติก่อนใช้งานจริง
ไม่เพิ่ม notification workers/agency integrations ใน scope นี้
