CREATE TABLE "awards" (
	"user_id" text NOT NULL,
	"award_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	CONSTRAINT "awards_user_id_award_id_pk" PRIMARY KEY("user_id","award_id")
);
