# Database specification

สถานะ: Proposed physical mapping; ยังไม่มี Prisma schema, DDL, migrations หรือ SQL ที่ผ่านการรัน
อ้าง [Data Model Sources](../data-model.md) และภาพต้นฉบับ 14 ตาราง; ไม่ถือว่าเอกสารนี้แก้ ER/Data Dictionary แล้ว
ภาพต้นฉบับยังเป็นที่มาของชื่อ/ขนาดคอลัมน์เดิม; การสร้าง migration ต้องเทียบทุก field กับภาพและรายการเปลี่ยนด้านล่าง

## ตารางหลักและ Constraints

| Table | Relationships / invariant / Index ที่ต้องพิจารณา |
|---|---|
| employer | PK BIGINT; registration_no เป็น string; index สำหรับ lookup ที่ scope ใช้; unique policy รอ O-06 |
| worker | PK BIGINT; passport_no string, nationality; duplicate policy ตาม O-06 ไม่ assume passport unique ข้ามชาติ/การออกใหม่ |
| employment | FK employer/worker; job, work location, date/wage ตาม Description; index (employer_id, worker_id), (worker_id); ห้าม Worker link ผิด scope |
| document_set | FK employment; type/case, readiness, reviewed_at; index employment/type; checklist version snapshot |
| checklist_item | FK document_set; requirement key, applicability, result, checked_at; เสนอ unique (document_set_id, requirement_key) |
| application | FK document_set_id UNIQUE NOT NULL; แยก submission/decision; receipt/submission/decision/evidence; ไม่สร้างซ้ำสำหรับ followup |
| document | employer_id XOR worker_id; FK application/entry/health ตามประเภทและ Worker เดียวกัน; health_check_id nullable UNIQUE; private file reference |
| document_set_document | composite PK (document_set_id, document_id); FKs ทั้งคู่; reverse lookup index document_id; ไม่ unique แต่ละ FK |
| entry_record | FK worker, visa_document_id → document; แผนแยก actual/result/evidence; index worker_id/visa_document_id |
| health_check | FK worker/entry; entry ต้อง ALLOWED ของ Worker เดียวกัน; certificate Document link ตามแบบ; index entry_id/worker_id |
| document_receipt | document_id FK UNIQUE NOT NULL; worker/receiver/time/channel; unique กันรับซ้ำ ไม่ overwrite เมื่อ retry ต่าง payload |
| actor_account | username UNIQUE, password_hash, role, employer/worker link ตาม Role, login_service FK; last_login_at lifecycle nullable เสนอ |
| login_service | Authentication configuration; ไม่เก็บ secret จริงใน source; adapter mapping รอ O-01 |
| login_session | account/service FK คู่ต้องสอดคล้อง; token_hash UNIQUE; expiry/revoked_at; index account_id/expiry |

BIGINT ส่งออก JSON เป็น decimal string; TEXT/VARCHAR ตามขนาดที่อนุมัติ; DATE กับ timestamp แยกให้ตรง semantics
เสนอ timestamptz สำหรับเวลาของ event, เก็บ UTC; calendar-only ใช้ DATE ไม่สร้าง midnight UTC แทนโดยพลการ
FK ไม่แทน cross-resource authorization; กฎข้ามตารางต้องตรวจ transaction และเพิ่ม constraint ที่ทำได้จริง
เสนอ RESTRICT การลบ resource ที่มีคำร้อง/หลักฐาน/receipt อ้างอิง; ไม่มี destructive delete endpoint ใน v1
ห้าม cascade ลบหลักฐานหรือ worker ทั้งชุดโดยไม่ได้ retention policy

## Schema adjustments ที่เสนอ

