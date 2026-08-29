CREATE TABLE "t_user_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"family_name" text,
	"given_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "t_user_profile" ADD CONSTRAINT "t_user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."t_user"("id") ON DELETE cascade ON UPDATE no action;