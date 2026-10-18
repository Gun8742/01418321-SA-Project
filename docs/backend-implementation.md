# Backend implementation

Backend ใช้ Next.js Route Handlers, PostgreSQL 17/Prisma 7, Better Auth และ S3 API ภายในแอปเดียวกับ Frontend เปิดด้วย `BACKEND_ENABLED=true` และ `NEXT_PUBLIC_ENABLE_MOCK=false` พร้อมกัน; flag ขัดกันจะปิดการทำงาน

## ขอบเขตที่ทำแล้ว

| งาน / UC | Implementation | การตรวจหลัก |
|---|---|---|
| Login, session, scope | `src/server/auth.ts`, `auth-db.ts`, `/api/auth/[...all]` | Native cookie, token hash, refresh, logout/revocation, cross-account denial |
| ข้อมูลลูกจ้าง/การจ้าง UC-04 | `workforce/operations.ts`, `service.ts`, `write.ts` | Create/update, expected versions, rollback, request replay |
| เตรียม/ตรวจชุดเอกสาร UC-01,05,06,02 | Shared domain + CasePolicy/Checklist/DocumentSet persistence | Readiness, prerequisite, evidence ownership, review version |
| ยื่น/ผลพิจารณา UC-01,11,03 | Application + event snapshots | รอยืนยันการยื่น, เอกสารเพิ่มในคำขอเดิม, approval, unique issued slot |
| รับ Visa/Work Permit UC-07,10 | Immutable DocumentReceipt | ยืนยันรับแยกจาก view/download; unique document/receipt |
| เดินทาง UC-08 | EntryRecord + scoped CapabilityGrant | Draft/confirm, evidence, permission, optimistic concurrency |
| ตรวจสุขภาพ UC-09 | HealthCheck + Certificate | Entry gate, result/evidence, confirmed result lock |
| ไฟล์ส่วนตัว | `server/documents.ts`, `storage.ts` | Real PDF/JPEG/PNG bytes, size/checksum, owner/scope, retries, cleanup |
| Queries / corrections | `workforce/queries.ts`, shared domain | Scoped pagination/filtering, correction resolution ไม่แก้เอกสารต้นฉบับ |
| Browser integration | `workforce/provider.tsx`, `login.tsx` | Login, persistent update/reload, upload/download, Worker denied Employer route |

## Transport และข้อตกลงที่ใช้งานจริง

- `GET /api/workforce` คืน UI projection ที่กรองตาม Session พร้อม scoped capabilities; Worker ไม่ได้รับข้อมูลบริษัทส่วนตัวหรือรายการเตรียมคำขอของ Employer
- `POST /api/workforce` รับ `{operation,input}`; `input.requestId` เป็น UUID และ existing mutation ต้องใช้ expected version ตาม domain schema คืน `{ok,data:{id},requestId}` หลัง commit แล้ว UI โหลด snapshot ใหม่
- `POST /api/workforce/query` รับ `{query,input}` สำหรับ named queries ใน `queries.ts`; input เป็น allowlist ไม่รับ Actor/Role/Grant จาก Client
- `POST /api/documents/uploads` → `PUT /api/documents/uploads/:id` → `POST /api/documents/uploads/:id/complete`; requestId/ownership และ SHA-256 ผูก reservation กับเนื้อหาเดิม
- `GET /api/documents/:id/download` ตรวจ Session/Employment/เจ้าของก่อนส่ง bytes; ไม่สร้าง Receipt และไม่เปิดเผย object key
- `GET /api/health/live`, `/api/health/ready` ตรวจ process และ dependency readiness โดยไม่คืน credentials

ไฟล์ `docs/specs/backend/operations.md` ยังคงเป็น canonical proposal ก่อน implement: รุ่นนี้ใช้ UI projection เดิมและ resource ID + refresh แทน full mutation DTO/availableActions ในทุก response ชื่อ field บางรายการจึงตรง UI model; ตัวตรวจ Zod ใน implementation เป็น wire contract ของรุ่นนี้ Authentication ใช้ native Better Auth contract แยกจาก operation receipts, cleanup เป็น trusted CLI การ export แบบราชการ/รวมชุดเอกสารยังไม่มี

`saveWorkerEmployment` ต้องส่ง `expectedEmployerVersion` ทั้งตอนสร้างและแก้ Worker/Employment โดยอ่านจาก `snapshot.data.employer.version` ซึ่งส่งให้เฉพาะ Employer แม้ยังไม่มี Employment ฟอร์มเก็บ version คู่กับข้อมูลที่แสดงจนกว่าจะเปิดใหม่; version เก่าคืน CONFLICT โดยไม่เขียนบางส่วน

ก่อน `recordDecision` ตรวจว่าไฟล์หลักฐานทุกไฟล์อ่านได้ ขนาดและ SHA-256 ตรงกับที่จัดเก็บ; หากไฟล์หาย/เปลี่ยน/storage ไม่พร้อม คืน FILE_UNAVAILABLE และ rollback state/history/operation receipt ก่อน `recordSubmission` ตรวจ policy ของ checklistVersion ที่ชุดนั้นอ้างอิงซ้ำภายใน transaction แม้ readiness เคย READY แล้ว

