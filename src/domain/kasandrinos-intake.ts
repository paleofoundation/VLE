import { z } from "zod";

const pilotProductCodes = ["COCOA_POWDER", "AVOCADO_FRUIT"] as const;
const heavyMetalAnalytes = ["Arsenic", "Cadmium", "Lead", "Mercury"] as const;

const analyteSchema = z.object({
  analyte: z.string().trim().min(1),
  loq: z.string().trim().min(1),
  lightLabsSpecLimit: z.string().trim().min(1).nullable(),
  status: z.string().trim().min(1).nullable(),
  result: z.string().trim().min(1).optional(),
  resultExpressions: z.array(z.string().trim().min(1)).min(1).optional(),
  loqColumn: z.string().trim().min(1).optional(),
  limitColumn: z.string().trim().min(1).optional(),
  concentration: z.string().trim().min(1).optional(),
  concentrationColumn: z.string().trim().min(1).optional(),
  perServing: z.string().trim().min(1).optional(),
  perServingColumn: z.string().trim().min(1).optional(),
}).refine((row) => Boolean(row.result || row.resultExpressions || row.concentration), {
  message: "Each analyte needs a reported result",
});

const namedLotSchema = z.object({
  fileName: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  productName: z.string().trim().min(1),
  productCode: z.null(),
  supplierLotCode: z.string().trim().min(2),
  supplierOrganizationId: z.null(),
  quantity: z.null(),
  quantityUnit: z.null(),
  locationName: z.null(),
  countryCode: z.null(),
  ownerOfRecord: z.null(),
  order: z.string().trim().min(1),
  test: z.string().trim().min(1),
  assay: z.string().trim().min(1),
  method: z.string().trim().min(1),
  methodStatement: z.string().trim().min(1).nullable(),
  testingLocation: z.string().trim().min(1),
  servingSize: z.string().trim().min(1),
  dateReceived: z.iso.date(),
  dateTested: z.iso.date(),
  dateReleasedAsPrinted: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  approvedByLine: z.string().trim().min(1),
  referenceUrl: z.null(),
  sampleCode: z.null(),
  tecridId: z.null(),
  resultColumnNote: z.string().trim().min(1).optional(),
  analytes: z.array(analyteSchema).min(1),
});

const pendingCertificateSchema = z.object({
  fileName: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  productName: z.string().trim().min(1),
  supplierLotCode: z.null(),
  order: z.string().trim().min(1),
  test: z.string().trim().min(1),
  assay: z.string().trim().min(1),
  method: z.string().trim().min(1),
  methodStatement: z.string().trim().min(1).nullable(),
  testingLocation: z.string().trim().min(1),
  servingSize: z.string().trim().min(1),
  dateReceived: z.iso.date(),
  dateTested: z.iso.date(),
  dateReleasedAsPrinted: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  approvedByLine: z.string().trim().min(1),
  resultColumnNote: z.string().trim().min(1).optional(),
  analytes: z.array(analyteSchema).min(1),
});

const packetSchema = z.object({
  packet: z.string().trim().min(1),
  customer: z.string().trim().min(1),
  customerEmail: z.string().trim().min(1),
  issuer: z.string().trim().min(1),
  labContact: z.string().trim().min(1),
  labEmail: z.string().trim().min(1),
  labPhone: z.string().trim().min(1),
  labAddress: z.string().trim().min(1),
  resultConfirmation: z.object({
    by: z.string().trim().min(1),
    statement: z.string().trim().min(1),
    fillsOwnerOfRecord: z.literal(false),
  }),
  evidenceBytes: z.object({
    storedInRepository: z.literal(false),
    whereTheyBelong: z.string().trim().min(1),
  }),
  limitColumnMeaning: z.string().trim().min(1),
  namedLots: z.array(namedLotSchema).min(1),
  pendingLotIdCertificates: z.array(pendingCertificateSchema).min(1),
});

export type KasandrinosPacket = z.infer<typeof packetSchema>;
export type KasandrinosAnalyte = z.infer<typeof analyteSchema>;
type NamedLot = z.infer<typeof namedLotSchema>;
type PendingCertificate = z.infer<typeof pendingCertificateSchema>;

export type IntakeRecordAssessment = {
  test: string;
  fileName: string;
  order: string;
  productName: string;
  supplierLotCode: string | null;
  disposition: "withheld_before_nomination" | "withheld_pending_supplier_lot_id";
  lotStatus: null;
  qualified: false;
  reserved: false;
  listed: false;
  attachedToPhysicalLot: false;
  heavyMetalPanelOnCertificate: boolean;
  heavyMetalStatusClaim: "not_claimable";
  blockersBeforeNomination: readonly string[];
  blockersAfterAnyFutureNomination: readonly string[];
};

export type KasandrinosIntakeAssessment = {
  databaseWrite: false;
  persistedRecords: 0;
  limitColumnMeaning: string;
  evidenceStorage: string;
  records: readonly IntakeRecordAssessment[];
  humanSteps: readonly string[];
};

