# ทดลองใช้ภายในองค์กร — 29 ตุลาคม 2569

ขอบเขตล่าสุดที่ผู้ใช้ยืนยัน: ใช้บัญชีนายจ้างเดิมเพียงบัญชีเดียว ไม่มีการสมัครนายจ้างผ่านเว็บ จากนั้นเพิ่มข้อมูลลูกจ้างและส่งคำเชิญทางอีเมล ลูกจ้างตั้งรหัสผ่านของตนเองโดยใช้คำเชิญ ไม่เปิดสมัคร Worker อิสระ นายจ้าง/ผู้แทนบันทึกผลจากหน่วยงาน ส่วนลูกจ้างดูข้อมูลของตน กรอกแผนเดินทาง และยืนยันว่าได้รับเอกสารจริง

## Checklist INTERNAL-1

ผู้ใช้อนุญาตให้สมมติรายการเอกสารเพื่อเริ่มทดลอง จึงใช้ baseline ภายในดังนี้กับชุดคำขอใหม่:

| Key        | เอกสารตั้งต้น                                     |
| ---------- | ------------------------------------------------- |
| passport   | หนังสือเดินทางที่ยังมีผล                          |
| employment | สัญญาจ้างหรือหนังสือรับเข้าทำงาน                  |
| company    | เอกสารนายจ้าง และหนังสือมอบอำนาจเมื่อดำเนินการแทน |

นี่เป็นนโยบายภายในที่สมมติขึ้น ไม่ใช่ Checklist หรือแบบฟอร์มที่หน่วยงานราชการรับรอง รายการเฉพาะประเทศ/ประเภท Visa/หน่วยงานต้องตรวจเพิ่มเติมก่อนยื่นจริง ระบบยังคงบังคับเงื่อนไขเดิม: Visa ต้องมีหนังสืออนุมัติก่อนเดินทาง, กรณี Work Permit หลังเข้าประเทศต้องมีผลอนุญาตเข้าเมืองและใบรับรองแพทย์ที่ยืนยันแล้ว ผลอนุมัติยังไม่ถือว่ามีเอกสารพร้อมรับจนกว่าจะจัดเก็บไฟล์ที่ออกจริง

`npm run db:bootstrap` เพิ่ม policy เท่านั้น ไม่สร้างบัญชีหรือข้อมูลธุรกิจ และไม่เขียนทับ policy เดิม `approved=true, synthetic=false` หมายถึง baseline ภายในที่อนุญาตให้ใช้ใน Backend โดยไม่เปิด demo flag ไม่ได้หมายถึงการรับรองทางกฎหมาย ชุดคำขอเก่าเก็บ `checklistVersion` เดิม; เปลี่ยนนโยบายให้เพิ่มเวอร์ชันใหม่และเปลี่ยน `CASE_POLICY_VERSION` ห้ามแก้รายการของเวอร์ชันที่ใช้งานแล้วเงียบ ๆ

## บัญชีและอีเมล

1. เปิด `/login` ด้วยบัญชีนายจ้างที่เตรียมไว้ ไม่มีหน้าหรือ API สมัครนายจ้าง และลิงก์สมัครนายจ้างจากรุ่นก่อนใช้เปิดบัญชีไม่ได้
2. เข้าสู่ระบบด้วยอีเมล เพิ่มลูกจ้างที่เมนูรายการลูกจ้าง แล้วไปเมนู **เชิญลูกจ้าง** เลือกบุคคลและอีเมลที่ตรวจสอบแล้ว
3. ลูกจ้างเปิดอีเมลคำเชิญและตั้งรหัสผ่าน ระบบผูกกับ Worker เดิม ไม่มีการสร้างประวัติลูกจ้างซ้ำ
4. เมื่อลืมรหัสผ่าน เปิด `/forgot-password`; Native Better Auth จัดการ token และเพิกถอน Session เดิมเมื่อเปลี่ยนรหัสสำเร็จ
5. นายจ้างบันทึกหลักฐานเข้าเมืองและโรงพยาบาลที่เมนู **หลักฐานเข้าเมืองและสุขภาพ** ลูกจ้างดูผลจากพื้นที่ของตน

Activation token สุ่ม 32 bytes เก็บเฉพาะ SHA-256 ใน DB ใช้ได้ครั้งเดียวและหมดอายุใน 24 ชั่วโมง คำขอใหม่ไปยังอีเมลเดิมเพิกถอนลิงก์เดิม ตรวจสิทธิ์ผู้เชิญและความสัมพันธ์การจ้างซ้ำตอนเปิดบัญชี เมื่อ SMTP ส่งล้มเหลวจะยกเลิกลิงก์ที่ส่งไม่สำเร็จ ส่งใหม่ผ่านฟอร์มเดิมได้ บัญชีที่มีอยู่แล้วได้รับข้อความตอบกลับแบบเดียวกันโดยไม่ส่งคำเชิญเปิดบัญชีเพิ่ม

