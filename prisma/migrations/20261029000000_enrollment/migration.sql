CREATE TABLE "enrollment" (
 "id" TEXT PRIMARY KEY, "digest" TEXT NOT NULL UNIQUE, "email" TEXT NOT NULL,
 "name" TEXT NOT NULL, "company" JSONB, "employerId" BIGINT,
    "inviterId" BIGINT, "workerId" BIGINT,
 "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "enrollment_email_createdAt_idx" ON "enrollment"("email", "createdAt");
