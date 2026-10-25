import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
export const reviewSessions = sqliteTable("review_sessions", {userId:text("user_id").primaryKey(), state:text("state").notNull(), version:integer("version").notNull().default(0)});
export const evidenceViews = sqliteTable("evidence_views", {id:text("id").primaryKey(), userId:text("user_id").notNull(), email:text("email").notNull(), name:text("name").notNull(), company:text("company").notNull(), lot:text("lot").notNull(), supplier:text("supplier").notNull(), viewedAt:text("viewed_at").notNull()});

// Better Auth tables are separate from EXAMPLE marketplace workspaces.
export const user=sqliteTable('auth_user',{
 id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull().unique(),
 emailVerified:integer('email_verified',{mode:'boolean'}).notNull().default(false),image:text('image'),
 createdAt:integer('created_at',{mode:'timestamp_ms'}).notNull(),updatedAt:integer('updated_at',{mode:'timestamp_ms'}).notNull(),
});
export const session=sqliteTable('auth_session',{
 id:text('id').primaryKey(),expiresAt:integer('expires_at',{mode:'timestamp_ms'}).notNull(),token:text('token').notNull().unique(),
 createdAt:integer('created_at',{mode:'timestamp_ms'}).notNull(),updatedAt:integer('updated_at',{mode:'timestamp_ms'}).notNull(),
 ipAddress:text('ip_address'),userAgent:text('user_agent'),userId:text('user_id').notNull().references(()=>user.id,{onDelete:'cascade'}),
});
export const account=sqliteTable('auth_account',{
 id:text('id').primaryKey(),accountId:text('account_id').notNull(),providerId:text('provider_id').notNull(),userId:text('user_id').notNull().references(()=>user.id,{onDelete:'cascade'}),
 accessToken:text('access_token'),refreshToken:text('refresh_token'),idToken:text('id_token'),
 accessTokenExpiresAt:integer('access_token_expires_at',{mode:'timestamp_ms'}),refreshTokenExpiresAt:integer('refresh_token_expires_at',{mode:'timestamp_ms'}),scope:text('scope'),password:text('password'),
 createdAt:integer('created_at',{mode:'timestamp_ms'}).notNull(),updatedAt:integer('updated_at',{mode:'timestamp_ms'}).notNull(),
});
export const verification=sqliteTable('auth_verification',{
 id:text('id').primaryKey(),identifier:text('identifier').notNull(),value:text('value').notNull(),expiresAt:integer('expires_at',{mode:'timestamp_ms'}).notNull(),
 createdAt:integer('created_at',{mode:'timestamp_ms'}).notNull(),updatedAt:integer('updated_at',{mode:'timestamp_ms'}).notNull(),
});
export const rateLimit=sqliteTable('auth_rate_limit',{
 id:text('id').primaryKey(),key:text('key').notNull().unique(),count:integer('count').notNull(),lastRequest:integer('last_request',{mode:'number'}).notNull(),
});

// Presentation drafts can change without changing lot reports or numerical results.
export const supplierStorefronts=sqliteTable('supplier_storefronts',{
 supplier:text('supplier').primaryKey(),draft:text('draft').notNull(),published:text('published'),
 revision:integer('revision').notNull().default(0),managerEmail:text('manager_email'),updatedAt:text('updated_at').notNull(),
});

