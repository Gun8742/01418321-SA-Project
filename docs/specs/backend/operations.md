# Backend operation contracts

สถานะ: Proposed ขยาย [operation catalog](../backend.md) ไม่ใช่ endpoints ที่ติดตั้งแล้ว
[Shared contract](../data-contract.md) เป็นเจ้าของ scalar/envelope/errors; [Workflow](../workflows.md) เป็นเจ้าของ status/gates; [Authorization](../authorization.md) เป็นเจ้าของ scope
ชื่อ field ใน input ต่อไปนี้เป็น canonical proposal สำหรับ implement; fields ย่อยที่แบบราชการยังไม่กำหนดรอ O-03

## ข้อตกลงทุก Operation

Queries รับ ActorContext จาก trusted session แยกจาก input; payload ไม่มี role/grant/employerId เพื่อเลือกตัวตนเอง
Create mutation รับ requestId; existing aggregate mutation รับ expectedVersion ด้วย ยกเว้น immutable receipt ใช้ unique document + requestId
Composite mutation รับ expectedVersions ของทุก aggregate ที่จะแก้ (รวม employer/worker/employment) เพื่อไม่ทำ lost update
ทุก write รวมการเปลี่ยน child/evidence เพิ่ม version ของ aggregate; Server ตรวจสิทธิ์และ gates จากข้อมูลปัจจุบันภายใน transaction
คืน success หลัง commit พร้อม safe DTO, version ใหม่, availableActions/blockingReasons; failure ไม่เปลี่ยน business status
Read-only preview/validation ไม่สร้าง records, ไม่ mark reviewed, ไม่เปลี่ยน status และไม่ออก download URL โดยไม่ตรวจสิทธิ์

Application mutation input ทุก field เป็น allowlist; nullable หมายถึงล้างค่าที่รองรับ; omitted patch ไม่แก้; ID เป็น decimal string
requestId เป็น opaque UUID string สำหรับ dedup ไม่ใช่ secret; เพิ่มในทั้ง Server Action และ HTTP mutation
Auth-native operations ใช้ library contract และไม่ผ่าน operation_receipt; cleanup เป็น trusted internal job ที่ idempotent ตาม object/reference state
Queries คืน NOT_FOUND เมื่อ resource อยู่นอก scope; visible-but-forbidden action คืน FORBIDDEN; stale version คืน CONFLICT
Domain gate ที่ไม่ผ่านคืน PRECONDITION_FAILED พร้อม blockers; invalid field/evidence metadata คืน VALIDATION_ERROR
requestId replay ต้องตรวจ policy ปัจจุบันก่อนคืนผลเดิมและก่อน expectedVersion check; result เดิมไม่ทับ latest state

## Queries

