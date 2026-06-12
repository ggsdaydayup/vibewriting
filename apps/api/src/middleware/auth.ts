import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/auth/jwt.js";

/**
 * 本地 JWT 验证中间件（无需调用 Supabase）
 * 支持自托管在国内云，零外部依赖，每请求验证耗时 < 1ms
 */
export const authMiddleware = createMiddleware<{
  Variables: { userId: string };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { userId } = await verifyToken(authHeader.slice(7));
    c.set("userId", userId);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
