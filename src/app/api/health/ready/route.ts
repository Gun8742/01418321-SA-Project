import { database } from "@/server/db";
import { storageReady } from "@/server/storage";
import { requireBackend } from "@/server/config";
export async function GET() {
  try {
    requireBackend();
    await Promise.all([database().$queryRaw`SELECT 1`, storageReady()]);
    return Response.json(
      { ready: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ready: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
