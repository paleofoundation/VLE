CREATE TABLE supplier_applications (
 id TEXT PRIMARY KEY NOT NULL,
 company_name TEXT NOT NULL, normalized_name TEXT NOT NULL UNIQUE,
 country TEXT NOT NULL, ingredient_categories TEXT NOT NULL,
 contact_email TEXT NOT NULL UNIQUE,
 verified_user_id TEXT UNIQUE, email_verified_at TEXT,
 status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(status IN ('PENDING_REVIEW','APPROVED','REJECTED')),
 reviewed_by TEXT, review_note TEXT, reviewed_at TEXT,
 created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX supplier_applications_queue ON supplier_applications(status,created_at DESC,id DESC);
--> statement-breakpoint
CREATE INDEX supplier_applications_all_queue ON supplier_applications(created_at DESC,id DESC);
--> statement-breakpoint
CREATE TABLE onboarding_rate_limits (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, started_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX onboarding_rate_started ON onboarding_rate_limits(started_at);
