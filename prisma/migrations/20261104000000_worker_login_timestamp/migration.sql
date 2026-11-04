ALTER TABLE "actor_account" ADD COLUMN "last_login_at" TIMESTAMP(3);

UPDATE "actor_account" AS account
SET "last_login_at" = sessions.last_login_at
FROM (
  SELECT "userId", MAX("createdAt") AS last_login_at
  FROM "login_session"
  GROUP BY "userId"
) AS sessions
WHERE account."userId" = sessions."userId";
