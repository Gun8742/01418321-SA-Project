import { resolvePrincipal } from "@/server/auth";
import { failure, readJson, requireSameOrigin } from "@/server/http";
import { executeCommand, snapshot } from "@/features/workforce/service";
export async function GET(request: Request) {
  try {
    return Response.json(
      await snapshot(await resolvePrincipal(request.headers)),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return Response.json(
      await executeCommand(
        await resolvePrincipal(request.headers),
        await readJson(request),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
