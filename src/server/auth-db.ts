import "server-only";
import { createHash } from "node:crypto";
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
// Native auth sees the original bearer; PostgreSQL stores only its SHA-256 digest.
export function authenticationDatabase() {
  return database().$extends({
    query: {
      session: {
        async create({ args, query }) {
          const token = args.data.token;
          const row = await query({
            ...args,
            data: { ...args.data, token: tokenDigest(token) },
          });
          return { ...row, token };
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