| Operation | Input | Response data | Scope / filtering |
|---|---|---|---|
| listWorkers | q?, page?, pageSize?, sort? | items: WorkerSummary[], page/pageSize/total/hasNext | Employer/Representative; scope ก่อน search/count, whitelist sort และ stable ID tie-breaker |
| listWorkerEmployments | workerId | EmploymentSummary[] | เฉพาะ Employer ของ session; selector ไม่เผยประวัตินายจ้างอื่น |
| getWorkerEmployment | workerId, employmentId (required ทั้งคู่) | WorkerEmploymentDetail + scoped documents/sets | คู่ต้องตรงกันและเป็นของ Employer ตน; มิฉะนั้น NOT_FOUND ไม่มี fallback/latest |
| getPreparationContext | employmentId, type, documentSetId? | profile/job fields, case options, existing documents, current set/checklist, gate blockers | Employer ตน; pre-arrival/Visa/Work Permit ตาม case; ไม่รวมคลังเอกสารคนละ Employment |
| getCaseChecklist | employmentId, type, caseKey, visaType?, targetAuthority, country?, travelStatus?, workHistory? | checklistVersion, applicable requirements, required/conditional flags, template reference | ตรวจ case กับข้อมูลจริง; unknown applicability เก็บ draft ได้แต่ review ไม่ผ่าน |
| getApplicationDetail | applicationId หรือ documentSetId (อย่างใดอย่างหนึ่ง) | ApplicationDetail, evidence, requested items, issued document summary | Employer detail; Worker projection เฉพาะสถานะ/เอกสารตน; ไม่ค้นด้วยเลขรับทั่วระบบ |
| getReceiptContext | applicationId, documentType: VISA/WORK_PERMIT | document summary, approval/readiness, collection details, receipt?, blockers | Worker ตน; Employer อ่านเฉพาะงานตน ไม่ยืนยันแทน |
| getOwnOverview | employmentId? | scoped active applications/tasks + blockers/actions | Worker ตน; หลายคำร้องคืนให้เลือก context |
| getOwnDocument | documentId | DocumentSummary พร้อม file/collection availability | Worker owner หรือ explicit scoped share; ไม่ใช่ signed URL ถาวร |
| getTravelContext | visaDocumentId, entryId? | Worker/valid Visa/receipt, plan/result/evidence, version/actions | Worker ตน; Employer อ่านผ่าน employment scope; entryId ต้องใช้ Visa เดียวกัน |
| getEntryResult | entryId | EntryDetail + safe evidence summaries | ตาม Worker/Employment scope |
| getHealthCheckContext | entryId, healthCheckId? | identity, allowed entry, visit/result/certificate, version/actions | ต้อง entry ALLOWED เพื่อเริ่ม; ผู้มีสิทธิ์อ่านสถานะเดิมได้แม้ write ถูกบล็อก |
| listCorrections | employmentId หรือ targetType+targetId, status?, page?, pageSize? | scoped items/total/hasNext | Employer เฉพาะ Employment ตน; Worker เฉพาะคำแจ้งตน; scope ก่อน count/pagination |
| getCorrection | correctionId | CorrectionDetail + resolution/resolvedBy/resolvedAt | reporter Worker หรือ Employer ที่รับผิดชอบ resource |
| getMutationOutcome | operation, requestId | COMMITTED + result reference/current versions หรือ NOT_RECORDED | current Actor + operation key เท่านั้น; NOT_RECORDED ไม่รับรองว่า external activity ไม่เกิด |
| resolveActor | trusted session เท่านั้น | safe ActorContext | session active, unexpired/unrevoked, service/account/link ตรงกัน |

getCaseChecklist ไม่สร้าง “รายการตามกฎหมาย” จากเลข UC; ใช้ approved version catalog ตามประเภท/หน่วยงาน/กรณี
getPreparationContext ของ UC-05 ต้องมีผลอนุมัติ+approval letter จาก UC-01; UC-02 ก่อนเดินทางใช้รายการกรณีนั้นและ previous reference เมื่อมี
ไม่คืน health details ทั้งหมดให้ Employer เมื่อใช้เพียง certificate-ready flag กับเอกสารที่จำเป็น

## UC-04: Worker และ Employment

saveWorkerEmployment input:
worker: { id?, fullName, dateOfBirth, nationality, passportNo, passportIssuerCountry, passportIssuedOn, passportExpiresOn, currentAddress, email, phone }
employer: { name, registrationNo, address, contactName, contactPhone } (แก้เฉพาะ linked Employer ของ session)
employment: { id?, jobTitle, jobDescription, workplace, startDate, endDate?, employmentTerms, wageAmount, wageCurrency, wageUnit }
documentIds: ไฟล์ที่ complete upload แล้ว; expectedVersions เมื่อแก้ existing records; requestId
Update ต้อง workerId + employmentId คู่เดิมจาก URL; ห้ามเปลี่ยนคู่ผ่าน draft และไม่มี latest-employment fallback
Output: WorkerEmploymentDetail + touched versions; ไม่สร้าง Account/login ให้อัตโนมัติ

Validate identity ตามหลักฐาน, required values ตาม Description, birthday/issue/expiry/start/end สอดคล้อง, email/phone รูปแบบที่ยืนยัน, wage decimal + unit
ตรวจเอกสารของบุคคล/บริษัทตรง scope และแยก owner; เสนอ max text ตาม baseline แต่ field lengths สุดท้ายต้อง O-03
Worker ซ้ำใน scope คืน existing-reference conflict ให้ผู้ใช้ตรวจ; global duplicate นอก scope ใช้ generic conflict ไม่เผย record
Worker ที่แชร์กับ Employment นายจ้างอื่น: การแก้ shared identity ถูกบล็อกจน O-06 กำหนด policy; เพิ่ม/แก้ job ของตนได้ตาม policy
Transaction ครอบ Worker/Employer/Employment และ document links; การล้มเหลวส่วนหนึ่ง rollback ทั้งชุด
ไม่ reset ใบอนุญาตที่ออกจริงเมื่อเปลี่ยน profile; invalidate future/reviewed draft ที่พึ่งข้อมูลนั้นและเก็บ snapshot ที่ยื่นแล้ว

