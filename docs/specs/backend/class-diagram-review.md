# Class Diagram review

## Source และวิธีตรวจ

ไฟล์ต้นทางใน workspace: `M3LycAAAAAElFTkSuQmCC.pdf` ที่ราก SA (จากราก Git repo คือ `../../M3LycAAAAAElFTkSuQmCC.pdf`)
PDF 1 หน้า ขนาด 1710 × 983 points เป็นภาพ ไม่มี text layer ที่ extract ได้
ตรวจภาพรวมและภาพขยายครบทั้งหน้า เทียบ revised UC01–UC11, Sequence ทั้ง 11, ER/Data Dictionary baseline และ Spec จาก PR #1
SHA256 อยู่ใน [Source manifest](../source-manifest.json); PDF ไม่ถูกรวมใน Git และชื่อไฟล์ยังไม่ถูกเปลี่ยน
ตารางนี้เป็น transcription ของ class names/พฤติกรรมที่อ่านได้ ไม่ใช่ OCR ที่ยืนยันทุกตัวอักษรหรือ SQL ที่ทดสอบแล้ว
ภาพไม่ระบุ multiplicity แบบ 1..n ที่ใช้อ้างเป็น physical constraint ได้ครบ; ใช้ ER/Dictionary สำหรับ cardinality

## Class inventory

พบ 35 named boxes: Boundary 11, Control 11, Entity 12 (รวม subclasses 2), Persistence 1
ชื่อ View/Controller จับคู่ทุก UC ใน [Coverage](coverage.json)

| UC | Boundary / Control | Backend mapping |
|---|---|---|
| UC-01 | PreArrivalApplicationView / PreArrivalApplicationController | pre-arrival operations + shared Application/DocumentSet |
| UC-02 | WorkPermitDocumentPreparationView / WorkPermitDocumentPreparationController | work-permits preparation + case policy |
| UC-03 | WorkPermitApplicationView / WorkPermitApplicationController | work-permits submission/decision/issued permit |
| UC-04 | EmploymentDataView / EmploymentDataController | workers/employment + scoped employer data |
| UC-05 | VisaDocumentPreparationView / VisaDocumentPreparationController | visa preparation/checklist/history |
| UC-06 | VisaDocumentReviewView / VisaDocumentReviewController | visa review; revalidate latest DocumentSet |
| UC-07 | VisaReceiptView / VisaReceiptController | receipt context, file access, actual confirmation |
| UC-08 | EntryTrackingView / EntryTrackingController | travel plan/result/evidence |
| UC-09 | HealthCheckView / HealthCheckController | medical visit/result/certificate |
| UC-10 | WorkPermitReceiptView / WorkPermitReceiptController | ใช้ receipt policy ร่วมกับ UC-07 โดยกรองชนิดเอกสาร |
| UC-11 | VisaApplicationTrackingView / VisaApplicationTrackingController | visa submission/decision/issued Visa |

## Entity และ Method mapping

Fields ในภาพเป็น subset ไม่ใช่ DTO สาธารณะ; Long แปลงเป็น decimal string ที่ API boundary
Map/Result/void ในภาพต้องแทนด้วย typed input/DTO/envelope ตาม Contract ไม่ใช้ any หรือ client-supplied object ตรง DB

| Class | Fields ที่ปรากฏในภาพ | Method families → operation/rule |
|---|---|---|
| Employer | employerId, employerName, registrationNo, address, contactPhone | updateContact/validateProfile → scoped employer update ภายใน saveWorkerEmployment |
| Worker | workerId, fullName, nationality, passportNo, contactPhone | updateProfile/matchesPassport → saveWorkerEmployment + identity validation |
| Employment | employmentId, jobTitle, workplace, employmentTerms, startDate, endDate, employmentStatus | getContext/validate/validateAndSave → getWorkerEmployment/saveWorkerEmployment |
| Application | applicationId, applicationType, receiptNo, submittedAt, decisionStatus, decisionReason, decidedAt | getContext/getRequiredDocuments/getTrackingContext → scoped query; checkSubmissionEvidence/validateSubmissionEvidence → submission rule; validateAndSave/validateAndSaveSubmission → recordSubmission ตามบริบท; validateDecisionEvidence/saveDecision/validateAndSaveResult → recordDecision; validatePermit/saveWorkPermit/validateApprovalAndVisa/validateAndSaveVisa → attachIssuedDocument |
| DocumentSet | documentSetId, purpose, visaType, targetAuthority, readinessStatus, createdAt, reviewedAt | getContext/getCaseChecklist/organizeByChecklist/getHistoricalDocumentRequirements/validateApplicationCase → preparation query + case policy; validate/validateDocumentSet/validateAndSave/saveDocumentSet → savePreparation; validateLatestChecklist/saveReview → reviewDocumentSet |
| ChecklistItem | checklistItemId, requirementName, isRequired, checkResult, remark, checkedAt | check/updateResult → checklist validation ใน transaction ของ review ไม่เปิด arbitrary checklist status endpoint |
| Document | documentId, documentType, documentNo, fileUri, issuer, issuedAt, expiresAt, uploadedAt | getDocumentFileOrCollectionDetails → getOwnDocument/authorizeDownload; validateFile/isExpired → private file validation + date rule |
| DocumentReceipt | receiptId, receivedAt, deliveryChannel, confirmationStatus | getReceiptContext/validateAndConfirmReceipt → getReceiptContext/confirmReceipt |
| EntryRecord | entryId, travelDate, portOfEntry, entryResult, decisionReason, decisionAt | getTravelContext/getEntryResult → scoped query; validate/validateAndSavePlan → saveTravelPlan; validateEntryEvidence/savePendingResult/saveEntryResult → recordEntryResult |
| HealthCheck | healthCheckId, hospitalName, examDate, healthResult, resultStatus, recordedAt | getHealthCheckContext → scoped query; validateAndSaveVisit → saveHealthVisit; validateHealthResult/saveResult → recordHealthResult; validateCertificateAndResults/validateAndSaveCertificate → confirmMedicalCertificate |
| VisaDocumentSet (subclass) | submissionCountry, workHistory | getCaseChecklist/getHistoricalDocumentRequirements → Visa case policy บน document_set เดิม |
| WorkPermitDocumentSet (subclass) | requestType, travelStatus | validateApplicationCase/getRequiredChecklist → Work Permit case policy บน document_set เดิม |
| Database (persistence) | databaseName | query/executeTransaction → parameterized persistence และ DB transaction; ไม่ expose arbitrary SQL ให้ Client |

