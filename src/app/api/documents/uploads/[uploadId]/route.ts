import { resolvePrincipal } from "@/server/auth";
import { failure, readBody, requireSameOrigin } from "@/server/http";
import { uploadBytes } from "@/server/documents";
import { MAX_FILE_SIZE } from "@/server/storage";
export async function PUT(
  request: Request,
  context: { params: Promise<{ uploadId: string }> },
) {
  try {
    requireSameOrigin(request);
    const principal = await resolvePrincipal(request.headers);
    await uploadBytes(
      principal,
      (await context.params).uploadId,
      await readBody(request, MAX_FILE_SIZE),
      request.headers.get("content-type"),
    );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