## UC-01/UC-02/UC-05: Preparation

createDocumentSet input: employmentId, type: PRE_ARRIVAL/VISA/WORK_PERMIT, caseKey, case fields, requestId
Output: DocumentSetDetail draft ใหม่; ใช้สำหรับคำขอใหม่ที่ผู้ใช้เลือกชัดเจน ไม่ใช่ followup เดิม
ตรวจ existing application context ก่อนสร้าง; case ซ้ำที่มีงานค้างให้กลับรายการเดิมหรือ explicit new-request intent ตาม O-07

savePreparation input: documentSetId, case fields, typed form fields, checklistVersion, documentIds, expectedVersion, requestId
case fields: residenceCountry (pre-arrival); visaType/targetAuthority/submissionCountry/workHistory (Visa); requestType/travelStatus/previousApplicationId? (Work Permit)
Output: NOT_READY หรือ AWAITING_REVIEW; ไม่ set READY เพียงเพราะ Client ส่ง checklist PASS
case ต้องตรงสถานะจริง: UC-01 ยังอยู่ต่างประเทศ, UC-05 มี approval letter; UC-02 AFTER_ENTRY ต้อง ALLOWED+certificate ตาม checklist, BEFORE_ENTRY ไม่บังคับ medical/entry
previousApplicationId ต้องใน scope/Worker เดียวกัน; ไม่บังคับ บต.25 และ บต.32 พร้อมกัน
workHistory = null/unknown ยอมใน draft; review ต้องสรุปว่า historical permit/ภ.ง.ด.91 applicable หรือไม่ตาม catalog

linkDocument/unlinkDocument input: documentSetId, documentId, expectedVersion, requestId
ตรวจ owner/Employment/purpose/file พร้อมใช้; ลบเฉพาะความสัมพันธ์ ไม่ลบ Document หรือ object ที่ชุดอื่นใช้
ทั้งสอง operation invalidate review เมื่อ content เปลี่ยน; ชุดที่ยื่นแล้วเก็บ submitted snapshot ไว้
ข้อมูล fields/files ที่แก้หลัง review ต้องผ่าน reviewDocumentSet ใหม่ก่อนยื่นหรือ resubmit

## UC-06 และ shared Review

reviewDocumentSet input: documentSetId, checklistVersion, reviewItems: { itemId, checkResult, remark?, documentIds }[], expectedVersion, requestId
Output: DocumentSetDetail + review outcome; reviewer/time derive จาก session/clock; Server recompute ไม่เชื่อ PASS จาก Client
ตรวจ current checklist version, case applicability, field identity/date checks, file complete/readable ตามการตรวจที่รองรับ, required documents ไม่หมดอายุ ณ relevant date
MISSING/NEEDS_CORRECTION คืน outcome พร้อม blockers และเก็บผลตรวจไม่ผ่านได้แบบ atomic โดย readiness ไม่ READY
Input ผิดรูป/foreign item คืน VALIDATION_ERROR และไม่เขียนบางรายการ; required item ตกหล่นไม่ผ่าน
ผล READY ผูก snapshot/hash/version ของ fields+files+policy; review เก่าหรือ concurrent file replacement คืน CONFLICT/review required
UC-01/UC-02 มีขั้นยืนยันชุดพร้อมใช้: adapter อาจเรียก savePreparation แล้ว review แยก หรือ composite save-and-review ที่ใช้กฎ/transaction เดียวกัน; ห้าม success ครึ่งชุด

## UC-01/UC-03/UC-11: Submission และ Decision

recordSubmission input: documentSetId, applicationId?, authority, channel?, submittedAt?, receiptNo?, acceptedEvidenceDocumentIds, expectedVersion (set), applicationExpectedVersion? (เมื่อมี), requestId
Output: ApplicationDetail + versions ของ set/application; Application UNIQUE ต่อ set; approval ของ pre-arrival ไม่ใช่ approval Work Permit/Visa
NOT_SUBMITTED/AWAITING_SUBMISSION_CONFIRMATION + ชุด READY → รอหลักฐาน หรือ SUBMITTED/PENDING เมื่อ acceptance evidence ครบตาม case
ADDITIONAL_DOCUMENTS + รอบแก้ที่ review แล้ว → SUBMITTED/PENDING ใน Application เดิม พร้อมเก็บรอบ/หลักฐานก่อนหน้า
PENDING ไม่สร้าง submission รอบใหม่ถ้าเพียงติดตาม; APPROVED/REJECTED ไม่ reset โดย operation นี้
เลขรับไม่ใช่หลักฐานเพียงอย่างเดียว; awaiting draft ไม่มี decidedAt ปลอม; submittedAt ต้องวันจริงจากหลักฐาน ไม่ derive จาก uploadedAt
channel ของการยื่นภายนอกเป็นข้อมูลบันทึก ไม่ส่ง API หรืออ้างทำการยื่นแทน

