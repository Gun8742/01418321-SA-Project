ALTER TABLE "file_upload" ADD COLUMN "ownerKind" TEXT NOT NULL DEFAULT 'WORKER';
ALTER TABLE "file_upload" ADD CONSTRAINT "upload_owner_kind" CHECK ("ownerKind" IN ('WORKER', 'EMPLOYER'));
