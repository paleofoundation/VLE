import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["BUYER", "SUPPLIER", "OPS", "ADMIN"]);
export const organizationKindEnum = pgEnum("organization_kind", ["BUYER", "SUPPLIER", "PLATFORM"]);
export const lotStatusEnum = pgEnum("lot_status", [
  "NOMINATED", "SAMPLING", "EVIDENCE_RECEIVED", "QUALIFIED", "NOT_QUALIFIED",
  "INSUFFICIENT_EVIDENCE", "HELD", "REVOKED", "TRANSFORMED", "DEPLETED",
]);
export const samplingStatusEnum = pgEnum("sampling_status", [
  "REQUESTED", "SCHEDULED", "COLLECTED", "SHIPPED", "RECEIVED", "COMPLETED", "CANCELLED",
]);
export const evidenceStatusEnum = pgEnum("evidence_status", ["CURRENT", "REVOKED"]);
export const profileStatusEnum = pgEnum("profile_status", ["DRAFT", "FROZEN", "RETIRED"]);
export const qualificationOutcomeEnum = pgEnum("qualification_outcome", [
  "QUALIFIED", "NOT_QUALIFIED", "INSUFFICIENT_EVIDENCE",
]);
export const listingStatusEnum = pgEnum("listing_status", ["LISTED", "UNLISTED"]);
export const lotArtifactTypeEnum = pgEnum("lot_artifact_type", ["SUPPLIER_COA", "SUPPLIER_PDF"]);
export const contaminantDocumentationTypeEnum = pgEnum("contaminant_documentation_type", [
  "HEAVY_METALS",
  "PFAS",
  "MICROPLASTICS",
]);
export const requirementMatchStatusEnum = pgEnum("requirement_match_status", ["ACTIVE", "INVALIDATED"]);
export const supplierQuoteStatusEnum = pgEnum("supplier_quote_status", ["DRAFT", "SENT", "ACCEPTED", "EXPIRED", "WITHDRAWN"]);
export const reservationIntentStatusEnum = pgEnum("reservation_intent_status", ["ACTIVE", "CANCELLED", "EXPIRED", "INVALIDATED"]);

export const organizations = pgTable("organizations", {
  id: id(), name: text("name").notNull(), slug: text("slug").notNull().unique(),
  kind: organizationKindEnum("kind").notNull(), createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: id(), clerkUserId: text("clerk_user_id").notNull().unique(), email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(), createdAt: createdAt(),
});

export const memberships = pgTable("memberships", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  role: roleEnum("role").notNull(), companyRole: text("company_role"), createdAt: createdAt(),
}, (table) => [uniqueIndex("membership_user_org_role_uq").on(table.userId, table.organizationId, table.role)]);

export const productTypes = pgTable("product_types", {
  id: id(), code: text("code").notNull().unique(), name: text("name").notNull(), active: boolean("active").notNull().default(true),
});

export const physicalLots = pgTable("physical_lots", {
  id: id(), supplierOrganizationId: uuid("supplier_organization_id").notNull().references(() => organizations.id),
  productTypeId: uuid("product_type_id").notNull().references(() => productTypes.id),
  supplierLotCode: text("supplier_lot_code").notNull(), status: lotStatusEnum("status").notNull().default("NOMINATED"),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(), quantityUnit: text("quantity_unit").notNull(),
  locationName: text("location_name").notNull(), countryCode: text("country_code").notNull(),
  ownerName: text("owner_name").notNull(), identityConfirmedAt: timestamp("identity_confirmed_at", { withTimezone: true }),
  quantityVerifiedAt: timestamp("quantity_verified_at", { withTimezone: true }),
  locationVerifiedAt: timestamp("location_verified_at", { withTimezone: true }),
  authorityToSellVerifiedAt: timestamp("authority_to_sell_verified_at", { withTimezone: true }),
  heldAt: timestamp("held_at", { withTimezone: true }), holdReason: text("hold_reason"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }), transformedAt: timestamp("transformed_at", { withTimezone: true }),
  depletedAt: timestamp("depleted_at", { withTimezone: true }), createdAt: createdAt(),
}, (table) => [uniqueIndex("physical_lot_supplier_code_uq").on(table.supplierOrganizationId, table.supplierLotCode)]);

