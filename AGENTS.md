# AGENTS.md

## Project

ระบบจัดการเอกสารและติดตามการจ้างแรงงานต่างด้าว สำหรับโครงการ Systems Analysis
รองรับนายจ้าง/ผู้กระทำการแทนและลูกจ้างต่างด้าว ตั้งแต่ข้อมูลการจ้างจนถึงการรับ Work Permit ครอบคลุม UC-01–UC-11

- ตอบผู้ใช้เป็นภาษาไทย กระชับ และคง Technical Terms ที่จำเป็น
- เริ่มงานด้วยการตรวจไฟล์ที่เกี่ยวข้อง รูปแบบที่ใช้อยู่ และผลกระทบต่อ callers ก่อนแก้ไข
- สรุปผลที่เปลี่ยน สิ่งที่ตรวจแล้ว และข้อจำกัดที่ยังเหลือ โดยแยกข้อเท็จจริงออกจากสมมติฐาน

## Current State and Stack

Repository นี้มี Mock Frontend แล้ว ณ วันที่ 18 ตุลาคม 2569; คำสั่งและข้อจำกัดอยู่ใน [README](README.md)
ก่อนแก้ UI หรือ Mock operations ให้อ่าน [Frontend Spec](docs/specs/frontend/README.md) และตรวจ manifests/lockfile/scripts จริง
Mock เปิดผ่าน NEXT_PUBLIC_ENABLE_MOCK=true เท่านั้น เก็บข้อมูลสมมติใน browser; การเชื่อม Auth/Database/Private Storage จริงยังไม่มี implementation

ก่อนเพิ่ม Feature, Route หรือ Infrastructure ให้อ่าน [Architecture](docs/architecture.md); ก่อนทำ Use Case ให้ดู [Use Case Map](docs/use-case-map.md) เพื่อเลือก Module และหน้าจอที่เกี่ยวข้อง

ก่อน implement ให้อ่าน [Implementation Specifications](docs/specs/README.md), Contract และ Acceptance ของ UC ที่เกี่ยวข้อง พร้อมตรวจ [Open decisions](docs/specs/decisions.md) ที่บล็อกงานนั้น
ก่อนทำ Backend, schema หรือ Auth ให้อ่าน [Backend Spec](docs/specs/backend/README.md) และ [Class Diagram review](docs/specs/backend/class-diagram-review.md) เพื่อเทียบ behavior กับ UC/ER ก่อนแปลง analysis classes เป็นโค้ด
ชุด Spec เป็น Draft; ข้อเสนอ implementation ไม่ทับ revised Description และการ merge เอกสารไม่ถือว่าปิด Open decisions แล้ว

Frontend ติดตั้ง Next.js/React/TypeScript, Zod, Noto Sans Thai, Vitest และ Playwright แล้ว ใช้ CSS Tokens จาก Figma; เวอร์ชันจริงดู package.json/lockfile
ส่วนต่อไปนี้ยังเป็นตัวเลือกสำหรับ Backend integration หรือ UI เพิ่มเติม ไม่ใช่สิ่งที่ติดตั้งแล้วทั้งหมด:

- Next.js Server Actions/Route Handlers สำหรับ Full-stack integration เมื่ออนุมัติ Backend แล้ว
- Tailwind CSS + shadcn/ui สำหรับ UI; React Hook Form + Zod สำหรับแบบฟอร์ม
- PostgreSQL + Prisma ORM สำหรับข้อมูลและ migrations
- Better Auth สำหรับ Authentication/Session; ตรวจ Role และสิทธิ์ข้อมูลในฝั่ง Server เพิ่มเติม
- Private object storage ที่รองรับ S3 API สำหรับเอกสาร; Vitest และ Playwright สำหรับการทดสอบ
- Docker Compose สำหรับบริการที่ต้องใช้ร่วมกันระหว่างพัฒนา

