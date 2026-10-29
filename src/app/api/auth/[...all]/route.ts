import { z } from "zod";
import { authentication, resolveLoginUsername } from "@/server/auth";
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
    requireBackend();
    requireSameOrigin(request);
    let bytes = await readBody(request);
    if (path === "sign-in/username") {
      const body = z
        .object({
          username: z.string().min(1).max(100),
          password: z.string(),
          rememberMe: z.boolean().optional(),
        })
        .parse(JSON.parse(new TextDecoder().decode(bytes)));
      body.username = await resolveLoginUsername(body.username);
      bytes = new TextEncoder().encode(JSON.stringify(body));
    }
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.delete("content-length");
    response = await authentication().handler(
      new Request(request.url, {
        method: request.method,
        headers: forwardedHeaders,
        body: new Uint8Array(bytes).buffer,
      }),
    );
  } catch (error) {
    return failure(error);
  }
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

export async function GET() {
  return new Response(null, { status: 404 });
}
