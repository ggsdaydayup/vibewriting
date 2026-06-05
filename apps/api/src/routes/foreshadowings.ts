import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { db, foreshadowings, projects } from "../db/index.js";

const createSchema = z.object({
  projectId: z.string().uuid(),
  description: z.string().min(1).max(500),
  plantedChapter: z.number().int().min(1),
  plannedCollection: z.number().int().min(1).optional(),
  relatedCharacters: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  description: z.string().max(500).optional(),
  plannedCollection: z.number().int().min(1).optional(),
  collectedChapter: z.number().int().min(1).optional(),
  status: z.enum(["planted", "due_soon", "collected", "abandoned"]).optional(),
  relatedCharacters: z.array(z.string()).optional(),
});

export const foreshadowingRoutes = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .get("/project/:projectId", async (c) => {
    const userId = c.get("userId");
    const { projectId } = c.req.param();
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    const list = await db.query.foreshadowings.findMany({
      where: eq(foreshadowings.projectId, projectId),
      orderBy: (f, { asc }) => [asc(f.plantedChapter)],
    });
    return c.json(list);
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, data.projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    const [item] = await db.insert(foreshadowings).values(data).returning();
    return c.json(item, 201);
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");
    const item = await db.query.foreshadowings.findFirst({
      where: eq(foreshadowings.id, c.req.param("id")),
    });
    if (!item) return c.json({ error: "Not found" }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, item.projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    const [updated] = await db
      .update(foreshadowings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(foreshadowings.id, c.req.param("id")))
      .returning();
    return c.json(updated);
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const item = await db.query.foreshadowings.findFirst({
      where: eq(foreshadowings.id, c.req.param("id")),
    });
    if (!item) return c.json({ error: "Not found" }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, item.projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    await db.delete(foreshadowings).where(eq(foreshadowings.id, c.req.param("id")));
    return c.json({ success: true });
  });
