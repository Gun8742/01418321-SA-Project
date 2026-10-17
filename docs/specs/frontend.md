# Frontend specification

สถานะ: Proposed implementation; business gates อ้าง [Workflow](workflows.md), สิทธิ์อ้าง [Authorization](authorization.md)
Desktop Web 1440 px ตาม Figma; screen IDs อ้าง [Use Case Map](../use-case-map.md) ไม่ใช่ข้อบังคับหนึ่ง URL ต่อหนึ่ง frame

## Route และพฤติกรรม

Routes ด้านล่างเสนอเพิ่มจากพื้นที่ Route เดิม; IDs ใน URL เป็น decimal string และต้องผ่าน Server authorization

| Route / Screen | UC | ข้อมูลและ Action | เงื่อนไขและผลลัพธ์ |
|---|---|---|---|
| /login — S01/S01W | Supporting | username, password; signIn, signOut | เลือก Role จากบัญชีที่ตรวจแล้ว ไม่ใช้สวิตช์ Role เป็น authentication; error แบบไม่เปิดเผยว่ามีบัญชีหรือไม่ |
| /employer/workers — E01 | UC-04 | ค้นหาชื่อ/Passport, รายการและสถานะการจ้าง; เปิดรายละเอียด/เพิ่ม | ค้นเฉพาะ Employer ปัจจุบัน; empty state มีทางเพิ่มข้อมูล |
| /employer/workers/new และ /employer/workers/:workerId/edit — E02/E14 | UC-04 | ข้อมูล Worker และ Employment; saveWorkerEmployment | แสดง field errors; duplicate/conflict ให้ตรวจรายการเดิม; ไม่สร้าง Employment ซ้ำเมื่อ retry |
| /employer/workers/:workerId — E15 | UC-04 | โปรไฟล์, การจ้าง, DocumentSet และ Application ของการจ้างนี้ | ไม่รวมเอกสารของนายจ้างอื่น; เริ่มคำขอใหม่ผ่านการเลือกประเภท/กรณี |
| /employer/pre-arrival/:setId — E03/E04 | UC-01 | ข้อมูลคำขอ, checklist, preview, review; submission/result tabs | เตรียม/ตรวจทานก่อนบันทึกการยื่น; ผล APPROVED เปิดเตรียม Visa เมื่อหลักฐานครบ |
| /employer/visa/:setId — E05/E06 | UC-05, UC-06 | ข้อมูลเอกสาร, upload/link, checklist, preview/review | แก้ข้อมูลที่ผ่าน review แล้วต้อง review ใหม่; ไม่ครบแสดงรายการที่ต้องแก้ |
| /employer/visa/:setId/application — E07–E10 | UC-11 | รับคำขอ, หลักฐานยื่น, ติดตามผล, ส่งเอกสารเพิ่ม, แนบ Visa | ไม่มีหลักฐานรับคงรอยืนยัน; APPROVED ยังไม่เท่ากับพร้อมรับ |
| /employer/work-permits/:setId — E11 | UC-02 | จัดชุด/ตรวจ Work Permit | กรณีหลังเข้าประเทศต้อง ALLOWED และใบรับรองตาม checklist; ก่อนเดินทางเลือกกรณี/อ้างอิงเดิมตาม Description |
| /employer/work-permits/:setId/application — E12/E13 | UC-03 | การยื่น, ผล, เอกสารเพิ่ม, ใบอนุญาต | หน่วยงานภายนอกเป็นผู้ตัดสิน; อนุมัติและมีใบอนุญาตจริงจึงพร้อมรับ |
| /worker — W01 | Summary | งานถัดไป, Visa, Entry, Medical, Work Permit | อ่านของตนเอง; สถานะ derived จากข้อมูลจริง ไม่แก้ status ตรงนี้ |
| /worker/visa — W02/W03 | UC-07 | ดู metadata/ไฟล์ Visa; confirmReceipt | เปิดรับเมื่ออนุมัติและมีเอกสารจริง; กดยืนยันว่าได้รับจริงก่อนบันทึก |
| /worker/travel — W04/W04A/W04R/W04N | UC-08 | แผนเดินทาง, หลักฐานเข้าเมือง, ผลตรวจ | แผนไม่ใช่ ALLOWED; ผลต้องมี evidence และ capability; DENIED ปิดเส้นทางต่อ |
| /worker/medical — W05/W06/W06S | UC-09 | วัน/สถานพยาบาล, ผล/นัดเพิ่มเติม, ใบรับรอง | เข้าได้เมื่อ ALLOWED; บันทึกผลด้วย capability; ไม่วินิจฉัยจากค่าเอง |
| /worker/work-permit — W07/W08/W09 | UC-10 | ใบอนุญาต/พร้อมรับ/ยืนยันการรับ | รับได้เมื่อ APPROVED และเอกสารพร้อม; retry ไม่สร้าง receipt ซ้ำ |
| Dialog จาก Visa/Travel/Permit — W10/W10S | Supporting | แจ้งข้อมูลไม่ตรง, รายละเอียด, evidence; reportCorrection | ไม่แก้เอกสารที่ออกแล้วเอง; การตอบกลับ/ปิดเรื่องอยู่ในขอบเขต Employer ที่เกี่ยวข้อง |
| Shared — S02/S03/S03S/S04/S05 | Supporting | ไม่มีสิทธิ์, preview/download, save feedback | ไม่ต้องสร้าง URL แยกสำหรับ toast/modal; download จำลองใน demo ต้องบอกชัด |

