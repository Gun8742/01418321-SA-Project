import { resolvePrincipal } from "@/server/auth";
import { failure } from "@/server/http";
import { authorizeDownload } from "@/server/documents";
export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const id = (await context.params).documentId;
    const file = await authorizeDownload(
      await resolvePrincipal(request.headers),
      id,
    );
    return new Response(new Uint8Array(file.bytes).buffer, {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition":
          "attachment; filename=document-" +
          id +
          "; filename*=UTF-8''" +
          encodeURIComponent(file.name),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
