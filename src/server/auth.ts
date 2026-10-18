import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { authenticationDatabase } from "./auth-db";
import { requireBackend } from "./config";
import { database } from "./db";
import { OperationError } from "../features/workforce/operations";
import type { Actor } from "../features/workforce/model";
import type { Prisma } from "../generated/prisma/client";

export function createAuthentication(provisioning = false) {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!secret || secret.length < 32 || !baseURL)
    throw new Error("Auth configuration is missing");
  return betterAuth({
    secret,
    baseURL,
    database: prismaAdapter(authenticationDatabase(), {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !provisioning,
      minPasswordLength: 12,
    },
    plugins: [username()],
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 15,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      storage: "database",
      enabled: true,
      window: 15 * 60,
      max: 50,
      customRules: {
        "/sign-in/email": { window: 15 * 60, max: 5 },
        "/sign-in/username": { window: 15 * 60, max: 5 },
      },
    },
  });
}
let instance: ReturnType<typeof createAuthentication> | undefined;
export function authentication() {
  instance ??= createAuthentication();
  return instance;
}
export type Principal = { actor: Actor; userId: string; sessionId: string };
export async function resolvePrincipal(headers: Headers): Promise<Principal> {
  requireBackend();
  const session = await authentication().api.getSession({ headers });
  if (!session) throw new OperationError("UNAUTHENTICATED", "กรุณาเข้าสู่ระบบ");
  const account = await database().actorAccount.findUnique({
    where: { userId: session.user.id },
    include: { service: true },
  });
  if (!account?.active || !account.service.active)
    throw new OperationError("UNAUTHENTICATED", "บัญชีนี้ใช้งานไม่ได้");
  if (account.role === "WORKER" && account.workerId && !account.employerId)
    return {
      userId: session.user.id,
      sessionId: session.session.id,
      actor: {
        role: "WORKER",
        accountId: account.id.toString(),
        workerId: account.workerId.toString(),
      },
    };
  if (
    (account.role === "EMPLOYER" || account.role === "REPRESENTATIVE") &&
    account.employerId &&
    !account.workerId
  )
    return {
      userId: session.user.id,
      sessionId: session.session.id,
      actor: {
        role: "EMPLOYER",
        accountId: account.id.toString(),
        employerId: account.employerId.toString(),
      },
    };
  throw new OperationError("FORBIDDEN", "บทบาทหรือความสัมพันธ์บัญชีไม่ถูกต้อง");
}
export async function assertActivePrincipal(
  tx: Prisma.TransactionClient,
  principal: Principal,
) {
  requireBackend();
  const session = await tx.session.findUnique({
    where: { id: principal.sessionId },
  });
  if (
    !session ||
    session.userId !== principal.userId ||
    session.expiresAt <= new Date()
  )
    throw new OperationError(
      "UNAUTHENTICATED",
      "Session หมดอายุหรือถูกเพิกถอน",
    );
  const row = await tx.actorAccount.findUnique({
    where: { id: BigInt(principal.actor.accountId) },
    include: { service: true },
  });
  if (
    !row?.active ||
    !row.service.active ||
    row.userId !== principal.userId ||
    (principal.actor.role === "EMPLOYER"
      ? row.employerId?.toString() !== principal.actor.employerId
      : row.workerId?.toString() !== principal.actor.workerId)
  )
    throw new OperationError("FORBIDDEN", "สิทธิ์บัญชีเปลี่ยนแล้ว");
}
