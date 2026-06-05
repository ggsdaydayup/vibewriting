import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { db, personas } from "../db/index.js";
import { compilePersonaFragment } from "../lib/ai/prompts.js";

const createSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(300).optional(),
  styleTags: z.array(z.string()).default([]),
  toneWords: z.array(z.string()).default([]),
  hardRules: z.array(z.string()).default([]),
  bannedWords: z.array(z.string()).default([]),
  sampleTexts: z.array(z.string()).default([]),
  extractedPatterns: z.record(z.any()).optional(),
});

const updateSchema = createSchema.partial();

export const personaRoutes = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .get("/", async (c) => {
    const userId = c.get("userId");
    const list = await db.query.personas.findMany({
      where: eq(personas.userId, userId),
      orderBy: (p, { desc }) => [desc(p.updatedAt)],
    });
    return c.json(list);
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const systemPromptFragment = compilePersonaFragment({
      name: data.name,
      description: data.description,
      styleTags: data.styleTags,
      toneWords: data.toneWords,
      hardRules: data.hardRules,
      bannedWords: data.bannedWords,
      extractedPatterns: data.extractedPatterns,
    });

    const [persona] = await db
      .insert(personas)
      .values({ ...data, userId, systemPromptFragment })
      .returning();
    return c.json(persona, 201);
  })
  .get("/:id", async (c) => {
    const userId = c.get("userId");
    const persona = await db.query.personas.findFirst({
      where: and(eq(personas.id, c.req.param("id")), eq(personas.userId, userId)),
    });
    if (!persona) return c.json({ error: "Not found" }, 404);
    return c.json(persona);
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const existing = await db.query.personas.findFirst({
      where: and(eq(personas.id, c.req.param("id")), eq(personas.userId, userId)),
    });
    if (!existing) return c.json({ error: "Not found" }, 404);

    const merged = {
      name: data.name ?? existing.name,
      description: data.description ?? existing.description ?? undefined,
      styleTags: data.styleTags ?? (existing.styleTags as string[]),
      toneWords: data.toneWords ?? (existing.toneWords as string[]),
      hardRules: data.hardRules ?? (existing.hardRules as string[]),
      bannedWords: data.bannedWords ?? (existing.bannedWords as string[]),
      extractedPatterns: data.extractedPatterns ?? (existing.extractedPatterns as any),
    };

    const systemPromptFragment = compilePersonaFragment(merged);

    const [updated] = await db
      .update(personas)
      .set({ ...data, systemPromptFragment, updatedAt: new Date() })
      .where(and(eq(personas.id, c.req.param("id")), eq(personas.userId, userId)))
      .returning();
    return c.json(updated);
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const [deleted] = await db
      .delete(personas)
      .where(and(eq(personas.id, c.req.param("id")), eq(personas.userId, userId)))
      .returning();
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  });
