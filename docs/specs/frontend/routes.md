# Frontend Routes และ Navigation

สถานะ: Proposed implementation; ใช้ [Frontend index](README.md), [Data Contract](../data-contract.md), [Workflow](../workflows.md) และ [Authorization](../authorization.md) ร่วมกัน

Desktop Web 1440 px ตาม Figma; screen IDs อ้าง [Use Case Map](../../use-case-map.md) ไม่ใช่ข้อบังคับหนึ่ง URL ต่อหนึ่ง frame

## Route และพฤติกรรม

Routes ด้านล่างเสนอเพิ่มจากพื้นที่ Route เดิม; IDs ใน URL เป็น decimal string และต้องผ่าน Server authorization

| Route / Screen | UC | ข้อมูลและ Action | เงื่อนไขและผลลัพธ์ |
|---|---|---|---|
| /login — S01/S01W | Supporting | username, password; signIn, signOut | เลือก Role จากบัญชีที่ตรวจแล้ว ไม่ใช้สวิตช์ Role เป็น authentication; error แบบไม่เปิดเผยว่ามีบัญชีหรือไม่ |
| /employer/workers — E01 | UC-04 | ค้นหาชื่อ/Passport, รายการและสถานะการจ้าง; เปิดรายละเอียด/เพิ่ม | ค้นเฉพาะ Employer ปัจจุบัน; empty state มีทางเพิ่มข้อมูล |
| /employer/workers/new — E02 | UC-04 | สร้าง Worker และ Employment; saveWorkerEmployment | แสดง field errors; duplicate/conflict ให้ตรวจรายการเดิม; ไม่สร้าง Employment ซ้ำเมื่อ retry |
| /employer/workers/:workerId | UC-04 | โปรไฟล์และ selector รายการ Employment ที่มีสิทธิ์ | เลือกการจ้างก่อนเปิดรายละเอียด/แก้ไข/เริ่มคำขอ; ไม่เลือกประวัติล่าสุดให้อัตโนมัติ |
| /employer/workers/:workerId/employments/:employmentId — E15 | UC-04 | โปรไฟล์, การจ้าง, DocumentSet และ Application ของการจ้างที่ระบุ | ไม่รวมเอกสารของนายจ้างอื่น; เริ่มคำขอใหม่ด้วย employmentId นี้ |
| /employer/workers/:workerId/employments/:employmentId/edit — E14 | UC-04 | แก้ข้อมูล Worker/Employment ด้วย saveWorkerEmployment | ส่ง workerId และ employmentId คู่เดิม; Server ตรวจความสัมพันธ์และ scope ก่อนบันทึก |
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
| Tab คำแจ้งใน E15 /employer/workers/:workerId/employments/:employmentId?tab=corrections | Supporting; Proposed UI เพิ่ม ยังไม่มี frame เฉพาะใน Figma | listCorrections; กรอง OPEN/RESOLVED; เลือกรายการเปิด detail panel ด้วย getCorrection | เฉพาะการจ้างที่เลือก; badge จำนวน OPEN และ link จากหน้าคำขอที่เกี่ยวข้อง |
| Shared — S02/S03/S03S/S04/S05 | Supporting | ไม่มีสิทธิ์, preview/download, save feedback | ไม่ต้องสร้าง URL แยกสำหรับ toast/modal; download จำลองใน demo ต้องบอกชัด |

หน้า list ของ pre-arrival/visa/work-permits ใช้พื้นที่ Route เดิมและ link ไป set/application ที่มีสิทธิ์
Summary แสดงรายการ pending ถ้ามีหลายคำขอ ไม่เลือก “ล่าสุด” มาแทนคำขอที่ผู้ใช้กำลังติดตามโดยเงียบ ๆ

## บริบท Worker / Employment

รายการ E01 link ไปหน้าการจ้างที่ระบุทั้ง workerId/employmentId หรือหน้า selector เมื่อเริ่มจากระดับ Worker
Selector แสดงตำแหน่ง ช่วงวันที่ และ employmentId แยกประวัติของ Worker คนเดิม เฉพาะ Employer ที่ session มีสิทธิ์
Header ของ detail/edit แสดง Worker และการจ้างที่เลือก; ทุก link ไปชุดเอกสาร/คำขอและ mutation ใช้บริบทเดียวกัน
Refresh/deep link ต้องได้การจ้างเดิมจาก URL; ไม่อ่านการเลือกจาก global “latest employment”
Server ตรวจ employmentId เป็นของ workerId และ Employer ปัจจุบัน; คู่ไม่ตรง/ไม่มีสิทธิ์คืน NOT_FOUND โดยไม่ fallback
เปลี่ยน selector ไป URL ใหม่และโหลดข้อมูลใหม่; ถ้า form มี unsaved changes ให้ยืนยันการทิ้งก่อนสลับ ห้ามส่ง draft เก่าไปการจ้างใหม่
URL เดิม /employer/workers/:workerId/edit ยังไม่มี implementation และไม่ใช่ canonical route; หากรองรับให้กลับ selector ห้ามเดา employmentId

## คำแจ้งข้อมูลไม่ตรงจนปิดเรื่อง

Worker เปิด W10 จากเอกสาร Visa/Work Permit หรือ Entry ที่เลือก: Visa/Work Permit ใช้ targetId ของ Document, ENTRY ใช้ EntryRecord
ส่ง targetType, targetId, reason, evidenceDocumentIds ตาม CorrectionInput; Worker ไม่เลือก Employer ผู้รับเอง Server derive จาก target และ Employment ที่เกี่ยวข้อง
หลังบันทึก Worker ดูสถานะ OPEN/RESOLVED และคำตอบ resolution ในส่วนคำแจ้งของหน้า Visa/Travel/Permit เดิม ผ่าน listCorrections/getCorrection
Employer เข้าจาก Tab คำแจ้งของ E15 หรือ link จากหน้าคำขอ → เลือกรายการ → อ่านเหตุผล/หลักฐาน/เป้าหมายและสถานะ
Detail panel แสดงช่องคำตอบ resolution และปุ่ม “ตอบกลับและปิดเรื่อง” ซึ่งเรียก resolveCorrection ด้วย correctionId, resolution, expectedVersion, requestId
resolution เป็นคำตอบตอนปิดเรื่องใน v1 ไม่เพิ่ม chat/thread หรือการตอบชั่วคราวขณะ OPEN; ต้องตรวจหลักฐาน/ดำเนินการที่มีสิทธิ์ก่อนปิดตาม Workflow
Resolve สำเร็จจึงเป็น RESOLVED และแสดงคำตอบ/ผู้ตอบ/เวลาให้ Worker; ไม่แก้เอกสารต้นฉบับหรือข้ามสิทธิ์ยืนยันผลภายนอก
รองรับ empty/loading/error; reason/resolution required; failure คง OPEN และข้อความที่กรอก, stale version ให้ reload, RESOLVED เป็น read-only ไม่ปิดซ้ำ
