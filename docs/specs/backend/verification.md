# Backend verification และ implementation handoff

เกณฑ์ด้านล่างยังไม่ใช่ผล runtime tests; [Acceptance baseline](../acceptance.md) ยังคงใช้ครบ
PR ของเอกสารต้องแสดงผลตรวจเอกสารแยกจากการพิสูจน์ Backend จริง

## Requirement → Test matrix

| ID | Scope | Setup / action | Observable result |
|---|---|---|---|
| BE-UC01 | UC-01 | pre-arrival case, missing → corrected → reviewed → draft submission → accepted → approved letter | ไม่มี evidence คง awaiting; letter ready จึงเปิด Visa; save failure ไม่ advance |
| BE-UC02 | UC-02 | BEFORE_ENTRY เทียบ AFTER_ENTRY, previous reference, checklist mismatch | ก่อนเดินทางไม่บังคับ medical; หลังเดินทางต้อง ALLOWED/certificate ตาม case; ไม่บังคับสองแบบพร้อมกัน |
| BE-UC03 | UC-03 | READY permit set; accepted/pending/additional/rejected/approved/not-issued/issued | ติดตาม Application เดิม; approved-not-issued รับไม่ได้; new set เฉพาะคำร้องใหม่ |
| BE-UC04 | UC-04 | create/update employer/worker/employment พร้อม docs และ versions | atomic commit; duplicate/retry ไม่สร้างซ้ำ; lost update conflict; shared Worker edit ตาม O-06 |
| BE-UC05 | UC-05 | approval letter, visa case/type/country/history true/false/unknown | conditional historical permit/tax evidence; unknown applicability review ไม่ผ่าน |
| BE-UC06 | UC-06 | review current checklist, แล้วแก้ file/profile/case/policy | READY ผูก content/version; stale review ใช้ยื่นไม่ได้; mixed foreign checklist item rollback |
| BE-UC07 | UC-07 | approved Visa + no file/valid file + view/download/actual confirm | ไม่มีไฟล์จริงยังรับไม่ได้; download ไม่สร้าง receipt; confirm actual สร้างครั้งเดียว |
| BE-UC08 | UC-08 | plan → pending evidence → ALLOWED/DENIED และ concurrent change | plan ไม่ใช่ approval; no grant ปฏิเสธ; DENIED ไม่เปิด medical |
| BE-UC09 | UC-09 | allowed entry, visit, pending/additional/complete result, invalid/valid certificate | complete อย่างเดียวไม่เปิด permit; same Worker และ evidence/grant ครบจึง verified |
| BE-UC10 | UC-10 | permit approved-not-issued/digital/physical + actual confirmation | verified channel/evidence ตาม policy; receipt unique และ immutable |
| BE-UC11 | UC-11 | accept submission, additional docs/review/resubmit, embassy decision, Visa metadata | revised UC-11 ครบ; same Application round history; final metadata correction ต้อง reason/policy |
| BE-AUTH | Supporting | expired/revoked/inactive/malformed role/account/session/service และ signOut | no scope fallback; revoked ใช้ต่อไม่ได้; safe generic credential errors |
| BE-SCOPE | Every query/command/file | Employer A/B, Worker A/B, Worker shared Employment, foreign IDs/joins | ไม่มีข้อมูล/count/file URL รั่ว; same Worker scope ยังไม่ให้สิทธิ์ทุก Employment |
| BE-GRANT | Entry/Medical/Correction | spoof grants, revoked grant, correct grant wrong Worker | deny before writes; correction ไม่ bypass target capability |
| BE-ATOMIC | Every composite write | inject DB failure หลัง child write ก่อน parent/status/receipt commit | rollback ทั้ง transaction; ไม่ส่ง success; existing state ไม่เปลี่ยน |
| BE-RACE | Every transition | concurrent upstream evidence change, review/submission/result/receipt versions | ไม่ใช้ gate เก่า, no lost update, receipt/application uniqueness; deadlock/serialization bounded retry |
| BE-REPLAY | Every mutation | network timeout after commit, same key same/different payload, current scope revoked | return committed ref เดิม/CONFLICT; current policy ยังบังคับ; no stale DTO overwrite |
| BE-FILE | Upload/download/cleanup | MIME spoof, corrupt/encrypted file, >5 MiB, key mutation, expired reservation/URL, cleanup-complete race | reject unsupported/unverified file; immutable checked bytes; cleanup ไม่ลบ referenced object; no fake success |
| BE-CORRECTION | Supporting | report mismatch, authorized/unauthorized resolve, final result | OPEN ไม่แก้ต้นฉบับ; authorized patch+history+invalidate atomic; unresolved policy คง OPEN |
| BE-SCALAR | Every boundary | BIGINT เกิน safe integer, leading zeros, date/timezone/พ.ศ., decimal currency | ID/string/วันไม่เสียความหมาย; null-before-event ไม่ใส่ค่าปลอม |
| BE-OPS | Infrastructure | missing config, storage/DB outage, recovery และ restore rehearsal | fail closed/readiness ตามจริง; no secret logs; backup references เปิดเอกสารได้หลัง restore |
| BE-VISIT-LOCK | saveHealthVisit | update หลัง COMPLETE, ADDITIONAL_TESTS, recorded result/evidence หรือ certificate; แข่งกับ recordHealthResult/confirmMedicalCertificate; create ใหม่ entry เดิม | locked update ถูกปฏิเสธ, ผล/ใบรับรอง/downstream gate/version คงเดิม; pending ที่ยังไม่มีผลแก้เฉพาะนัดได้; unique entry กัน create bypass |
| BE-ISSUED-ONCE | attachIssuedDocument | attach ซ้ำด้วย requestId เดิม/ใหม่, สอง key แข่งกัน, และ attach หลัง receipt | replay เดิมคืน slot เดิม; key ใหม่ CONFLICT; DB UNIQUE slot ทำให้สำเร็จอย่างมากหนึ่งราย; Document/Receipt เดิมไม่ถูกเพิ่ม/แทน/reset; reissue รอ O-07 |
| BE-PLAN-MODE | saveTravelPlan/recordEntryResult | incomplete DRAFT → incomplete CONFIRM → valid CONFIRM; wrong supplied field; DRAFT ทับ confirmed; record result จาก draft | DRAFT เก็บ partial valid fields ได้; invalid CONFIRM/invalid supplied field ไม่เขียน; valid CONFIRM จึง planStatus CONFIRMED แต่ entryResult ยัง PLANNED; draft ไม่เปิดผลเข้าเมือง; confirmed ไม่ downgrade |
| BE-ENCODING | document checker | run ปกติ และ python3 -X warn_default_encoding -W error::EncodingWarning scripts/check-specs.py | ทุก read_text ระบุ UTF-8 รวม Backend paths ใหม่; ไม่มี locale-dependent read; ไม่อ้างว่าได้ทดสอบ Windows จริงจาก check นี้ |

