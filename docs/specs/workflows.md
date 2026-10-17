# Workflow Specification

**Confirmed:** ความพร้อมเอกสาร, การยื่น, ผลพิจารณา และการรับเป็นคนละเหตุการณ์
ชื่อ Enum ต่อไปนี้เป็น **Proposed Contract values**; ห้ามใช้ boolean เดียวแทนหลายเงื่อนไข

## Status Vocabulary

| Field | Values | ความหมาย |
|---|---|---|
| DocumentSet.readinessStatus | NOT_READY, AWAITING_REVIEW, READY | ยังไม่ครบ / รอตรวจ / ผ่านตรวจและพร้อมใช้ |
| ChecklistItem.checkResult | NOT_CHECKED, PASS, MISSING, NEEDS_CORRECTION | ผลตรวจต่อรายการ |
| Application.submissionStatus | NOT_SUBMITTED, AWAITING_SUBMISSION_CONFIRMATION, SUBMITTED | ยังไม่ยื่น / รอหลักฐานรับ / ยืนยันรับคำขอแล้ว |
| Application.decisionStatus | NOT_DECIDED, PENDING, ADDITIONAL_DOCUMENTS, APPROVED, REJECTED | ยังไม่เริ่มรอผล / รอผล / ขอเพิ่ม / อนุมัติ / ไม่อนุมัติ |
| EntryRecord.entryResult | PLANNED, PENDING_VERIFICATION, ALLOWED, DENIED | แผนเดินทาง / รอหลักฐานผล / อนุญาต / ไม่อนุญาต |
| HealthCheck.resultStatus | PENDING, ADDITIONAL_TESTS, COMPLETE | รอผล / ตรวจเพิ่ม / ผลครบ |
| DocumentReceipt.confirmationStatus | CONFIRMED | สร้าง record เมื่อยืนยันจริง; ก่อนรับใช้ absence ของ Receipt |
| CorrectionRequest.status | OPEN, RESOLVED | รับแจ้ง / ตรวจและแก้ข้อมูลบันทึกแล้ว |

สถานะ READY ของ Sequence และ COMPLETE ของ ER Query ที่หมายถึงชุดเอกสารพร้อมใช้ normalize เป็น READY ใน Contract
แยก submissionStatus จาก decisionStatus เป็นข้อเสนอแก้ความกำกวมใน ER เดิม; ดู mapping ใน Database
UI label ไม่ใช่ Enum และไม่ต้องใช้ภาษาอังกฤษของ Enum เป็นข้อความแก่ผู้ใช้

## กฎเปลี่ยนสถานะ

| Operation | Preconditions | ผลสำเร็จ / สิ่งที่ไม่ทำ |
|---|---|---|
| savePreparation | มีข้อมูลการจ้างและสิทธิ์; ตรวจ gate ของประเภท/กรณีคำขอด้านล่าง | เก็บ draft เป็น NOT_READY หรือ AWAITING_REVIEW; ยังไม่ยื่น |
| reviewDocumentSet | มีสิทธิ์และใช้ Checklist/content version ล่าสุด | ทุก required item PASS, ไฟล์พร้อมและ metadata ตรงจึง READY พร้อม reviewer/Server time; ไม่ครบเก็บผลตรวจไม่ผ่านและ blockers โดยไม่อนุมัติคำขอ |
| changeReviewedContent | แก้ Field/ไฟล์/Checklist ที่ใช้ยื่น | reset readiness เป็น AWAITING_REVIEW หรือ NOT_READY และต้องตรวจซ้ำ |
| recordSubmission | มีชุด READY ที่ตรง applicationType; ใช้ Application เดิมสำหรับ follow-up | ถ้าไม่มีเลขรับ/หลักฐานรับ คง AWAITING_SUBMISSION_CONFIRMATION/NOT_DECIDED; ถ้าครบเป็น SUBMITTED/PENDING |
| recordDecision | การยื่นยืนยันแล้ว มีผลและหลักฐานจากหน่วยงานสำหรับผลตัดสิน | APPROVED/REJECTED/ADDITIONAL_DOCUMENTS; PENDING เป็น followup observation ไม่สร้าง final decidedAt; ห้ามใช้ผลที่กรอกเองแทนเอกสารหลักฐาน |
| attachIssuedDocument | APPROVED และเอกสารออกจริงตรง Worker/Employment/ชนิดคำขอ | เก็บไฟล์/metadata พร้อมใช้; approved อย่างเดียวไม่แปลว่าพร้อมรับ |
| confirmReceipt | สิทธิ์ของ Worker, APPROVED และมีช่องทางรับที่พร้อมจริง | สร้าง Receipt ของเอกสาร/Worker นั้น; การเปิด/ดาวน์โหลดไม่เรียก operation นี้ |
| saveTravelPlan | Worker ของตนมี Visa ที่รับแล้วและใช้เดินทางได้ตามข้อมูลหลักฐาน | PLANNED; ไม่ถือว่าผ่านตรวจเข้าเมือง |
| recordEntryResult | มี grant บันทึกผลของ Worker นั้น | ไม่มีผลหลักฐานให้ PENDING_VERIFICATION; มีผลจึง ALLOWED/DENIED |
| saveHealthVisit | Entry ALLOWED ของ Worker เดียวกัน | PENDING; ไม่ยืนยันว่ามีใบรับรองแล้ว |
| recordHealthResult | มี grant บันทึกผลและหลักฐานจริง | PENDING/ADDITIONAL_TESTS/COMPLETE ตามข้อมูล; COMPLETE อย่างเดียวไม่สร้างไฟล์ใบรับรอง |
| confirmMedicalCertificate | มี grant บันทึกผล; ผลครบ ไม่มีรายการรอเพิ่ม ใบรับรองตรงบุคคลและพร้อมใช้ | เปิด certificate สำหรับชุด Work Permit ตามกรณี |
| resolveCorrection | ผู้รับผิดชอบมีสิทธิ์และตรวจหลักฐานแล้ว | แก้เฉพาะข้อมูลบันทึก พร้อมเหตุผล; ไม่แก้เอกสาร/ผลตัดสินต้นฉบับ |

