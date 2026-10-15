import rawPacket from "../../fixtures/kasandrinos/light-labs-certificates.json";
import { addCompliancePackChecksum, COMPLIANCE_PACK_FORMAT, COMPLIANCE_PACK_VERSION } from "./compliance-pack";
import {
  assessKasandrinosIntake,
  formatKasandrinosAnalyteResult,
  parseKasandrinosPacket,
  type KasandrinosAnalyte,
  type KasandrinosPacket,
} from "./kasandrinos-intake";
import { isKasandrinosPreviewPath, kasandrinosPreviewEnabled } from "./kasandrinos-preview-path";
import { evaluatePublicationGate } from "./publication";

export { isKasandrinosPreviewPath, kasandrinosPreviewEnabled };

export const kasandrinosPacket = parseKasandrinosPacket(rawPacket);

const pdfSlugByFileName = {
  "Heavy_Metal_Testing_EVOO.pdf": "heavy-metal-testing-evoo.pdf",
  "Aluminum_-_3L_Can.pdf": "aluminum-3l-can.pdf",
  "Olive Oil Heavy Metals.pdf": "olive-oil-heavy-metals.pdf",
  "3 Liter Can Heavy Metals.pdf": "3-liter-can-heavy-metals.pdf",
  "3 liter BIB Heavy Metals.pdf": "3-liter-bib-heavy-metals.pdf",
  "3 liter can aluminum.pdf": "3-liter-can-aluminum.pdf",
  "Olive Oil GlyphosateAMPA.pdf": "olive-oil-glyphosate-ampa.pdf",
  "Olive Oil Phthalates.pdf": "olive-oil-phthalates.pdf",
} as const;

export type KasandrinosPdfSlug = (typeof pdfSlugByFileName)[keyof typeof pdfSlugByFileName];

export const kasandrinosPreviewTour = [
  { path: "/preview/kasandrinos", title: "Brand profile" },
  { path: "/preview/kasandrinos/lots/227-k-b", title: "Lot 227 K/B" },
  { path: "/preview/kasandrinos/ops", title: "Operations board" },
  { path: "/preview/kasandrinos/ops/lots/227-k-b", title: "Operations workflow" },
  { path: "/preview/kasandrinos/ops/lots/227-k-b/compliance-pack", title: "Compliance pack" },
  { path: "/preview/kasandrinos/lots/228-k-b", title: "Lot 228 K/B" },
] as const;

export const PREVIEW_NOTICE = "Preview, not a live listing.";

export function kasandrinosPdfHref(fileName: string) {
  const slug = pdfSlugByFileName[fileName as keyof typeof pdfSlugByFileName];
  return slug ? `/preview/kasandrinos/certificates/${slug}` : null;
}

export function kasandrinosPdfFileName(slug: string) {
  const entry = Object.entries(pdfSlugByFileName).find(([, value]) => value === slug);
  return entry?.[0] ?? null;
}

export type PreviewRailStep = {
  label: string;
  state: "now" | "locked";
  detail: string;
};

export const nominationNextStep = "Nomination is the next step, and it is blocked. Olive oil is not a pilot lane, and the certificate does not give quantity, stocked location, country, or the owner of record.";

export function lotStateRail(heavyMetalPanel: boolean): PreviewRailStep[] {
  return [
    { label: "Nomination", state: "now", detail: nominationNextStep },
    { label: "Inventory", state: "locked", detail: "Identity, quantity, location, and authority to sell are not verified." },
    { label: "Sampling", state: "locked", detail: "No sampling order. A supplier certificate does not start sampling." },
    { label: "Sample", state: "locked", detail: "No sample, seal, or custody record is bound to this lot." },
    { label: "TECRID evidence", state: "locked", detail: "No TECRID record. The Light Labs certificate is not authenticated evidence." },
    {
      label: "Decision",
      state: "locked",
      detail: heavyMetalPanel
        ? "No frozen olive oil profile and no qualification decision. The heavy-metals panel on the certificate is not a VLE claim."
        : "No heavy-metals panel is on this certificate, so it cannot support a heavy-metal claim. No qualification decision exists.",
    },
    { label: "Listing", state: "locked", detail: "Not listed. This preview is not a public listing and cannot be reserved." },
  ];
}

