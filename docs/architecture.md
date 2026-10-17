# Architecture

## แนวทาง

ใช้ Modular Monolith แบบ Feature-based: Next.js Full-stack หนึ่งแอป แยก Module ตามพฤติกรรมธุรกิจ ไม่แยกตาม Actor หรือสร้างบริการแยกสำหรับแต่ละ UC

นี่คือโครงสร้างเริ่มต้นสำหรับพัฒนา ยังไม่มี runtime, dependencies, Database schema หรือ application implementation
ไฟล์ `.gitkeep` มีไว้ให้ Git เก็บ Directory ว่าง เมื่อมีไฟล์จริงใน Directory นั้นให้ลบ placeholder ออก

## Directory ที่เตรียมไว้

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   ├── architecture.md
│   └── use-case-map.md
├── public/                       # รูป/ไอคอนที่เปิดสาธารณะ
├── prisma/                       # Schema และ Migrations เมื่อเริ่มพัฒนา
├── src/
│   ├── app/                      # Routing และการประกอบหน้าจอ
│   │   ├── login/
│   │   ├── employer/
│   │   │   ├── workers/
│   │   │   ├── pre-arrival/
│   │   │   ├── visa/
│   │   │   └── work-permits/
│   │   ├── worker/
│   │   │   ├── visa/
│   │   │   ├── travel/
│   │   │   ├── medical/
│   │   │   └── work-permit/
│   │   └── api/
│   │       ├── auth/
│   │       └── documents/
│   ├── features/
│   │   ├── workers/
│   │   ├── employment/
│   │   ├── pre-arrival/
│   │   ├── visa/
│   │   │   ├── components/
│   │   │   └── server/
│   │   ├── travel/
│   │   ├── medical/
│   │   ├── work-permits/
│   │   └── documents/
│   ├── components/
│   │   ├── ui/                   # UI primitives และ shadcn/ui
│   │   └── layout/               # Sidebar, Header, App shell
│   ├── server/                   # Infrastructure ฝั่ง Server ที่ใช้ร่วมกัน
│   └── lib/                      # Utilities ที่ใช้ร่วมกันจริง
└── tests/
    ├── integration/
    └── e2e/
```

เมื่อสร้าง Next.js application ให้เพิ่ม root layout, pages, global styles และ config ตามเวอร์ชันที่ติดตั้งจริง
Directory ใน `app/` เป็นพื้นที่เตรียมไว้ ยังไม่ได้สร้าง route ที่ทำงานได้
เส้นทาง `/worker` เป็นภาพรวมลูกจ้าง ส่วน `/employer` เป็นจุดเข้าสู่พื้นที่นายจ้าง; รายละเอียด routes ให้ตามหน้าจอของ UC ที่กำลังทำ

## หน้าที่และ Dependency

| ส่วน | หน้าที่ | ใช้ส่วนใดได้ |
|---|---|---|
| `app/` | รับ request, จัด layout, ประกอบหน้า และแปลง response | Feature interfaces และ shared UI |
| `features/<name>/components/` | UI ของงานนั้น รวม form และสถานะที่เกี่ยวข้อง | Shared UI, schemas และ Server Actions ที่เปิดให้เรียก |
| `features/<name>/server/` | ตรวจสิทธิ์ข้อมูล, business rules, workflow และ transactions | Infrastructure และ Interface ของ Feature ที่เกี่ยวข้อง |
| `components/` | UI ที่ใช้ข้าม Feature โดยไม่มี business rules | Utilities และข้อมูลที่ caller ส่งมา |
| `server/` | Database client, Authentication/Session และ Private Storage | Libraries และ configuration ฝั่ง Server |
| `lib/` | Helpers ที่ไม่มีเจ้าของเป็น Feature ใดโดยเฉพาะ | Dependencies เท่าที่จำเป็น |

Feature หนึ่งเรียกอีก Feature ผ่าน operation ที่ตั้งชื่อชัดเจน เช่น เตรียมคำขอหรือบันทึกการรับเอกสาร ไม่เข้าถึงไฟล์ภายในของกันและกันจนเกิด circular dependencies
กฎข้อมูลลูกจ้างอยู่ใน Module ที่เป็นเจ้าของข้อมูล ส่วน Authentication บอกว่าเป็นใคร ไม่แทนการตรวจว่าบุคคลนั้นเข้าถึง record ใดได้บ้าง
ใช้ `server-only` กับ Database, Storage และ implementation ที่ต้องอยู่ฝั่ง Server; ไฟล์ `schemas.ts` ที่ Client ใช้ร่วมต้องไม่มี Server imports

## รูปแบบภายใน Feature

ตัวอย่างไฟล์ที่จะเพิ่มเมื่อเริ่มทำ Visa ไม่ใช่ไฟล์ implementation ที่สร้างไว้แล้ว:

```text
features/visa/
├── components/
│   ├── visa-form.tsx
│   └── visa-checklist.tsx
├── schemas.ts
└── server/
    ├── actions.ts
    ├── service.ts
    ├── workflow.ts
    └── workflow.test.ts
