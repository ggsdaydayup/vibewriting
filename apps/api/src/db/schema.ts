import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  genre: text("genre"),
  coverUrl: text("cover_url"),
  personaId: uuid("persona_id"),
  coreTheme: text("core_theme"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chapters = pgTable("chapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  status: text("status").notNull().default("draft"),
  content: text("content"),
  summary: text("summary"),
  vibePrompt: text("vibe_prompt"),
  wordCount: integer("word_count").notNull().default(0),
  endSnapshot: jsonb("end_snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  styleTags: jsonb("style_tags").notNull().default([]),
  toneWords: jsonb("tone_words").notNull().default([]),
  hardRules: jsonb("hard_rules").notNull().default([]),
  bannedWords: jsonb("banned_words").notNull().default([]),
  sampleTexts: jsonb("sample_texts").notNull().default([]),
  extractedPatterns: jsonb("extracted_patterns"),
  systemPromptFragment: text("system_prompt_fragment").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const characters = pgTable("characters", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull().default("supporting"),
  description: text("description"),
  currentState: text("current_state"),
  startState: text("start_state"),
  endState: text("end_state"),
  behaviorRules: jsonb("behavior_rules").notNull().default([]),
  arcMilestones: jsonb("arc_milestones").notNull().default([]),
  relationships: jsonb("relationships"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const foreshadowings = pgTable("foreshadowings", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  plantedChapter: integer("planted_chapter").notNull(),
  plannedCollection: integer("planned_collection"),
  collectedChapter: integer("collected_chapter"),
  status: text("status").notNull().default("planted"),
  relatedCharacters: jsonb("related_characters").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const worldNotes = pgTable("world_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("general"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  aiProvider: text("ai_provider").notNull().default("openai"),
  aiModel: text("ai_model").notNull().default("gpt-4o"),
  aiApiKey: text("ai_api_key"),
  aiBaseUrl: text("ai_base_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
