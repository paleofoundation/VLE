import type { Actor } from "./authz";
import { DomainError } from "./errors";

/**
 * Closed catalog of contaminant documentation types.
 * Explainers and index links are product copy. They are not measured results.
 */
export const contaminantDocumentationTypes = [
  {
    code: "HEAVY_METALS",
    name: "Heavy metals",
    explainer:
      "Heavy metals documentation is a supplier document for lead, cadmium, arsenic, or mercury, attached to one physical lot or one compliance profile. The Institute of Contaminant Standards publishes the Heavy Metal Index for this class. VLE records the document without extracting a concentration, and it does not treat the file as a qualification result.",
    indexName: "Heavy Metal Index",
    indexUrl: "https://heavymetalindex.com",
  },
  {
    code: "PFAS",
    name: "PFAS / forever chemicals",
    explainer:
      "PFAS documentation is a supplier document for per- and polyfluoroalkyl substances, also called forever chemicals, attached to one physical lot or one compliance profile. The Forever Chemicals Index is the PFAS evidence destination in the Institute of Contaminant Standards network. A file on record is not a measured value and does not list a lot.",
    indexName: "Forever Chemicals Index",
    indexUrl: "https://foreverchemicalsindex.com",
  },
  {
    code: "MICROPLASTICS",
    name: "Microplastics",
    explainer:
      "Microplastics documentation is a supplier document for plastic particles, attached to one physical lot or one compliance profile. The Institute of Contaminant Standards microplastics page provides context while its index is in development. VLE does not invent a particle count, a method, or a pass mark for this type.",
    indexName: "ICS microplastics vertical",
    indexUrl: "https://contaminantstandards.com/network/microplastics",
  },
] as const;

export type ContaminantDocumentationCode = (typeof contaminantDocumentationTypes)[number]["code"];

export const contaminantAttachmentSubjects = ["LOT", "PROFILE"] as const;
export type ContaminantAttachmentSubject = (typeof contaminantAttachmentSubjects)[number];

export const MAX_CONTAMINANT_FILE_BYTES = 512 * 1024;

export type ContaminantFile = { bytes: Uint8Array; contentType: "application/pdf" };

export type ContaminantAttachmentInput = {
  documentationType: ContaminantDocumentationCode;
  subject: ContaminantAttachmentSubject;
  physicalLotId?: string;
  complianceProfileId?: string;
  fileName: string;
  referenceUrl?: string;
  file?: ContaminantFile;
  documentDate?: Date;
  retestOn?: Date;
  notes?: string;
};

export function contaminantDocumentationType(code: string) {
  return contaminantDocumentationTypes.find((type) => type.code === code) ?? null;
}

export function assertContaminantAttachment(input: ContaminantAttachmentInput) {
  if (!contaminantDocumentationType(input.documentationType)) {
    throw new DomainError("Unknown contaminant documentation type", "INVALID_INPUT");
  }
  if (!contaminantAttachmentSubjects.includes(input.subject)) {
    throw new DomainError("Choose a lot or profile subject", "INVALID_INPUT");
  }
  const hasLot = Boolean(input.physicalLotId);
  const hasProfile = Boolean(input.complianceProfileId);
  if (input.subject === "LOT" && (!hasLot || hasProfile)) {
    throw new DomainError("A lot document attaches to one physical lot", "INVALID_INPUT");
  }
  if (input.subject === "PROFILE" && (!hasProfile || hasLot)) {
    throw new DomainError("A profile document attaches to one compliance profile", "INVALID_INPUT");
  }
  const fileName = input.fileName.trim();
  if (!fileName || fileName.length > 180) {
    throw new DomainError("File name is required", "INVALID_INPUT");
  }
  if (Boolean(input.referenceUrl) === Boolean(input.file)) {
    throw new DomainError("Choose a PDF upload or an https reference, not both", "INVALID_INPUT");
  }
  if (input.file) {
    if (!input.file.bytes.byteLength || input.file.bytes.byteLength > MAX_CONTAMINANT_FILE_BYTES) {
      throw new DomainError("PDF must be nonempty and no larger than 512 KiB", "INVALID_INPUT");
    }
    const signature = new TextDecoder().decode(input.file.bytes.slice(0, 5));
    if (input.file.contentType !== "application/pdf" || signature !== "%PDF-" || !fileName.toLowerCase().endsWith(".pdf")) {
      throw new DomainError("Upload a PDF document", "INVALID_INPUT");
    }
  } else {
    let url: URL;
    try { url = new URL(input.referenceUrl!); } catch {
      throw new DomainError("Reference must be an https URL", "INVALID_INPUT");
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new DomainError("Reference must be an https URL without credentials", "INVALID_INPUT");
    }
  }
  for (const date of [input.documentDate, input.retestOn]) {
    if (date && !Number.isFinite(date.getTime())) throw new DomainError("Invalid document date", "INVALID_INPUT");
  }
  if (input.notes && input.notes.trim().length > 1000) {
    throw new DomainError("Notes are too long", "INVALID_INPUT");
  }
}

export function assertContaminantDownload(actor: Actor) {
  if (!actor.roles.some((role) => role === "SUPPLIER" || role === "OPS" || role === "ADMIN")) {
    throw new DomainError("Document download is limited to the supplier and operations", "FORBIDDEN");
  }
}
