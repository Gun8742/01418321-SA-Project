import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { OperationError } from "../features/workforce/operations";

export function passportUsername(passport: string) {
  return z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "เลข Passport ต้องเป็นตัวอักษรอังกฤษ ตัวเลข - หรือ _",
    )
    .parse(passport)
    .toLowerCase();
}
export async function syncWorkerUsername(
  tx: Prisma.TransactionClient,
  workerId: bigint,
  passport: string,
) {
  const username = passportUsername(passport);
  const actor = await tx.actorAccount.findFirst({
    where: { workerId },
    include: { service: true },
  });
  if (
    await tx.worker.findFirst({
      where: {
        id: { not: workerId },
        passportNo: { equals: passport.trim(), mode: "insensitive" },
      },
    })
  )
    throw new OperationError(
      "CONFLICT",
      "พบเลข Passport ซ้ำ กรุณาตรวจข้อมูลก่อนสร้างบัญชี",
    );
  const occupied = await tx.user.findUnique({ where: { username } });
  if (occupied && occupied.id !== actor?.userId)
    throw new OperationError(
      "CONFLICT",
      "เลข Passport นี้ถูกใช้เป็นชื่อบัญชีแล้ว กรุณาตรวจข้อมูล",
    );
  if (actor)
    await tx.user.update({
      where: { id: actor.userId },
      data: { username, displayUsername: passport.trim() },
    });
}
export async function generateWorkerCredentials(
  tx: Prisma.TransactionClient,
  workerId: bigint,
  accountId: bigint,
  reset = false,
) {
  const worker = await tx.worker.findUniqueOrThrow({ where: { id: workerId } });
  await syncWorkerUsername(tx, workerId, worker.passportNo);
  const actor = await tx.actorAccount.findFirst({
    where: { workerId },
    include: { service: true },
  });
  if (actor && !reset)
    throw new OperationError(
      "CONFLICT",
      "ลูกจ้างมีบัญชีแล้ว เลือก Generate รหัสผ่านใหม่หากทำรหัสหาย",
    );
  if (
    actor &&
    (actor.role !== "WORKER" || !actor.active || !actor.service.active)
  )
    throw new OperationError(
      "PRECONDITION_FAILED",
      "บัญชีถูกระงับ กรุณาติดต่อผู้ดูแล",
    );
  const password = randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(password);
  const username = passportUsername(worker.passportNo);
  if (actor) {
    const credential = await tx.account.findFirst({
      where: { userId: actor.userId, providerId: "credential" },
    });
    if (!credential)
      throw new OperationError(
        "PRECONDITION_FAILED",
        "ไม่พบบัญชีรหัสผ่าน กรุณาติดต่อผู้ดูแล",
      );
    await tx.account.update({
      where: { id: credential.id },
      data: { password: passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: actor.userId } });
  } else {
    const userId = randomUUID();
    await tx.user.create({
      data: {
        id: userId,
        name: worker.name,
        username,
        displayUsername: worker.passportNo,
        email: userId + "@worker.invalid",
        emailVerified: false,
      },
    });
    await tx.account.create({
      data: {
        id: randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: passwordHash,
      },
    });
    const service = await tx.loginService.upsert({
      where: { name: "password-local" },
      update: {},
      create: { name: "password-local" },
    });
    if (!service.active)
      throw new OperationError("PRECONDITION_FAILED", "บริการ Login ถูกระงับ");
    await tx.actorAccount.create({
      data: {
        id: accountId,
        userId,
        role: "WORKER",
        workerId,
        serviceId: service.id,
      },
    });
  }
  await tx.enrollment.updateMany({
    where: { workerId, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return { username: worker.passportNo, password };
}
