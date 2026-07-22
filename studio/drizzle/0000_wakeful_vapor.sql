CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carousel_id" uuid NOT NULL,
	"agent" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"model" text,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carousel_id" uuid NOT NULL,
	"slide_id" uuid,
	"storage_provider" text NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"source_url" text,
	"attribution" text,
	"is_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"instagram" text,
	"audience" text,
	"positioning" text,
	"voice" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"logo_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carousels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"brand_profile_id" uuid,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"audience" text NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slide_count" integer DEFAULT 7 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_stage" text DEFAULT 'brief' NOT NULL,
	"thesis" text,
	"brand_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carousel_id" uuid NOT NULL,
	"source_id" uuid,
	"slide_order" integer NOT NULL,
	"role" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"kind" text DEFAULT 'paper' NOT NULL,
	"image_strategy" text DEFAULT 'generated' NOT NULL,
	"image_url" text,
	"image_prompt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carousel_id" uuid NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text,
	"title" text NOT NULL,
	"publisher" text,
	"summary" text,
	"image_url" text,
	"published_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"relevance_score" real,
	"rights_status" text DEFAULT 'external_attributed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_carousel_id_carousels_id_fk" FOREIGN KEY ("carousel_id") REFERENCES "public"."carousels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_carousel_id_carousels_id_fk" FOREIGN KEY ("carousel_id") REFERENCES "public"."carousels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_slide_id_slides_id_fk" FOREIGN KEY ("slide_id") REFERENCES "public"."slides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carousels" ADD CONSTRAINT "carousels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carousels" ADD CONSTRAINT "carousels_brand_profile_id_brand_profiles_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slides" ADD CONSTRAINT "slides_carousel_id_carousels_id_fk" FOREIGN KEY ("carousel_id") REFERENCES "public"."carousels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slides" ADD CONSTRAINT "slides_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_carousel_id_carousels_id_fk" FOREIGN KEY ("carousel_id") REFERENCES "public"."carousels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_carousel_idx" ON "agent_runs" USING btree ("carousel_id","created_at");--> statement-breakpoint
CREATE INDEX "assets_carousel_idx" ON "assets" USING btree ("carousel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_profiles_user_idx" ON "brand_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "carousels_user_updated_idx" ON "carousels" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "slides_carousel_order_idx" ON "slides" USING btree ("carousel_id","slide_order");--> statement-breakpoint
CREATE INDEX "sources_carousel_idx" ON "sources" USING btree ("carousel_id");