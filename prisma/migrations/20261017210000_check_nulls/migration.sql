ALTER TABLE "correction_request" DROP CONSTRAINT "correction_target_xor";
ALTER TABLE "correction_request" ADD CONSTRAINT "correction_target_xor" CHECK (
  ("targetType" = 'ENTRY' AND "entryId" IS NOT NULL AND "entryId" = "targetId" AND "documentId" IS NULL)
  OR ("targetType" IN ('VISA','WORK_PERMIT') AND "documentId" IS NOT NULL AND "documentId" = "targetId" AND "entryId" IS NULL));
ALTER TABLE "entry_record" DROP CONSTRAINT "confirmed_plan_complete";
ALTER TABLE "entry_record" ADD CONSTRAINT "confirmed_plan_complete" CHECK (
  "planStatus" = 'DRAFT' OR ("plannedArrivalAt" IS NOT NULL AND "travelMode" IS NOT NULL AND "travelMode" IN ('AIR','LAND','SEA')
    AND port IS NOT NULL AND length(trim(port)) > 0 AND ("travelMode" <> 'AIR' OR ("flightNo" IS NOT NULL AND length(trim("flightNo")) > 0))));
ALTER TABLE "application" DROP CONSTRAINT "accepted_submission_metadata";
ALTER TABLE "application" ADD CONSTRAINT "accepted_submission_metadata" CHECK (
  "submissionStatus" <> 'SUBMITTED' OR ("receiptNo" IS NOT NULL AND length(trim("receiptNo")) > 0 AND "submittedAt" IS NOT NULL));