เมื่องานให้เริ่มพัฒนา ให้ใช้ข้อกำหนดของงานนั้นและ dependencies ที่มีอยู่เป็นหลัก เลือกเวอร์ชันที่ทำงานร่วมกันได้ และบันทึกคำสั่งใช้งานจริงใน README
ใช้โครงสร้างแอปเดียวก่อน แยก Go Backend, Microservices หรือบริการเสริมเมื่อขอบเขตงานต้องการเท่านั้น

สำหรับ Next.js ให้ตรวจเวอร์ชันที่ติดตั้งและอ่าน guide ที่เกี่ยวข้องใน `node_modules/next/dist/docs/` หากมี มิฉะนั้นใช้เอกสารทางการที่ตรงเวอร์ชัน
รักษา block `nextjs-agent-rules` ที่ tooling สร้างเมื่อมีอยู่จริง โดยไม่คัดลอกคำเตือนของ Repository อื่นมาเป็นข้อเท็จจริงของที่นี่

## Sources of Truth

ก่อนเปลี่ยน business logic, validation หรือ workflow ให้อ่าน Description ของ UC ที่เกี่ยวข้องและเทียบกับ Sequence/ER
แหล่งข้อมูลใน workspace อยู่ภายนอก Git Repository นี้ โดยอ้าง path จากโฟลเดอร์ที่มี AGENTS.md:

- `../../Use case description - revised UC01-UC11.docx` — ข้อกำหนดหลักของ UC, Actor, Precondition และทางเลือก/ข้อผิดพลาด
- `../../Sequence Diagrams/README.txt` และ `../../Sequence Diagrams/UC-XX.txt` — ลำดับงานและ data flow ประกอบแต่ละ UC
- [ER Diagram — Peter Chen 2](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=322-5899) — ER ล่าสุดสำหรับ Entity, Relationship, Cardinality และ Actor Login; ใช้แทนหน้า Peter Chen เดิม
- `../../Data-Dictionary-Images/` — ER Description ที่ผู้ใช้ยืนยัน มีภาพ Data Dictionary 14 ตารางสำหรับชนิดข้อมูล, NULL, PK/FK และข้อกำหนดที่เสนอ
- [Main 3 (for ai) 2](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=230-10120) — Business Process, Use Case และ CRUD Matrix

ก่อนสร้างหรือปรับ UI ให้อ่านแหล่งต่อไปนี้:

