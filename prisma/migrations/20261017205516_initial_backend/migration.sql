-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYER', 'REPRESENTATIVE', 'WORKER');

-- CreateEnum
CREATE TYPE "CaseKind" AS ENUM ('PRE_ARRIVAL', 'VISA', 'WORK_PERMIT');

-- CreateEnum
CREATE TYPE "Readiness" AS ENUM ('NOT_READY', 'AWAITING_REVIEW', 'READY');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'AWAITING_SUBMISSION_CONFIRMATION', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('NOT_DECIDED', 'PENDING', 'ADDITIONAL_DOCUMENTS', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SUPPORTING', 'APPROVAL_LETTER', 'VISA', 'WORK_PERMIT', 'ENTRY', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "EntryResult" AS ENUM ('PLANNED', 'PENDING_VERIFICATION', 'ALLOWED', 'DENIED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('PENDING', 'ADDITIONAL_TESTS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "auth_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "username" TEXT,
    "displayUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_credential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "password_hash" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_service" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "login_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor_account" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "employerId" BIGINT,
    "workerId" BIGINT,
    "serviceId" BIGINT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "actor_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker" (
    "id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "passportNo" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "passportCountry" TEXT NOT NULL,
    "passportIssuedAt" DATE NOT NULL,
    "passportExpiresAt" DATE NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment" (
    "id" BIGINT NOT NULL,
    "employerId" BIGINT NOT NULL,
    "workerId" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "job" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "wage" DECIMAL(18,2) NOT NULL,
    "wageUnit" TEXT NOT NULL,

    CONSTRAINT "employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_set" (
    "id" BIGINT NOT NULL,
    "employmentId" BIGINT NOT NULL,
    "type" "CaseKind" NOT NULL,
    "caseKey" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "readinessStatus" "Readiness" NOT NULL DEFAULT 'NOT_READY',
    "checklistVersion" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" BIGINT,
    "reviewedSnapshot" JSONB,

    CONSTRAINT "document_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_item" (
    "documentSetId" BIGINT NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "documentId" BIGINT,
    "checkResult" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "checklist_item_pkey" PRIMARY KEY ("documentSetId","requirementKey")
);

-- CreateTable
CREATE TABLE "document_set_document" (
    "documentSetId" BIGINT NOT NULL,
    "documentId" BIGINT NOT NULL,

    CONSTRAINT "document_set_document_pkey" PRIMARY KEY ("documentSetId","documentId")
);

-- CreateTable
CREATE TABLE "application" (
    "id" BIGINT NOT NULL,
    "documentSetId" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submissionStatus" "SubmissionStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "decisionStatus" "DecisionStatus" NOT NULL DEFAULT 'NOT_DECIDED',
    "authority" TEXT NOT NULL,
    "receiptNo" TEXT,
    "submittedAt" DATE,
    "decidedAt" DATE,
    "reason" TEXT NOT NULL,
    "requestedItems" TEXT NOT NULL,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_event" (
    "id" BIGSERIAL NOT NULL,
    "applicationId" BIGINT NOT NULL,
    "actorId" BIGINT NOT NULL,
    "label" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "application_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_issued_document" (
    "applicationId" BIGINT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "documentId" BIGINT NOT NULL,

    CONSTRAINT "application_issued_document_pkey" PRIMARY KEY ("applicationId")
);

-- CreateTable
CREATE TABLE "document" (
    "id" BIGINT NOT NULL,
    "employmentId" BIGINT NOT NULL,
    "employerId" BIGINT,
    "workerId" BIGINT,
    "fileId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "documentNo" TEXT,
    "issuer" TEXT,
    "issuedAt" DATE,
    "validFrom" DATE,
    "expiresAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_receipt" (
    "id" BIGSERIAL NOT NULL,
    "documentId" BIGINT NOT NULL,
    "actorId" BIGINT NOT NULL,
    "receivedAt" DATE NOT NULL,
    "channel" TEXT NOT NULL,

    CONSTRAINT "document_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_record" (
    "id" BIGINT NOT NULL,
    "employmentId" BIGINT NOT NULL,
    "visaDocumentId" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "planStatus" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "plannedArrivalAt" DATE,
    "travelMode" TEXT,
    "port" TEXT,
    "flightNo" TEXT,
    "entryResult" "EntryResult" NOT NULL DEFAULT 'PLANNED',
    "actualArrivalAt" DATE,
    "permittedUntil" DATE,
    "reason" TEXT,

    CONSTRAINT "entry_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check" (
    "id" BIGINT NOT NULL,
    "employmentId" BIGINT NOT NULL,
    "entryId" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "hospitalName" TEXT NOT NULL,
    "examDate" DATE NOT NULL,
    "resultStatus" "HealthStatus" NOT NULL DEFAULT 'PENDING',
    "pendingItems" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "certificateDocumentId" BIGINT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" BIGINT,

    CONSTRAINT "health_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_request" (
    "documentId" BIGINT,
    "entryId" BIGINT,
    "id" BIGINT NOT NULL,
    "employmentId" BIGINT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "reporterId" BIGINT NOT NULL,
    "resolvedByAccountId" BIGINT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "correction_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_grant" (
    "id" TEXT NOT NULL,
    "actorId" BIGINT NOT NULL,
    "employmentId" BIGINT NOT NULL,
    "capability" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "capability_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_upload" (
    "id" TEXT NOT NULL,
    "actorId" BIGINT NOT NULL,
    "employmentId" BIGINT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_receipt" (
    "actorId" BIGINT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "resourceId" BIGINT NOT NULL,
    "employmentId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_receipt_pkey" PRIMARY KEY ("actorId","operation","requestId")
);

-- CreateTable
CREATE TABLE "id_sequence" (
    "name" TEXT NOT NULL,
    "nextValue" BIGINT NOT NULL,

    CONSTRAINT "id_sequence_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "case_policy" (
    "version" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "requirements" JSONB NOT NULL,

    CONSTRAINT "case_policy_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "auth_rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "auth_rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_applicationEvidence" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_applicationEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_travelEvidence" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_travelEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_entryEvidence" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_entryEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_healthEvidence" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_healthEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_correctionEvidence" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_correctionEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_email_key" ON "auth_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_username_key" ON "auth_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "login_session_token_hash_key" ON "login_session"("token_hash");

-- CreateIndex
CREATE INDEX "login_session_userId_expiresAt_idx" ON "login_session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "auth_credential_userId_idx" ON "auth_credential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credential_providerId_accountId_key" ON "auth_credential"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "login_service_name_key" ON "login_service"("name");

-- CreateIndex
CREATE UNIQUE INDEX "actor_account_userId_key" ON "actor_account"("userId");

-- CreateIndex
CREATE INDEX "worker_nationality_passportNo_idx" ON "worker"("nationality", "passportNo");

-- CreateIndex
CREATE INDEX "employment_employerId_workerId_idx" ON "employment"("employerId", "workerId");

-- CreateIndex
CREATE INDEX "employment_workerId_idx" ON "employment"("workerId");

-- CreateIndex
CREATE INDEX "document_set_employmentId_type_idx" ON "document_set"("employmentId", "type");

-- CreateIndex
CREATE INDEX "document_set_document_documentId_idx" ON "document_set_document"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "application_documentSetId_key" ON "application"("documentSetId");

-- CreateIndex
CREATE INDEX "application_event_applicationId_at_idx" ON "application_event"("applicationId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "application_issued_document_documentId_key" ON "application_issued_document"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "application_issued_document_applicationId_type_key" ON "application_issued_document"("applicationId", "type");

-- CreateIndex
CREATE INDEX "document_employmentId_idx" ON "document"("employmentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_receipt_documentId_key" ON "document_receipt"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "entry_record_visaDocumentId_key" ON "entry_record"("visaDocumentId");

-- CreateIndex
CREATE INDEX "entry_record_employmentId_idx" ON "entry_record"("employmentId");

-- CreateIndex
CREATE UNIQUE INDEX "health_check_entryId_key" ON "health_check"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "health_check_certificateDocumentId_key" ON "health_check"("certificateDocumentId");

-- CreateIndex
CREATE INDEX "correction_request_employmentId_status_idx" ON "correction_request"("employmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "capability_grant_actorId_employmentId_capability_key" ON "capability_grant"("actorId", "employmentId", "capability");

-- CreateIndex
CREATE UNIQUE INDEX "file_upload_objectKey_key" ON "file_upload"("objectKey");

-- CreateIndex
CREATE INDEX "file_upload_status_createdAt_idx" ON "file_upload"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "auth_rate_limit_key_key" ON "auth_rate_limit"("key");

-- CreateIndex
CREATE INDEX "_applicationEvidence_B_index" ON "_applicationEvidence"("B");

-- CreateIndex
CREATE INDEX "_travelEvidence_B_index" ON "_travelEvidence"("B");

-- CreateIndex
CREATE INDEX "_entryEvidence_B_index" ON "_entryEvidence"("B");

-- CreateIndex
CREATE INDEX "_healthEvidence_B_index" ON "_healthEvidence"("B");

-- CreateIndex
CREATE INDEX "_correctionEvidence_B_index" ON "_correctionEvidence"("B");

-- AddForeignKey
ALTER TABLE "login_session" ADD CONSTRAINT "login_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_credential" ADD CONSTRAINT "auth_credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_account" ADD CONSTRAINT "actor_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_account" ADD CONSTRAINT "actor_account_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_account" ADD CONSTRAINT "actor_account_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_account" ADD CONSTRAINT "actor_account_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "login_service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_set" ADD CONSTRAINT "document_set_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item" ADD CONSTRAINT "checklist_item_documentSetId_fkey" FOREIGN KEY ("documentSetId") REFERENCES "document_set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item" ADD CONSTRAINT "checklist_item_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_set_document" ADD CONSTRAINT "document_set_document_documentSetId_fkey" FOREIGN KEY ("documentSetId") REFERENCES "document_set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_set_document" ADD CONSTRAINT "document_set_document_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_documentSetId_fkey" FOREIGN KEY ("documentSetId") REFERENCES "document_set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_event" ADD CONSTRAINT "application_event_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_issued_document" ADD CONSTRAINT "application_issued_document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_issued_document" ADD CONSTRAINT "application_issued_document_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_receipt" ADD CONSTRAINT "document_receipt_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_receipt" ADD CONSTRAINT "document_receipt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_record" ADD CONSTRAINT "entry_record_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_record" ADD CONSTRAINT "entry_record_visaDocumentId_fkey" FOREIGN KEY ("visaDocumentId") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_check" ADD CONSTRAINT "health_check_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_check" ADD CONSTRAINT "health_check_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entry_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_check" ADD CONSTRAINT "health_check_certificateDocumentId_fkey" FOREIGN KEY ("certificateDocumentId") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_request" ADD CONSTRAINT "correction_request_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_request" ADD CONSTRAINT "correction_request_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entry_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_request" ADD CONSTRAINT "correction_request_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_request" ADD CONSTRAINT "correction_request_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "actor_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_request" ADD CONSTRAINT "correction_request_resolvedByAccountId_fkey" FOREIGN KEY ("resolvedByAccountId") REFERENCES "actor_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_grant" ADD CONSTRAINT "capability_grant_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_grant" ADD CONSTRAINT "capability_grant_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_upload" ADD CONSTRAINT "file_upload_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_upload" ADD CONSTRAINT "file_upload_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_receipt" ADD CONSTRAINT "operation_receipt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_receipt" ADD CONSTRAINT "operation_receipt_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_applicationEvidence" ADD CONSTRAINT "_applicationEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_applicationEvidence" ADD CONSTRAINT "_applicationEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_travelEvidence" ADD CONSTRAINT "_travelEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_travelEvidence" ADD CONSTRAINT "_travelEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "entry_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_entryEvidence" ADD CONSTRAINT "_entryEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_entryEvidence" ADD CONSTRAINT "_entryEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "entry_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_healthEvidence" ADD CONSTRAINT "_healthEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_healthEvidence" ADD CONSTRAINT "_healthEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "health_check"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_correctionEvidence" ADD CONSTRAINT "_correctionEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "correction_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_correctionEvidence" ADD CONSTRAINT "_correctionEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Lifecycle and ownership checks not expressible in the Prisma schema.
ALTER TABLE "actor_account" ADD CONSTRAINT "actor_role_owner" CHECK (
  (role IN ('EMPLOYER','REPRESENTATIVE') AND "employerId" IS NOT NULL AND "workerId" IS NULL)
  OR (role = 'WORKER' AND "workerId" IS NOT NULL AND "employerId" IS NULL));
ALTER TABLE "document" ADD CONSTRAINT "document_owner_xor" CHECK (("employerId" IS NULL) <> ("workerId" IS NULL));
ALTER TABLE "correction_request" ADD CONSTRAINT "correction_target_xor" CHECK (
  ("targetType" = 'ENTRY' AND "entryId" = "targetId" AND "documentId" IS NULL)
  OR ("targetType" IN ('VISA','WORK_PERMIT') AND "documentId" = "targetId" AND "entryId" IS NULL));
ALTER TABLE "health_check" ADD CONSTRAINT "verified_certificate_complete" CHECK (
  "certificateDocumentId" IS NULL OR ("resultStatus" = 'COMPLETE' AND "pendingItems" = '' AND "verifiedAt" IS NOT NULL AND "verifiedBy" IS NOT NULL));
ALTER TABLE "entry_record" ADD CONSTRAINT "confirmed_plan_complete" CHECK (
  "planStatus" = 'DRAFT' OR ("plannedArrivalAt" IS NOT NULL AND "travelMode" IN ('AIR','LAND','SEA')
    AND length(trim(port)) > 0 AND ("travelMode" <> 'AIR' OR length(trim("flightNo")) > 0)));
ALTER TABLE "entry_record" ADD CONSTRAINT "result_requires_confirmed_plan" CHECK (
  "entryResult" = 'PLANNED' OR "planStatus" = 'CONFIRMED');
ALTER TABLE "application" ADD CONSTRAINT "decision_requires_submission" CHECK (
  "decisionStatus" = 'NOT_DECIDED' OR "submissionStatus" = 'SUBMITTED');
ALTER TABLE "application" ADD CONSTRAINT "accepted_submission_metadata" CHECK (
  "submissionStatus" <> 'SUBMITTED' OR (length(trim("receiptNo")) > 0 AND "submittedAt" IS NOT NULL));
ALTER TABLE "employment" ADD CONSTRAINT "employment_dates_wage" CHECK ("startDate" <= "endDate" AND wage >= 0);
