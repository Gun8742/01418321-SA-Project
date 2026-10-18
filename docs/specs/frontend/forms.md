# Frontend Forms และ Validation

สถานะ: Proposed implementation; ใช้ [Frontend index](README.md), [Data Contract](../data-contract.md), [Workflow](../workflows.md) และ [Authorization](../authorization.md) ร่วมกัน

## กลุ่ม Field

ทุก Field เป็นข้อเสนอ mapping จาก Description/UI; รายการตามกฎหมายจริงต้องใช้ checklist/template ที่ได้รับยืนยัน ไม่ใช้รายการนี้แทน

| Form | Fields ที่ต้องรองรับ | Validation / conditional |
|---|---|---|
| Worker | ชื่อตาม Passport, วันเกิด, nationality, passportNo, ประเทศผู้ออก/วันที่ออก/หมดอายุ, ที่อยู่, email, phone | ชื่อ/nationality/passportNo required สำหรับ draft นี้; passport format ตาม nationality ที่ยืนยัน ห้าม regex เดียวครอบทุกประเทศ |
| Employment | employer/worker link, บริษัท/ทะเบียน/ที่อยู่/ผู้ติดต่อ, ตำแหน่ง/ลักษณะงาน, สถานที่, วันเริ่ม/ระยะจ้าง, ค่าจ้าง/หน่วย/สกุลเงินตามแบบ | employer derive จาก session; date range ถูกต้อง, เงิน decimal non-negative; fields ที่ต้องใช้ยื่นตรวจตอน review |
| Preparation | employmentId, ประเภท, caseKey, ข้อมูลแบบคำขอ, checklistVersion, documents | ต้องระบุกรณีเพื่อรู้ required/conditional checklist; draft ขาดได้แต่ review ผ่านไม่ได้ |
| Visa preparation | visaType, country, authority, workHistory (true/false/null), taxEvidenceRequired (true/false/null) | Mock DEMO-1: เคยทำงานต้องแนบใบอนุญาตเดิม; ภ.ง.ด.91 เฉพาะกรณีที่ระบุว่าเข้าเงื่อนไขจากรายการคำร้อง; unknown เก็บ draft ได้แต่ review/submit ไม่ผ่าน เมื่อเปลี่ยนกรณีต้องบันทึกเพื่อปรับ Checklist และตรวจใหม่ |
| Submission | authority, submittedAt, receiptNo, acceptedEvidence | ข้อมูลรับคำขอครบตามกรณีจึง SUBMITTED; ขาดเก็บ draft พร้อมบอกช่องที่ขาด |
| Decision | decision, decidedAt, reference/evidence, reason, requestedItems | เพิ่มเอกสาร/ไม่อนุมัติต้องมีเหตุผล; APPROVED ต้องหลักฐานผล |
| Issued document | type, documentNo, issuer, issuedAt, validFrom/expiresAt เมื่อมี, file หรือ physical availability evidence | no expiry ใช้ null ตามชนิด; วันเริ่มไม่หลังวันสิ้นสุด; ต้องผูกคำขอและ Worker เดียวกัน |
| Travel | visaDocumentId, plannedArrivalAt, travelMode, flightNo (เครื่องบิน), port, travel evidence, actualArrivalAt/result/reason/permittedUntil/evidence | แผนเป็น draft; actual result แยก fields/time; รับ DENIED ได้โดยไม่เปิด medical |
| Health | entryId, hospitalName, examDate, result, pendingItems/followUpAt, certificateNo เมื่อมี/issuedAt/doctorName/certificate | ADDITIONAL_TESTS ต้องคำแนะนำ/นัดตามหลักฐาน; COMPLETE ไม่แปลว่าผ่านการตรวจจนกว่าจะมีใบรับรองที่ยืนยัน |
| Receipt | documentId, receivedAt, channel, confirmation | explicit confirmation; วันไม่อนาคตตาม server clock; document ต้องพร้อมรับ |
| Correction | targetType, targetId, reason, evidenceDocumentIds | required reason; targetType เป็น VISA/ENTRY/WORK_PERMIT ตาม Contract; ตรวจสิทธิ์ไฟล์และ target |
| Resolve correction | correctionId, resolution, expectedVersion, requestId | resolution required; OPEN และมีสิทธิ์จึงปิดได้; ไม่ส่ง target ใหม่หรือเปลี่ยนสถานะเอง |

วันที่แสดงไทยได้ แต่ส่ง ISO Gregorian ตาม [Data Contract](../data-contract.md); ไม่แปลง พ.ศ. ซ้ำตอนบันทึก
Mock ตรวจ `examDate ≥ actualArrivalAt` และ `certificate.issuedAt ≥ examDate` ก่อนบันทึก และตรวจซ้ำก่อนเปิด Work Permit; การแก้ข้อมูล Worker ร่วม invalidate review ของ draft ทุก Employment ที่พึ่งข้อมูลนั้น ส่วนการแก้ Employment อย่างเดียวกระทบเฉพาะ draft ของการจ้างนั้น ไม่ลบประวัติคำร้องที่ยื่นแล้ว
ข้อเสนอ limit: search 100 characters, ชื่อ/หัวข้อ 200, reason/note 2,000; backend ใช้ชุดเดียวกันและเคารพขนาดคอลัมน์ที่จะอนุมัติ

การเลือกบริบทและการส่งคำแจ้งใช้ [Routes](routes.md); การแสดง validation/failure ใช้ [UI States](ui-states.md)
