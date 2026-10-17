# Backend infrastructure specification

สถานะ: Proposed integration contract; ไม่ใช่ configuration/deployment ที่ตั้งค่าแล้ว
ใช้ private Server modules ตาม [Architecture](../../architecture.md); library/version/native Auth routes รอ O-01/O-08

## Auth และ capability lifecycle

signIn รับ username/password ผ่าน TLS ใน integrated deployment; validate shape, rate limit, generic invalid-credentials error, ไม่ log credentials
เสนอ rate limit เริ่มต้น 5 failed attempts ต่อ account-key/IP window 15 นาที พร้อม 429/retry hint; ค่า production และ proxy trust ต้องยืนยันก่อนเปิดจริง ไม่ใช้ account existence เป็น response
verify password/session ผ่าน integration ที่เลือกและ tested hashing configuration; ไม่สร้าง custom hash algorithm หรือระบบ Session ซ้อนเพื่อให้ column ตรง ER
issue session cookie Secure/HTTP-only ใน HTTPS deployment; SameSite/CSRF/origin checks ต้องเหมาะกับ deployment และทุก state-changing entrypoint
Auth-native response ใช้เฉพาะ auth adapter; ฝั่ง UI map safe result; password ไม่ผ่าน getMutationOutcome หรือ operation_receipt

resolveActor อ่าน session แล้วตรวจ account/service active, expiry/revocation, role/link ถูกต้อง และ capability ที่ยังไม่ revoked/expired
EMPLOYER/REPRESENTATIVE ต้อง linked Employer; WORKER ต้อง linked Worker; unknown/malformed role/link ปฏิเสธ ไม่ fallback
AUTHORIZED_OFFICER ยัง default deny; ไม่เพิ่มหน้า external officer
signOut revoke current session ฝั่ง Server และ clear cookie; network failure ต้องไม่อ้าง revocation สำเร็จจนตรวจได้
ระยะ session/rotation และ storage mapping ต้อง O-01; tests ใช้ injected clock ตรวจ expiry ไม่อ้างค่า default ของ library ที่ยังไม่ได้ติดตั้ง
provisionAccount/grant/revoke เป็น trusted operational process ไม่ public route: explicit role+scope, audit actor/time/reason, revoke ส่งผลต่อ request ถัดไป
ไม่ให้ UI ส่ง capability มาเพิ่มสิทธิ์; การ replay mutation receipt ยังตรวจ current scope/grant

## HTTP adapter ที่ต้องมี

เส้นทางต่อไปนี้เป็น proposal ใต้พื้นที่ /api/documents เดิม; Server Actions ไม่จำเป็นต้องมี REST endpoints ซ้ำ
ทุก handler ส่ง safe errors ตาม [Data Contract](../data-contract.md), จำกัด body และตรวจ session/origin/CSRF ตามวิธี auth ที่เลือก
เสนอ JSON metadata body ไม่เกิน 256 KiB; byte upload มีขอบเขต 5 MiB แยกต่างหากและต้อง enforce ฝั่ง proxy/storage พร้อม actual-byte check

| Method / Path | Operation / Input | Success | Error ที่สำคัญ |
|---|---|---|---|
| POST /api/documents/uploads | initiateUpload: purpose, contextId, originalName, declaredMime, declaredSize, requestId | 201 uploadId, expiresAt, upload target/method/required headers | 401/404/403/422/413/415/429 |
| POST /api/documents/uploads/:uploadId/complete | completeUpload: requestId, contextExpectedVersion? | 200 DocumentSummary + version; replay คืน record เดิม | 404/409/413/415/503 |
| GET /api/documents/:documentId/download | authorizeDownload + content delivery | 200 streamed bytes หรือ 303 ไป private signed object URL อายุจำกัด | 401/404/403/503 |
| Auth paths ตาม library ที่เลือก | signIn/signOut/callback ถ้าจำเป็น | native auth response ผ่าน adapter | ไม่มี guessed /api/auth subroute จนเลือกรุ่นจริง |

Download GET ไม่เปลี่ยน business state; ใช้ Cache-Control private/no-store และ Content-Disposition attachment/safe filename; signed URL ไม่เก็บถาวรใน DTO/DB/log
ถ้า redirect ต้องไม่ใส่ URL ลง analytics/referrer; ใช้ referrer policy ที่เหมาะสม; bucket ไม่เปิด public
collection details ที่ไม่มี digital bytes คืนผ่าน getReceiptContext ไม่คืน fake download 200
initiateUpload upload target ใช้ proxy หรือ scoped presigned PUT ตาม storage ที่เลือก; implementation ต้องจำกัด size/type/immutable key และ complete validation เหมือนกัน
proposal presigned target อายุ 5 นาที, reservation หมดอายุ 30 นาที; scope/object key สุ่มโดย Server; expiry ไม่ bypass การตรวจ bytes