PENDING ไม่ใช่ปุ่มให้ผู้ใช้ย้อนผลสุดท้าย; การแก้ผลที่บันทึกผิดต้องใช้ correction flow พร้อมเหตุผลและตรวจหลักฐาน
UC-01 ใช้ attachIssuedDocument เก็บหนังสืออนุมัติจริงเพื่อเปิด UC-05; UC-11 ต้องแนบ Visa file จริง ส่วนช่องทางรับ Work Permit ใช้หลักฐานตามกรณี/O-05
รอบยื่นเอกสารเพิ่มทำใน Application เดิม: เพิ่ม/เปลี่ยนเอกสาร → readiness reset → review → recordSubmission → SUBMITTED/PENDING
REJECTED ไม่ถูก reset โดยอัตโนมัติ; การดำเนินต่อให้ตรวจคำสั่งหน่วยงานว่าเป็น follow-up ของเดิมหรือคำขอใหม่ก่อนเลือก operation
ข้อความแจ้งผู้เกี่ยวข้องใน v1 แสดงในหน้าสถานะ ไม่อ้างว่ามี email/SMS ที่ส่งจริง

## เงื่อนไขเปิดขั้นตอนตาม UC

| UC | Gate สำคัญ |
|---|---|
| UC-01 | การจ้างจาก UC-04; ลูกจ้างยังอยู่ต่างประเทศ; เลือกกรณีคำขอและประเทศพำนัก |
| UC-02 | มี Employment; กรณีหลังเข้าประเทศต้องมี Entry ALLOWED และ certificate ที่พร้อมใช้ตาม Checklist; กรณีก่อนเดินทางใช้เอกสารตามประเภทคำขอ |
| UC-03 | ชุด Work Permit READY และตรวจ Application เดิมก่อนสร้างใหม่ |
| UC-04 | สิทธิ์จัดการนายจ้าง/ลูกจ้าง; บันทึกข้อมูลกลางไม่ใช่อนุญาตเริ่มงาน |
| UC-05 | ข้อมูล UC-04 และหนังสืออนุมัติที่เกี่ยวข้องจาก UC-01; เลือกประเภท Visa/สถานทูต/ประเทศก่อนสร้าง Checklist |
| UC-06 | มีชุด UC-05; required items ผ่านและข้อมูลตรงหลักฐานก่อน READY |
| UC-07 | ผล Visa APPROVED + Visa พร้อมใช้; ไม่พร้อมให้ดูสถานะได้แต่รับไม่ได้ |
| UC-08 | Visa จาก UC-07; เดินทางและตรวจเกิดภายนอก; DENIED ยุติเส้นทางนั้น ไม่เปิด UC-09 |
| UC-09 | Entry ALLOWED; โรงพยาบาลออกผลและใบรับรองภายนอก |
| UC-10 | Work Permit APPROVED + เอกสารหรือช่องทางรับพร้อมจริง |
| UC-11 | ชุด Visa READY จาก UC-06; เก็บการยื่นและผลในคำร้องเดิมตามหลักฐาน |

Gate เป็นข้อมูลที่ UI อ่านผ่าน availableActions แต่ Server คำนวณใหม่ทุก write
การเปลี่ยน Evidence/metadata ที่ gate เคยพึ่งพาต้องทำให้ gate ไม่ผ่านจนกว่าจะตรวจซ้ำ ไม่คงสิทธิ์จาก cache ของ UI

## ความล้มเหลวและคำขอพร้อมกัน

- Validation, permission, storage หรือ DB ล้มเหลว: ไม่เปลี่ยน business state และไม่แสดง success
- รับ expectedVersion ใน write; version ไม่ตรงคืน CONFLICT พร้อมให้โหลดข้อมูลล่าสุดก่อนแก้และส่งใหม่
- สองคน review/recordDecision พร้อมกันต้องมีคนเดียวเปลี่ยนจาก version เดิมสำเร็จ
- Receipt ซ้ำของ document เดิมและข้อมูลรับตรงกันคืน Receipt เดิม; ถ้ารายละเอียดต่างคืน CONFLICT ไม่ overwrite การรับจริง
- Upload/Download failure ไม่สร้าง Receipt และไม่เปิด stage ถัดไป
- การบันทึก correction เก็บ reason และ actor/time ในระบบ ไม่ใช้การ edit โดยไม่มีประวัติของ operation
