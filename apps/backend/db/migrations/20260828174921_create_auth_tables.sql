CREATE TABLE "t_account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "t_account_issuer_provider_account_id_key" UNIQUE("issuer","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "t_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "t_session_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "t_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "t_user_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "t_verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "t_account" ADD CONSTRAINT "t_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t_session" ADD CONSTRAINT "t_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "t_account_user_id_idx" ON "t_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "t_session_user_id_idx" ON "t_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "t_verification_identifier_idx" ON "t_verification" USING btree ("identifier");