import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { db, projects } from "../db/index.js";

const createSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  genre: z.string().max(50).optional(),
  coreTheme: z.string().max(500).optional(),
  personaId: z.string().uuid().optional(),
});

const updateSchema = createSchema.partial();

export const projectRoutes = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .get("/", async (c) => {
    const userId = c.get("userId");
    const list = await db.query.projects.findMany({
      where: eq(projects.userId, userId),
      orderBy: (p, { desc }) => [desc(p.updatedAt)],
    });
    return c.json(list);
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");
    const [project] = await db
      .insert(projects)
      .values({ ...data, userId })
      .returning();
    return c.json(project, 201);
  })
  .get("/:id", async (c) => {
    const userId = c.get("userId");
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, c.req.param("id")), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    return c.json(project);
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");
    const [updated] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, c.req.param("id")), eq(projects.userId, userId)))
      .returning();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const [deleted] = await db
      .delete(projects)
      .where(and(eq(projects.id, c.req.param("id")), eq(projects.userId, userId)))
      .returning();
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  });
