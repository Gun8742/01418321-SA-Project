import "dotenv/config";
process.env.CASE_POLICY_VERSION = "DEMO-1";
process.env.EXTERNAL_RESULTS_BY_EMPLOYER = "false";
import { Client } from "pg";
import { spawnSync } from "node:child_process";
import { CreateBucketCommand } from "@aws-sdk/client-s3";
import { storage } from "../src/server/storage";
const connection = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(connection.hostname))
  throw new Error("Integration runner requires a local database");
connection.pathname = "/sa_test";
const admin = new URL(connection);
admin.pathname = "/postgres";
const client = new Client({ connectionString: admin.toString() });
await client.connect();
try {
  await client.query("CREATE DATABASE sa_test");
} catch (error) {
  if (!(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "42P04"
  ))
    throw error;
} finally {
  await client.end();
}
process.env.DATABASE_URL = connection.toString();
process.env.S3_BUCKET = "sa-integration";
process.env.ALLOW_SYNTHETIC_POLICY = "true";
const s3 = storage();
try {
  await s3.client.send(new CreateBucketCommand({ Bucket: s3.bucket }));
} catch (error) {
  if (!(
    error &&
    typeof error === "object" &&
    "name" in error &&
    ["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(
      String(error.name),
    )
  ))
    throw error;
}
function run(file: string, args: string[]) {
  const result = spawnSync(
    process.execPath,
    ["--conditions=react-server", file, ...args],
    { env: process.env, stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
run("node_modules/vitest/vitest.mjs", [
  "run",
  "--config",
  "vitest.integration.config.ts",
]);
