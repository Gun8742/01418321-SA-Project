ALTER TABLE "file_upload" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "file_upload_actorId_requestId_key" ON "file_upload"("actorId", "requestId");
CREATE UNIQUE INDEX "document_supporting_upload" ON "document"("fileId") WHERE type = 'SUPPORTING';
