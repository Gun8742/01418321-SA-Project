# Data Model Sources

อัปเดตแหล่งอ้างอิงวันที่ 17 ตุลาคม 2569; Repository ยังไม่มี physical schema หรือ migrations ที่รันแล้ว

## ER ล่าสุด

ใช้ [ER Diagram — Peter Chen 2](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=322-5899) แทนหน้า Peter Chen เดิม

- [Unified Chen ER](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=322-5900): Entity, Attributes และ Relationships รวม Actor Login
- [ER with Queries](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=322-6341): ชื่อตาราง PK/FK และคำอธิบายประกอบ
- [Query Table](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=322-7040): Query ตัวอย่างของ UC01–UC11 และ Login

Description กำหนดพฤติกรรมและ Precondition ของ UC; ER กำหนดแบบจำลองข้อมูลที่ใช้อ้างอิง ส่วน Data Dictionary/ER Description ใน `../../Data-Dictionary-Images/` (นับจากราก Repository) กำหนดรายละเอียดคอลัมน์ที่เสนอ
หากข้อมูลขัดกันให้ระบุจุดขัดแย้งและผลต่อ implementation ก่อนเลือก mapping ไม่ถือว่าเอกสารชุดหนึ่งได้แก้อีกชุดโดยอัตโนมัติ
บอร์ดระบุว่า keys, attributes และ cardinalities เป็น design assumptions และ Query เป็นแบบเสนอ จึงยังไม่ใช่หลักฐานว่า SQL รันได้หรือมีการบังคับสิทธิ์ครบ

## กลุ่มข้อมูลที่พบ

| กลุ่ม | Entities | Module ที่เกี่ยวข้อง |
|---|---|---|
| นายจ้างและการจ้าง | Employer, Worker, Employment | workers, employment |
| ชุดเอกสารและคำขอ | DocumentSet, ChecklistItem, Application | documents, pre-arrival, visa, work-permits |
| เอกสารและการรับ | Document, DocumentReceipt | documents และ Module ธุรกิจที่เปิดรับเอกสาร |
| การเดินทางและสุขภาพ | EntryRecord, HealthCheck | travel, medical |
| Authentication | ActorAccount, LoginService, LoginSession | server/auth และ Auth integration |

Unified Chen ER มี 13 Entities ข้างต้น และระบุ associative table `document_set_document(document_set_id, document_id)` สำหรับ DocumentSet ↔ Document แบบ M:N
ไม่สร้างตาราง Visa หรือ WorkPermit แยกเพียงเพราะชื่อ Feature แยกกัน; เทียบการใช้ Application/Document ตามแบบจำลองก่อน

## ข้อสังเกตสำหรับ Authentication

- ActorAccount ผูกบทบาท EMPLOYER/REPRESENTATIVE กับ Employer และ WORKER กับ Worker; นายจ้างหรือลูกจ้างหนึ่งรายมีหลายบัญชีได้ตามแบบ
- ER ยังระบุ AUTHORIZED_OFFICER ที่อาจไม่มี Employer/Worker link แต่หน้าจอและขอบเขต UI ปัจจุบันรองรับสองกลุ่มหลัก บทบาทนี้ไม่ใช่การอนุมัติให้เพิ่มหน้าเจ้าหน้าที่หรือสิทธิ์กว้างโดยอัตโนมัติ
- LoginService เป็นข้อมูล configuration ของบริการ Authentication ไม่ใช่ Actor หรือสิ่งทดแทนโค้ดยืนยันตัวตน
- LoginSession ผูกกับบัญชีและ LoginService ที่ตรงกัน พร้อมอายุ Session และการเพิกถอน
- แบบระบุ `password_hash` และ `token_hash`; Query ตัวอย่างให้ตรวจรหัสผ่านใน application code ก่อนสร้าง Session
- Better Auth ยังเป็นตัวเลือก Stack ไม่ใช่ implementation ที่ตกลง mapping แล้ว ต้องเทียบ storage model, identifiers และ Session semantics กับ ER ก่อนเลือกใช้

กฎสิทธิ์และ Precondition ของธุรกิจยังอ้างอิง AGENTS.md และ revised Description; Query ในบอร์ดไม่แทนการตรวจ ownership และ transactions ใน implementation

## ER Description / Data Dictionary

ผู้ใช้ยืนยันว่า ER Description หมายถึง `../../Data-Dictionary-Images/` จากราก Git Repository
อ่านครบ 14 ภาพแล้ว ได้แก่ employer, worker, employment, document_set, checklist_item, application, document, document_set_document, entry_record, health_check, document_receipt, actor_account, login_service และ login_session
ชื่อไฟล์เป็นชื่อตารางแบบ snake_case; ในแต่ละภาพมี Field, คำอธิบาย, ชนิดข้อมูล (เสนอ), NULL, อ้างอิง FK และข้อกำหนด
ตำแหน่งนี้อยู่นอก Git Repository จึงไม่ได้มากับการ clone; ให้จัดหาเอกสารต้นฉบับก่อนเปลี่ยนตารางที่ยังตรวจเนื้อหาไม่ได้

