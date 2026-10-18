# 01418321-SA-Project

ระบบจัดการเอกสารและติดตามการจ้างแรงงานต่างด้าว สำหรับโครงการ Systems Analysis ครอบคลุม UC-01–UC-11

## สถานะ

มี Mock Frontend แบบ Modular Monolith / Feature-based ด้วย Next.js + React + TypeScript แล้ว
รองรับทั้งสอง Actor ครบ UC-01–UC-11 ตาม Figma และ Spec; Database, Authentication จริง และ Private Storage ยังไม่ได้ implement

Dependencies/versions ที่ติดตั้งจริงอยู่ใน package.json และ package-lock.json; UI ใช้ CSS Tokens และ SVG จาก Figma พร้อม Noto Sans Thai ที่ self-host
PostgreSQL/Prisma/Auth และรายละเอียดการเชื่อมต่อยังเป็นข้อเสนอใน Spec

## ทดลองในเครื่อง

ใช้ Node.js ที่ตรง engines ใน package.json แล้วติดตั้งด้วย `npm ci`

```sh
NEXT_PUBLIC_ENABLE_MOCK=true npm run dev
```

เปิด http://127.0.0.1:3000/login แล้วเลือกบัญชีสมมติ นายจ้าง หรือ ARUN/MAYA/LIN
Arun มีหลาย Employment จึงต้องเลือกการจ้างก่อน; links และการบันทึกใช้บริบทจาก URL
เครื่องมือสาธิตอยู่ท้ายทุกหน้าหลัง Login: reset สถานการณ์, จำลอง save/read failure และ capability บันทึกหลักฐานภายนอก

Mock ปิดเป็นค่าเริ่มต้น; การเปิดต้องตั้ง NEXT_PUBLIC_ENABLE_MOCK=true อย่างชัดเจน
ตัวแปร NEXT_PUBLIC ถูกฝังตอน build: หากต้องการ production-mode demo ให้ตั้ง flag นี้ตอน `npm run build` แล้ว `npm start`
ห้ามใช้บัญชี รหัสผ่าน หรือข้อมูลบุคคลจริงกับแอปสาธิตนี้

## ข้อมูลและข้อจำกัด Mock

- เก็บข้อมูลสมมติใน localStorage และบัญชีสาธิตใน sessionStorage ของ browser นี้; ไม่มี Server session, DB หรือการบังคับสิทธิ์สำหรับข้อมูลจริง
- Mock operations แยกใน src/features/demo และคืน success/error envelope; UI ไม่เรียกฐานข้อมูลโดยตรง การเชื่อม Backend ยังต้องทำ read DTO mapping, Server adapter และตรวจ O-01–O-08
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
NEXT_PUBLIC_ENABLE_MOCK=true npm run build
npm run check:specs
```

E2E ใช้ localhost:3100 และ Chromium; เปิด Mock ให้เฉพาะ test server และใช้ browser context ใหม่ต่อ test
ผล Mock/E2E ไม่พิสูจน์สิทธิ์, transactions หรือ security ของ Backend จริง

## เริ่มอ่าน

- [AGENTS.md](AGENTS.md) — แหล่งข้อกำหนด กฎธุรกิจ และแนวทางทำงาน
- [Architecture](docs/architecture.md) — Directory, Dependency และหน้าที่แต่ละส่วน
- [Frontend implementation](docs/frontend-implementation.md) — Coverage, ผลทดสอบจริง และข้อจำกัด Mock
- [Use Case Map](docs/use-case-map.md) — UC → Module → หน้าจอและพื้นที่ Route
- [Data Model Sources](docs/data-model.md) — ER ล่าสุด, Actor Login และสถานะเอกสารรายละเอียดข้อมูล
- [Implementation Specifications](docs/specs/README.md) — Product, Frontend, Backend, Contract, Workflow, สิทธิ์, Database และ Acceptance ครบ UC-01–UC-11; Draft พร้อม Open decisions
- [Backend Specifications](docs/specs/backend/README.md) — Class Diagram review, operation contracts, persistence/transactions, Auth/private files และ verification
- [Figma UI Design](https://www.figma.com/design/aBLNdRvl9Z3x8qrhG6x38g) — แบบหน้าจอและ Components

เมื่อเชื่อม Backend ให้เคลียร์ Open decisions ที่เกี่ยวข้อง แทน Mock operations และทดสอบ integration ตาม Spec ก่อนใช้ข้อมูลจริง
เอกสาร Requirement บางส่วนอยู่ภายนอก Repository ตามที่ระบุใน AGENTS.md จึงไม่ได้มากับการ clone นี้

ตรวจ Spec: `python3 scripts/check-specs.py` (ตรวจเอกสาร ไม่ใช่ application tests)
