# 01418321-SA-Project

ระบบจัดการเอกสารและติดตามการจ้างแรงงานต่างด้าว สำหรับโครงการ Systems Analysis ครอบคลุม UC-01–UC-11

## สถานะ

มี Frontend และ Backend ครอบคลุม flow UC-01–UC-11 ด้วย Next.js + React + TypeScript, PostgreSQL/Prisma, Better Auth และ S3 API
ข้อมูลสำหรับทดลองเป็นข้อมูลสมมติ; policy/แบบราชการและ deployment จริงยังต้องยืนยันตาม Open decisions
Dependencies/versions อยู่ใน package.json/lockfile; UI ใช้ CSS Tokens และ Noto Sans Thai ที่ self-host

## เริ่ม Backend ในเครื่อง

ใช้ Node.js ตาม engines และ Docker แล้วเตรียม `.env` จาก `.env.example` เปลี่ยน secrets รวมถึง POSTGRES_PASSWORD ให้ตรงกับ DATABASE_URL และตั้ง SEED_PASSWORD เป็นรหัสสมมติที่ยาวพอ

```sh
cp .env.example .env
# แก้ secrets ใน .env ก่อนเริ่ม
npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

เปิด http://127.0.0.1:3000/login ใช้บัญชี `employer`, `arun`, `maya` หรือ `lin` กับรหัสจาก SEED_PASSWORD; `other_employer` เป็นบัญชีทดสอบแยก scope Seed ซ้ำรักษาข้อมูลธุรกิจและรหัสบัญชีเดิม
Backend ใช้ Server Session/DB และอัปโหลดไฟล์จริงไป S3Mock local; capability บันทึกผลภายนอกเริ่มจาก deny ดู [Backend implementation](docs/backend-implementation.md) สำหรับคำสั่ง grant/revoke, cleanup, transport และข้อจำกัด

Compose ผูกบริการกับ loopback: PostgreSQL 5447, S3Mock 9040 เก็บข้อมูลใน named volumes S3Mock สำหรับทดสอบเท่านั้น ห้ามใช้เอกสารส่วนบุคคลจริง

## ทดลองในเครื่อง

ใช้ Node.js ที่ตรง engines ใน package.json แล้วติดตั้งด้วย `npm ci`

```sh
BACKEND_ENABLED=false NEXT_PUBLIC_ENABLE_MOCK=true npm run dev
```

เปิด http://127.0.0.1:3000/login แล้วเลือกบัญชีสมมติ นายจ้าง หรือ ARUN/MAYA/LIN
Arun มีหลาย Employment จึงต้องเลือกการจ้างก่อน; links และการบันทึกใช้บริบทจาก URL
เครื่องมือสาธิตอยู่ท้ายทุกหน้าหลัง Login: reset สถานการณ์, จำลอง save/read failure และ capability บันทึกหลักฐานภายนอก

Mock ปิดเป็นค่าเริ่มต้น; การเปิดต้องตั้ง NEXT_PUBLIC_ENABLE_MOCK=true อย่างชัดเจน
ตัวแปร NEXT_PUBLIC ถูกฝังตอน build: หากต้องการ production-mode demo ให้ตั้ง flag นี้ตอน `npm run build` แล้ว `npm start`
ห้ามใช้บัญชี รหัสผ่าน หรือข้อมูลบุคคลจริงกับแอปสาธิตนี้

## ข้อมูลและข้อจำกัด Mock

- เก็บข้อมูลสมมติใน localStorage และบัญชีสาธิตใน sessionStorage ของ browser นี้; ไม่มี Server session, DB หรือการบังคับสิทธิ์สำหรับข้อมูลจริง
- Mock operations แยกใน src/features/demo และคืน success/error envelope; UI ไม่เรียกฐานข้อมูลโดยตรง Backend mode ใช้ shared rules เดียวกัน แต่บังคับ Auth/DB/files ฝั่ง Server และยังต้องยืนยัน O-01–O-08 ก่อนข้อมูลจริง
- เลือกไฟล์ PDF/JPEG/PNG ไม่เกิน 5 MiB โดยตรวจ MIME/extension/signature; เก็บเฉพาะ metadata ไม่อัปโหลดหรือเก็บ bytes
- Preview เป็นข้อมูลสมมติ และ Download เป็นไฟล์ข้อความสาธิต ไม่ใช่เอกสารราชการ; download ไม่สร้าง Receipt
- Case checklist DEMO-1 เป็นตัวอย่าง ไม่มีการสร้างแบบราชการหรือเชื่อม API หน่วยงาน
- Capability ในเครื่องมือสาธิตเป็นการจำลอง O-02; การยื่น อนุมัติ เข้าเมือง และตรวจแพทย์เกิดภายนอกระบบ
- Reset จะล้างการแก้ไขข้อมูลสาธิตทั้งหมดใน browser นี้; ไม่มีผลต่อเอกสารต้นฉบับหรือ Figma

## ตรวจงาน

```sh
npm run format:check
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run test:integration
npm run test:e2e:backend
BACKEND_ENABLED=false NEXT_PUBLIC_ENABLE_MOCK=true npm run build
npm run check:specs
```

Mock E2E ใช้ localhost:3100 และ Chromium; เปิด Mock ให้เฉพาะ test server และใช้ browser context ใหม่ต่อ test
Integration tests ใช้ DB sa_test และ bucket sa-integration แยกจาก local และรีเซ็ตเฉพาะ test DB; Backend E2E ใช้ port 3187 และแก้ข้อมูลสมมติใน sa_local
ผล Mock ไม่พิสูจน์ Backend; Integration/E2E ตรวจสิทธิ์, transactions และไฟล์บน local dependencies เท่านั้น

## เริ่มอ่าน

- [AGENTS.md](AGENTS.md) — แหล่งข้อกำหนด กฎธุรกิจ และแนวทางทำงาน
- [Architecture](docs/architecture.md) — Directory, Dependency และหน้าที่แต่ละส่วน
- [Frontend implementation](docs/frontend-implementation.md) — Coverage, ผลทดสอบจริง และข้อจำกัด Mock
- [Use Case Map](docs/use-case-map.md) — UC → Module → หน้าจอและพื้นที่ Route
- [Data Model Sources](docs/data-model.md) — ER ล่าสุด, Actor Login และสถานะเอกสารรายละเอียดข้อมูล
- [Implementation Specifications](docs/specs/README.md) — Product, Frontend, Backend, Contract, Workflow, สิทธิ์, Database และ Acceptance ครบ UC-01–UC-11; Draft พร้อม Open decisions
- [Backend Specifications](docs/specs/backend/README.md) — Class Diagram review, operation contracts, persistence/transactions, Auth/private files และ verification
- [Figma UI Design](https://www.figma.com/design/aBLNdRvl9Z3x8qrhG6x38g) — แบบหน้าจอและ Components

ก่อนใช้ข้อมูลจริงให้ยืนยัน Open decisions และตรวจ production deployment ตามข้อจำกัดใน Backend implementation
เอกสาร Requirement บางส่วนอยู่ภายนอก Repository ตามที่ระบุใน AGENTS.md จึงไม่ได้มากับการ clone นี้

ตรวจ Spec: `python3 scripts/check-specs.py` (ตรวจเอกสาร ไม่ใช่ application tests)
