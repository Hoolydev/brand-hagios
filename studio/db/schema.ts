import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const brandProfiles = pgTable("brand_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  instagram: text("instagram"),
  audience: text("audience"),
  positioning: text("positioning"),
  voice: jsonb("voice").$type<string[]>().default([]).notNull(),
  palette: jsonb("palette").$type<string[]>().default([]).notNull(),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("brand_profiles_user_idx").on(table.userId)]);

export const carousels = pgTable("carousels", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  brandProfileId: uuid("brand_profile_id").references(() => brandProfiles.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  audience: text("audience").notNull(),
  interests: jsonb("interests").$type<string[]>().default([]).notNull(),
  slideCount: integer("slide_count").default(7).notNull(),
  status: text("status").default("draft").notNull(),
  currentStage: text("current_stage").default("brief").notNull(),
  thesis: text("thesis"),
  brandSnapshot: jsonb("brand_snapshot").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("carousels_user_updated_idx").on(table.userId, table.updatedAt)]);

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  carouselId: uuid("carousel_id").notNull().references(() => carousels.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  canonicalUrl: text("canonical_url"),
  title: text("title").notNull(),
  publisher: text("publisher"),
  summary: text("summary"),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow().notNull(),
  relevanceScore: real("relevance_score"),
  rightsStatus: text("rights_status").default("external_attributed").notNull(),
}, (table) => [index("sources_carousel_idx").on(table.carouselId)]);

export const slides = pgTable("slides", {
  id: uuid("id").defaultRandom().primaryKey(),
  carouselId: uuid("carousel_id").notNull().references(() => carousels.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").references(() => sources.id, { onDelete: "set null" }),
  order: integer("slide_order").notNull(),
  role: text("role").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  kind: text("kind").default("paper").notNull(),
  imageStrategy: text("image_strategy").default("generated").notNull(),
  imageUrl: text("image_url"),
  imagePrompt: text("image_prompt"),
  status: text("status").default("draft").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("slides_carousel_order_idx").on(table.carouselId, table.order)]);

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  carouselId: uuid("carousel_id").notNull().references(() => carousels.id, { onDelete: "cascade" }),
  slideId: uuid("slide_id").references(() => slides.id, { onDelete: "set null" }),
  storageProvider: text("storage_provider").notNull(),
  storageKey: text("storage_key").notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  sourceUrl: text("source_url"),
  attribution: text("attribution"),
  isGenerated: boolean("is_generated").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("assets_carousel_idx").on(table.carouselId)]);

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  carouselId: uuid("carousel_id").notNull().references(() => carousels.id, { onDelete: "cascade" }),
  agent: text("agent").notNull(),
  status: text("status").default("queued").notNull(),
  model: text("model"),
  input: jsonb("input").$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("agent_runs_carousel_idx").on(table.carouselId, table.createdAt)]);
