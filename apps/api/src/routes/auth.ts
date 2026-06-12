import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { signToken, verifyToken } from "../lib/auth/jwt.js";

const router = new Hono();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /api/auth/register
router.post("/register", zValidator("json", authSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return c.json({ error: "该邮箱已注册" }, 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();

  const accessToken = await signToken(user.id, "access");
  const refreshToken = await signToken(user.id, "refresh");

  return c.json({ accessToken, refreshToken, user: { id: user.id, email: user.email } }, 201);
});

// POST /api/auth/login
router.post("/login", zValidator("json", authSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return c.json({ error: "邮箱或密码错误" }, 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return c.json({ error: "邮箱或密码错误" }, 401);

  const accessToken = await signToken(user.id, "access");
  const refreshToken = await signToken(user.id, "refresh");

  return c.json({ accessToken, refreshToken, user: { id: user.id, email: user.email } });
});

// POST /api/auth/refresh
router.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = body.refreshToken;
  if (!token) return c.json({ error: "Missing refresh token" }, 401);

  try {
    const { userId, type } = await verifyToken(token);
    if (type !== "refresh") return c.json({ error: "Invalid token type" }, 401);

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json({ error: "User not found" }, 401);

    const accessToken = await signToken(user.id, "access");
    return c.json({ accessToken });
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

// GET /api/auth/me
router.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { userId } = await verifyToken(authHeader.slice(7));
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json({ error: "User not found" }, 401);
    return c.json({ id: user.id, email: user.email });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

export { router as authRoutes };
