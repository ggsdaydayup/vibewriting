import { Hono } from "hono";
import { completeRoute } from "./complete.js";
import { inlineRoute } from "./inline.js";
import { chatRoute } from "./chat.js";
import { autopilotRoute } from "./autopilot.js";
import { analyzePersonaRoute } from "./analyze-persona.js";
import summarizeRouter from "./summarize.js";
import outlineRouter from "./outline.js";
import consistencyCheckRouter from "./consistency-check.js";

export const aiRoutes = new Hono()
  .route("/complete", completeRoute)
  .route("/inline", inlineRoute)
  .route("/chat", chatRoute)
  .route("/autopilot", autopilotRoute)
  .route("/analyze-persona", analyzePersonaRoute)
  .route("/summarize", summarizeRouter)
  .route("/outline", outlineRouter)
  .route("/consistency-check", consistencyCheckRouter);