ภาพมีเพียง behavior/field subset; authorization, versions, idempotency, evidence FK และ null-before-event ต้องเพิ่มในการออกแบบ implementation
Application.validateAndSave ที่ชื่อเดียวแต่ใช้หลายขั้นตอนไม่ถือว่า operation เดียว: preparation เขียน DocumentSet, submission เขียน Application

## Findings และข้อยุติสำหรับ Spec

| ID | สิ่งที่ตรวจพบ | ผลต่อ Backend Spec |
|---|---|---|
| CD-01 | View/Controller ครบ 11 UC รวม VisaApplicationTrackingController | คง UC-11 และ map ทุก control ไป named operation; ไม่ตกหล่นเพราะเลข UC ใน ER เก่า |
| CD-02 | มี VisaDocumentSet/WorkPermitDocumentSet inheritance แต่ Dictionary ไม่มีตาราง subclass | เสนอ discriminated case policy/typed fields บน document_set; ไม่เพิ่มสองตารางโดยอนุมานจาก UML |
| CD-03 | ไม่มี ActorAccount/LoginService/LoginSession ในภาพ | Auth จาก ER ล่าสุดยังจำเป็น; O-01 ไม่ได้ถูกยกเลิก |
| CD-04 | Application มี decisionStatus แต่ไม่แยก submissionStatus; EntryRecord.travelDate คลุม plan/actual | แยก lifecycle ตาม baseline เพื่อไม่อ้างว่ายื่น/เข้าเมืองสำเร็จก่อนมีหลักฐาน |
| CD-05 | Entity เรียก Database และ methods validateAndSave จำนวนมาก | ใช้ named service operation + transaction ตาม architecture ไม่บังคับ Active Record; validation/read-only ไม่ persist |
| CD-06 | recordEntryResult/recordHealthResult อยู่ใน control แต่ไม่ระบุผู้มีสิทธิ์ | scope + capability และ O-02; เจ้าของข้อมูลไม่มีสิทธิ์บันทึกผลจากหน่วยงานโดยอัตโนมัติ |
| CD-07 | reportRecordedDataMismatch และ saveVisa(correctionReason) มีใน control แต่ไม่มี Correction entity | เพิ่ม correction_request/history ที่เสนอ; เปิด correction ของข้อมูลบันทึกเมื่อมี policy ไม่เปลี่ยนต้นฉบับ |
| CD-08 | deliverDocument และ confirmReceipt แยกใน control | download/delivery details ไม่สร้าง receipt; ยืนยัน actual receipt เท่านั้น |
| CD-09 | fileUri ใน Document และ generic Database.query | private storage key ฝั่ง Server; ไม่ส่ง SQL/storage key ใน DTO |
| CD-10 | subclass workHistory เป็น Boolean และ View ขอ previous permit/tax evidence | false/unknown ไม่เหมือนกัน; เก็บ unknown ได้ใน draft, review ต้องรู้ applicability; ไม่บังคับ ภ.ง.ด.91 ทุกคน |
| CD-11 | fields ใน Worker/Employment/Entry/Health ยังไม่ครบ revised Description | เสริม typed fields ตาม Requirements; O-03 กำหนด length/template ที่ยังไม่ยืนยัน |
| CD-12 | เส้นสัมพันธ์ไม่ได้กำหนด XOR/M:N/unique ครบในภาพ | ใช้ document owner XOR, join table M:N และ application/receipt constraints จาก ER/Dictionary |

Findings เป็นความต่าง/รายละเอียดที่ขาด ไม่ใช่การกล่าวว่า Diagram ต้องถูกแก้ทั้งหมด
ไม่ใช้ inheritance เป็นเหตุผลเปลี่ยน ownership, cardinality หรือ Actor ของ UC