export const lotArtifacts = pgTable("lot_artifacts", {
  id: id(), physicalLotId: uuid("physical_lot_id").notNull().references(() => physicalLots.id),
  artifactType: lotArtifactTypeEnum("artifact_type").notNull(), fileName: text("file_name").notNull(),
  referenceUrl: text("reference_url").notNull(), documentDate: timestamp("document_date", { withTimezone: true }),
  notes: text("notes"), loggedByUserId: uuid("logged_by_user_id").references(() => users.id),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(), createdAt: createdAt(),
}, (table) => [index("lot_artifact_lot_received_idx").on(table.physicalLotId, table.receivedAt)]);

/**
 * Supplier file reference for one documentation type, attached to one physical lot
 * or one compliance profile. No measured result is stored. Attaching a row does not
 * change lot status, create a sample, or qualify a listing.
 */
export const contaminantDocuments = pgTable("contaminant_documents", {
  id: id(),
  documentationType: contaminantDocumentationTypeEnum("documentation_type").notNull(),
  supplierOrganizationId: uuid("supplier_organization_id").notNull().references(() => organizations.id),
  physicalLotId: uuid("physical_lot_id").references(() => physicalLots.id),
  complianceProfileId: uuid("compliance_profile_id").references(() => complianceProfiles.id),
  fileName: text("file_name").notNull(),
  referenceUrl: text("reference_url").notNull(),
  documentDate: timestamp("document_date", { withTimezone: true }),
  retestOn: timestamp("retest_on", { withTimezone: true }),
  notes: text("notes"),
  attachedByUserId: uuid("attached_by_user_id").references(() => users.id),
  attachedAt: timestamp("attached_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (table) => [
  index("contaminant_document_supplier_idx").on(table.supplierOrganizationId, table.attachedAt),
  index("contaminant_document_lot_idx").on(table.physicalLotId),
  index("contaminant_document_profile_idx").on(table.complianceProfileId),
  check(
    "contaminant_document_one_subject_chk",
    sql`(physical_lot_id IS NOT NULL AND compliance_profile_id IS NULL) OR (physical_lot_id IS NULL AND compliance_profile_id IS NOT NULL)`,
  ),
]);

export const complianceProfiles = pgTable("compliance_profiles", {
  id: id(), productTypeId: uuid("product_type_id").notNull().references(() => productTypes.id),
  name: text("name").notNull(), createdAt: createdAt(),
});

export const complianceProfileVersions = pgTable("compliance_profile_versions", {
  id: id(), profileId: uuid("profile_id").notNull().references(() => complianceProfiles.id),
  version: text("version").notNull(), status: profileStatusEnum("status").notNull().default("DRAFT"),
  rules: jsonb("rules").notNull(), notes: text("notes").notNull(), frozenAt: timestamp("frozen_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id), createdAt: createdAt(),
}, (table) => [uniqueIndex("profile_version_uq").on(table.profileId, table.version)]);

export const samplingOrders = pgTable("sampling_orders", {
  id: id(), physicalLotId: uuid("physical_lot_id").notNull().references(() => physicalLots.id),
  requestedByOrganizationId: uuid("requested_by_organization_id").notNull().references(() => organizations.id),
  status: samplingStatusEnum("status").notNull().default("REQUESTED"), assignedSampler: text("assigned_sampler"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }), createdAt: createdAt(),
});

export const samples = pgTable("samples", {
  id: id(), samplingOrderId: uuid("sampling_order_id").notNull().references(() => samplingOrders.id).unique(),
  physicalLotId: uuid("physical_lot_id").notNull().references(() => physicalLots.id),
  sampleCode: text("sample_code").notNull().unique(), sampledAt: timestamp("sampled_at", { withTimezone: true }).notNull(),
  samplerName: text("sampler_name").notNull(), method: text("method").notNull(),
  sealIdentifiers: jsonb("seal_identifiers").notNull(), chainOfCustody: jsonb("chain_of_custody").notNull(), createdAt: createdAt(),
});

export const tecridEvidence = pgTable("tecrid_evidence", {
  id: id(), sampleId: uuid("sample_id").notNull().references(() => samples.id),
  tecridId: text("tecrid_id").notNull().unique(), issuer: text("issuer").notNull(),
  status: evidenceStatusEnum("status").notNull().default("CURRENT"), issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), results: jsonb("results").notNull(),
  payloadHash: text("payload_hash").notNull(), verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }), revocationReason: text("revocation_reason"), createdAt: createdAt(),
});

