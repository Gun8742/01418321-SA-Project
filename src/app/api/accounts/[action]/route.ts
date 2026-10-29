import { resolvePrincipal } from "@/server/auth";
import { manageWorkerAccount } from "@/features/workforce/service";
import { failure, readJson, requireSameOrigin } from "@/server/http";
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await context.params;
    if (action !== "create" && action !== "reset")
      return new Response(null, { status: 404 });
    requireSameOrigin(request);
    const credentials = await manageWorkerAccount(
      await resolvePrincipal(request.headers),
      await readJson(request),
      action === "reset",
    );
    return Response.json(
      { ok: true, credentials },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