ข้อกำหนดสำคัญที่อ่านได้จากภาพ:

- ใช้ BIGINT สำหรับ IDs/FKs, VARCHAR/TEXT สำหรับข้อมูลข้อความ, DATE สำหรับวัน และ TIMESTAMP สำหรับวันเวลา; ขนาด VARCHAR ต่างกันตาม Field จึงต้องอ่านภาพของตารางนั้นก่อน mapping
- `application.document_set_id` เป็น FK + UNIQUE และ NOT NULL; `document_set_document` ใช้ composite PK จากสอง FKs ไม่บังคับ UNIQUE แยกแต่ละคอลัมน์
- `document.employer_id` และ `document.worker_id` เป็น nullable FKs แต่ต้องมีเจ้าของเพียงหนึ่งรายแบบ XOR; Application/HealthCheck/Entry links ใช้ตามประเภทและต้องตรงลูกจ้าง
- `document.health_check_id` เป็น nullable FK + UNIQUE; `document_receipt.document_id` เป็น FK + UNIQUE และ NOT NULL
- `health_check.entry_id` ต้องอ้างผลเข้าประเทศที่อนุญาตและเป็นลูกจ้างเดียวกัน; `entry_record.visa_document_id` อ้าง Document ที่ใช้เดินทาง
- `actor_account.username` และ `login_session.token_hash` ต้อง UNIQUE; `login_session.revoked_at` nullable และ Session ต้องใช้ LoginService เดียวกับบัญชีเจ้าของ
- `registration_no`, `passport_no`, หมายเลขเอกสารและเบอร์โทรเป็นข้อความ เพื่อรักษาเลขศูนย์นำหน้าและอักขระ

## ช่องว่างที่ต้องแก้ตอนออกแบบ physical schema

ตารางต่อไปนี้เป็นข้อสังเกตจากการเทียบเอกสาร ไม่ใช่การแก้ Data Dictionary ต้นฉบับหรือกำหนด default ใหม่:

| จุดที่พบ | ผลต่อการพัฒนา |
|---|---|
| ภาพกำหนด `document_set.reviewed_at`, `checklist_item.checked_at`, `application.decided_at`, `entry_record.decision_at` และ `actor_account.last_login_at` เป็น NOT NULL | ต้องรองรับช่วงก่อนตรวจทาน ก่อนทราบผล และก่อน Login ครั้งแรก; หาข้อยุติ nullability/การสร้าง record ตาม lifecycle โดยไม่ใส่วันปลอม |
| `application.receipt_no` และ `submitted_at` เป็น NOT NULL | ต้องเทียบสถานะรอยืนยันการยื่นเมื่อยังไม่มีเลขรับ/หลักฐานก่อนกำหนด required fields |
| `document.document_no`, `issuer`, `issued_at`, `expires_at` เป็น NOT NULL | Description กำหนด metadata บางรายการเฉพาะเอกสารที่มีข้อมูลดังกล่าว จึงต้องตรวจตาม document type |
| Status/Role หลาย Field เป็น VARCHAR และข้อกำหนดให้กำหนดชุดค่าในการออกแบบ | ต้องระบุ allowed values และ transitions จาก UC/ER; ไม่ถือว่า VARCHAR ยอมรับค่าใดก็ได้ |
| Field ที่ Description/UI ใช้แต่ภาพยังไม่แยกคอลัมน์ครบ เช่น วันเกิด อีเมล เลขเที่ยวบิน ช่วงวันมีผล Visa และผู้ตรวจทาน | บันทึก mapping หรือ schema extension ที่จำเป็นอย่างชัดเจนก่อน implement ไม่ตัด Requirement ทิ้งเพราะไม่ปรากฏในภาพ |

ยังไม่ได้สร้าง DDL/Migrations, รัน Query ในฐานข้อมูล หรือยืนยันว่า Auth library ใช้ schema นี้ได้โดยตรง

## Class Diagram เพิ่มเติม

ตรวจ PDF `../../M3LycAAAAAElFTkSuQmCC.pdf` ครบ 1 หน้าแล้ว: Boundary/Control ครบ 11 UC พร้อม Entity subclasses สำหรับ Visa/Work Permit DocumentSet
ดู [Class Diagram review](specs/backend/class-diagram-review.md) สำหรับ inventory, method mapping และข้อแตกต่าง; subclass ไม่ใช่เหตุให้เพิ่มตารางใหม่ และ Auth entities ใน ER ยังจำเป็นแม้ไม่แสดงใน Class Diagram
