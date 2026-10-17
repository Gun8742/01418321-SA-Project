# Backend persistence และ transaction specification

สถานะ: Proposed; อ่าน [Database baseline](../database.md) และ [Class review](class-diagram-review.md) ก่อนสร้าง migration
ตารางใน ER/Dictionary 14 ตารางยังเป็น baseline; schema extensions ด้านล่างต้อง review ไม่ถือว่ารัน SQL แล้ว

## Class → Tables และ ownership

Employer/Worker/Employment/Application/DocumentSet/ChecklistItem/Document/DocumentReceipt/EntryRecord/HealthCheck → ตาราง snake_case ที่มีอยู่ใน Dictionary
VisaDocumentSet/WorkPermitDocumentSet → discriminated case data ใน document_set และ case policy, ไม่ใช่ subclass tables
Database → server DB client/transaction, ไม่มี business Entity ชื่อ Database ใน schema
ActorAccount/LoginService/LoginSession ยังจำเป็นแม้ Class Diagram ไม่แสดง; Auth integration รอ O-01

Document.owner ต้อง Employer XOR Worker; การแชร์เอกสารบริษัทผ่านชุดของ Employment ไม่เปลี่ยน owner เป็น Worker
Employer เห็น Worker-owned Document เฉพาะบริบทที่ได้รับอนุญาต ไม่ได้สิทธิ์ดูทุก Document ของ Worker
document_set_document เป็น M:N; unlink ลบ join เท่านั้น, ไม่มี object deletion ตามการถอดจากชุด
Application UNIQUE document_set_id; Receipt UNIQUE document_id; Health certificate UNIQUE health_check_id ตาม Dictionary
cross-links ทุกครั้งต้องยืนยัน same Worker/Employment/purpose; FK ที่มีอย่างเดียวไม่พิสูจน์ scope
Document ใช้ application/entry/health links ตาม purpose; supporting employer document ไม่ถูกบังคับให้มี Worker FK จนละเมิด XOR

## Fields เพิ่มที่ต้อง map จาก Description/Class

| Aggregate | Proposed fields / mapping | Nullability และ validation |
|---|---|---|
| Employer | name/registration/address/contact person/phone จาก UC-04 | ขนาด/type ตามภาพและ O-03; registration/phone string |
| Worker | DOB, passport issuer country/issue/expiry, address/email/phone | DATE สำหรับ calendar fields; required-at-confirm ตาม UC-04; ไม่เติมวันปลอม |
| Employment | job description/terms, workplace, wage decimal/currency/unit, dates/status | status ไม่เท่ากับอนุญาตทำงาน; endDate nullable ตามระยะจ้าง |
| DocumentSet | type/caseKey, residenceCountry, visaType/targetAuthority/submissionCountry, workHistory, requestType/travelStatus, previousApplicationId, checklistVersion, reviewedContentVersion | case-discriminated fields; unknown workHistory nullable ใน draft; travelStatus ต้องตรวจ against Entry evidence |
| ChecklistItem | requirementKey/applicability/document refs/checkResult/remark/reviewer/time | checkedAt/reviewer nullable ก่อนตรวจ; required เมื่อมีผล review จริง |
| Application | submissionStatus แยก decisionStatus, authority/channel, receiptNo/submittedAt/decidedAt, current round | nullable ก่อน event; SUBMITTED ต้อง acceptance evidence ตาม case; ไม่ตั้ง decidedAt ตอนแค่ PENDING |
| Document | title/type/private storage object/version/checksum/size/MIME, conditional issue/expiry/validFrom, collection details | fileUri เดิมเป็น private reference ไม่ public URL; VISA UC-11 ต้องไฟล์; supporting upload บางชนิดไม่มีเลข/วันหมดอายุ |
| EntryRecord | planStatus DRAFT/CONFIRMED, planned arrival/mode/flight/port และ actual arrival/decision/reason/permittedUntil แยกกัน | plan fields nullable ใน DRAFT; CONFIRMED ต้องครบตาม mode; old travelDate ไม่ใช้แทน actual; DRAFT บันทึกผลเข้าเมืองไม่ได้ |
| HealthCheck | hospital/exam/result/pending items/followup, certificate verification actor/time/identity | เสนอ UNIQUE entry_id (หนึ่ง health episode ต่อ entry ใน v1); update นัดต้อง PENDING และไม่มีผล/ใบรับรอง; สถานะ locked ไม่ reset |
| DocumentReceipt | actual receivedAt/channel/confirmedByAccountId | immutable actual receipt, Worker/document links; ไม่ใช้ viewedAt แทน |
| Mutable aggregates | version integer >=1, createdAt/updatedAt | optimistic compare-and-increment; timestamps Server-generated เว้นวัน event ตามหลักฐาน |

