# 01418321-SA-Project

ระบบจัดการเอกสารและติดตามการจ้างแรงงานต่างด้าว สำหรับโครงการ Systems Analysis ครอบคลุม UC-01–UC-11

## สถานะ

เตรียม Architecture Directory แบบ Modular Monolith / Feature-based แล้ว
ปัจจุบันมีเอกสารและ Directory placeholders ยังไม่มี application implementation, dependencies, Database schema หรือคำสั่ง run/build/test

แนวทาง Stack คือ Next.js Full-stack + TypeScript + PostgreSQL; รายละเอียดและสถานะตัวเลือกอยู่ใน [AGENTS.md](AGENTS.md#current-state-and-stack)

## เริ่มอ่าน

- [AGENTS.md](AGENTS.md) — แหล่งข้อกำหนด กฎธุรกิจ และแนวทางทำงาน
- [Architecture](docs/architecture.md) — Directory, Dependency และหน้าที่แต่ละส่วน
- [Use Case Map](docs/use-case-map.md) — UC → Module → หน้าจอและพื้นที่ Route
- [Data Model Sources](docs/data-model.md) — ER ล่าสุด, Actor Login และสถานะเอกสารรายละเอียดข้อมูล
- [Implementation Specifications](docs/specs/README.md) — Product, Frontend, Backend, Contract, Workflow, สิทธิ์, Database และ Acceptance ครบ UC-01–UC-11; Draft พร้อม Open decisions
- [Backend Specifications](docs/specs/backend/README.md) — Class Diagram review, operation contracts, persistence/transactions, Auth/private files และ verification
- [Figma UI Design](https://www.figma.com/design/aBLNdRvl9Z3x8qrhG6x38g) — แบบหน้าจอและ Components

เมื่อเริ่มทำแอป ให้เลือกเวอร์ชันที่เข้ากัน เพิ่ม configuration ที่จำเป็น และบันทึกคำสั่งที่รันได้จริงใน README
เอกสาร Requirement บางส่วนอยู่ภายนอก Repository ตามที่ระบุใน AGENTS.md จึงไม่ได้มากับการ clone นี้

ตรวจ Spec: `python3 scripts/check-specs.py` (ตรวจเอกสาร ไม่ใช่ application tests)
