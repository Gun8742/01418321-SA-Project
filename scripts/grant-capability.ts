import "dotenv/config";
import { database } from "../src/server/db";
import { assertLocalDatabase } from "../prisma/seed";
import { idSchema } from "../src/features/workforce/model";
assertLocalDatabase();
const [username, employmentId, capability, mode] = process.argv.slice(2);
idSchema.parse(employmentId);
if (
  !username ||
  !["entry:record-evidence", "medical:record-evidence"].includes(capability)
)
  throw new Error(
    "Usage: grant-capability <username> <employmentId> <entry:record-evidence|medical:record-evidence> [revoke]",
  );
const db = database();
try {
  const account = await db.actorAccount.findFirstOrThrow({
    where: { user: { username }, active: true },
  });
  const employment = await db.employment.findUniqueOrThrow({
    where: { id: BigInt(employmentId) },
  });
  if (
    account.role === "WORKER"
      ? account.workerId !== employment.workerId
      : account.employerId !== employment.employerId
  )
    throw new Error("Account does not belong to this Employment");
  await db.capabilityGrant.upsert({
    where: {
      actorId_employmentId_capability: {
        actorId: account.id,
        employmentId: employment.id,
        capability,
      },
    },
    create: {
      actorId: account.id,
      employmentId: employment.id,
      capability,
      revokedAt: mode === "revoke" ? new Date() : null,
    },
    update: { revokedAt: mode === "revoke" ? new Date() : null },
  });
  console.log(
    mode === "revoke"
      ? "Scoped capability revoked"
      : "Scoped capability granted for synthetic local testing",
  );
} finally {
  await db.$disconnect();
}