มี DB rate limits สำหรับการส่งคำเชิญและการเปิดบัญชีลูกจ้าง รวมถึง native auth limits สำหรับ login/password reset เนื่องจากยังไม่มีระบบย้ายบัญชี Worker ข้ามบริษัท ให้ประสานผู้ดูแลเมื่ออีเมลมีบัญชีอยู่แล้วหรือมี Worker account เดิม

## Local

```sh
cp .env.example .env
# เปลี่ยน secrets ก่อนเริ่ม
npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:bootstrap
# เครื่องใหม่: สร้างบัญชีและข้อมูลทดสอบด้วย SEED_PASSWORD ของเครื่องนี้
ALLOW_SYNTHETIC_POLICY=true npm run db:seed
npm run dev
```

เปิด [Login](http://127.0.0.1:3000/login) ด้วยบัญชี `employer` ที่เตรียมไว้ อ่านอีเมล local ที่ [Mailpit](http://127.0.0.1:8025) ซึ่งไม่ส่งออกสู่อินเทอร์เน็ต Local S3Mock สำหรับข้อมูลทดสอบเท่านั้น หากต้องการ fixture เดิม ใช้ `ALLOW_SYNTHETIC_POLICY=true` กับ `SEED_PASSWORD` แล้วรัน `npm run db:seed` อย่างชัดเจน เครื่องที่ยังไม่มีบัญชีทดสอบต้อง provision ผ่าน seed ก่อน โดย `other_employer` ใช้สำหรับทดสอบ scope เท่านั้น

## ติดตั้งบน Server ภายในองค์กร

มี `Dockerfile` และ `compose.server.yaml` แยกจาก local ไม่มี S3Mock/Mailpit ในชุด Server ใช้ PostgreSQL volume ถาวร แอปรันด้วย user `node` และผูก port กับ loopback ให้ Reverse Proxy เป็นจุดรับ HTTPS

```sh
cp deploy/server.env.example .env.server
# ตั้ง secrets ใหม่, HTTPS origin, Private S3 และ SMTP จริง
# POSTGRES_PASSWORD ต้องเป็น URL-safe เพราะใช้ประกอบ DATABASE_URL
# เตรียม private bucket ก่อนเริ่มแอป
docker compose --env-file .env.server -f compose.server.yaml up -d --build --wait
```

แอป apply migrations และ bootstrap ก่อนเริ่ม ไม่มีการสร้างบัญชีผ่านเว็บ; ต้องเตรียมบัญชีนายจ้างด้วย trusted provisioning ก่อน ตั้ง Reverse Proxy ขององค์กรไปยัง `127.0.0.1:3000` รักษา Host/Origin ให้ตรง `BETTER_AUTH_URL` และทดสอบการรับอีเมลจาก URL ที่ผู้ใช้เข้าถึงได้ SMTP ภายนอกต้องรองรับ TLS/STARTTLS และ certificate ที่เชื่อถือได้ S3 credentials ต้องจำกัดเฉพาะ private bucket นี้

ก่อนใช้ข้อมูลจริง ผู้ดูแลต้องตั้ง HTTPS, สำรอง/ทดสอบกู้คืนทั้ง PostgreSQL และ S3, กำหนด retention และทดสอบ SMTP/S3 ขององค์กร การตรวจ readiness `/api/health/ready` ตรวจ DB และ S3 เท่านั้น ไม่ยืนยันว่าอีเมลเข้ากล่องผู้รับแล้ว หรือสำรองข้อมูลสำเร็จ การยื่น อนุมัติ การเดินทาง และการตรวจสุขภาพยังเป็นกิจกรรมนอกระบบ

## การตรวจสอบ

- `npm test`: shared domain และ validation
- `npm run test:integration`: รีเซ็ตเฉพาะ `sa_test` ตรวจ Auth, transactions, scopes, files, enrollment/replay/expiry/SMTP failure และ Password reset (SMTP ถูก stub ในชุดนี้)
- `npm run test:e2e:backend`: ใช้ข้อมูลสมมติใน `sa_local`, Mailpit ที่ port 8025 และ S3 local ตรวจว่าหน้าและ API สมัครนายจ้างถูกปิด รวมเชิญ/เปิดบัญชีลูกจ้าง/Login/Reset ผ่าน HTTP จริง รวมถึง upload/download และสิทธิ์ Worker; เพิ่มข้อมูลทดสอบและแก้ Worker fixture เดิม จึงห้ามชี้ไป DB ข้อมูลจริง
- `npm run test:e2e`: regression Mock flows UC-01–UC-11
- `docker build -t sa-workforce:internal .`: ตรวจ image build โดยไม่ deploy ขึ้น Server

การทดสอบ local หรือ build สำเร็จไม่ยืนยัน SMTP/S3/HTTPS/Backup ของ Server เป้าหมาย

ผลตรวจ local ครั้งนี้: Unit tests 34/34, Integration 20/20, Mock E2E 9/9 และ Backend E2E 3/3 ผ่าน รวม TypeScript, formatter, spec checks และ Docker build; image เริ่มด้วย non-root user และ `/api/health/ready` ตอบ `ready: true` เมื่อเชื่อม local PostgreSQL/S3 ไม่ได้ทดสอบ Server หรือ SMTP/S3 ขององค์กรจริง
