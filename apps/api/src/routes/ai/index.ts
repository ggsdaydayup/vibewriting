import { Hono } from "hono";
import { completeRoute } from "./complete.js";
import { inlineRoute } from "./inline.js";
import { chatRoute } from "./chat.js";
import { autopilotRoute } from "./autopilot.js";
import { analyzePersonaRoute } from "./analyze-persona.js";

export const aiRoutes = new Hono()
  .route("/complete", completeRoute)
  .route("/inline", inlineRoute)
  .route("/chat", chatRoute)
  .route("/autopilot", autopilotRoute)
  .route("/analyze-persona", analyzePersonaRoute);
