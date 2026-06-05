import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { db, characters, projects } from "../db/index.js";

const createSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(50),
  role: z.enum(["protagonist", "deuteragonist", "antagonist", "supporting"]),
  description: z.string().max(1000).optional(),
  currentState: z.string().max(500).optional(),
  startState: z.string().max(500).optional(),
  endState: z.string().max(500).optional(),
  behaviorRules: z.array(z.string()).default([]),
});

const updateSchema = createSchema.omit({ projectId: true }).partial();

export const characterRoutes = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .get("/project/:projectId", async (c) => {
    const userId = c.get("userId");
    const { projectId } = c.req.param();
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    const list = await db.query.characters.findMany({
      where: eq(characters.projectId, projectId),
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
    const [character] = await db.insert(characters).values(data).returning();
    return c.json(character, 201);
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, c.req.param("id")),
    });
    if (!character) return c.json({ error: "Not found" }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, character.projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    const [updated] = await db
      .update(characters)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(characters.id, c.req.param("id")))
      .returning();
    return c.json(updated);
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, c.req.param("id")),
    });
    if (!character) return c.json({ error: "Not found" }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, character.projectId), eq(projects.userId, userId)),
    });
    if (!project) return c.json({ error: "Not found" }, 404);
    await db.delete(characters).where(eq(characters.id, c.req.param("id")));
    return c.json({ success: true });
  });
