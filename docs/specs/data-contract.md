# Data Contract

สถานะ: Proposed; ใช้ร่วม Frontend, Server adapter และ mock adapter
ค่าตัวอย่างใน [examples.json](examples.json) เป็น synthetic scenarios สำหรับตรวจ gates ไม่ใช่ fixture schema ที่พร้อม import เข้า DB

## Scalar และ Envelope

- ID/FK: non-empty positive decimal string เช่น "1001"; ห้าม JSON number สำหรับ BIGINT
- Date: YYYY-MM-DD Gregorian; datetime: RFC3339 UTC มี Z; UI แสดง Asia/Bangkok และ พ.ศ. ได้
- เงิน: decimal string + currency + unit; ห้าม binary floating point หรือ format commas ใน payload
- optional field: omit = ไม่แก้เมื่อ patch; null = ล้างค่าเมื่อ field รองรับ; empty string ไม่แทน null โดยอัตโนมัติ
- unknown input fields ถูก reject ที่ trust boundary; trim เฉพาะ human text ไม่ trim password/token
- enums ใช้ค่าจาก [Workflow](workflows.md); labels ภาษาไทยเป็น presentation ไม่ใช้เทียบ business rules

Success envelope: { ok: true, data: T, requestId: string }
Failure envelope: { ok: false, error: { code, message, fieldErrors?, blockingReasons?, retryable }, requestId: string }
fieldErrors เป็น map ของ field path → string[]; message ปลอดภัยและแปลไทยได้
blockingReasons เป็น array { code, message, resourceId? }; ห้ามส่ง resource ที่ไม่มีสิทธิ์
availableActions เป็น string[] จาก Server เพื่อ UI แต่ Server recheck เสมอ
Mutation input ใช้ requestId; existing aggregate ต้อง expectedVersion เป็น integer >= 1; composite mutation รับ expectedVersions ของทุก record ที่แก้ตาม [Backend Operations](backend/operations.md)
immutable Receipt ใช้ unique document + requestId แทน version; existing application/set ที่แก้ร่วมกันใช้ version guards ทั้งคู่
สร้างใหม่ไม่มี expectedVersion; ไม่ยอมให้ Client กำหนด role/ownership/status ที่ควร derive

## Errors และ transport

| Code | HTTP เมื่อใช้ Route Handler | ความหมาย / UI |
|---|---|---|
| VALIDATION_ERROR | 422 | แสดง fieldErrors, คง input |
| UNAUTHENTICATED | 401 | ไป Login; ไม่คง password/file bytes ใน URL/storage |
| FORBIDDEN | 403 | เห็น resource ได้แต่ทำ action ไม่ได้ |
| NOT_FOUND | 404 | ไม่มี resource หรืออยู่นอก scope |
| PRECONDITION_FAILED | 409 | แสดง blockers และลิงก์ขั้นตอนที่ต้องแก้ |
| CONFLICT | 409 | reload/reconcile ก่อน retry |
| FILE_TOO_LARGE | 413 | ลดขนาด/เปลี่ยนไฟล์ |
| UNSUPPORTED_FILE_TYPE | 415 | เลือกชนิดที่อนุญาต |
| FILE_UNAVAILABLE | 503 | retry หรือแจ้งผู้ดูแล; ไม่แสร้งดาวน์โหลดสำเร็จ |
| RATE_LIMITED | 429 | retry หลังเวลาที่ Server อนุญาต |
| SAVE_FAILED | 503 | เก็บ input; reconcile หาก outcome ไม่แน่ชัด |

Server Actions คืน envelope เดียวกันโดยไม่แสร้งว่ามี HTTP status ต่อ operation
Auth endpoint อาจใช้ library-native response; adapter ต้อง map เป็น safe UI result หลังตรวจ O-01

## DTO

