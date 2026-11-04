import "server-only";
import { createHash } from "node:crypto";
import { APIError } from "better-auth/api";
import { database } from "./db";
import type { Prisma } from "../generated/prisma/client";

export function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function rawToken(where?: Prisma.SessionWhereInput): string | undefined {
  const token = where?.token;
  if (typeof token === "string") return token;
  if (token?.equals && typeof token.equals === "string") return token.equals;
}
function hashWhere(
  where?: Prisma.SessionWhereInput,
): Prisma.SessionWhereInput | undefined {
  if (!where) return where;
  const token = rawToken(where);
  return {
    ...where,
    ...(token ? { token: tokenDigest(token) } : {}),
    ...(where.AND
      ? {
          AND: Array.isArray(where.AND)
            ? where.AND.map((w) => hashWhere(w) ?? {})
            : hashWhere(where.AND),
        }
      : {}),
    ...(where.OR ? { OR: where.OR.map((w) => hashWhere(w) ?? {}) } : {}),
    ...(where.NOT
      ? {
          NOT: Array.isArray(where.NOT)
            ? where.NOT.map((w) => hashWhere(w) ?? {})
            : hashWhere(where.NOT),
        }
      : {}),
  };
}
async function createAuthorizedSession(args: Prisma.SessionCreateArgs) {
  const token = args.data.token;
  return database().$transaction(async (tx) => {
    // Lock eligibility until the session and login timestamp commit together.
    const [account] = await tx.$queryRaw<{ id: bigint }[]>`
      SELECT aa.id
      FROM actor_account aa
      JOIN login_service ls ON ls.id = aa."serviceId"
      WHERE aa."userId" = ${args.data.userId}
        AND aa.active AND ls.active
        AND (
          (aa.role = 'WORKER' AND aa."workerId" IS NOT NULL AND aa."employerId" IS NULL)
          OR (aa.role IN ('EMPLOYER', 'REPRESENTATIVE')
              AND aa."employerId" IS NOT NULL AND aa."workerId" IS NULL)
        )
      FOR UPDATE OF aa FOR SHARE OF ls
    `;
    if (!account)
      throw new APIError("UNAUTHORIZED", {
        message: "ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง",
      });
    const row = await tx.session.create({
      ...args,
      data: { ...args.data, token: tokenDigest(token) },
    });
    await tx.$executeRaw`
      UPDATE actor_account
      SET last_login_at = GREATEST(last_login_at, ${row.createdAt}::timestamp)
      WHERE id = ${account.id}
    `;
    return { ...row, token };
  });
}

// Native auth sees the original bearer; PostgreSQL stores only its SHA-256 digest.
export function authenticationDatabase() {
  return database().$extends({
    query: {
      session: {
        create({ args }) {
          return createAuthorizedSession(args);
        },
        async findFirst({ args, query }) {
          const token = rawToken(args.where);
          const row = await query({ ...args, where: hashWhere(args.where) });
          return row && token ? { ...row, token } : row;
        },
        async findMany({ args, query }) {
          const token = rawToken(args.where);
          const rows = await query({ ...args, where: hashWhere(args.where) });
          return token ? rows.map((row) => ({ ...row, token })) : rows;
        },
        async update({ args, query }) {
          const token = rawToken(args.where);
          const where = { ...args.where };
          if (where.token) where.token = tokenDigest(where.token);
          const row = await query({ ...args, where });
          return token ? { ...row, token } : row;
        },
        async updateMany({ args, query }) {
          return query({ ...args, where: hashWhere(args.where) });
        },
        async deleteMany({ args, query }) {
          return query({ ...args, where: hashWhere(args.where) });
        },
      },
    },
  });
}