fields ตาม type ควร typed columns ที่ validate ได้; catalog/template definitions เป็น configuration/versioned data ที่ review แล้ว
ถ้าใช้ JSON เฉพาะ template-specific extra fields ต้องมี versioned allowlist/schema ห้ามรับ arbitrary keys เป็นทางลัด
exact lengths, auth-native identifiers และ evidence/correction physical layout รอ O-01/O-03; Spec นี้ไม่ใช่ schema drop-in

## Proposed supporting records

| Record | Fields/constraints ขั้นต่ำ | เหตุผล |
|---|---|---|
| requirement catalog/version | case/type/authority/country/version, item keys/required/applicability/template refs | checklist ย้อนตรวจได้ว่าผ่านตามเวอร์ชันใด |
| review snapshot | set/version, normalized form snapshot, linked document immutable versions/checksums, policy version, reviewer/time/outcome | READY ต้องตรง content ที่ตรวจ; submission เก็บ snapshot อ้างอิง ไม่อ่าน live profile ย้อนทับ |
| application_event | application/round/event type/status observation, eventAt/recordedAt/actor/reason/evidence links | followup/decision trace โดยไม่ลบผลเก่า; เป็น history log ไม่ใช่ event-sourcing framework |
| application_requested_item | application/round/item key/reason, supplied document refs, resolved-by-resubmission refs | additional documents ในคำร้องเดิม, ไม่ตีความ upload เป็น authority acceptance |
| evidence links | typed FK target + document_id + purpose; UNIQUE target/document/purpose | accepted/decision/issued/entry/medical evidence แยกกัน; same Worker/scope check |
| application_issued_document | composite PK (application_id, document_type), document_id UNIQUE FK | issued slot หนึ่งรายการต่อ Application/type; ไม่มี replacement/reissue จน O-07; supporting/evidence Documents ไม่ถูกนับเป็น slot |
| correction_request | target typed FK/XOR, reporter, reason, state, resolution, timestamps/version | W10 และการแจ้งข้อมูลบันทึกผิด; valid target เพียงหนึ่งประเภท |
| scoped capability assignment | account, capability, Worker/Employment scope, issued/revoked/expiry | provision/revoke ที่ตรวจได้ ไม่ Client-granted |
| upload reservation | uploadId, actor/scope/purpose, generated key, expected/actual size/type/checksum, expiry, status, documentId? | bind file bytes กับผู้เริ่ม upload และ complete ครั้งเดียว |
| operation_receipt | UNIQUE actor+operation+requestId, payload digest, committed resource refs/versions, createdAt | reconcile mutation commit เมื่อ network timeout |

operation_receipt ไม่เก็บ raw input, password, file bytes หรือ signed URL; ไม่มี failed receipt ที่ทำให้ retry valid operation ถูกมองว่าสำเร็จ
เสนอ retention 7 วันสำหรับ operation receipts ใน demo/integration; production ต้องยืนยัน O-04 และเก็บ tombstone/key policy หาก retry horizon ยาวกว่า
เมื่อเลย horizon ให้ client reload current state และไม่ replay destructive/final-changing operation อัตโนมัติ

## Transaction units และ contention