Business IDs เป็น BIGINT และส่ง JSON เป็น decimal string; Auth IDs ใช้ native library IDs วันธุรกิจเป็น DATE ส่วน event/session timestamps เป็น UTC Session token เก็บ SHA-256 ผ่าน Prisma adapter extension; Client ได้ HttpOnly cookie การเปลี่ยน Better Auth ต้องทดสอบ create/read/refresh/revoke และตรวจ adapter call paths ใหม่

Mutation ใช้ Serializable transaction, expected versions, actor/operation/requestId receipts และ unique constraints ภายใน DB การ replay ตรวจสิทธิ์ปัจจุบันก่อนคืน resource ID เดิมและไม่ย้อนสถานะ ข้อมูลเหตุการณ์เก็บ snapshot แยกจากเอกสารที่แก้ภายหลัง ID allocator ใช้ counter lock ร่วม จึงเหมาะกับขนาดโครงการ; เมื่อ throughput เพิ่มให้เปลี่ยนเป็น DB sequence พร้อมรักษา idempotency

## Local operations และข้อมูลสมมติ

อ่านคำสั่งเริ่มระบบ/ทดสอบใน [README](../README.md) Seed มีบัญชี `employer`, `other_employer`, `arun`, `maya`, `lin` ใช้รหัสจาก `SEED_PASSWORD` ใน `.env` เท่านั้น ไม่มี public signup และไม่มี UI กำหนด Role

Seed เปิดเฉพาะ DB ชื่อ local/test บน loopback ใช้ข้อมูลสมมติและ checklist `DEMO-1`; seed ซ้ำไม่ทับข้อมูลธุรกิจที่แก้ไว้หรือเปลี่ยนรหัสบัญชีเดิม S3Mock ใน Docker Compose เป็นบริการทดสอบ ไม่ใช่ private storage สำหรับใช้งานจริง

การบันทึกหลักฐานภายนอกเริ่มจาก deny; trusted local command ให้/ถอน capability ตามบัญชีและ Employment:

```sh
npm run db:grant -- arun 201 entry:record-evidence
npm run db:grant -- arun 201 medical:record-evidence
npm run db:grant -- arun 201 medical:record-evidence revoke
npm run storage:cleanup
```

Cleanup เก็บกวาด temporary uploads เก่ากว่า 24 ชั่วโมง เฉพาะที่ยังไม่มี Document อ้างอิง Claim สถานะก่อนลบและทำซ้ำได้ ไม่มี scheduler อัตโนมัติ

## ข้อจำกัดก่อนใช้ข้อมูลจริง

- O-01–O-08 ยังต้องยืนยัน policy ที่เกี่ยวข้อง: ผู้มีสิทธิ์บันทึกผลภายนอก, case catalog/แบบราชการ, retention, shared Worker ข้ามบริษัท และ reissue/correction การแก้ Worker ที่หลายบริษัทใช้ร่วมกันถูกปฏิเสธในรุ่นนี้
- `DEMO-1` เป็น synthetic policy; ต้องเปิด `ALLOW_SYNTHETIC_POLICY=true` อย่างชัดเจน ไม่ใช่การอนุมัติ checklist ทางกฎหมาย ไม่มีการยื่น อนุมัติ ตรวจแพทย์ หรือเข้าเมืองแทนหน่วยงาน
- ต้องตั้ง HTTPS/origin/secret, private bucket policy/encryption, account provisioning, backup/restore, retention และ rate/operational monitoring สำหรับ production เอง ยังไม่ตรวจ deployment จริงหรือผู้ให้บริการ S3 จริง
- Read snapshot โหลดข้อมูลที่อยู่ใน scope ทั้งชุด เหมาะกับข้อมูลขนาดโครงการ แม้ `listWorkers` มี DB pagination แล้ว
- ผล unit/integration/E2E เป็นหลักฐาน local synthetic เท่านั้น ไม่ยืนยันกฎหมายหรือการเชื่อมหน่วยงาน; รายการไฟล์และ test assertions คือหลักฐานล่าสุด ห้ามใช้ผล spec checker แทน runtime checks


## ผลตรวจรุ่น local — 18 ตุลาคม 2569

- Unit tests 34 กรณี, PostgreSQL/Auth/S3 integration 15 กรณี, Mock browser E2E 9 กรณี และ Backend browser E2E 2 กรณีผ่าน
- TypeScript และ production build ผ่าน; formatter ตรวจ source/config/test scripts และไม่แตะ generated Prisma client
- Spec checker ตรวจ Markdown/UC mappings/examples ผ่าน แต่ source fingerprints ตาม manifest ปัจจุบันไม่พบ 29 ไฟล์ภายนอก จึงไม่ถือว่าตรวจ checksum ต้นฉบับแล้ว
- `pg` 8 แจ้ง deprecation เกี่ยวกับ concurrent client queries ในการทดสอบ Prisma; ไม่ทำให้ test ล้ม ต้องตรวจ adapter compatibility ก่อนย้าย pg 9
- Backend browser tests ล้าง rate-limit เฉพาะ DB `sa_local` บน loopback ก่อนเริ่ม เพื่อให้ rerun ได้โดยไม่ลด rate-limit ของแอปจริง และแก้ข้อมูลสมมติบางส่วน ควรรัน browser tests ก่อน build เพราะ build ล้าง `.next` รวม test cache
