import { resolvePrincipal } from "@/server/auth";
import { inviteWorker, activateAccount } from "@/server/enrollment";
import { failure, readJson, requireSameOrigin } from "@/server/http";
import { requireBackend } from "@/server/config";
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    requireBackend();
    requireSameOrigin(request);
    const { action } = await context.params;
    const body = await readJson(request);
    if (action === "invite")
      await inviteWorker(await resolvePrincipal(request.headers), body);
    else if (action === "activate") await activateAccount(body);
    else return new Response(null, { status: 404 });
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
