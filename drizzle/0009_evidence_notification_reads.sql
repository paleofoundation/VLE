CREATE TABLE evidence_notification_reads (
 notification_id TEXT NOT NULL,
 recipient_email TEXT NOT NULL,
 read_at TEXT NOT NULL,
 PRIMARY KEY (notification_id,recipient_email)
);