export const sourcingBriefs=sqliteTable('sourcing_briefs',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),category:text('category').notNull(),body:text('body').notNull(),shared:integer('shared').notNull().default(0),status:text('status').notNull().default('Open'),version:integer('version').notNull().default(0),createdAt:text('created_at').notNull()});
export const sourcingRooms=sqliteTable('sourcing_rooms',{id:text('id').primaryKey(),buyerId:text('buyer_id').notNull(),supplierEmail:text('supplier_email').notNull(),supplierAccountId:text('supplier_account_id'),supplierName:text('supplier_name').notNull(),lot:text('lot').notNull(),brief:text('brief').notNull(),stage:text('stage').notNull().default('Inquiry'),record:text('record').notNull().default('{}'),version:integer('version').notNull().default(0),createdAt:text('created_at').notNull()});
export const sourcingEvents=sqliteTable('sourcing_events',{id:text('id').primaryKey(),roomId:text('room_id').notNull(),actorId:text('actor_id').notNull(),actor:text('actor').notNull(),body:text('body').notNull(),createdAt:text('created_at').notNull()});
export const sourcingNotifications=sqliteTable('sourcing_notifications',{id:text('id').primaryKey(),email:text('email').notNull(),accountId:text('account_id'),message:text('message').notNull(),href:text('href').notNull(),read:integer('read').notNull().default(0),delivery:text('delivery').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),nextAttempt:integer('next_attempt').notNull().default(0),createdAt:text('created_at').notNull()});
export const sourcingPreferences=sqliteTable('sourcing_preferences',{email:text('email').primaryKey(),emailEnabled:integer('email_enabled').notNull().default(1)});
export const supplierSubmissions=sqliteTable('supplier_submissions',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),body:text('body').notNull(),fileKey:text('file_key').notNull(),status:text('status').notNull().default('Submitted'),review:text('review').notNull().default(''),createdAt:text('created_at').notNull()});

export const teamAccounts=sqliteTable('team_accounts',{id:text('id').primaryKey(),name:text('name').notNull(),kind:text('kind').notNull(),ownerEmail:text('owner_email').notNull(),contactEmail:text('contact_email').notNull(),supplierKey:text('supplier_key'),createdAt:text('created_at').notNull()});
export const teamMembers=sqliteTable('team_members',{id:text('id').primaryKey(),teamId:text('team_id').notNull(),email:text('email').notNull(),role:text('role').notNull(),source:text('source').notNull().default('invited')});
export const teamDomains=sqliteTable('team_domains',{id:text('id').primaryKey(),teamId:text('team_id').notNull(),domain:text('domain').notNull(),role:text('role').notNull()});
export const teamSelections=sqliteTable('team_selections',{userId:text('user_id').primaryKey(),teamId:text('team_id')});

// TEST report grants are exact-email and source-report scoped; no domain default.
export const kasReportPermissions=sqliteTable('kas_report_permissions',{
 reportNumber:text('report_number').notNull(),recipientEmail:text('recipient_email').notNull(),status:text('status').notNull(),
 resultsAccess:integer('results_access').notNull().default(0),pdfAccess:integer('pdf_access').notNull().default(0),
 requestedResults:integer('requested_results').notNull().default(0),requestedPdf:integer('requested_pdf').notNull().default(0),
 expiresAt:text('expires_at'),revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull(),updatedBy:text('updated_by').notNull(),
},t=>[primaryKey({columns:[t.reportNumber,t.recipientEmail]})]);
export const kasReportPermissionEvents=sqliteTable('kas_report_permission_events',{
 reportNumber:text('report_number').notNull(),recipientEmail:text('recipient_email').notNull(),revision:integer('revision').notNull(),
 action:text('action').notNull(),resultsAccess:integer('results_access').notNull(),pdfAccess:integer('pdf_access').notNull(),
 expiresAt:text('expires_at'),actorEmail:text('actor_email').notNull(),createdAt:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.reportNumber,t.recipientEmail,t.revision]})]);

// Durable notifications contain request metadata only; recipient is fixed by the service.
export const kasAccessNotifications=sqliteTable('kas_access_notifications',{
 id:text('id').primaryKey(),dedupeKey:text('dedupe_key').notNull().unique(),kind:text('kind').notNull(),
 reportNumber:text('report_number'),requesterEmail:text('requester_email'),requestRevision:integer('request_revision'),
 requestedResults:integer('requested_results').notNull(),requestedPdf:integer('requested_pdf').notNull(),
 status:text('status').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),
 nextAttempt:integer('next_attempt').notNull().default(0),leaseId:text('lease_id'),lastError:text('last_error'),
 createdAt:text('created_at').notNull(),sentAt:text('sent_at'),
});

export const evidenceNotificationReads=sqliteTable("evidence_notification_reads",{
 notificationId:text("notification_id").notNull(),recipientEmail:text("recipient_email").notNull(),readAt:text("read_at").notNull(),
},table=>[primaryKey({columns:[table.notificationId,table.recipientEmail]})]);
