import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export function getUserId(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request): { userId: string } | Response {
  const userId = getUserId(req);
  if (!userId) return Response.json({ message: "Unauthorized" }, { status: 403 });
  return { userId };
}
