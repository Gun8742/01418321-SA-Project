import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { database } from "./db";
import { assertActivePrincipal, type Principal } from "./auth";
import { allocateIds, transaction } from "../features/workforce/service";
import { idSchema } from "../features/workforce/model";
import { OperationError } from "../features/workforce/operations";
import { sendAccountMail } from "./mail";
import type { Prisma } from "../generated/prisma/client";

const emailSchema = z.email().trim().toLowerCase().max(254);
export const invitationSchema = z.strictObject({
  email: emailSchema,
  workerId: idSchema,
});
export const activationSchema = z.strictObject({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(12).max(128),
});
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

async function consumeBudget(
  tx: Prisma.TransactionClient,
  key: string,
  limit: number,
) {
  const now = Date.now();
  const rate = await tx.rateLimit.findUnique({ where: { key } });
  const active = rate && now - Number(rate.lastRequest) < 15 * 60 * 1000;
  if (active && rate.count >= limit)
    throw new OperationError("CONFLICT", "ส่งคำขอถี่เกินไป กรุณารอแล้วลองใหม่");
  await tx.rateLimit.upsert({
    where: { key },
    create: { id: randomUUID(), key, count: 1, lastRequest: BigInt(now) },
    update: {
      count: active ? { increment: 1 } : 1,
      lastRequest: active ? rate.lastRequest : BigInt(now),
    },
  });
}

async function reserveEnrollment(
  email: string,
  name: string,
  principal: Principal,
  workerId: string,
) {
  const token = randomBytes(32).toString("hex");
  const row = await transaction(async (tx) => {
    await assertActivePrincipal(tx, principal);
    await consumeBudget(tx, "enrollment:all", 100);
    await consumeBudget(tx, "enrollment:" + digest(email), 5);
    if (principal) {
      if (principal.actor.role !== "EMPLOYER" || !workerId)
        throw new OperationError("FORBIDDEN", "เฉพาะนายจ้าง");
      const employment = await tx.employment.findFirst({
        where: {
          workerId: BigInt(workerId),
          employerId: BigInt(principal.actor.employerId),
        },
      });
      if (!employment)
        throw new OperationError("NOT_FOUND", "ไม่พบลูกจ้างในองค์กร");
      if (
        await tx.actorAccount.findFirst({
          where: { workerId: BigInt(workerId) },
        })
      )
        throw new OperationError("CONFLICT", "ลูกจ้างมีบัญชีแล้ว");
    }
    if (await tx.user.findUnique({ where: { email } })) return null;
    await tx.enrollment.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return tx.enrollment.create({
      data: {
        id: randomUUID(),
        digest: digest(token),
        email,
        name,
        employerId:
          principal.actor.role === "EMPLOYER"
            ? BigInt(principal.actor.employerId)
            : null,
        inviterId: BigInt(principal.actor.accountId),
        workerId: BigInt(workerId),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });
  if (!row) return;
  const origin = process.env.BETTER_AUTH_URL;
  if (!origin) throw new Error("Auth URL missing");
  try {
    await sendAccountMail(
      email,
      "คำเชิญเข้าระบบเอกสารแรงงาน",
      new URL("/activate?token=" + token, origin).toString(),
    );
  } catch (error) {
    await database().enrollment.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    throw error;
  }
}
export async function inviteWorker(principal: Principal, raw: unknown) {
  const input = invitationSchema.parse(raw);
  if (principal.actor.role !== "EMPLOYER")
    throw new OperationError("FORBIDDEN", "เฉพาะนายจ้าง");
  const worker = await database().worker.findFirst({
    where: {
      id: BigInt(input.workerId),
      employments: { some: { employerId: BigInt(principal.actor.employerId) } },
    },
  });
  if (!worker) throw new OperationError("NOT_FOUND", "ไม่พบลูกจ้าง");
  await reserveEnrollment(input.email, worker.name, principal, input.workerId);
}
export async function activateAccount(raw: unknown) {
  const { token, password } = activationSchema.parse(raw);
  await transaction(async (tx) => {
    await consumeBudget(tx, "activation:all", 100);
  });
  const pending = await database().enrollment.findUnique({
    where: { digest: digest(token) },
  });
  if (
    !pending ||
    !pending.workerId ||
    !pending.employerId ||
    pending.consumedAt ||
    pending.expiresAt <= new Date()
  )
    throw new OperationError(
      "PRECONDITION_FAILED",
      "ลิงก์หมดอายุหรือใช้แล้ว กรุณาขอลิงก์ใหม่",
    );
  const passwordHash = await hashPassword(password);
  await transaction(async (tx) => {
    const row = await tx.enrollment.findUnique({
      where: { digest: digest(token) },
    });
    if (
      !row ||
      !row.workerId ||
      !row.employerId ||
      row.consumedAt ||
      row.expiresAt <= new Date()
    )
      throw new OperationError(
        "PRECONDITION_FAILED",
        "ลิงก์หมดอายุหรือใช้แล้ว กรุณาขอลิงก์ใหม่",
      );
    const baseId = BigInt(await allocateIds(tx));
    const employerId = row.employerId;
    if (row.workerId) {
      if (
        !employerId ||
        !(await tx.employment.findFirst({
          where: { workerId: row.workerId, employerId },
        }))
      )
        throw new OperationError(
          "FORBIDDEN",
          "การจ้างเปลี่ยนแล้ว กรุณาขอคำเชิญใหม่",
        );
      const inviter = await tx.actorAccount.findFirst({
        where: {
          id: row.inviterId ?? 0n,
          employerId,
          active: true,
          service: { active: true },
          role: { in: ["EMPLOYER", "REPRESENTATIVE"] },
        },
      });
      if (
        !inviter ||
        (await tx.actorAccount.findFirst({ where: { workerId: row.workerId } }))
      )
        throw new OperationError("CONFLICT", "ไม่สามารถเปิดบัญชีจากคำเชิญนี้");
    }
    const userId = randomUUID();
    const username = "user_" + baseId.toString();
    await tx.user.create({
      data: {
        id: userId,
        email: row.email,
        emailVerified: true,
        name: row.name,
        username,
      },
    });
    await tx.account.create({
      data: {
        id: randomUUID(),
        userId,
        providerId: "credential",
        accountId: userId,
        password: passwordHash,
      },
    });
    const service = await tx.loginService.upsert({
      where: { name: "password-local" },
      update: {},
      create: { name: "password-local" },
    });
    await tx.actorAccount.create({
      data: {
        id: baseId + 1n,
        userId,
        role: "WORKER",
        workerId: row.workerId,
        employerId: null,
        serviceId: service.id,
      },
    });
    await tx.enrollment.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
  });
}