recordDecision input: applicationId, decision: PENDING/ADDITIONAL_DOCUMENTS/APPROVED/REJECTED, decidedAt?, reason?, evidenceDocumentIds, requestedItems?, expectedVersion, requestId
Output: ApplicationDetail; ต้อง confirmed submission และ evidence ของคำร้องเดียวกัน
PENDING followup เก็บ checkedAt/event observation แทนตัดสิน final; decidedAt null จนมีผลตัดสินจริง; ไม่ลบหลักฐานเดิม
ADDITIONAL_DOCUMENTS ต้อง reason+requestedItems; REJECTED ต้อง reason; final decisions ต้อง date+official evidence
APPROVED ไม่สร้าง Visa/Work Permit/receipt อัตโนมัติ; pre-arrival APPROVED ต้อง approval letter ที่พร้อมใช้ก่อนเปิด UC-05
การแก้ final result ต้อง O-07/correction policy: default reject overwrite แม้ version ตรง
Output สำหรับ REJECTED/ADDITIONAL_DOCUMENTS แสดงเหตุผลและจุดกลับเตรียมตาม UC ไม่สันนิษฐานว่าคำร้องใหม่ทุกครั้ง

addRequestedDocuments input: applicationId, requestedItemIds, documentIds, expectedVersion (application), documentSetExpectedVersion, requestId
ต้อง ADDITIONAL_DOCUMENTS และ item เป็นของรอบปัจจุบัน; เพิ่มเอกสารในชุดเดิม + invalidate review
การแนบยังไม่ปิด requested item ว่าหน่วยงานยอมรับ จนยืนยัน resubmission ตามหลักฐาน; เก็บ item/evidence history

attachIssuedDocument input: applicationId, type: VISA/WORK_PERMIT/APPROVAL_LETTER, metadata, uploadId หรือ documentId ที่ยังไม่ผูก issued role, collectionDetails?, expectedVersion, requestId
metadata: holderName/passportNo ตามหลักฐาน, documentNo เมื่อมี, issuer, issuedAt, validFrom?, expiresAt?, visaType? หรือ permit particulars ตามแบบ
VISA/WORK_PERMIT ต้อง APPROVED, type ตรงคำร้อง/Worker/Employment, date range ถูกต้อง และเอกสารออกจริงพร้อมใช้
UC-11 ต้องแนบ Visa file ที่อ่านได้ตาม revised Description; collection details อย่างเดียวใช้เปิด Visa receipt ไม่ได้
APPROVAL_LETTER ใช้ pre-arrival APPROVED, เป็นหนังสือจริงสำหรับ UC-05 ไม่แปลงเป็น Visa
Work Permit physical channel ต้องมี verified issued-document evidence พร้อมข้อมูลรับตาม O-05; ไม่มี evidence คง approved-not-ready
เป็น create-only operation: ตรวจ issued slot UNIQUE (applicationId, type) ภายใน transaction ก่อนสร้าง/link Document และ event; ไม่ใช่แค่ตรวจ requestId ซ้ำ
ถ้ามี slot แล้ว คำขอที่ใช้ requestId ใหม่คืน CONFLICT พร้อม blocker ISSUED_DOCUMENT_EXISTS แม้ metadata/file เหมือนเดิม; ไม่สร้างหรือแทน Document, slot หรือ Receipt
replay requestId เดิมที่ commit แล้วคืน committed reference ตามกฎ replay ก่อนตรวจ version/slot; สอง requestId ที่แข่งกันมีผู้สร้าง slot สำเร็จอย่างมากหนึ่งราย โดย DB uniqueness เป็น backstop
correctionReason ไม่ใช่ทางข้าม guard: การแก้ recorded metadata/replacement/reissue ต้องใช้ correction policy/history แยกตาม O-07; ยังไม่เปิด reissue operation และไม่เปลี่ยน issued slot/receipt เดิม

