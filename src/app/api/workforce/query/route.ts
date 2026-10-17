import { resolvePrincipal } from "@/server/auth";
import { failure, readJson, requireSameOrigin } from "@/server/http";
import { executeQuery } from "@/features/workforce/queries";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return Response.json(
      {
        ok: true,
        data: await executeQuery(
          await resolvePrincipal(request.headers),
          await readJson(request),
        ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
