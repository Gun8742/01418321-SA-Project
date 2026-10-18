import "server-only";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDatabase = globalThis as typeof globalThis & {
  saDatabase?: PrismaClient;
};
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  globalDatabase.saDatabase ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  return globalDatabase.saDatabase;
}
