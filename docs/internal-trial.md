# การทดลองระบบภายใน

## บัญชีและการใช้งาน

ใช้บัญชีนายจ้างที่เตรียมไว้ ไม่มีสมัครนายจ้างผ่านเว็บ เมื่อนายจ้างบันทึกลูกจ้างใหม่ ระบบสร้าง Worker account พร้อมการจ้างใน DB transaction เดียวกัน ใช้เลข Passport เป็นชื่อบัญชี (ไม่แยกตัวพิมพ์ใหญ่/เล็ก) และสร้างรหัสผ่านแบบสุ่ม 24 ตัวอักษร นายจ้างคัดลอกข้อมูลที่แสดงครั้งเดียวแล้วส่งให้ลูกจ้างด้วยตนเอง ระบบไม่ส่งอีเมล ไม่ต้องตั้ง SMTP และไม่มี Activation link

1. Login เป็นนายจ้าง `employer` แล้วเพิ่มข้อมูลลูกจ้างและการจ้าง
2. หลังบันทึกสำเร็จ คัดลอก Passport และรหัสผ่านก่อนกด **เสร็จสิ้น** หรือออกจากหน้า
3. ลูกจ้างใช้ Passport และรหัสที่ได้รับ Login เพื่อเข้าถึงข้อมูลของตนเอง
4. ลูกจ้างเดิมที่ยังไม่มีบัญชี: เมนู **บัญชีลูกจ้าง** → เลือกลูกจ้าง → **สร้างบัญชีสำหรับลูกจ้างที่ยังไม่มีบัญชี**
5. หากรหัสหายหรือเป็นบัญชีเดิม: เลือก **Generate รหัสผ่านใหม่ / เปลี่ยนมาใช้ Passport** แล้วยืนยัน ระบบยกเลิกรหัสเดิมและ Session ทุกอุปกรณ์ ส่งรหัสใหม่ให้ลูกจ้างด้วยตนเอง
6. นายจ้างบันทึกหลักฐานภายนอกที่เมนู **หลักฐานเข้าเมืองและสุขภาพ** ลูกจ้างดูผลจากพื้นที่ตนเอง

เก็บเฉพาะ Password Hash ใน DB ไม่เก็บรหัสผ่านใน browser storage, logs หรือ OperationReceipt การ replay คำขอบันทึกเดิมคืนเฉพาะ ID โดยไม่คืนรหัสอีก ถ้า Response สูญหายให้ตรวจรายการลูกจ้างก่อน แล้ว Generate รหัสใหม่จากหน้าบัญชี เลข Passport ต้องไม่ชนบัญชี/ลูกจ้างอื่น; การแก้ Passport ของบัญชีที่มีอยู่จะปรับ Username ตามใน transaction เดียวกัน บัญชีเดิมยัง Login ด้วย Passport ผ่านการจับคู่ Worker ได้ โดยไม่เปลี่ยนรหัสเดิม

อีเมลใน Worker profile เป็นข้อมูลติดต่อ ไม่ใช่ช่องทางเปิดบัญชี บัญชีใหม่ใช้ email ภายใน `.invalid` เพื่อรองรับ schema ของ Auth library โดยไม่มีการส่งเมล ลิงก์เชิญและ Reset password รุ่นเก่าใช้งานไม่ได้แล้ว เก็บตาราง Enrollment เดิมเพื่อรักษาข้อมูลย้อนหลังโดยไม่มี endpoint เปิดบัญชีจาก token อีก

เมื่อเริ่ม trial ควรส่งบัญชีผ่านช่องทางส่วนตัวที่นายจ้างและลูกจ้างตกลงกัน ระบบไม่มีการกู้รหัสนายจ้างผ่านเว็บ; ผู้ดูแลต้องใช้ trusted provisioning/recovery ภายนอก

## Local

```sh
cp .env.example .env
# ตั้ง secrets ของเครื่องนี้
npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:bootstrap
# เฉพาะเครื่องทดสอบที่ยังไม่มีบัญชี: seed ข้อมูลสมมติ
ALLOW_SYNTHETIC_POLICY=true npm run db:seed
npm run dev
```

เปิด [Login](http://127.0.0.1:3000/login) ด้วย `employer` และ SEED_PASSWORD ของเครื่องที่สร้างบัญชีไว้ Seed fixtures `arun`, `maya`, `lin`, `other_employer` มีไว้ทดสอบ; บัญชีใหม่จาก UI ใช้ Passport ตามขั้นตอนข้างต้น Local ใช้ PostgreSQL/S3Mock; ข้อมูลในแต่ละเครื่องไม่ตาม Git Push/Pull

## Server

มี Dockerfile และ compose.server.yaml สำหรับเครื่องภายใน ใช้ Private S3 ขององค์กรและ Reverse Proxy HTTPS ให้ Host/Origin ตรง BETTER_AUTH_URL ไม่มี SMTP dependency

```sh
cp deploy/server.env.example .env.server
# ตั้ง secrets ใหม่, HTTPS origin และ Private S3; เตรียม private bucket
# POSTGRES_PASSWORD ต้องเป็น URL-safe

docker compose --env-file .env.server -f compose.server.yaml up -d --build --wait
```

ต้อง provision นายจ้างผ่านช่องทางผู้ดูแลก่อนเริ่มใช้จริง และจัดการ Backup/Restore ของ DB และ S3 เอง Readiness ตรวจ DB/S3 การยื่น อนุมัติ การเดินทาง และตรวจสุขภาพเกิดภายนอกระบบ Checklist INTERNAL-1 เป็นข้อสมมติภายในโครงการ ไม่ใช่การรับรองข้อกำหนดราชการ

## Verification

- `npm test`: shared domain และ validation
- `npm run test:integration`: reset เฉพาะ sa_test ตรวจ Auth, account creation/replay/reset, Password Hash, session revocation, transactions, scopes และ files
- `npm run test:e2e:backend`: ใช้ synthetic data ตรวจสร้างลูกจ้าง → รับ credentials → Passport Login → สิทธิ์ Worker → Generate รหัสใหม่ → Session เดิมถูกยกเลิก รวม private files; default ชี้ sa_local จึงห้ามใช้ DB จริง
- `npm run test:e2e`: Mock UC regression

หลักฐานบทที่ 7 ฉบับก่อนเปลี่ยนเป็น Passport/manual credentials ยังเป็นประวัติการทดสอบ Flow อีเมลเดิม ต้องเก็บภาพและแก้ Supporting Flow ใหม่ก่อนใช้อ้างอิงรุ่นนี้