export type PreviewAnalyteRow = {
  analyte: string;
  loq: string;
  lightLabsSpec: string;
  result: string;
  status: string;
};

function analyteRow(row: KasandrinosAnalyte): PreviewAnalyteRow {
  return {
    analyte: row.analyte,
    loq: row.loqColumn ? `${row.loqColumn} ${row.loq}` : row.loq,
    lightLabsSpec: row.lightLabsSpecLimit ?? (row.limitColumn ? `${row.limitColumn} blank` : "Blank"),
    result: formatKasandrinosAnalyteResult(row),
    status: row.status ?? "Blank",
  };
}

export type PreviewLot = {
  slug: "227-k-b" | "228-k-b";
  supplierLotCode: string;
  productName: string;
  test: string;
  order: string;
  assay: string;
  method: string;
  methodStatement: string | null;
  fileName: string;
  sha256: string;
  pdfHref: string;
  dateReceived: string;
  dateTested: string;
  dateReleasedAsPrinted: string;
  approvedByLine: string;
  servingSize: string;
  resultColumnNote: string | null;
  heavyMetalPanelOnCertificate: boolean;
  heavyMetalStatusClaim: "not_claimable";
  lotState: "not created, stopped before nomination";
  nextStep: string;
  rail: PreviewRailStep[];
  analytes: PreviewAnalyteRow[];
  path: string;
  opsPath: string;
};

function previewLot(packet: KasandrinosPacket, supplierLotCode: "227 K/B" | "228 K/B"): PreviewLot {
  const source = packet.namedLots.find((lot) => lot.supplierLotCode === supplierLotCode);
  if (!source) throw new Error(`Missing named lot ${supplierLotCode}`);
  const assessment = assessKasandrinosIntake(packet).records.find((record) => record.test === source.test);
  if (!assessment) throw new Error(`Missing assessment for ${source.test}`);
  const slug = supplierLotCode === "227 K/B" ? "227-k-b" : "228-k-b";
  const pdfHref = kasandrinosPdfHref(source.fileName);
  if (!pdfHref) throw new Error(`Missing preview PDF for ${source.fileName}`);
  return {
    slug,
    supplierLotCode,
    productName: source.productName,
    test: source.test,
    order: source.order,
    assay: source.assay,
    method: source.method,
    methodStatement: source.methodStatement,
    fileName: source.fileName,
    sha256: source.sha256,
    pdfHref,
    dateReceived: source.dateReceived,
    dateTested: source.dateTested,
    dateReleasedAsPrinted: source.dateReleasedAsPrinted,
    approvedByLine: source.approvedByLine,
    servingSize: source.servingSize,
    resultColumnNote: source.resultColumnNote ?? null,
    heavyMetalPanelOnCertificate: assessment.heavyMetalPanelOnCertificate,
    heavyMetalStatusClaim: "not_claimable",
    lotState: "not created, stopped before nomination",
    nextStep: nominationNextStep,
    rail: lotStateRail(assessment.heavyMetalPanelOnCertificate),
    analytes: source.analytes.map(analyteRow),
    path: `/preview/kasandrinos/lots/${slug}`,
    opsPath: `/preview/kasandrinos/ops/lots/${slug}`,
  };
}

export function getPreviewLot(slug: string, packet = kasandrinosPacket) {
  if (slug === "227-k-b") return previewLot(packet, "227 K/B");
  if (slug === "228-k-b") return previewLot(packet, "228 K/B");
  return null;
}

export function getPreviewBrand(packet = kasandrinosPacket) {
  return {
    customer: packet.customer,
    customerEmail: packet.customerEmail,
    supplierOrganization: null as null,
    ownerOfRecord: null as null,
    confirmation: packet.resultConfirmation,
    issuer: packet.issuer,
    labContact: packet.labContact,
    labAddress: packet.labAddress,
    lots: [previewLot(packet, "227 K/B"), previewLot(packet, "228 K/B")],
    pending: packet.pendingLotIdCertificates.map((certificate) => ({
      test: certificate.test,
      order: certificate.order,
      productName: certificate.productName,
      assay: certificate.assay,
      fileName: certificate.fileName,
      pdfHref: kasandrinosPdfHref(certificate.fileName),
      dateReceived: certificate.dateReceived,
      dateTested: certificate.dateTested,
      dateReleasedAsPrinted: certificate.dateReleasedAsPrinted,
    })),
  };
}

