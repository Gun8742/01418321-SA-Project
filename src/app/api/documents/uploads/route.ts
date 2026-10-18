import { resolvePrincipal } from "@/server/auth";
import { failure, readJson, requireSameOrigin } from "@/server/http";
import { initiateUpload } from "@/server/documents";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return Response.json(
      {
        ok: true,
        data: await initiateUpload(
          await resolvePrincipal(request.headers),
          await readJson(request),
        ),
      },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