## Test layers

Pure rule tests: case applicability, checklist, dates, status guards, allowed actions และ owner matching; injected clock ให้ตรวจ event time ได้
Integration: disposable DB + private test objects + Auth adapter จริง; assert transaction, constraints, query scope, storage cleanup และ concurrent requests
Adapter tests: Server Action/HTTP parse input เดียวกันแล้วเรียก operation เดียวกัน, error envelope/HTTP mapping, cookie/origin checks และ safe DTO
End-to-end: บัญชีจริงสอง Actor + สิทธิ์ scoped evidence ที่ provision สำหรับ test; main path และ failures ครบตาม UC; fake-user switch ไม่ใช้พิสูจน์ authorization
ใช้ public operations/assert DB invariant ไม่ทดสอบแค่ private function หรือภาพปุ่ม disabled

## ลำดับเริ่ม implement

1. ตัดสิน O-01/O-03/O-08 ที่เกี่ยวข้อง; record Auth mapping/typed schema/checklist test catalog และ versioned dependencies
2. ตั้ง test environment/seed/DB private storage พร้อม scope/Auth boundary; ตรวจ BE-AUTH/BE-SCOPE/BE-FILE ก่อนเพิ่มข้อมูลจริง
3. UC-04 → pre-arrival → Visa preparation/review/submission/receipt พร้อม failure/replay tests
4. Entry/Medical หลัง O-02 เรื่องผู้มีสิทธิ์; Work Permit ทั้งสองกรณี → actual receipt; correction/history ตาม O-07
5. ปิด integrated acceptance และ operational gates O-04/O-05/O-06 ที่เกี่ยวข้องก่อน production
ทุกช่วงต้องมี safe error, scope, transaction และ recovery ของช่วงนั้น ไม่เลื่อนไปทำ security ทั้งหมดท้ายงาน

## เอกสารชุดนี้ตรวจอะไรได้

`python3 scripts/check-specs.py` ตรวจ links/anchors, source fingerprints ที่มี, ตัวอย่าง JSON, UC/Class/operation references และ acceptance IDs
ตรวจว่าทุก UC มี Controller mapping และ operations อยู่ใน catalog; subclasses ไม่ถูกนับเป็นตารางใหม่
checker ไม่ใช่ business transition engine และไม่พิสูจน์ว่า parameterized SQL/Auth/lock strategy/ไฟล์ตรวจชนิดทำงานจริง
source hash ตรงแปลว่าไฟล์ไม่เปลี่ยน ไม่ได้แปลว่ารายละเอียดใน Spec ถูกต้องทั้งหมด; ต้องอ่าน findings และ review ข้อเสนอด้วย