export function buildKasandrinosCompliancePack(packet = kasandrinosPacket, generatedAt = new Date()) {
  const lot = previewLot(packet, "227 K/B");
  const gate = evaluatePublicationGate({
    identityConfirmedAt: null,
    quantityVerifiedAt: null,
    locationVerifiedAt: null,
    authorityToSellVerifiedAt: null,
    samplingRecorded: false,
    evidenceStatus: null,
    evidenceExpiresAt: null,
    decisionOutcome: null,
    profileFrozen: false,
    heldAt: null,
    revokedAt: null,
    transformedAt: null,
    depletedAt: null,
  }, generatedAt);
  const payload = {
    format: COMPLIANCE_PACK_FORMAT,
    formatVersion: COMPLIANCE_PACK_VERSION,
    preview: {
      notice: PREVIEW_NOTICE,
      indexed: false,
      databaseWrite: false,
      physicalLotCreated: false,
      productionBehaviorUnchanged: true,
    },
    generatedAt: generatedAt.toISOString(),
    snapshotBoundary: {
      statement: "Preview snapshot only. No physical lot was inserted, so this is not an export from the live compliance-pack route.",
      currency: "Re-check listing eligibility only after a real lot, sample, and TECRID record exist.",
      allowedClaim: null,
      forbiddenInference: "No passed-profile, heavy-metal, safety, or reservation claim is made.",
    },
    statusAtExport: {
      lotState: lot.lotState,
      nextStep: lot.nextStep,
      publicationGateEligible: gate.allowed,
      publicationGateReasons: gate.allowed ? [] : gate.reasons,
      marketplaceListed: false,
      permittedClaim: null,
      qualified: false,
      reserved: false,
    },
    product: { id: null, code: null, name: lot.productName },
    supplierOrganization: null,
    physicalLot: null,
    supplierLotCodeOnCertificate: lot.supplierLotCode,
    inventoryVerification: {
      identityConfirmedAt: null,
      quantityVerifiedAt: null,
      locationVerifiedAt: null,
      authorityToSellVerifiedAt: null,
    },
    samplingOrders: [],
    samples: [],
    tecridEvidence: [],
    qualificationDecisions: [],
    marketplaceListingHistory: [],
    lightLabsCertificate: {
      test: lot.test,
      order: lot.order,
      assay: lot.assay,
      method: lot.method,
      methodStatement: lot.methodStatement,
      fileName: lot.fileName,
      sha256: lot.sha256,
      previewPdfPath: lot.pdfHref,
      dateReceived: lot.dateReceived,
      dateTested: lot.dateTested,
      dateReleasedAsPrinted: lot.dateReleasedAsPrinted,
      approvedByLine: lot.approvedByLine,
      servingSize: lot.servingSize,
      limitColumnMeaning: packet.limitColumnMeaning,
      heavyMetalPanelOnCertificate: lot.heavyMetalPanelOnCertificate,
      heavyMetalStatusClaim: lot.heavyMetalStatusClaim,
      analytes: lot.analytes,
    },
    backgroundArtifacts: {
      classification: "SUPPLIER_CONTEXT_ONLY_NOT_TECRID_EVIDENCE",
      records: [{
        artifactType: "SUPPLIER_COA",
        fileName: lot.fileName,
        referenceUrl: lot.pdfHref,
        storedInDatabase: false,
        note: "Preview file reference only. Logging a certificate does not change lot state, and this preview did not write a lot artifact row.",
      }],
    },
    notAttached: packet.pendingLotIdCertificates.map((certificate) => ({
      test: certificate.test,
      order: certificate.order,
      productName: certificate.productName,
      reason: "The lot field is blank, so this certificate is not part of lot 227 K/B.",
    })),
    auditTrail: {
      events: [],
      latestIncludedEventHash: null,
      note: "No audit event was written because no lot was inserted.",
    },
  };
  return addCompliancePackChecksum(payload);
}