export function parseKasandrinosPacket(value: unknown): KasandrinosPacket {
  return packetSchema.parse(value);
}

export function formatKasandrinosAnalyteResult(analyte: KasandrinosAnalyte): string {
  if (analyte.resultExpressions) return analyte.resultExpressions.join(" | ");
  if (analyte.result) return analyte.result;
  const serving = analyte.perServing ? `; ${analyte.perServingColumn}: ${analyte.perServing}` : "";
  return `${analyte.concentrationColumn}: ${analyte.concentration}${serving}`;
}

function hasHeavyMetalPanel(analytes: readonly KasandrinosAnalyte[]) {
  const names = new Set(analytes.map((row) => row.analyte));
  return heavyMetalAnalytes.every((name) => names.has(name));
}

function nominationBlockers(lot: NamedLot): string[] {
  const pilotLane = (pilotProductCodes as readonly string[]).includes(lot.productCode ?? "");
  const reasons = [
    pilotLane
      ? `${lot.productName} is on an active pilot lane.`
      : `${lot.productName} has no VLE product code. Nomination accepts only cocoa powder and avocado fruit. Olive oil is outside those lanes, so this certificate cannot become a physical lot.`,
  ];
  if (!lot.supplierOrganizationId) reasons.push("No supplier organization is recorded.");
  if (lot.quantity == null || lot.quantityUnit == null) reasons.push("Quantity and quantity unit are not on the certificate. The nomination form requires a positive quantity and records the unit as kilograms.");
  if (!lot.locationName) reasons.push("Stocked location is not on the certificate.");
  if (!lot.countryCode) reasons.push("Country code is not on the certificate.");
  if (!lot.ownerOfRecord) reasons.push("Authorizer or owner of record is not on the certificate. Confirmation that the file is a Light Labs result does not fill that field.");
  return reasons;
}

function postNominationBlockers(input: { assay: string; heavyMetalPanel: boolean; referenceUrl: string | null; sampleCode: string | null; tecridId: string | null }): string[] {
  const reasons = [
    "No sampling order, sample, seal, or chain of custody exists. A supplier certificate does not create a sample.",
    "No TECRID identifier exists. A Light Labs certificate is not TECRID evidence, so the lot cannot enter evidence received.",
    "No frozen olive oil compliance profile exists. Cocoa and avocado example limits do not apply, and the Light Labs Limit column cannot be reused as one.",
    "Qualification, publication, and reservation stay closed. Nothing in this packet is qualified or reserved.",
  ];
  if (!input.referenceUrl) reasons.unshift("No secure http(s) reference is recorded, so a background certificate artifact cannot be logged yet. Logging one would not change lot state anyway.");
  if (!input.heavyMetalPanel) reasons.push(`${input.assay} does not include arsenic, cadmium, lead, and mercury. This record cannot claim heavy-metal status.`);
  if (input.sampleCode || input.tecridId) reasons.push("Sample and TECRID fields must stay empty until those records exist.");
  return reasons;
}

function assessNamedLot(lot: NamedLot): IntakeRecordAssessment {
  const heavyMetalPanelOnCertificate = hasHeavyMetalPanel(lot.analytes);
  return {
    test: lot.test,
    fileName: lot.fileName,
    order: lot.order,
    productName: lot.productName,
    supplierLotCode: lot.supplierLotCode,
    disposition: "withheld_before_nomination",
    lotStatus: null,
    qualified: false,
    reserved: false,
    listed: false,
    attachedToPhysicalLot: false,
    heavyMetalPanelOnCertificate,
    heavyMetalStatusClaim: "not_claimable",
    blockersBeforeNomination: nominationBlockers(lot),
    blockersAfterAnyFutureNomination: postNominationBlockers({
      assay: lot.assay,
      heavyMetalPanel: heavyMetalPanelOnCertificate,
      referenceUrl: lot.referenceUrl,
      sampleCode: lot.sampleCode,
      tecridId: lot.tecridId,
    }),
  };
}

function assessPending(certificate: PendingCertificate, namedLotCodes: readonly string[]): IntakeRecordAssessment {
  const heavyMetalPanelOnCertificate = hasHeavyMetalPanel(certificate.analytes);
  return {
    test: certificate.test,
    fileName: certificate.fileName,
    order: certificate.order,
    productName: certificate.productName,
    supplierLotCode: null,
    disposition: "withheld_pending_supplier_lot_id",
    lotStatus: null,
    qualified: false,
    reserved: false,
    listed: false,
    attachedToPhysicalLot: false,
    heavyMetalPanelOnCertificate,
    heavyMetalStatusClaim: "not_claimable",
    blockersBeforeNomination: [
      "The lot field on this certificate is blank.",
      `It is not attached to ${namedLotCodes.join(" or ")}.`,
      "VLE has no product-testing-history record apart from a physical lot. This certificate is not stored as a lot, a sample, or a background artifact.",
    ],
    blockersAfterAnyFutureNomination: postNominationBlockers({
      assay: certificate.assay,
      heavyMetalPanel: heavyMetalPanelOnCertificate,
      referenceUrl: null,
      sampleCode: null,
      tecridId: null,
    }),
  };
}

