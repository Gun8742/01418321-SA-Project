import { resolvePrincipal } from "@/server/auth";
import { failure, readJson, requireSameOrigin } from "@/server/http";
import { completeUpload } from "@/server/documents";
export async function POST(
  request: Request,
  context: { params: Promise<{ uploadId: string }> },
) {
  try {
    requireSameOrigin(request);
    return Response.json(
      await completeUpload(
        await resolvePrincipal(request.headers),
        (await context.params).uploadId,
        await readJson(request),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