หน้า list ของ pre-arrival/visa/work-permits ใช้พื้นที่ Route เดิมและ link ไป set/application ที่มีสิทธิ์
Summary แสดงรายการ pending ถ้ามีหลายคำขอ ไม่เลือก “ล่าสุด” มาแทนคำขอที่ผู้ใช้กำลังติดตามโดยเงียบ ๆ

## กลุ่ม Field

ทุก Field เป็นข้อเสนอ mapping จาก Description/UI; รายการตามกฎหมายจริงต้องใช้ checklist/template ที่ได้รับยืนยัน ไม่ใช้รายการนี้แทน

| Form | Fields ที่ต้องรองรับ | Validation / conditional |
|---|---|---|
| Worker | ชื่อตาม Passport, วันเกิด, nationality, passportNo, ประเทศผู้ออก/วันที่ออก/หมดอายุ, ที่อยู่, email, phone | ชื่อ/nationality/passportNo required สำหรับ draft นี้; passport format ตาม nationality ที่ยืนยัน ห้าม regex เดียวครอบทุกประเทศ |
| Employment | employer/worker link, บริษัท/ทะเบียน/ที่อยู่/ผู้ติดต่อ, ตำแหน่ง/ลักษณะงาน, สถานที่, วันเริ่ม/ระยะจ้าง, ค่าจ้าง/หน่วย/สกุลเงินตามแบบ | employer derive จาก session; date range ถูกต้อง, เงิน decimal non-negative; fields ที่ต้องใช้ยื่นตรวจตอน review |
| Preparation | employmentId, ประเภท, caseKey, ข้อมูลแบบคำขอ, checklistVersion, documents | ต้องระบุกรณีเพื่อรู้ required/conditional checklist; draft ขาดได้แต่ review ผ่านไม่ได้ |
| Submission | authority, submittedAt, receiptNo, acceptedEvidence | ข้อมูลรับคำขอครบตามกรณีจึง SUBMITTED; ขาดเก็บ draft พร้อมบอกช่องที่ขาด |
| Decision | decision, decidedAt, reference/evidence, reason, requestedItems | เพิ่มเอกสาร/ไม่อนุมัติต้องมีเหตุผล; APPROVED ต้องหลักฐานผล |
| Issued document | type, documentNo, issuer, issuedAt, validFrom/expiresAt เมื่อมี, file หรือ physical availability evidence | no expiry ใช้ null ตามชนิด; วันเริ่มไม่หลังวันสิ้นสุด; ต้องผูกคำขอและ Worker เดียวกัน |
| Travel | visaDocumentId, plannedArrivalAt, travelMode, flightNo (เครื่องบิน), port, travel evidence, actualArrivalAt/result/reason/permittedUntil/evidence | แผนเป็น draft; actual result แยก fields/time; รับ DENIED ได้โดยไม่เปิด medical |
| Health | entryId, hospitalName, examDate, result, pendingItems/followUpAt, certificateNo เมื่อมี/issuedAt/doctorName/certificate | ADDITIONAL_TESTS ต้องคำแนะนำ/นัดตามหลักฐาน; COMPLETE ไม่แปลว่าผ่านการตรวจจนกว่าจะมีใบรับรองที่ยืนยัน |
| Receipt | documentId, receivedAt, channel, confirmation | explicit confirmation; วันไม่อนาคตตาม server clock; document ต้องพร้อมรับ |
| Correction | resourceType/id, reason, evidenceDocumentIds | required reason; จำกัดประเภท resource; ตรวจสิทธิ์ไฟล์และ resource |

