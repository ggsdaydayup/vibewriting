import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { db, userSettings } from "../db/index.js";
import { PROVIDER_PRESETS } from "../lib/ai/providers.js";

const updateSchema = z.object({
  aiProvider: z.enum(["openai", "anthropic", "deepseek", "qwen", "custom"]),
  aiModel: z.string().min(1),
  aiApiKey: z.string().min(1),
  aiBaseUrl: z.string().url().optional(),
});

export const settingsRoutes = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .get("/", async (c) => {
    const userId = c.get("userId");
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });
    if (!settings) {
      return c.json({
        aiProvider: "openai",
        aiModel: "gpt-4o",
        aiApiKey: "",
        aiBaseUrl: null,
      });
    }
    return c.json({
      ...settings,
      aiApiKey: settings.aiApiKey ? "••••••••" : "",
    });
  })
  .put("/", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return c.json({ ...updated, aiApiKey: "••••••••" });
    } else {
      const [created] = await db
        .insert(userSettings)
        .values({ ...data, userId })
        .returning();
      return c.json({ ...created, aiApiKey: "••••••••" });
    }
  })
  .get("/providers", async (c) => {
    return c.json(PROVIDER_PRESETS);
  });
