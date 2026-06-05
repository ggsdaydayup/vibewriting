import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { db, worldNotes, projects } from "../db/index.js";

const createSchema = z.object({
  projectId: z.string().uuid(),
  category: z.string().max(50).default("general"),
  title: z.string().min(1).max(100),
  content: z.string().min(1),
});

const updateSchema = z.object({
  category: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  content: z.string().optional(),
});

export const worldNoteRoutes = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .get("/project/:projectId", async (c) => {
    const userId = c.get("userId");
    const { projectId } = c.req.param();
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    const list = await db.query.worldNotes.findMany({
      where: eq(worldNotes.projectId, projectId),
      orderBy: (w, { asc }) => [asc(w.category), asc(w.title)],
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
    const [note] = await db.insert(worldNotes).values(data).returning();
    return c.json(note, 201);
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");
    const note = await db.query.worldNotes.findFirst({
      where: eq(worldNotes.id, c.req.param("id")),
    });
    if (!note) return c.json({ error: "Not found" }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, note.projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    const [updated] = await db
      .update(worldNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(worldNotes.id, c.req.param("id")))
      .returning();
    return c.json(updated);
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const note = await db.query.worldNotes.findFirst({
      where: eq(worldNotes.id, c.req.param("id")),
    });
    if (!note) return c.json({ error: "Not found" }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, note.projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    await db.delete(worldNotes).where(eq(worldNotes.id, c.req.param("id")));
    return c.json({ success: true });
  });