| DTO | Fields ที่ public consumer ต้องใช้ |
|---|---|
| ActorContext | accountId, role: EMPLOYER/REPRESENTATIVE/WORKER, employerId หรือ workerId ตาม Role; ไม่มี hashes |
| WorkerSummary | workerId, displayName, nationality, maskedPassportNo, version; รายการการจ้างอ่านผ่าน listWorkerEmployments |
| EmploymentSummary | employmentId, workerId, job, startDate/endDate, version; เฉพาะ Employer scope ใช้ใน selector |
| WorkerEmploymentDetail | Worker fields ที่จำเป็นใน scope, employmentId, employer summary, job/dates/wage, versions |
| DocumentSetDetail | id, employmentId, type: PRE_ARRIVAL/VISA/WORK_PERMIT, caseKey, checklistVersion, readinessStatus, items, documents, applicationId?, version, blockers/actions |
| ChecklistItem | id, requirementKey, label, required, applicability, checkResult, missingReason?, documentIds |
| ApplicationDetail | id, documentSetId, submissionStatus, decisionStatus, authority?, receiptNo?, submittedAt?, decidedAt?, evidence references, requestedItems, version, blockers/actions |
| DocumentSummary | id, type, title, owner, metadata, availability, receipt summary?, actions; ไม่มี file_uri/storage key |
| EntryDetail | id, workerId, visaDocumentId, plan, planStatus: DRAFT/CONFIRMED, actual result/evidence, entryResult, version, blockers/actions |
| HealthDetail | id, workerId, entryId, hospital/visit/result/followup, certificateDocumentId?, resultStatus, version, blockers/actions |
| ReceiptDetail | id, documentId, workerId, receivedAt, channel, confirmedByAccountId |
| CorrectionDetail | id, targetType, targetId, employmentId, reason, evidenceDocumentIds, status, resolution?, reportedAt, resolvedAt?, resolvedByAccountId?, version, availableActions |

owner เป็น discriminated union: { kind: "EMPLOYER", employerId } หรือ { kind: "WORKER", workerId }; ส่งทั้งคู่ไม่ได้
availability เสนอ MISSING / DIGITAL_READY / PHYSICAL_READY; physical ต้องมีหลักฐาน/ช่องทางรับที่ยืนยัน ไม่ใช่ช่องติ๊กตามใจ
UC-11 ต้องแนบ Visa file จริงก่อนพร้อมรับ; PHYSICAL_READY อย่างเดียวไม่ผ่าน Visa gate ส่วน Work Permit ใช้ issued evidence และช่องทางตาม O-05
issued document metadata และ link ต้องผ่านตามประเภท; file upload ทั่วไปไม่เท่ากับ issued Visa/Work Permit
receipt summary เป็น null เมื่อยังไม่รับ; ห้ามเติม receivedAt จาก viewedAt/downloadedAt
Detail DTO ไม่จำเป็นต้องส่ง fields ทั้งตาราง; จำกัด sensitive fields เฉพาะ operation/use case ที่จำเป็น

## Input groups และ Referential rules

