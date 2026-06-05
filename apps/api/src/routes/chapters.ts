import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { db, chapters, projects } from "../db/index.js";

const createSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  order: z.number().int().min(0),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  summary: z.string().max(1000).optional(),
  status: z.enum(["draft", "outline", "completed"]).optional(),
  vibePrompt: z.string().max(500).optional(),
  endSnapshot: z.record(z.any()).optional(),
});

async function verifyProjectAccess(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  });
  return !!project;
}

export const chapterRoutes = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .get("/project/:projectId", async (c) => {
    const userId = c.get("userId");
    const { projectId } = c.req.param();
    if (!(await verifyProjectAccess(projectId, userId)))
      return c.json({ error: "Not found" }, 404);

    const list = await db.query.chapters.findMany({
      where: eq(chapters.projectId, projectId),
      orderBy: (ch, { asc }) => [asc(ch.order)],
    });
    return c.json(list);
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");
    if (!(await verifyProjectAccess(data.projectId, userId)))
      return c.json({ error: "Not found" }, 404);

    const [chapter] = await db.insert(chapters).values(data).returning();
    return c.json(chapter, 201);
  })
  .get("/:id", async (c) => {
    const userId = c.get("userId");
    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, c.req.param("id")),
    });
    if (!chapter) return c.json({ error: "Not found" }, 404);
    if (!(await verifyProjectAccess(chapter.projectId, userId)))
      return c.json({ error: "Not found" }, 404);
    return c.json(chapter);
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, c.req.param("id")),
    });
    if (!chapter) return c.json({ error: "Not found" }, 404);
    if (!(await verifyProjectAccess(chapter.projectId, userId)))
      return c.json({ error: "Not found" }, 404);

    const wordCount = data.content != null
      ? data.content.replace(/\s/g, "").length
      : undefined;

    const [updated] = await db
      .update(chapters)
      .set({
        ...data,
        ...(wordCount != null ? { wordCount } : {}),
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, c.req.param("id")))
      .returning();
    return c.json(updated);
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, c.req.param("id")),
    });
    if (!chapter) return c.json({ error: "Not found" }, 404);
    if (!(await verifyProjectAccess(chapter.projectId, userId)))
      return c.json({ error: "Not found" }, 404);

    await db.delete(chapters).where(eq(chapters.id, c.req.param("id")));
    return c.json({ success: true });
  });