export const qualificationDecisions = pgTable("qualification_decisions", {
  id: id(), physicalLotId: uuid("physical_lot_id").notNull().references(() => physicalLots.id),
  sampleId: uuid("sample_id").notNull().references(() => samples.id), evidenceId: uuid("evidence_id").notNull().references(() => tecridEvidence.id),
  profileVersionId: uuid("profile_version_id").notNull().references(() => complianceProfileVersions.id),
  outcome: qualificationOutcomeEnum("outcome").notNull(), rationale: jsonb("rationale").notNull(),
  engineVersion: text("engine_version").notNull(), inputHash: text("input_hash").notNull(), decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
}, (table) => [index("qualification_lot_decided_idx").on(table.physicalLotId, table.decidedAt)]);

export const marketplaceListings = pgTable("marketplace_listings", {
  id: id(), physicalLotId: uuid("physical_lot_id").notNull().references(() => physicalLots.id),
  qualificationDecisionId: uuid("qualification_decision_id").notNull().references(() => qualificationDecisions.id),
  status: listingStatusEnum("status").notNull(), publicSlug: text("public_slug").notNull().unique(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  unpublishedAt: timestamp("unpublished_at", { withTimezone: true }), unpublishReason: text("unpublish_reason"),
}, (table) => [index("listing_lot_status_idx").on(table.physicalLotId, table.status)]);

export const buyerRequirements = pgTable("buyer_requirements", {
  id: id(), buyerOrganizationId: uuid("buyer_organization_id").notNull().references(() => organizations.id),
  productTypeId: uuid("product_type_id").notNull().references(() => productTypes.id),
  profileVersionId: uuid("profile_version_id").notNull().references(() => complianceProfileVersions.id),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(), quantityUnit: text("quantity_unit").notNull(),
  destination: text("destination").notNull(), notes: text("notes"), createdAt: createdAt(),
});

export const requirementMatches = pgTable("requirement_matches", {
  id: id(), buyerRequirementId: uuid("buyer_requirement_id").notNull().references(() => buyerRequirements.id),
  marketplaceListingId: uuid("marketplace_listing_id").notNull().references(() => marketplaceListings.id),
  profileVersionId: uuid("profile_version_id").notNull().references(() => complianceProfileVersions.id),
  status: requirementMatchStatusEnum("status").notNull().default("ACTIVE"),
  matchedByUserId: uuid("matched_by_user_id").references(() => users.id), matchedAt: timestamp("matched_at", { withTimezone: true }).notNull(),
  invalidatedAt: timestamp("invalidated_at", { withTimezone: true }), invalidationReason: text("invalidation_reason"),
}, (table) => [
  uniqueIndex("requirement_listing_match_uq").on(table.buyerRequirementId, table.marketplaceListingId),
  index("requirement_match_status_idx").on(table.buyerRequirementId, table.status),
]);

export const supplierQuotes = pgTable("supplier_quotes", {
  id: id(), requirementMatchId: uuid("requirement_match_id").notNull().references(() => requirementMatches.id),
  buyerOrganizationId: uuid("buyer_organization_id").notNull().references(() => organizations.id),
  supplierOrganizationId: uuid("supplier_organization_id").notNull().references(() => organizations.id),
  status: supplierQuoteStatusEnum("status").notNull().default("DRAFT"),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(), quantityUnit: text("quantity_unit").notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 4 }).notNull(), currency: text("currency").notNull(),
  terms: text("terms"), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id), createdAt: createdAt(),
  sentAt: timestamp("sent_at", { withTimezone: true }), acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  expiredAt: timestamp("expired_at", { withTimezone: true }), withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
}, (table) => [index("supplier_quote_tenant_status_idx").on(table.supplierOrganizationId, table.buyerOrganizationId, table.status)]);