## UC-07/UC-10: Receipt

confirmReceipt input: documentId, receivedAt (actual datetime), channel, confirmation: true, requestId
Output: ReceiptDetail; derive workerId และ document type จาก DB; Worker ยืนยันของตน ไม่ยืนยันแทนจาก Employer
ตรวจ APPROVED, issued document พร้อมจริง, receivedAt ไม่อนาคต และไม่ก่อนการออกเอกสารตามหลักฐาน
documentId ต้องเป็น Document ของ issued slot ใน Application/type นั้น ไม่ใช่ supporting upload หรือสำเนาที่แนบเพิ่มนอก slot
immutable receipt UNIQUE documentId; identical normalized facts คืน receipt เดิม แม้ requestId ต่าง; รายละเอียดต่างคืน CONFLICT
download, collection details หรือ unsuccessful delivery ไม่สร้าง receipt; ไม่เก็บ file bytes ใน operation receipt

## UC-08: Entry

saveTravelPlan input เป็น discriminated union ตาม mode: DRAFT | CONFIRM (required), มี visaDocumentId, entryId? (update), expectedVersion? เมื่อ update และ requestId ทั้งสอง mode
DRAFT: plannedArrivalAt?, travelMode?, port?, flightNo?, travelEvidenceDocumentIds? ไม่บังคับครบ แต่ทุกค่าที่ส่งมาต้องผ่านชนิด/รูปแบบ/ownership validation; ไม่ยอมรับ enum/date/file ที่ผิดเพียงเพราะเป็น draft
CONFIRM: plannedArrivalAt, travelMode, port, travelEvidenceDocumentIds ต้องครบตามกรณี และ flightNo required เมื่อ AIR; ตรวจเอกสารและ Visa gate จากข้อมูลจริงก่อน commit
Output: EntryDetail มี planStatus: DRAFT | CONFIRMED แยกจาก entryResult: PLANNED; CONFIRMED หมายถึงยืนยันแผนเท่านั้น ไม่ใช่อนุญาตเข้าประเทศ
create DRAFT → planStatus DRAFT; create/update CONFIRM ที่ผ่าน → CONFIRMED; ถ้าไม่ครบคืน VALIDATION_ERROR และคง plan/status/version เดิม (create ที่ล้มเหลวไม่สร้าง record)
แก้แผน CONFIRMED ได้ด้วย mode CONFIRM และตรวจครบใหม่เท่านั้น; ส่ง DRAFT ทับ CONFIRMED คืน PRECONDITION_FAILED ไม่ downgrade; entryResult ที่ไม่ใช่ PLANNED ปฏิเสธ saveTravelPlan ทั้งสอง mode
recordEntryResult input: entryId, result: PENDING_VERIFICATION/ALLOWED/DENIED, actualArrivalAt?, port?, reason?, permittedUntil?, decisionAt?, evidenceDocumentIds, expectedVersion, requestId
ต้อง scoped entry:record-evidence; ALLOWED/DENIED ต้อง actual date/result/official evidence, DENIED ต้อง reason
ต้องมี planStatus CONFIRMED ก่อน recordEntryResult ทุกผล; แผน DRAFT คืน PRECONDITION_FAILED พร้อม blocker TRAVEL_PLAN_UNCONFIRMED โดยไม่เขียนผล/หลักฐาน
ไม่มีหลักฐานผลเก็บ PENDING_VERIFICATION; ALLOWED เปิด medical; DENIED ปิดเส้นทาง ไม่ลบ plan/history
แก้ผลปลายทางผ่าน correction policy O-07; นายจ้าง/ลูกจ้างอ่านและแจ้งข้อมูลผิด ไม่แก้คำตัดสินเอง

## UC-09: Medical

