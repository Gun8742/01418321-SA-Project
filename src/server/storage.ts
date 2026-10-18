import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { OperationError } from "../features/workforce/operations";
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export function storage() {
  const {
    S3_ENDPOINT: endpoint,
    S3_REGION: region,
    S3_ACCESS_KEY_ID: accessKeyId,
    S3_SECRET_ACCESS_KEY: secretAccessKey,
    S3_BUCKET: bucket,
  } = process.env;
  if (!region || !accessKeyId || !secretAccessKey || !bucket)
    throw new Error("S3 configuration is required");
  return {
    bucket,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: !!endpoint,
      credentials: { accessKeyId, secretAccessKey },
      maxAttempts: 2,
      requestHandler: { connectionTimeout: 2000, requestTimeout: 5000 },
    }),
  };
}
export async function validateFile(
  bytes: Uint8Array,
  name: string,
  mime: string,
) {
  if (!bytes.length || bytes.length > MAX_FILE_SIZE)
    throw new OperationError(
      "FILE_TOO_LARGE",
      "ไฟล์ต้องไม่ว่างและไม่เกิน 5 MiB",
    );
  const suffix = name.toLowerCase().split(".").pop();
  try {
    if (mime === "application/pdf" && suffix === "pdf") {
      if (Buffer.from(bytes.slice(0, 5)).toString() !== "%PDF-")
        throw new Error("Not PDF");
      const doc = await PDFDocument.load(bytes);
      if (doc.isEncrypted || !doc.getPageCount())
        throw new Error("Unreadable PDF");
    } else if (
      (mime === "image/png" && suffix === "png") ||
      (mime === "image/jpeg" && ["jpg", "jpeg"].includes(suffix ?? ""))
    ) {
      const info = await sharp(bytes, {
        limitInputPixels: 40_000_000,
        failOn: "warning",
      }).metadata();
      if (info.format !== (mime === "image/png" ? "png" : "jpeg"))
        throw new Error("Type mismatch");
      await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning" })
        .raw()
        .toBuffer();
    } else throw new Error("Unsupported type");
  } catch {
    throw new OperationError(
      "UNSUPPORTED_FILE_TYPE",
      "รองรับ PDF/JPEG/PNG ที่อ่านได้และชนิดตรงกันเท่านั้น",
    );
  }
  return createHash("sha256").update(bytes).digest("hex");
}
export async function putFile(key: string, bytes: Uint8Array, mime: string) {
  const { client, bucket } = storage();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: mime,
      IfNoneMatch: "*",
    }),
  );
}
export async function getFile(key: string) {
  const { client, bucket } = storage();
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!result.Body) throw new OperationError("FILE_UNAVAILABLE", "ไม่พบไฟล์");
  return result.Body.transformToByteArray();
}
export async function deleteFile(key: string) {
  const { client, bucket } = storage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
export async function storageReady() {
  const { client, bucket } = storage();
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
}