| Gap | Proposed adjustment | เหตุผล / การตรวจ |
|---|---|---|
| reviewed_at, checked_at, decided_at, decision_at, last_login_at NOT NULL ในภาพ | nullable จน event เกิด; คู่ status/event validated ร่วมกัน | รองรับ draft/ยังไม่ทราบผล/ยังไม่เคย Login โดยไม่ใส่วันปลอม |
| receipt_no/submitted_at NOT NULL | nullable ใน draft/awaiting confirmation; SUBMITTED ต้องครบตามกรณี | ไม่อ้างว่ายื่นสำเร็จเพียงเพราะกรอกฟอร์ม |
| metadata เอกสารทุกชนิด NOT NULL | document_no/issuer/issue/expiry conditional ตามชนิด | supporting upload อาจไม่มีเลข/วันหมดอายุ; issued permit ยัง validate เข้มตามแบบ |
| readiness READY vs ER COMPLETE | explicit enum mapping ตาม workflows.md | ทำ migration แปลงค่าเมื่อมีข้อมูลจริง ห้ามยอมรับ arbitrary VARCHAR |
| ข้อมูล profile/employment/form ที่ขาด | เพิ่ม typed fields จาก Description เช่น DOB/email/passport details, job/location/wage; ไม่เก็บทุกอย่างเป็น JSON ก้อนเดียว | O-03 ต้องตรวจ exact field/type/length กับแบบคำขอ |
| แผน/ผลเข้าเมือง, flight และ Visa validFrom | แยก planned/actual fields และ conditional timestamps | แผนไม่เป็นหลักฐานเข้าเมือง |
| reviewer/checklist version/evidence | reviewer account FK, reviewed version, requirement catalog/version, evidence relationships | trace การ review กับเอกสารชุดจริง; แก้แล้ว invalidate |
| concurrent update | version integer >= 1 ใน mutable aggregates | compare-and-increment ภายใน transaction |
| record decision ซ้ำและ additional documents | application_event และ application_requested_item เป็นตารางเพิ่มที่เสนอ | เก็บผล/เหตุผล/หลักฐานเดิมโดยไม่ overwrite; ไม่ทำ event sourcing ทั้งระบบ |
| W10 แจ้งข้อมูลไม่ตรง | correction_request + evidence links เป็นตารางเพิ่มที่เสนอ | OPEN/RESOLVED, target, reporter, reason, resolution, timestamps/version; target ต้องตรวจ scope |
| retry หลัง timeout | operation_receipt: actor/operation/request_id UNIQUE, digest/result reference | atomic กับ operation; retention ต้องครอบคลุมช่วง retry ที่กำหนด |
| evidence capability | scoped account capability assignment | grant โดย provisioning ที่อนุมัติ ไม่เปิด self-grant/officer UI |

หลักฐานควรอ้าง Document ผ่าน FK/join table ไม่ใช้ URL หรือ array ID ที่ข้าม integrity checks
generic correction target ต้องมี constraint หรือ typed FK ที่ตรวจว่าระบุเป้าหมายเพียงหนึ่งประเภทจริง
certificate link ระหว่าง Document/HealthCheck ต้องวาง transaction ให้ไม่เกิด circular insert deadlock; ไม่มี health COMPLETE+verified certificate จน link ครบ
รายละเอียด schema extensions/constraints และ Auth adapter ต้อง review ก่อน migration; Spec นี้ไม่ใช่ schema drop-in

## Migration และ Seed acceptance

เริ่ม migration ใหม่เมื่อ O-01/O-03 ได้ข้อยุติ; pin PostgreSQL/ORM versions จริงแล้วทดสอบ constraints/rollback strategy ใน disposable database
Seed ใช้ข้อมูลสมมติและบัญชี demo ที่สร้าง credentials ผ่าน Auth integration ที่ถูกต้อง; ไม่ commit password/hash/session token จริง
ทดสอบ FK/UNIQUE/XOR, null-before-event, invalid-state rejection, concurrent receipt และ Worker cross-link
ถ้ามีข้อมูลเดิมในอนาคต ต้อง inventory/backfill/dry run/backup ก่อนเพิ่ม NOT NULL/UNIQUE; ห้าม reset production DB เพื่อให้ migration ผ่าน
Source images/queries ไม่ใช่หลักฐานว่า SQL/Prisma adapter รองรับ constraints เหล่านี้โดยตรง

รายละเอียด Class → Table, typed case fields, submitted snapshots, evidence records, lock/race handling และ transaction units อยู่ใน [Backend Persistence](backend/persistence.md)
