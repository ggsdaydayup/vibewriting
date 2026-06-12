import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { aiRoutes } from "./routes/ai/index.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { chapterRoutes } from "./routes/chapters.js";
import { personaRoutes } from "./routes/personas.js";
import { characterRoutes } from "./routes/characters.js";
import { foreshadowingRoutes } from "./routes/foreshadowings.js";
import { worldNoteRoutes } from "./routes/world-notes.js";
import { settingsRoutes } from "./routes/settings.js";

const app = new Hono();

app.use("*", logger());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "tauri://localhost",
  "https://tauri.localhost",
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : []),
];

app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ status: "ok", ts: Date.now() }));

app.route("/api/auth", authRoutes);
app.route("/api/ai", aiRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/chapters", chapterRoutes);
app.route("/api/personas", personaRoutes);
app.route("/api/characters", characterRoutes);
app.route("/api/foreshadowings", foreshadowingRoutes);
app.route("/api/world-notes", worldNoteRoutes);
app.route("/api/settings", settingsRoutes);

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`);
});