saveHealthVisit input: healthCheckId? (update), entryId, hospitalName, examDate, expectedVersion? เมื่อ update, requestId
Create: HealthDetail PENDING; Worker ตน, entry ALLOWED same Worker, date ไม่ก่อน actual entry สำหรับกรณีนี้
Update ทำได้เฉพาะ resultStatus PENDING และยังไม่มี recorded healthResult/result evidence, pending test results หรือ certificate link/verification; ตรวจ guard และ expectedVersion ใน transaction เดียวกับการแก้นัด
ถ้า ADDITIONAL_TESTS/COMPLETE หรือมีผล/ใบรับรองบันทึกแล้ว คืน PRECONDITION_FAILED พร้อม blocker HEALTH_VISIT_LOCKED; ไม่เปลี่ยน hospital/examDate/result/status/certificate หรือ downstream gate
การ update ที่อนุญาตแก้เฉพาะข้อมูลนัด ไม่ reset ผลหรือใบรับรอง; นัดติดตามจากผลตรวจใช้ followUpAt ใน recordHealthResult ตามสิทธิ์ ไม่ใช้ saveHealthVisit ย้อนผลเป็น PENDING
การแก้ข้อมูลหลังล็อกต้อง policy/correction ที่อนุมัติแยกตาม O-07; Worker ไม่ได้สิทธิ์ reset ด้วย requestId ใหม่หรือการละ healthCheckId เพื่อสร้างรายการทดแทน (same entry มี health episode เดียวใน v1)
Create ที่ entryId มี health episode อยู่แล้วคืน CONFLICT พร้อม blocker HEALTH_VISIT_EXISTS และ reference เฉพาะที่ผู้ใช้มีสิทธิ์; ไม่สร้าง episode ซ้ำแม้ requestId ใหม่
recordHealthResult input: healthCheckId, healthResult (ตามเอกสาร), resultStatus: PENDING/ADDITIONAL_TESTS/COMPLETE, pendingItems, followUpAt?, evidenceDocumentIds, expectedVersion, requestId
ต้อง scoped medical:record-evidence; additional tests มีรายการตามคำแนะนำโรงพยาบาล; COMPLETE ต้องไม่มี pending items; ไม่วินิจฉัยจาก text/code เอง
confirmMedicalCertificate input: healthCheckId, certificateDocumentId หรือ uploadId, certificateNo?, issuedAt, doctorName, hospitalName, examinedIdentity, expectedVersion, requestId
ต้อง grant เดียวกัน, ผลครบ/ไม่มีรอตรวจเพิ่ม, identity ตรง, certificate ออกจริง/อ่านได้; ไม่มีเลขให้ null ไม่สร้างเลขเอง
วันที่ออกต้องไม่ก่อนวันที่ตรวจตามหลักฐาน; หากหลักฐานมีค่าขัดกันให้แจ้งตรวจสอบ ไม่แก้วันที่เอกสารเอง
Output: HealthDetail + certificate summary/verified flag; link เอกสาร/HealthCheck ใน transaction; verified certificate เปิด AFTER_ENTRY Work Permit ตาม checklist
Health COMPLETE อย่างเดียวไม่เปิด gate ถ้าใบรับรองยังไม่มี/ไม่ยืนยัน

## Corrections

reportCorrection input: targetType: VISA/ENTRY/WORK_PERMIT, targetId, reason, evidenceDocumentIds, requestId
Worker ของ resource แจ้ง OPEN; คืน CorrectionDetail; ไม่แก้ Document/Application/Entry status ตอนแจ้ง
resolveCorrection input: correctionId, resolution, expectedVersion, requestId
Employer ใน Employment scope ตอบและปิด OPEN → RESOLVED พร้อม resolvedBy/resolvedAt; resolution required, RESOLVED เป็น read-only และ retry ตาม requestId
เป็นคำตอบปิดเรื่อง ไม่รับ target patch และไม่เพิ่มสิทธิ์แก้ผล/เอกสารภายนอก; การแก้ข้อมูลจริงต้อง operation/policy ที่มีสิทธิ์แยกตาม O-02/O-07 พร้อม history และ invalidation ที่เกี่ยวข้อง
การปิดเรื่องไม่อ้างว่าได้แก้เอกสารต้นฉบับ; Worker อ่านคำตอบ/ผู้ตอบ/เวลาได้ผ่าน listCorrections/getCorrection; ไม่มี chat/thread ใน v1
Server derive Employment/ผู้รับจาก target ตอน report; Client ไม่ส่งผู้รับหรือ field alias เพื่อเปลี่ยน scope

## Supporting Operations

signIn/signOut/resolveActor, initiateUpload/completeUpload/authorizeDownload และ cleanupTemporaryUploads ระบุใน [Infrastructure](infrastructure.md)
HTTP adapter/auth native errors ต้อง map safe envelope ตามช่องทาง; browser credentials และ file bytes ไม่อยู่ใน mock result หรือ logs