export const reservationIntents = pgTable("reservation_intents", {
  id: id(), supplierQuoteId: uuid("supplier_quote_id").notNull().references(() => supplierQuotes.id).unique(),
  requirementMatchId: uuid("requirement_match_id").notNull().references(() => requirementMatches.id),
  marketplaceListingId: uuid("marketplace_listing_id").notNull().references(() => marketplaceListings.id),
  buyerOrganizationId: uuid("buyer_organization_id").notNull().references(() => organizations.id),
  supplierOrganizationId: uuid("supplier_organization_id").notNull().references(() => organizations.id),
  status: reservationIntentStatusEnum("status").notNull().default("ACTIVE"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdByUserId: uuid("created_by_user_id").references(() => users.id),
  createdAt: createdAt(), cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  expiredAt: timestamp("expired_at", { withTimezone: true }), invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
  statusReason: text("status_reason"),
}, (table) => [index("reservation_listing_status_idx").on(table.marketplaceListingId, table.status)]);

export const auditEvents = pgTable("audit_events", {
  id: id(), actorUserId: uuid("actor_user_id").references(() => users.id),
  actorOrganizationId: uuid("actor_organization_id").references(() => organizations.id),
  eventType: text("event_type").notNull(), entityType: text("entity_type").notNull(), entityId: uuid("entity_id").notNull(),
  data: jsonb("data").notNull(), previousHash: text("previous_hash"), eventHash: text("event_hash").notNull().unique(), createdAt: createdAt(),
}, (table) => [index("audit_entity_idx").on(table.entityType, table.entityId, table.createdAt)]);


export const listingSourceEnum = pgEnum("listing_source", ["PUBLIC_DOCUMENTS", "MEMBER"]);
export const claimStatusEnum = pgEnum("claim_status", ["UNCLAIMED", "CLAIM_PENDING", "CLAIMED"]);
export const publicDocumentTypeEnum = pgEnum("public_document_type", ["Heavy metals report", "Pesticide residue report", "Phthalates report", "Glyphosate report", "Arsenic report", "COA", "Certificate", "Other"]);
export const publicLinkStateEnum = pgEnum("public_link_state", ["LIVE", "NO_LONGER_PUBLISHED"]);

// An unclaimed public listing has no account organization. Claim approval supplies that link.
export const supplierProfiles = pgTable("supplier_profiles", {
  id: id(), organizationId: uuid("organization_id").unique().references(() => organizations.id),
  slug: text("slug").notNull().unique(), displayName: text("display_name").notNull(),
  country: text("country"), website: text("website"), categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
  certificationsShown: text("certifications_shown"),
  listingSource: listingSourceEnum("listing_source").notNull().default("PUBLIC_DOCUMENTS"),
  claimStatus: claimStatusEnum("claim_status").notNull().default("UNCLAIMED"),
  hidden: boolean("hidden").notNull().default(false), createdAt: createdAt(),
});

export const publicDocuments = pgTable("public_documents", {
  id: id(), supplierProfileId: uuid("supplier_profile_id").notNull().references(() => supplierProfiles.id),
  productName: text("product_name"), lotOrBatch: text("lot_or_batch"),
  docType: publicDocumentTypeEnum("doc_type").notNull(), testsText: text("tests_text"),
  analytes: text("analytes").array().notNull().default(sql`'{}'::text[]`), labName: text("lab_name"),
  labAccreditationAsStated: text("lab_accreditation_as_stated"), reportDate: date("report_date"),
  reportDateText: text("report_date_text"), sourceUrl: text("source_url").notNull(), sourceDomain: text("source_domain").notNull(),
  sourcePageUrl: text("source_page_url"), foundAt: date("found_at").notNull(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }), httpStatus: numeric("http_status", { precision: 3, scale: 0 }),
  sha256: text("sha256"), linkState: publicLinkStateEnum("link_state").notNull().default("LIVE"),
  verificationNote: text("verification_note"), createdAt: createdAt(),
}, (t) => [uniqueIndex("public_document_supplier_source_uq").on(t.supplierProfileId, t.sourceUrl), index("public_document_supplier_idx").on(t.supplierProfileId)]);


export const supplierCertifications = pgTable("supplier_certifications", {
  id: id(), supplierProfileId: uuid("supplier_profile_id").notNull().references(() => supplierProfiles.id),
  certificationKey: text("certification_key").notNull(), otherName: text("other_name"), certifyingBody: text("certifying_body"),
  certificateNumber: text("certificate_number"), expiresOn: date("expires_on"), sourceUrl: text("source_url"),
  confirmedAt: date("confirmed_at"), confirmedIssuer: text("confirmed_issuer"), confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id),
  flaggedAt: timestamp("flagged_at", { withTimezone: true }), flagNote: text("flag_note"), createdAt: createdAt(),
}, (t) => [uniqueIndex("supplier_certification_key_uq").on(t.supplierProfileId, t.certificationKey)]);
export const certificationSuggestions = pgTable("certification_suggestions", {
  id: id(), supplierProfileId: uuid("supplier_profile_id").notNull().references(() => supplierProfiles.id),
  certificationKey: text("certification_key").notNull(), note: text("note").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id), createdAt: createdAt(),
});
