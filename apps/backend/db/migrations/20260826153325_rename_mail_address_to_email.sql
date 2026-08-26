ALTER TABLE "t_user" RENAME COLUMN "mail_address" TO "email";--> statement-breakpoint
ALTER INDEX "t_user_mail_address_lower_unique" RENAME TO "t_user_email_lower_uidx";