## Private file lifecycle

ข้อเสนอ limits เดิม: PDF/JPEG/PNG <=5 MiB; declared size/MIME/extension ไม่พอ ต้องตรวจ actual bytes/signature/decoded validity
password-protected/corrupt PDF หรือรูป decode ไม่ได้ให้ reject หรือ explicit manual-review state ที่ห้าม READY จนยืนยัน; ไม่สมมติว่ามี OCR/semantic identity checker
ตรวจ file ownership จาก session+context, checksum/object immutable version, ไม่รับ arbitrary remote URL/path เป็นแหล่งไฟล์เพื่อกันอ่าน resource โดยไม่ตั้งใจ
original filename ใช้เฉพาะ safe display/attachment name; sanitize control characters/path separators, ไม่เป็น storage key
readability/identity ตามเอกสารต้อง human review เมื่อไม่มีการตรวจอัตโนมัติ; file validator ไม่รับรองเอกสารจริงทางกฎหมาย
upload complete validate reservation actor/scope/purpose/expiry อีกครั้ง, ตรวจ size/type/checksum และผูก Document เพียงหนึ่งครั้งใน transaction
mutation failure หลัง upload เก็บ temporary จน cleanup; object ที่มี ref ห้ามถูก cleanup/delete แม้อัปโหลดนานแล้ว

cleanupTemporaryUploads เป็น scheduled trusted job/operational command ไม่ public user endpoint
temporary ที่ไม่อ้างอิงและเกิน 24 ชั่วโมงให้ eligible; ทำ claim/lock ตรวจ reference ซ้ำก่อนลบ และป้องกัน completeUpload race
object delete สำเร็จแต่ DB marking ล้มเหลว retry ได้อย่าง idempotent; delete fail ไม่ลบ DB reference หรือบอก success
ถ้า storage outage ปิด mutation ที่ต้อง evidence durability, คืน retryable FILE_UNAVAILABLE/SAVE_FAILED และคง state เดิม
permanent retention/expiry, malware scanning requirement และไฟล์เกิน limit ต้อง O-04/O-03 ก่อน production; ไม่ลบเอกสารจริงด้วย temporary job

## Configuration contract

ชื่อ configuration เหล่านี้เป็น project-level proposal ไม่ใช่ environment variables ของ library ใด; implementation ต้อง map และ validate ตอน startup

| Logical config | Required / validation |
|---|---|
| application origin / trusted origins / environment | exact allowlist, production HTTPS; test/demo flag ต้อง false ใน production |
| database connection | Server-only secret; test reset guard; limit pool/connections ตาม deployment |
| auth secret/service config | Server-only; fail closed เมื่อขาด/ผิด; native names หลัง O-01 |
| storage endpoint/region/bucket/credentials | private bucket + least privilege; ไม่ให้ Client credentials; test namespace แยก |
| upload/URL/reservation/cleanup limits | positive bounded values; default proposals ข้างต้น; Server และ UI contract ตรงกัน |
| log level / correlation policy | safe IDs, redaction; ไม่มี credentials/body/bytes/signed URL |
| backup/retention/restore target | deployment-specific ตาม O-04; ไม่ใช้ demo defaults กับข้อมูลจริง |

ไม่ commit .env จริง, password/hash/token/signing key; .env.example ใส่ placeholder หลังเลือก runtime ที่ใช้จริง
config ขาดให้ process startup fail ก่อนรับ traffic; readiness ไม่คืนความลับหรือ connection strings

## Operations และ recovery

แยก liveness (process ตอบ) กับ readiness (DB/storage/Auth dependencies ที่ต้องใช้พร้อม); health endpoint ไม่เปิดรายละเอียดบัญชี/schema
log requestId, operation, safe actor/resource IDs เท่าที่จำเป็น, result/error code, duration; audit sensitive action แยกสิทธิ์อ่านและกำหนด retention
monitor DB/storage failures, unauthorized access attempts, conflict/replay rates, orphan cleanup backlog; ไม่ตั้ง SLO ตัวเลขโดยไม่มี capacity requirement
backup ต้องครอบ DB และ objects ที่ references ใช้อย่างสอดคล้อง; restore rehearsal ตรวจว่าเอกสารยังเปิดได้และไม่ข้าม ownership
recovery หลัง network timeout: getMutationOutcome → reconcile resource latest version → retry key เดิมเมื่อผลยังไม่ยืนยัน; UI ไม่ขึ้น success จากการส่ง request อย่างเดียว
ไม่มี email/SMS/agency callback queues ใน scope; สถานะติดตามอ่านจาก DB และแสดงว่า external activity เกิดนอกระบบ
deployment ที่มีข้อมูลจริงรอ O-04; PR นี้ไม่สร้าง hosting resources หรือทดสอบ disaster recovery แล้ว