export function assessKasandrinosIntake(packet: KasandrinosPacket): KasandrinosIntakeAssessment {
  const named = packet.namedLots.map(assessNamedLot);
  const namedLotCodes = packet.namedLots.map((lot) => lot.supplierLotCode);
  const pending = packet.pendingLotIdCertificates.map((certificate) => assessPending(certificate, namedLotCodes));
  return {
    databaseWrite: false,
    persistedRecords: 0,
    limitColumnMeaning: packet.limitColumnMeaning,
    evidenceStorage: packet.evidenceBytes.whereTheyBelong,
    records: [...named, ...pending],
    humanSteps: [
      "Leave the pull request as a draft. Do not merge it to load data, and do not run a seed or migration against production.",
      "This command never opens a database connection. A database URL in the environment is ignored.",
      "Olive oil is not a pilot lane. A human product decision is required before any Kasandrinos lot can be nominated. Do not place these certificates on the cocoa powder or avocado fruit lanes.",
      `Ask the supplier for the missing nomination facts for ${namedLotCodes.join(" and ")}: quantity, stocked location, country, and the authorizer or owner of record. ${packet.resultConfirmation.by}'s confirmation covers the laboratory results only.`,
      "After those facts exist and a supplier organization exists, operations creates a private nominated lot at /ops/nominations. That is the first legal state. Do not skip ahead to sampling.",
      packet.evidenceBytes.whereTheyBelong,
      "Verify inventory only from observed stock, then run independent sampling through a completed sampling order with seals and custody.",
      "Authenticate a TECRID evidence record bound to that sample. The Light Labs certificate is not that record.",
      "Use a frozen profile written for this product. Do not reuse the cocoa or avocado example limits, and do not treat the Light Labs Limit column as a VLE or regulatory limit.",
      "Run qualification only after that evidence exists. Publish only if the publication gate passes. Do not create a reservation from this packet.",
      `${packet.namedLots.find((lot) => !hasHeavyMetalPanel(lot.analytes))?.supplierLotCode ?? "A lot without the four-metal panel"} cannot carry a heavy-metal claim unless a heavy-metals certificate for that same lot code arrives.`,
      "The July 2025 certificates have a blank lot field. Keep them out of both named lots until the supplier provides lot ids.",
    ],
  };
}

function analyteLine(analyte: KasandrinosAnalyte): string {
  const loq = analyte.loqColumn ? `${analyte.loqColumn} ${analyte.loq}` : `LOQ ${analyte.loq}`;
  const limit = analyte.lightLabsSpecLimit
    ? `Light Labs spec ${analyte.lightLabsSpecLimit}`
    : analyte.limitColumn
      ? `${analyte.limitColumn} blank`
      : "Light Labs spec blank";
  const status = analyte.status ? `certificate status ${analyte.status}` : "certificate status blank";
  return `${analyte.analyte}: ${loq}; ${limit}; result ${formatKasandrinosAnalyteResult(analyte)}; ${status}`;
}

export function formatKasandrinosIntakeReport(packet: KasandrinosPacket, assessment: KasandrinosIntakeAssessment): string {
  const lines = [
    "Kasandrinos Light Labs intake",
    "No database write. No physical lot, sample, TECRID record, qualification, listing, or reservation is created.",
    assessment.limitColumnMeaning,
    "",
  ];
  for (const record of assessment.records) {
    const source = [...packet.namedLots, ...packet.pendingLotIdCertificates].find((item) => item.test === record.test);
    lines.push(`Test ${record.test}, order ${record.order}, ${record.productName}`);
    lines.push(record.supplierLotCode ? `Lot code on certificate: ${record.supplierLotCode}` : "Lot code on certificate: blank");
    lines.push(`Lot state: ${record.disposition === "withheld_before_nomination" ? "not created, stopped before nomination" : "not stored, waiting on a supplier lot id"}`);
    lines.push(`Heavy-metal panel on this certificate: ${record.heavyMetalPanelOnCertificate ? "yes" : "no"}. Heavy-metal status claim: not claimable.`);
    if (!source) continue;
    lines.push(`File ${source.fileName}; method ${source.method}; received ${source.dateReceived}; tested ${source.dateTested}; released ${source.dateReleasedAsPrinted}; approved by ${source.approvedByLine}.`);
    if ("methodStatement" in source && source.methodStatement) lines.push(source.methodStatement);
    if (source.resultColumnNote) lines.push(source.resultColumnNote);
    for (const analyte of source.analytes) lines.push(analyteLine(analyte));
    const reasonLabel = record.disposition === "withheld_before_nomination" ? "Before nomination" : "Not stored";
    for (const reason of record.blockersBeforeNomination) lines.push(`${reasonLabel}: ${reason}`);
    lines.push("");
  }
  lines.push("What a human must do before any of this is live");
  assessment.humanSteps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  return `${lines.join("\n")}\n`;
}