| Unit | Reads ที่ต้องตรวจใน transaction | Writes ที่ commit พร้อมกัน |
|---|---|---|
| Worker+Employment save | scoped employer/worker/employment versions, duplicate policy | profile/job, approved doc links, dependent draft invalidation, operation receipt |
| Preparation/link/review | current policy/fields, complete file metadata, set/version + linked doc versions | set/checklist/joins/review snapshot/version, receipt |
| Submission/resubmission | READY reviewed content, application existing status/version, evidence | one Application, round/event/evidence/submitted snapshot, versions/receipt |
| Decision | confirmed submission/current round/version, scope/evidence | status+date/reason, event/requested items/evidence, version/receipt |
| Issued document | APPROVED application/version, Worker/type/file evidence, no existing issued slot | Document+issued slot+links/availability/event, versions/operation receipt; UNIQUE slot violation rollback ทุก write |
| Travel plan | scoped Visa, mode, current planStatus/entryResult/version; CONFIRM completeness | fields+planStatus+version/operation receipt atomic; CONFIRM fail ไม่เปลี่ยน draft/confirmed plan เดิม |
| Health visit | ALLOWED entry, unique entry episode, PENDING without results/certificate, version | เฉพาะ visit fields+version/operation receipt; locked guard กับผล/certificate ต้องอยู่ใน transaction เดียวกัน |
| Actual receipt | owner/approval/issued availability, existing receipt | receipt once + operation receipt; no download side effect |
| Entry/Health | capability currently active, same Worker, upstream gate/version | result/certificate/evidence/event/version/dependent draft invalidation/receipt |
| Correction resolution | correction OPEN/version, Employer scope ที่ derive จาก target | resolution+RESOLVED+resolvedBy/resolvedAt+version/operation receipt; ไม่ patch target; การแก้ target ใช้ operation/policy แยก |
| Upload completion | reservation actor/scope/expiry/object immutable version/bytes | Document+reservation completion+optional links/aggregate version+receipt |

External file upload/delete ไม่อยู่ใน DB transaction; ตรวจ immutable object version/checksum ก่อน reference เพื่อกันเปลี่ยน bytes หลังตรวจ
แทนไฟล์ด้วย Document/version ใหม่ ไม่ overwrite object เดิมที่ถูก review/submitted snapshot อ้าง; invalidation ต้องครอบ draft sets ที่อ้าง metadata/version ที่เปลี่ยนโดยไม่ลบ submitted evidence
ถ้า dependent evidence ถูกแก้/revoke ต้องไม่ปล่อย concurrent next-step mutation ใช้ gate เก่า: lock upstream resources หรือใช้ transaction isolation+version guards ที่ตรวจจริง
เลือก implementation วิธีเดียวที่พิสูจน์ race test ได้; compare-and-update target อย่างเดียวไม่พอเมื่อ upstream row คนละตัวถูกแก้พร้อมกัน
กำหนด lock order คงที่ตาม aggregate type แล้ว ID; retry serialization/deadlock แบบ bounded (เสนอสูงสุด 3 ครั้ง) เฉพาะ operation ที่ idempotent และ recheck gates ทุกครั้ง
จับ unique violation ที่ known constraint เป็น safe CONFLICT/replay ไม่ส่งชื่อ constraint/SQL ให้ Client
Application final decision/receipt history ไม่ reset เพราะแก้ draft; ติดธงข้อมูลบันทึกที่ต้องตรวจและบล็อก future actions แทนการลบประวัติ

## Query และ Index acceptance

scope/filter ก่อน count/pagination; stable sort, pageSize <=100; หลีกเลี่ยงการดึง file bytes/ทุก health records ไปทำ list
พิจารณา indexes ของ employer-worker Employment, set employment/type, application set unique/status, join reverse document_id, entry Worker/Visa, health entry, receipt doc unique, sessions account/expiry และ operation key unique
passport search/duplicate policy O-06 กำหนดก่อน unique index; ไม่เปิด global search คืนชื่อคนนอก scope
ใช้ EXPLAIN กับ synthetic seed ที่มี cardinality ใกล้เป้าหมายหลังเลือก capacity; PR นี้ไม่อ้างว่ามี query plan หรือ latency ผ่านแล้ว

## Migration และ data safety

สร้าง schema/migration หลัง O-01/O-03 ที่เกี่ยวข้องสรุป; pin compatible versions จาก manifests จริงและตรวจ official versioned docs ตอน implement
ตรวจ constraints ใน disposable PostgreSQL: PK/FK/UNIQUE/XOR/null-before-event/check enums/invalid cross-links, delete RESTRICT และ concurrent mutations
วงจร certificate: insert HealthCheck ก่อน Document FK แล้ว update verified link ภายใน transaction เดียว; ห้ามต้องมี circular non-null FK ตั้งแต่ต้นทั้งคู่
Seed บัญชี/ไฟล์/หลักฐาน synthetic เท่านั้น; reset script จำกัด local/test environment และป้องกัน connection string production
Database rollback ไม่ลบ object ที่ใช้ร่วม; deployment migration ที่มีข้อมูลต้อง backup/dry-run/backfill/restore rehearsal ตาม O-04 ไม่ reset ฐานจริง