วันที่แสดงไทยได้ แต่ส่ง ISO Gregorian ตาม [Data Contract](data-contract.md); ไม่แปลง พ.ศ. ซ้ำตอนบันทึก
ข้อเสนอ limit: search 100 characters, ชื่อ/หัวข้อ 200, reason/note 2,000; backend ใช้ชุดเดียวกันและเคารพขนาดคอลัมน์ที่จะอนุมัติ

## Components และ State

ใช้ Tokens/Components ของ Figma: สีเขียวเข้ม primary, light background, Noto Sans Thai; ค่าสี/spacing จริง extract จาก Foundations ตอน implement ไม่แต่ง token hex ใหม่ใน Spec
Components ที่ใช้ซ้ำ: AppShell, navigation ตาม Actor, StatusBadge, DataTable, FormField, Checklist, DocumentList/Preview, Stepper, ErrorSummary, ConfirmationDialog, Toast
ไม่สร้าง abstraction ทุกส่วนล่วงหน้า; แยกเมื่อมี reuse หรือ behavior ที่ต้องทดสอบ

ทุก data view รองรับ loading, empty, error + retry; ทุก mutation รองรับ saving, validation error, failure, success
ห้ามแสดง success ก่อน Server commit; error คงข้อมูลกรอกและ status เดิม; กรณี outcome ไม่แน่ชัดให้ reload/reconcile ก่อน retry
แสดง error ใกล้ field พร้อม summary และย้าย focus ไป error แรก; disabled action มีเหตุผลและทางแก้จาก blockingReasons
Submit ซ้ำขณะ saving ถูกยับยั้งใน UI แต่ Server ต้องป้องกันซ้ำด้วย

## Accessibility และ Responsive

เสนอเป้าหมาย WCAG 2.2 AA: semantic landmarks, labels จริง, keyboard ทุก action, focus ชัด, dialog trap/restore focus, error ผ่าน aria-describedby และ live feedback
ห้ามใช้สีอย่างเดียวบอก status; contrast ข้อความปกติอย่างน้อย 4.5:1, large text/UI controls ตามเกณฑ์ที่เกี่ยวข้อง
ทดสอบ 1440, 1024, 390 px; sidebar collapse, tables มี horizontal scroll โดย controls ยังเข้าถึงได้, ไม่มี text clipping
ข้อความไทยยาว/ชื่อไฟล์ยาวต้อง wrap; preview มี fallback download; reduced-motion ไม่เสียข้อมูล
สิ่งเหล่านี้เป็น acceptance target ยังไม่ใช่ผล audit ที่ทำแล้ว

## Mock และ integration seam

Frontend ใช้ operation interfaces ตาม [Backend](backend.md) และ DTO ตาม [Data Contract](data-contract.md)
Mock adapter และ Server adapter ให้ผล success/error shape เดียวกัน; mock role switch จำกัด demo build และติดป้าย “ข้อมูลสมมติ / จำลองการทำงาน”
ห้ามนำ mock adapter, fake login หรือ role override เปิดใน production
Fixture ต้องครอบคลุมงานครบ/ไม่ครบ/ขอเพิ่ม/ไม่อนุมัติ/พร้อมรับ/รับแล้ว และ failure; ห้ามมี PII จริง
