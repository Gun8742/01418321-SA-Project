import { authentication } from "@/server/auth";
import { requireBackend } from "@/server/config";
import { failure, readBody, requireSameOrigin } from "@/server/http";
const allowed = new Set(["sign-in/email", "sign-in/username", "sign-out"]);
async function handle(
  request: Request,
  context: { params: Promise<{ all: string[] }> },
) {
  const path = (await context.params).all.join("/");
  if (!allowed.has(path))
    return Response.json({ error: "Not found" }, { status: 404 });
  let response: Response;
  try {
    requireBackend(); requireSameOrigin(request);
    const bytes = await readBody(request);
    response = await authentication().handler(new Request(request.url, { method: request.method, headers: request.headers, body: new Uint8Array(bytes).buffer }));
  } catch (error) { return failure(error); }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("Cache-Control", "private, no-store");
  if (path.startsWith("sign-in/")) {
    if (!response.ok)
      return Response.json(
        { error: { message: "ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง" } },
        { status: response.status, headers },
      );
    return Response.json({ ok: true }, { status: response.status, headers });
  }
  return new Response(response.body, { status: response.status, headers });
}
export const POST = handle;
