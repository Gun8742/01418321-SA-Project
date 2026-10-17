import "dotenv/config";
import { cleanupTemporaryUploads } from "../src/server/documents";
import { database } from "../src/server/db";
try {
  console.log("Temporary uploads removed:", await cleanupTemporaryUploads());
} finally {
  await database().$disconnect();
}