WorkerEmploymentDraft ใช้ fields ตาม [Frontend](frontend.md); create เชื่อม existing worker ที่มีสิทธิ์หรือสร้างใหม่ตาม duplicate policy O-06
การแก้ Employment เดิมต้องส่ง workerId และ employmentId คู่ที่ระบุใน URL; ไม่อนุญาตเปลี่ยนคู่ความสัมพันธ์ผ่าน draft หรือเลือกการจ้างล่าสุดโดย implicit
PreparationInput: documentSetId หรือ new employmentId/type/caseKey, fields ที่ whitelist ตามประเภท, linked documentIds
SubmissionInput: applicationId หรือ documentSetId, authority/submittedAt/receiptNo/acceptedEvidenceDocumentIds
DecisionInput: applicationId, decision, decidedAt, evidenceDocumentIds, reason?, requestedItems?
IssuedDocumentInput: applicationId, metadata, uploadId? หรือ physical evidence references/channel
ReceiptInput: documentId, receivedAt, channel, confirmation: true
TravelPlanInput: mode: DRAFT/CONFIRM, visaDocumentId, entryId?/expectedVersion? เมื่อ update, requestId; DRAFT ยอม omitted plan fields ที่ยังไม่ครบ แต่ validate ทุกค่าที่ส่ง; CONFIRM ต้อง plannedArrivalAt/travelMode/port/travelEvidenceDocumentIds และ flightNo เมื่อ AIR
TravelPlanOutput: planStatus DRAFT/CONFIRMED แยกจาก entryResult PLANNED; CONFIRM ไม่ครบไม่ commit; recordEntryResult รับเฉพาะ CONFIRMED และไม่เปลี่ยน DRAFT เป็นผลเข้าเมืองโดยตรง
EntryResultInput: entryId, result: ALLOWED/DENIED/PENDING_VERIFICATION, actualArrivalAt?, decisionAt?, reason?, permittedUntil?, evidenceDocumentIds
HealthInput: entryId หรือ healthCheckId, visit/result/certificate fields แยก operation; certificate มี issuedAt, doctorName และ certificateNo เมื่อมี
CorrectionInput: targetType (VISA/ENTRY/WORK_PERMIT), targetId, reason, evidenceDocumentIds
VISA/WORK_PERMIT targetId อ้าง Document ชนิดตรงกัน; ENTRY อ้าง EntryRecord; Server derive Worker/Employment และตรวจ scope ไม่รับผู้รับเรื่องจาก Client
ResolveCorrectionInput: correctionId, resolution (ข้อความ 1–2,000 characters หลัง trim), expectedVersion, requestId
reportCorrection ใช้ requestId และไม่มี expectedVersion เพราะสร้างใหม่; ไม่รับ resourceType/resourceId หรือ alias อื่น ให้คืน VALIDATION_ERROR สำหรับ unknown fields
listCorrections input: employmentId สำหรับ Employer หรือ targetType+targetId สำหรับ Worker ในหน้าต้นทาง, status? (OPEN/RESOLVED), page/pageSize ตาม read query; คืนรายการแบบ paginated ของ CorrectionDetail ภายใน scope
getCorrection input: correctionId; resolveCorrection ตรวจ status OPEN และ current version ก่อนปิด; RESOLVED ห้ามเปลี่ยนคำตอบเงียบ ๆ

IDs ทั้งหมดต้องมี scope และ Worker/Employment ตรงกัน; เป็น ID ที่ valid syntactically ไม่ได้แปลว่าเชื่อมได้
submission fields อาจขาดได้ใน draft; เปลี่ยน SUBMITTED ต้องครบตาม case checklist ที่อนุมัติ
Decision ADDITIONAL_DOCUMENTS ต้อง reason/requested items; REJECTED ต้อง reason; APPROVED ต้อง evidence
ผลปลายทางห้ามแก้ย้อนหลังเงียบ ๆ; ต้องกำหนด correction policy/authority ตาม O-02/O-07 ก่อนเปิดใช้งานจริง

## Read query

listWorkers input: q ไม่เกิน 100 characters, page default 1, pageSize default 20/max 100, sort whitelist name/updatedAt พร้อม id tie-breaker
output: items, page, pageSize, total, hasNext; apply scope ก่อน search/count/pagination
listWorkerEmployments input: workerId; output: EmploymentSummary[] เฉพาะ Employer ของ session; ใช้เลือกบริบท ไม่ส่งประวัตินายจ้างอื่น
getWorkerEmployment input: workerId และ employmentId ทั้งคู่; ส่งคู่ไม่ตรงหรืออยู่นอก scope คืน NOT_FOUND ไม่ fallback ไปการจ้างอื่น
detail queries ใช้ context ID ชัดเจน; Worker มีหลาย Application ให้ผู้ใช้เลือก ห้ามเลือกคนละเรื่องเพราะ updatedAt ใหม่กว่า
Auth/session และ signed URL ไม่ cache แบบ public; invalidation ครอบคลุม Overview และหน้าติดตามของ Actor ที่เกี่ยวข้อง

ใน examples.json ค่า canPrepareWorkPermit หมายถึงผ่าน case/entry/medical gate เพื่อเริ่มเตรียมเท่านั้น ยังต้องตรวจ scope และ checklist จริง
canSubmit หมายถึงเริ่มยื่นหรือส่งเอกสารเพิ่มที่ review แล้ว; PENDING/APPROVED/REJECTED ไม่เปิดให้ยื่นซ้ำโดยอัตโนมัติ
ตัวอย่างเป็น snapshots สำหรับ discussion ไม่ใช่ transition engine; policy ที่บังคับจริงต้องทดสอบตาม acceptance.md