```

- `schemas.ts`: รูปแบบ input และ Validation ที่แชร์ได้ ตรวจซ้ำฝั่ง Server ก่อนใช้ข้อมูล
- `actions.ts`: Server Actions ที่รับ input และ Session แล้วเรียก business operation; ถือเป็น entry point ที่ต้องตรวจสิทธิ์
- `service.ts`: Interface ของ business operations เช่น บันทึกการยื่นและผล Visa รวมการตรวจ ownership, สถานะปัจจุบัน, หลักฐาน และ DB transaction
- `workflow.ts`: กฎ Precondition/transition ที่แยกทดสอบได้ เพิ่มเมื่อมีตรรกะที่ควรแยกจาก service
- ไฟล์อื่นใช้รูปแบบเดียวกันเมื่อมีงานจริง ไม่สร้างทุกชั้นหรือ Repository Interface โดยอัตโนมัติ; service เรียก Prisma ได้โดยตรง

เส้นทางการเปลี่ยนข้อมูล:

```text
Client UI → Server Action → Feature operation → Database / Private Storage
HTTP request → Route Handler → Feature operation เดียวกัน
Server Component → Feature operation สำหรับอ่านข้อมูล
```

Route Handler มีไว้เมื่อจำเป็นต้องมี HTTP endpoint เช่น Authentication, upload/download ไม่ต้องสร้าง REST endpoint ซ้ำให้ทุก Server Action
ส่ง context ของผู้ใช้จาก Session ที่ตรวจแล้ว ไม่เชื่อ Role หรือ owner ID ที่ Client อ้างเอง
การเขียนหลาย record สำเร็จร่วมกันใน DB transaction; การจัดการไฟล์ต้องมี recovery/cleanup แยก เพราะ transaction ของ Database ไม่ครอบคลุม Object Storage

## การทดสอบ

- วาง tests ของกฎเฉพาะ Feature ใกล้ implementation เช่น `workflow.test.ts`
- `tests/integration/`: สิทธิ์อ่าน/แก้ไข/ดาวน์โหลด, DB constraints, transactions และการบันทึกซ้ำ/พร้อมกัน
- `tests/e2e/`: เส้นทางนายจ้างและลูกจ้าง รวม missing documents, rejected/pending results และ save failures
- ทดสอบผ่าน Interface ที่ผู้เรียกใช้จริง แทนการผูก test กับรายละเอียดภายใน

## สิ่งที่เพิ่มตอนเริ่มทำแอป

เพิ่ม package manifest, lockfile, framework/TypeScript/test configuration, `.env.example` และ `compose.yaml` หลังเลือกเวอร์ชันและบริการจริง
บันทึกคำสั่ง install, development, migration และ checks ใน README หลังทดสอบว่าใช้ได้
เก็บไฟล์เอกสารส่วนบุคคลใน Private Storage; `public/` ใช้เฉพาะ assets ที่ตั้งใจให้ทุกคนเข้าถึงได้