- [SA — UI Design](https://www.figma.com/design/aBLNdRvl9Z3x8qrhG6x38g) — หน้าจอและ Components ล่าสุด
- [Site map / UI structure](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=338-3418) — เมนูและความสัมพันธ์ระหว่างหน้า
- `../../Report/UI Design/README.md` — จับคู่ UC กับหน้าจอ แหล่ง PNG และข้อจำกัด Prototype

ใช้ revised Description เป็นหลักเมื่อ Figma รุ่นเก่าขัดกัน โดยเฉพาะ UC-11 ซึ่งยืนยันรวมในเอกสาร revised แล้ว แม้บางส่วนในบอร์ดยังเขียนว่าเป็นข้อเสนอ
ก่อนออกแบบ schema, migrations หรือ Authentication ให้อ่าน [Data Model Sources](docs/data-model.md) และภาพ Data Dictionary ของตารางที่เกี่ยวข้อง; แยกข้อกำหนดที่เสนอออกจาก schema/SQL ที่ทดสอบจริง และตรวจช่องว่างเรื่อง nullability ตาม lifecycle ก่อนสร้าง migration
หาก Description กับ ER ไม่ตรงกัน ให้ระบุช่องว่างและออกแบบ schema/migration ที่จำเป็นอย่างชัดเจน ไม่ถือว่า Attribute ที่ขาดใน ER เป็นข้อห้ามเพิ่มข้อมูลตาม Requirement
เมื่อ clone Repository ไปเครื่องอื่นแล้วไม่พบเอกสารภายนอก ให้แจ้งแหล่งที่ขาดและขอเฉพาะข้อมูลที่จำเป็นต่อส่วนที่ทำ ห้ามแต่ง Requirement หรือผลการทดสอบขึ้นเอง

## Domain Rules

ลำดับหลักคือ `UC-04 → UC-01 → UC-05 → UC-06 → UC-11 → UC-07 → UC-08 → UC-09 → UC-02 → UC-03 → UC-10`
ใช้ Precondition และหลักฐานของแต่ละกรณีกำหนด transition รวมถึงกรณีส่งเอกสารเพิ่ม ไม่ใช้เลข UC เป็นลำดับสถานะ

- นายจ้าง/ผู้แทนจัดการข้อมูลการจ้าง ชุดเอกสาร การยื่นและผลคำขอ; ลูกจ้างเข้าถึงข้อมูลและเอกสารของตนเองตามสิทธิ์
- หน่วยงานภายนอกเป็นผู้พิจารณา อนุมัติ ออกเอกสาร ตรวจสุขภาพ และตรวจเข้าเมือง ระบบบันทึกผลตามหลักฐาน ไม่สมมติ API เชื่อมหน่วยงาน
- UC-01 ในโครงการหมายถึงคำขอก่อนเดินทางประกอบ Visa ตาม Description ไม่ปะปนกับการแจ้งตาม บต.52/บต.55
- เลือก Checklist/แม่แบบตามกรณีคำขอและหน่วยงาน เอกสารเฉพาะกรณีไม่ใช่เอกสารบังคับสำหรับลูกจ้างทุกคน
- ไม่มีหลักฐานรับคำขอให้คงรอยืนยันการยื่น มีหลักฐานรับแล้วจึงแสดงรอพิจารณา
- ผลอนุมัติกับเอกสารพร้อมรับเป็นคนละเงื่อนไข เปิด UC-07 เมื่อ Visa อนุมัติและมีเอกสารจริง; เปิด UC-10 เมื่อ Work Permit อนุมัติและพร้อมรับ
- การกรอกแผนเดินทางไม่ใช่ผลอนุญาตเข้าประเทศ เปิด UC-09 เมื่อมีผลอนุญาตพร้อมหลักฐาน; กรณีไม่อนุญาตให้ยุติเส้นทางนั้น
- ใบรับรองแพทย์มาจากโรงพยาบาล ระบบเก็บตามเอกสาร ไม่วินิจฉัยหรือแปลงผลเป็นการอนุมัติ Work Permit
- กำหนดผู้มีสิทธิ์บันทึกหลักฐานเข้าเมือง/ใบรับรองตาม Requirement ของงาน ไม่เพิ่ม Actor เจ้าหน้าที่หน่วยงานภายนอกโดยอนุมานเอง
- บันทึก DocumentReceipt เมื่อผู้ใช้ยืนยันว่าได้รับจริง การเปิดหน้าหรือเริ่มดาวน์โหลดยังไม่ถือว่าได้รับเอกสาร
- ติดตามหรือส่งเอกสารเพิ่มใน Application เดิมเมื่อเป็นคำร้องเดียวกัน; สร้าง DocumentSet ใหม่สำหรับคำขอใหม่
- DocumentSet เชื่อม Document ผ่าน `document_set_document`; Document มีเจ้าของเป็น Employer หรือ Worker เพียงรายเดียวตาม ER
- เมื่อ validation หรือการบันทึกล้มเหลว ให้คงสถานะเดิม แจ้งสาเหตุที่แก้ได้ และเปิดทางตรวจข้อมูลล่าสุดก่อนลองใหม่

## Implementation

- ใช้โครงสร้างและ Components ที่มีอยู่ก่อน เพิ่ม abstraction เมื่อช่วยลดความซ้ำหรือทำให้ทดสอบพฤติกรรมได้ชัดเจน
- แยก orchestration ออกจาก validation, business rules และ persistence; ใช้ named functions สำหรับพฤติกรรมที่มีความหมาย
- เก็บกฎสิทธิ์และ transition ในฝั่ง Server ให้ UI/API เรียกใช้ร่วมกัน แทนการซ่อนปุ่มอย่างเดียว
- ตรวจ Session, Role และความสัมพันธ์กับข้อมูลทุกครั้งที่อ่าน/แก้ไข/ดาวน์โหลด ตรวจสิทธิ์จากข้อมูลจริง ไม่เชื่อ workerId/employerId ที่ Client ส่งมาอย่างเดียว
- ตรวจ input และไฟล์ที่ trust boundary; ใช้ Type Safety โดยแก้ต้นเหตุของ type errors แทน `any`, unsafe casts หรือการปิดการตรวจ
- ใช้ DB transaction เมื่อหลาย record ต้องสำเร็จพร้อมกัน และตรวจสถานะปัจจุบันก่อนเปลี่ยนสถานะเพื่อรองรับคำขอซ้ำ/การแก้ไขพร้อมกัน
- แยก lifecycle ของไฟล์จาก DB transaction: รับมือไฟล์อัปโหลดค้างและ DB บันทึกล้มเหลว พร้อม cleanup ที่ไม่ลบไฟล์ซึ่งยังถูกอ้างอิง
- เก็บเอกสารใน Private Storage ตรวจชนิด ขนาด และเจ้าของไฟล์ก่อนใช้; ส่งไฟล์ผ่านช่องทางที่ตรวจสิทธิ์หรือ signed URL อายุจำกัด
- ใช้ข้อมูลสมมติใน fixtures, screenshots และ logs สำหรับทดสอบ เก็บ secrets นอก source control และหลีกเลี่ยง log รหัสผ่าน Token หรือเอกสารส่วนบุคคล

## UI

- รักษา Desktop Web 1440 px, Noto Sans Thai, โทนสว่าง/เขียวเข้ม และ Design Tokens ตาม Figma พร้อมจัด layout ให้ใช้งานได้เมื่อหน้าต่างแคบลง
- ใช้ Components และคำศัพท์เดียวกันทั้งสอง Actor พร้อม labels, keyboard focus และข้อความ Validation ใกล้ช่องที่ผิด
- แสดงสถานะ loading, empty, error, disabled และ success ตามการทำงานจริง ไม่แสดงผลสำเร็จล่วงหน้าในขั้นตอนที่อาจบันทึกล้มเหลว
- หน้า Employer/Worker ใน Figma เป็นแบบแยก Actor ส่วน Prototype & Coverage มีสำเนาสำหรับเชื่อม flow; เมื่องานแก้ Design ให้ปรับสำเนาที่เกี่ยวข้องให้ตรงกัน
- ข้อมูลและผลใน Prototype เป็นตัวอย่าง ไม่ใช่ Backend, สิทธิ์ที่บังคับใช้จริง หรือหลักฐานว่าผ่านการทดสอบระบบแล้ว

## Verification and Completion

ตรวจ scripts และเครื่องมือที่มีจริง แล้วรัน formatter/linter, type check, tests และ build ที่เกี่ยวข้องกับส่วนที่แก้
เมื่อตัวโครงการยังไม่มีเครื่องมือดังกล่าว ให้บอกว่าตรวจอะไรได้บ้างและอะไรยังไม่ได้ตรวจ แทนการอ้างคำสั่งที่ไม่มี

สำหรับ business logic ให้มี regression test ที่ตรวจพฤติกรรมสำคัญของการเปลี่ยนแปลง เช่น:

- ผู้ใช้เข้าถึงข้อมูลหรือไฟล์ของผู้อื่นไม่ได้
- ขาดหลักฐาน/เอกสารหรือ Precondition ไม่ผ่านแล้วไม่เปิดขั้นตอนถัดไป
- เอกสารไม่ครบ ไฟล์ไม่ถูกต้อง หรือบันทึกล้มเหลวแล้วสถานะไม่เปลี่ยน
- การบันทึกซ้ำหรือคำขอพร้อมกันไม่ทำให้ transition ผิดหรือเกิดรายการซ้ำ

สำหรับ UI ให้ตรวจหน้าจอและ flow ที่แก้ รวมข้อความภาษาไทยยาว การใช้ Keyboard และ error states
ส่งมอบเมื่อ callers และเอกสารที่ได้รับผลกระทบสอดคล้องกัน พร้อมระบุผลตรวจจริงและข้อจำกัดที่ยังไม่ยืนยัน

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
